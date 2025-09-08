import { getRepo } from '@/lib/repo';
import { NextResponse } from 'next/server';

export async function GET() {
  const repo = await getRepo();
  return NextResponse.json({
    ok: true,
    repo: repo.kind || 'unknown',
    useMemoryEnv: process.env.USE_MEMORY_DB === '1',
    hasDatabaseURL: Boolean(process.env.DATABASE_URL),
    node: process.version,
  });
}

