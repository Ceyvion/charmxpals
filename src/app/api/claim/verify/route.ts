import { NextRequest } from 'next/server';
import { getRepo } from '@/lib/repo';
import { hashClaimCode } from '@/lib/crypto';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.url, request.headers);
    const rl = rateLimitCheck(`${ip}:claim-verify`, { windowMs: 60_000, max: 30, prefix: 'claim' });
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.max(0, Math.ceil((rl.resetAt - Date.now()) / 1000)).toString(),
        },
      });
    }

    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return Response.json({ error: 'Missing code' }, { status: 400 });
    }

    const codeHash = hashClaimCode(code);
    const repo = await getRepo();
    const unit = await repo.findUnitByCodeHash(codeHash);
    if (!unit) {
      return Response.json({ status: 'not_found' as const, character: null });
    }

    const character = await repo.getCharacterById(unit.characterId);

    return Response.json({
      status: unit.status,
      character: character
        ? {
            id: character.id,
            name: character.name,
            description: character.description,
            rarity: character.rarity,
            artRefs: character.artRefs,
            stats: character.stats,
            realm: character.realm ?? null,
            title: character.title ?? null,
            tagline: character.tagline ?? null,
            codeSeries: character.codeSeries ?? null,
            slug: character.slug ?? null,
            color: character.color ?? null,
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
