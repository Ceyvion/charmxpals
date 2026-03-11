import { NextRequest } from 'next/server';
import { getTopScores, submitScore } from '@/lib/leaderboard';
import { getClientIp } from '@/lib/ip';
import { rateLimitCheck } from '@/lib/rateLimit';
import { getSafeServerSession } from '@/lib/serverSession';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'runner';
  const top = await getTopScores(mode, 20);
  return Response.json(
    { success: true, top },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } },
  );
}

export async function POST(req: NextRequest) {
  // Rate limit: 30 submissions per minute per IP
  const ip = getClientIp(req.url, req.headers);
  const rateLimitResult = await rateLimitCheck(`score-submit:${ip}`, {
    max: 30,
    windowMs: 60_000,
    prefix: 'rl',
  });
  if (!rateLimitResult.allowed) {
    return Response.json(
      { success: false, error: 'rate limit exceeded' },
      { status: 429 }
    );
  }

  // Require authentication
  const session = await getSafeServerSession();
  if (!session?.user?.id) {
    return Response.json(
      { success: false, error: 'unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const mode = (body?.mode as string) || 'runner';
    const score = Number(body?.score ?? 0);
    const coins = typeof body?.coins === 'number' ? Number(body.coins) : undefined;
    const name = typeof body?.name === 'string'
      ? body.name.slice(0, 32)
      : session.user.name || session.user.email || 'Anonymous';

    if (!Number.isFinite(score) || score <= 0) {
      return Response.json({ success: false, error: 'invalid score' }, { status: 400 });
    }

    const result = await submitScore({ mode, score, coins, name });
    return Response.json(result);
  } catch {
    return Response.json({ success: false, error: 'bad request' }, { status: 400 });
  }
}
