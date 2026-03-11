import { NextRequest } from 'next/server';

import { computeChallengeDigest, hashClaimCode, signChallengeWithCode, verifyClaimToken } from '@/lib/crypto';
import { getRepo } from '@/lib/repo';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { getSafeServerSession } from '@/lib/serverSession';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.url, request.headers);
    const rl = await rateLimitCheck(`${ip}:claim-complete`, { windowMs: 60_000, max: 20, prefix: 'claim' });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString(),
        },
      });
    }

    const session = await getSafeServerSession();
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    type CompletePayload = {
      code?: unknown;
      challengeId?: unknown;
      challengeToken?: unknown;
      signature?: unknown;
    };

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const parsed: CompletePayload = typeof payload === 'object' && payload !== null ? (payload as CompletePayload) : {};
    const code = typeof parsed.code === 'string' ? parsed.code : null;
    const challengeId = typeof parsed.challengeId === 'string' ? parsed.challengeId : null;
    const challengeToken = typeof parsed.challengeToken === 'string' ? parsed.challengeToken : null;
    const signature = typeof parsed.signature === 'string' ? parsed.signature : null;
    if (!code || (!challengeId && !challengeToken) || !signature) {
      return Response.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const codeHash = hashClaimCode(code);
    const repo = await getRepo();
    const tokenClaims = challengeToken ? verifyClaimToken(challengeToken) : null;
    if (challengeToken && !tokenClaims) {
      return Response.json({ success: false, error: 'Invalid challenge' }, { status: 400 });
    }

    if (tokenClaims) {
      if (tokenClaims.codeHash !== codeHash) {
        return Response.json({ success: false, error: 'Invalid challenge' }, { status: 400 });
      }
      if (tokenClaims.sub && tokenClaims.sub !== userId) {
        return Response.json({ success: false, error: 'Challenge mismatch for user' }, { status: 403 });
      }

      const expectedDigest = computeChallengeDigest({
        codeHash,
        nonce: tokenClaims.nonce,
        timestamp: tokenClaims.timestamp,
        secureSalt: tokenClaims.secureSalt,
      });
      const expectedSig = signChallengeWithCode(code, expectedDigest);
      if (expectedSig !== signature) {
        try { await repo.logAbuse({ type: 'invalid-signature', actorRef: userId, metadata: { ip, challengeId: tokenClaims.challengeId } }); } catch {}
        return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
      }

      try {
        const claimed = await repo.claimUnitAndCreateOwnership({
          unitId: tokenClaims.unitId,
          userId,
          challengeId: tokenClaims.challengeId,
        });
        return Response.json({
          success: true,
          message: 'Successfully claimed character',
          characterId: claimed.characterId,
          claimedAt: claimed.claimedAt.toISOString(),
        });
      } catch (claimError) {
        const message = claimError instanceof Error ? claimError.message : 'claim_failed';
        if (
          message === 'unit_unavailable' ||
          message === 'Unit no longer available' ||
          message === 'challenge_not_found' ||
          message === 'challenge_consumed' ||
          message === 'Challenge already consumed'
        ) {
          return Response.json({ success: false, error: 'Challenge expired' }, { status: 400 });
        }
        throw claimError;
      }
    }

    // Load and validate challenge
    const challenge = await repo.getChallengeById(challengeId!);
    if (!challenge || challenge.codeHash !== codeHash) {
      return Response.json({ success: false, error: 'Invalid challenge' }, { status: 400 });
    }
    if (challenge.consumed || new Date() > challenge.expiresAt) {
      return Response.json({ success: false, error: 'Challenge expired' }, { status: 400 });
    }
    if (challenge.userId && challenge.userId !== userId) {
      return Response.json({ success: false, error: 'Challenge mismatch for user' }, { status: 403 });
    }

    const fallbackUnit = !challenge.unitId ? await repo.findUnitByCodeHash(codeHash) : null;
    const unitId = challenge.unitId || fallbackUnit?.id || null;
    if (!unitId) {
      return Response.json({ success: false, error: 'Invalid code' }, { status: 400 });
    }

    const secureSalt = challenge.secureSalt || fallbackUnit?.secureSalt || null;
    if (!secureSalt) {
      return Response.json({ success: false, error: 'Invalid challenge' }, { status: 400 });
    }

    // Verify challenge digest integrity and signature from client
    const expectedDigest = computeChallengeDigest({
      codeHash,
      nonce: challenge.nonce,
      timestamp: challenge.timestamp,
      secureSalt,
    });

    const expectedSig = signChallengeWithCode(code, expectedDigest);
    if (expectedSig !== signature) {
      // optional: record abuse attempt
      try { await repo.logAbuse({ type: 'invalid-signature', actorRef: userId, metadata: { ip, challengeId } }); } catch {}
      return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    // Atomically claim and create ownership; also consume the challenge
    let characterId: string;
    let claimedAt: Date;
    try {
      const claimed = await repo.claimUnitAndCreateOwnership({ unitId, userId, challengeId: challenge.id });
      characterId = claimed.characterId;
      claimedAt = claimed.claimedAt;
    } catch (claimError) {
      const message = claimError instanceof Error ? claimError.message : 'claim_failed';
      if (
        message === 'unit_unavailable' ||
        message === 'Unit no longer available' ||
        message === 'challenge_not_found' ||
        message === 'challenge_consumed' ||
        message === 'Challenge already consumed'
      ) {
        return Response.json({ success: false, error: 'Challenge expired' }, { status: 400 });
      }
      throw claimError;
    }

    return Response.json({ success: true, message: 'Successfully claimed character', characterId, claimedAt: claimedAt.toISOString() });
  } catch (error) {
    console.error('Claim complete error:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to complete claim process',
      },
      { status: 500 },
    );
  }
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
