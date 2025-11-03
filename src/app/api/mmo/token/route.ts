import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { getRepo } from '@/lib/repo';
import { rateLimitCheck } from '@/lib/rateLimit';
import { signToken, type MmoSessionClaims } from '@/lib/mmo/token';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Simple rate limit
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'local';
  const rl = await rateLimitCheck(`mmo-token:${ip}`, { windowMs: 15_000, max: 10, prefix: 'mmo' });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString() } });
  }

  const repo = await getRepo();
  const devAllow = process.env.NODE_ENV !== 'production';

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }
  const user = await repo.getUserById(userId);
  if (!user) return NextResponse.json({ ok: false, error: 'no_user' }, { status: 404 });

  // Gate by ownership (dev can bypass in non-prod)
  const owns = await repo.listOwnershipsByUser(user.id);
  const ownedCharIds = Array.from(new Set(owns.map((o) => o.characterId)));
  if (!devAllow && ownedCharIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_ownership' }, { status: 403 });
  }

  // Mint short-lived session token
  const sessionId = randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const ttlSec = 10 * 60; // 10 minutes
  const claims: MmoSessionClaims = {
    sub: user.id,
    sid: sessionId,
    exp: now + ttlSec,
    nonce: randomUUID(),
    scope: ['plaza:join'],
    owned: ownedCharIds,
  };
  const token = signToken(claims);

  return NextResponse.json({ ok: true, token, claims: { ...claims, iat: now } });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
