import { NextRequest } from 'next/server';
import { getRepo } from '@/lib/repo';
import { hashCode } from '@/lib/crypto';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/ip';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.url, request.headers);
    const rl = rateLimitCheck(`${ip}:claim-verify`, { windowMs: 60_000, max: 30, prefix: 'claim' });
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

    const codeHash = hashCode(code);
    const repo = await getRepo();
    const unit = await repo.findUnitByCodeHash(codeHash);
    if (!unit) {
      return Response.json({ success: false, error: 'Invalid code' }, { status: 400 });
    }

    return Response.json({
      success: true,
      status: unit.status,
      characterId: unit.characterId,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return Response.json({ success: false, error: 'Failed to verify code' }, { status: 500 });
  }
}

