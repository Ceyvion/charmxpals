import { getRepo } from '@/lib/repo';
import { NextResponse } from 'next/server';

export async function GET() {
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
