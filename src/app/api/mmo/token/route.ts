import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getRepo } from '@/lib/repo';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { normalizeAvatarId } from '@/lib/mmo/avatarId';
import { signToken, type MmoSessionClaims } from '@/lib/mmo/token';
import { ensurePlazaServer } from '@/lib/mmo/serverRuntime';
import { resolveConfiguredWsBase, resolveServerWsBase } from '@/lib/mmo/wsUrl';
import { getSafeServerSession } from '@/lib/serverSession';

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get('mode');
  const mode: 'plaza' | 'arena' = modeParam === 'arena' ? 'arena' : 'plaza';

  // Simple rate limit
  const ip = getClientIp(request.url, request.headers);
  const rl = await rateLimitCheck(`mmo-token:${ip}`, { windowMs: 15_000, max: 10, prefix: 'mmo' });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString() } });
  }

  const repo = await getRepo();
  const devAllow = process.env.NODE_ENV !== 'production';

  const session = await getSafeServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }
  const user = await repo.getUserById(userId);
  if (!user) return NextResponse.json({ ok: false, error: 'no_user' }, { status: 404 });

  // Gate by ownership (dev can bypass in non-prod)
  const configuredFallbackAvatarId = normalizeAvatarId(process.env.MMO_DEFAULT_AVATAR_ID);
  const fallbackAvatarId = configuredFallbackAvatarId || 'neon-city';
  const ownedAvatarIds = await repo.listOwnedAvatarIdsByUser(user.id);
  const claimedAvatarIds = ownedAvatarIds
    .map((avatarId) => normalizeAvatarId(avatarId))
    .filter((avatarId): avatarId is string => Boolean(avatarId));
  const claimsOwned = claimedAvatarIds.length > 0 ? claimedAvatarIds : [fallbackAvatarId];
  if (!devAllow && ownedAvatarIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'no_ownership' }, { status: 403 });
  }

  const isHosted = process.env.VERCEL === '1';
  const configuredWsBase = resolveConfiguredWsBase();
  const hasConfiguredWs = Boolean(configuredWsBase);
  const shouldAutoStart = !hasConfiguredWs && process.env.MMO_AUTO_START !== '0' && !isHosted;

  if (!hasConfiguredWs && isHosted) {
    return NextResponse.json({ ok: false, error: 'plaza_unconfigured' }, { status: 503 });
  }

  if (shouldAutoStart) {
    try {
      const server = await ensurePlazaServer();
      if (!server) {
        console.warn('[mmo] plaza server auto-start skipped (port already in use)');
      }
    } catch (err) {
      console.error('[mmo] failed to auto-start plaza server', err);
      return NextResponse.json({ ok: false, error: 'plaza_unavailable' }, { status: 503 });
    }
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
    scope: [mode === 'arena' ? 'arena:join' : 'plaza:join'],
    owned: claimsOwned,
    mode,
  };
  const token = signToken(claims);
  const requestHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host ||
    request.nextUrl.hostname;
  const wsBase = resolveServerWsBase({ requestHost, isHosted });

  return NextResponse.json({ ok: true, token, claims: { ...claims, iat: now, mode }, wsBase });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
