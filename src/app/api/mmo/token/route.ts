import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { getRepo } from '@/lib/repo';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { canUseHttpPlazaTransport } from '@/lib/mmo/httpPlazaStore';
import { normalizeAvatarId } from '@/lib/mmo/avatarId';
import { signToken, type MmoSessionClaims } from '@/lib/mmo/token';
import { ensurePlazaServer } from '@/lib/mmo/serverRuntime';
import { resolveConfiguredWsBase, resolveServerWsBase } from '@/lib/mmo/wsUrl';
import { getSafeServerSession } from '@/lib/serverSession';

let httpPreviewRateLimitBypassUntil = 0;

function resolveDisplayName(sessionUser: { name?: string | null; email?: string | null } | undefined, userId: string) {
  const raw = sessionUser?.name || sessionUser?.email || (userId.startsWith('guest:') ? 'Guest' : userId);
  const compact = raw.split('@')[0].replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  return (compact || 'Guest').slice(0, 18);
}

export async function GET(request: NextRequest) {
  const modeParam = request.nextUrl.searchParams.get('mode');
  const mode: 'plaza' | 'arena' = modeParam === 'arena' ? 'arena' : 'plaza';

  const devAllow = process.env.NODE_ENV !== 'production';

  const session = await getSafeServerSession();
  const signedInUserId = session?.user?.id;
  if (!signedInUserId && mode !== 'plaza') {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  const isHosted = process.env.VERCEL === '1';
  const configuredWsBase = resolveConfiguredWsBase();
  const hasConfiguredWs = Boolean(configuredWsBase);
  const useHttpTransport = mode === 'plaza' && isHosted && !hasConfiguredWs && canUseHttpPlazaTransport();
  const shouldAutoStart = !hasConfiguredWs && process.env.MMO_AUTO_START !== '0' && !isHosted;

  if (!hasConfiguredWs && isHosted && !useHttpTransport) {
    return NextResponse.json({ ok: false, error: 'plaza_unconfigured' }, { status: 503 });
  }

  // Simple rate limit. Auth/config gates run first so missing backend services do not mask them.
  const ip = getClientIp(request.url, request.headers);
  let rl: Awaited<ReturnType<typeof rateLimitCheck>>;
  if (useHttpTransport && Date.now() < httpPreviewRateLimitBypassUntil) {
    rl = { allowed: true, remaining: 0, resetAt: httpPreviewRateLimitBypassUntil };
  } else {
    try {
      rl = await rateLimitCheck(`mmo-token:${ip}`, { windowMs: 15_000, max: 10, prefix: 'mmo' });
    } catch (error) {
      if (useHttpTransport) {
        console.warn('[mmo] token rate limit unavailable; allowing HTTP plaza preview token', error);
        httpPreviewRateLimitBypassUntil = Date.now() + 60_000;
        rl = { allowed: true, remaining: 0, resetAt: httpPreviewRateLimitBypassUntil };
      } else {
        console.error('[mmo] token rate limit failed', error);
        return NextResponse.json({ ok: false, error: 'plaza_unavailable' }, { status: 503 });
      }
    }
  }
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString() } });
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

  // Gate arena by ownership. Plaza preview can use a guest/fallback avatar.
  const configuredFallbackAvatarId = normalizeAvatarId(process.env.MMO_DEFAULT_AVATAR_ID);
  const fallbackAvatarId = configuredFallbackAvatarId || 'neon-city';
  const sessionId = randomUUID();
  const userId = signedInUserId || `guest:${sessionId}`;
  let claimsOwned = [fallbackAvatarId];

  if (signedInUserId) {
    try {
      const repo = await getRepo();
      const ownedAvatarIds = await repo.listOwnedAvatarIdsByUser(signedInUserId);
      const claimedAvatarIds = ownedAvatarIds
        .map((avatarId) => normalizeAvatarId(avatarId))
        .filter((avatarId): avatarId is string => Boolean(avatarId));
      claimsOwned = claimedAvatarIds.length > 0 ? claimedAvatarIds : [fallbackAvatarId];
      if (!devAllow && mode === 'arena' && ownedAvatarIds.length === 0) {
        return NextResponse.json({ ok: false, error: 'no_ownership' }, { status: 403 });
      }
    } catch (error) {
      if (mode === 'arena') {
        console.error('[mmo] ownership lookup failed for arena token', error);
        return NextResponse.json({ ok: false, error: 'plaza_unavailable' }, { status: 503 });
      }
      console.warn('[mmo] ownership lookup failed; using plaza fallback avatar', error);
    }
  }

  // Mint short-lived session token
  const now = Math.floor(Date.now() / 1000);
  const ttlSec = 10 * 60; // 10 minutes
  const claims: MmoSessionClaims = {
    sub: userId,
    sid: sessionId,
    exp: now + ttlSec,
    nonce: randomUUID(),
    scope: [mode === 'arena' ? 'arena:join' : 'plaza:join'],
    owned: claimsOwned,
    mode,
    displayName: resolveDisplayName(session?.user || undefined, userId),
  };
  let token: string;
  try {
    token = signToken(claims);
  } catch (error) {
    console.error('[mmo] failed to sign token', error);
    return NextResponse.json({ ok: false, error: 'plaza_unavailable' }, { status: 503 });
  }
  const requestHost =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.host ||
    request.nextUrl.hostname;
  const wsBase = useHttpTransport ? null : resolveServerWsBase({ requestHost, isHosted });

  return NextResponse.json({
    ok: true,
    transport: useHttpTransport ? 'http' : 'ws',
    token,
    claims: { ...claims, iat: now, mode },
    wsBase,
    syncPath: useHttpTransport ? '/api/mmo/sync' : undefined,
    snapshotInterval: useHttpTransport ? 220 : undefined,
  });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
