import { NextRequest } from 'next/server';
import { getRepo } from '@/lib/repo';
import { computeChallengeDigest, generateNonce, hashClaimCode } from '@/lib/crypto';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.url, request.headers);
    const rl = rateLimitCheck(`${ip}:claim-start`, { windowMs: 60_000, max: 10, prefix: 'claim' });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString(),
        },
      });
    }

    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return Response.json({ success: false, error: 'Missing code' }, { status: 400 });
    }

    const codeHash = hashClaimCode(code);

    // Validate the physical unit exists and is available
    const repo = await getRepo();
    const unit = await repo.findUnitByCodeHash(codeHash);
    if (!unit) {
      return Response.json({ success: false, error: 'Invalid code' }, { status: 400 });
    }
    if (unit.status !== 'available') {
      return Response.json({ success: false, error: 'Code already claimed' }, { status: 400 });
    }

    // Generate a signed challenge bound to this unit
    const nonce = generateNonce();
    const timestamp = Date.now().toString();
    const challengeDigest = computeChallengeDigest({
      codeHash,
      nonce,
      timestamp,
      secureSalt: unit.secureSalt,
    });

    // Persist the challenge with TTL (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const challenge = await repo.createChallenge({ codeHash, nonce, timestamp, challengeDigest, expiresAt });

    return Response.json({
      success: true,
      challengeId: challenge.id,
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
