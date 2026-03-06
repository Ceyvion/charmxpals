import { getRepo } from '@/lib/repo';
import { NextResponse } from 'next/server';
import { getRuntimeDiagnostics } from '@/lib/runtime';

export async function GET() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_STATUS_ENDPOINT !== '1') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const diagnostics = getRuntimeDiagnostics();
  try {
    const repo = await getRepo();
    return NextResponse.json({
      ok: true,
      repo: repo.kind || 'unknown',
      runtime: diagnostics,
      hasDatabaseURL: false,
      node: process.version,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        runtime: diagnostics,
        error: error instanceof Error ? error.message : 'status_unavailable',
        node: process.version,
      },
      { status: 503 },
    );
  }
}
