import { NextRequest, NextResponse } from 'next/server';

import { syncHttpPlazaSession, type HttpPlazaSyncInput } from '@/lib/mmo/httpPlazaStore';
import { verifyToken } from '@/lib/mmo/token';

function hasPlazaScope(scope: string[] | undefined) {
  return !Array.isArray(scope) || scope.length === 0 || scope.includes('plaza:join');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as (HttpPlazaSyncInput & { token?: unknown }) | null;
    const token = typeof body?.token === 'string' ? body.token : '';
    const claims = token ? verifyToken(token) : null;
    if (!claims || claims.mode === 'arena' || !hasPlazaScope(claims.scope)) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const result = await syncHttpPlazaSession(claims, {
      axes: body?.axes,
      characterId: body?.characterId,
      emote: body?.emote,
      chat: body?.chat,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[mmo] http plaza sync failed', error);
    return NextResponse.json({ ok: false, error: 'plaza_unavailable' }, { status: 503 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';
