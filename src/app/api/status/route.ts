import { getRepo } from '@/lib/repo';
import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_STATUS_ENDPOINT !== '1') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const repo = await getRepo();
  return NextResponse.json({
    ok: true,
    repo: repo.kind || 'unknown',
    useMemoryEnv: process.env.USE_MEMORY_DB === '1',
    hasRedisConfig: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    hasDatabaseURL: false,
    node: process.version,
  });
}
