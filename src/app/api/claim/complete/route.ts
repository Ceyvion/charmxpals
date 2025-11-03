import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';

import { computeChallengeDigest, hashClaimCode, signChallengeWithCode } from '@/lib/crypto';
import { getRepo } from '@/lib/repo';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { authOptions } from '@/lib/auth';

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

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return Response.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const code = typeof payload?.code === 'string' ? payload.code : null;
    const challengeId = typeof payload?.challengeId === 'string' ? payload.challengeId : null;
    const signature = typeof payload?.signature === 'string' ? payload.signature : null;
    if (!code || !challengeId || !signature) {
      return Response.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    const codeHash = hashClaimCode(code);

    // Load and validate challenge
    const repo = await getRepo();
    const challenge = await repo.getChallengeById(challengeId);
    if (!challenge || challenge.codeHash !== codeHash) {
      return Response.json({ success: false, error: 'Invalid challenge' }, { status: 400 });
    }
    if (challenge.consumed || new Date() > challenge.expiresAt) {
      return Response.json({ success: false, error: 'Challenge expired' }, { status: 400 });
    }
    if (challenge.userId && challenge.userId !== userId) {
      return Response.json({ success: false, error: 'Challenge mismatch for user' }, { status: 403 });
    }

    // Load unit
    const unit = await repo.findUnitByCodeHash(codeHash);
    if (!unit) {
      return Response.json({ success: false, error: 'Invalid code' }, { status: 400 });
    }
    if (unit.status !== 'available') {
      return Response.json({ success: false, error: 'Code already claimed' }, { status: 400 });
    }

    // Verify challenge digest integrity and signature from client
    const expectedDigest = computeChallengeDigest({
      codeHash,
      nonce: challenge.nonce,
      timestamp: challenge.timestamp,
      secureSalt: unit.secureSalt,
    });
    if (expectedDigest !== challenge.challengeDigest) {
      return Response.json({ success: false, error: 'Challenge mismatch' }, { status: 400 });
    }

    const expectedSig = signChallengeWithCode(code, challenge.challengeDigest);
    if (expectedSig !== signature) {
      // optional: record abuse attempt
      try { await repo.logAbuse({ type: 'invalid-signature', actorRef: userId, metadata: { ip, challengeId } }); } catch {}
      return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    // Atomically claim and create ownership; also consume the challenge
    await repo.consumeChallenge(challenge.id);
    const { characterId, claimedAt } = await repo.claimUnitAndCreateOwnership({ unitId: unit.id, userId });

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
