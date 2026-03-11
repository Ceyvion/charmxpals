import { NextRequest } from 'next/server';

import { computeChallengeDigest, generateNonce, hashClaimCode, signClaimToken } from '@/lib/crypto';
import { getRepo } from '@/lib/repo';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { getSafeServerSession } from '@/lib/serverSession';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.url, request.headers);
    const rl = await rateLimitCheck(`${ip}:claim-start`, { windowMs: 60_000, max: 10, prefix: 'claim' });
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

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }
    const code = typeof (payload as { code?: unknown })?.code === 'string' ? (payload as { code?: string }).code : null;
    if (!code || typeof code !== 'string') {
      return Response.json({ success: false, error: 'Missing code' }, { status: 400 });
    }

    const codeHash = hashClaimCode(code);
    const repo = await getRepo();
    const nonce = generateNonce();
    const timestamp = Date.now().toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const optimized = repo.startClaimChallenge
      ? await repo.startClaimChallenge({ codeHash, userId, nonce, timestamp, expiresAt })
      : null;

    if (optimized && !optimized.ok) {
      return Response.json(
        { success: false, error: optimized.reason === 'unavailable' ? 'Code already claimed' : 'Invalid code' },
        { status: 400 },
      );
    }

    let challenge = optimized?.ok ? optimized.challenge : null;
    let secureSalt = optimized?.ok ? optimized.secureSalt : null;

    if (!challenge || !secureSalt) {
      const unit = await repo.findUnitByCodeHash(codeHash);
      if (!unit) {
        return Response.json({ success: false, error: 'Invalid code' }, { status: 400 });
      }
      if (unit.status !== 'available') {
        return Response.json({ success: false, error: 'Code already claimed' }, { status: 400 });
      }
      secureSalt = unit.secureSalt;
      challenge = await repo.createChallenge({
        codeHash,
        nonce,
        timestamp,
        challengeDigest: '',
        expiresAt,
        userId,
        unitId: unit.id,
        secureSalt,
      });
    }

    const challengeDigest = computeChallengeDigest({
      codeHash,
      nonce,
      timestamp,
      secureSalt,
    });
    const challengeToken = challenge?.unitId && challenge?.secureSalt
      ? signClaimToken({
          challengeId: challenge.id,
          codeHash,
          nonce,
          timestamp,
          unitId: challenge.unitId,
          secureSalt: challenge.secureSalt,
          sub: userId ?? null,
          exp: Math.floor(expiresAt.getTime() / 1000),
        })
      : null;

    return Response.json({
      success: true,
      challengeId: challenge.id,
      challengeToken,
      nonce,
      timestamp,
      challengeDigest,
      // Note: client should compute signature = HMAC_SHA256(key=code, msg=challengeDigest)
    });
  } catch (error) {
    console.error('Claim start error:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to start claim process',
      },
      { status: 500 },
    );
  }
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
