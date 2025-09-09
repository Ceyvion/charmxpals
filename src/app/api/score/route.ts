import { NextRequest } from 'next/server';

// Lightweight in-memory score store (resets on server restart)
type ScoreEntry = { score: number; coins?: number; name?: string; at: string };
const store: Record<string, ScoreEntry[]> = {};

function todayKey(mode: string) {
  const now = new Date();
  const d = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${mode}:${d}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'runner';
  const key = todayKey(mode);
  const top = (store[key] || []).slice(0).sort((a, b) => b.score - a.score).slice(0, 20);
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
    const key = todayKey(mode);
    if (!store[key]) store[key] = [];
    const entry: ScoreEntry = { score: Math.round(score), coins, name, at: new Date().toISOString() };
    store[key].push(entry);
    // keep list bounded
    store[key] = store[key].sort((a, b) => b.score - a.score).slice(0, 100);
    return Response.json({ success: true, entry });
  } catch {
    return Response.json({ success: false, error: 'bad request' }, { status: 400 });
  }
}

