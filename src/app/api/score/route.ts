import { NextRequest } from 'next/server';
import { getTopScores, submitScore } from '@/lib/leaderboard';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'runner';
  const top = await getTopScores(mode, 20);
  return Response.json({ success: true, top });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = (body?.mode as string) || 'runner';
    const score = Number(body?.score ?? 0);
    const coins = typeof body?.coins === 'number' ? Number(body.coins) : undefined;
    const name = typeof body?.name === 'string' ? body.name.slice(0, 32) : undefined;
    if (!Number.isFinite(score) || score <= 0) return Response.json({ success: false, error: 'invalid score' }, { status: 400 });
    const result = await submitScore({ mode, score, coins, name });
    return Response.json(result);
  } catch {
    return Response.json({ success: false, error: 'bad request' }, { status: 400 });
  }
}
