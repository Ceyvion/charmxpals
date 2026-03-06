import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getRedis } from '@/lib/redis';
import { getRuntimeDiagnostics, hasRedisEnv } from '@/lib/runtime';

export async function GET() {
  const diagnostics = getRuntimeDiagnostics();
  const checks: Record<string, { ok: boolean; detail?: string }> = {
    runtime: { ok: diagnostics.ok, detail: diagnostics.issues.join(' ') || 'ok' },
    repo: { ok: false },
    redis: { ok: !hasRedisEnv(), detail: hasRedisEnv() ? undefined : 'not configured' },
  };

  try {
    const repo = await getRepo();
    checks.repo = { ok: Boolean(repo), detail: repo.kind || 'unknown' };
  } catch (error) {
    checks.repo = {
      ok: false,
      detail: error instanceof Error ? error.message : 'repo_unavailable',
    };
  }

  if (hasRedisEnv()) {
    try {
      const redis = getRedis();
      await redis.get('__healthcheck__');
      checks.redis = { ok: true, detail: 'reachable' };
    } catch (error) {
      checks.redis = {
        ok: false,
        detail: error instanceof Error ? error.message : 'redis_unreachable',
      };
    }
  }

  const ok = Object.values(checks).every((check) => check.ok);
  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 503 },
  );
}
