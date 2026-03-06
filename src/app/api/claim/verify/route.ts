import { NextRequest } from 'next/server';
import { getRepo } from '@/lib/repo';
import { hashClaimCode } from '@/lib/crypto';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';
import { withCharacterLore } from '@/lib/characterLore';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.url, request.headers);
    const rl = await rateLimitCheck(`${ip}:claim-verify`, { windowMs: 60_000, max: 30, prefix: 'claim' });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString(),
        },
      });
    }

    type VerifyPayload = { code?: unknown };

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const parsed: VerifyPayload = typeof payload === 'object' && payload !== null ? (payload as VerifyPayload) : {};
    const code = typeof parsed.code === 'string' ? parsed.code : '';
    if (!code) {
      return Response.json({ error: 'Missing code' }, { status: 400 });
    }

    const codeHash = hashClaimCode(code);
    const repo = await getRepo();
    const unit = await repo.findUnitByCodeHash(codeHash);
    if (!unit) {
      return Response.json({ status: 'not_found' as const, character: null });
    }

    const character = await repo.getCharacterById(unit.characterId);
    const enriched = withCharacterLore(character);

    return Response.json({
      status: unit.status,
      character: enriched
        ? {
            id: enriched.id,
            name: enriched.name,
            description: enriched.description,
            rarity: enriched.rarity,
            artRefs: enriched.artRefs,
            stats: enriched.stats,
            realm: enriched.realm ?? null,
            title: enriched.title ?? null,
            tagline: enriched.tagline ?? null,
            codeSeries: enriched.codeSeries ?? null,
            slug: enriched.slug ?? null,
            color: enriched.color ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return Response.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
export const revalidate = 0;
