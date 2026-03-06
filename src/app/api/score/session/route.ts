import { NextRequest } from 'next/server';

import { getSafeServerSession } from '@/lib/serverSession';
import {
  createScoreAttemptRecord,
  createScoreSession,
  getRunnerAttemptRequirements,
  getRunnerScoreLimits,
} from '@/lib/scoreSession';
import { getClientIp } from '@/lib/ip';
import { rateLimitCheck } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.url, request.headers);
  const rateLimitResult = await rateLimitCheck(`score-session:${ip}`, {
    max: 30,
    windowMs: 60_000,
    prefix: 'score',
  });
  if (!rateLimitResult.allowed) {
    return Response.json({ success: false, error: 'rate limit exceeded' }, { status: 429 });
  }

  const session = await getSafeServerSession();
  if (!session?.user?.id) {
    return Response.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const mode = typeof (body as { mode?: unknown })?.mode === 'string' ? (body as { mode: string }).mode : '';
  const trackId = typeof (body as { trackId?: unknown })?.trackId === 'string' ? (body as { trackId: string }).trackId : '';

  if (mode !== 'runner') {
    return Response.json({ success: false, error: 'unsupported_mode' }, { status: 400 });
  }

  const limits = getRunnerScoreLimits(trackId);
  const requirements = getRunnerAttemptRequirements(trackId);
  if (!limits || !requirements) {
    return Response.json({ success: false, error: 'invalid_track' }, { status: 400 });
  }

  const { token, claims } = createScoreSession({
    userId: session.user.id,
    mode: 'runner',
    trackId: limits.trackId,
    minAgeSeconds: requirements.minAgeSeconds,
  });
  await createScoreAttemptRecord({
    claims,
    noteCount: requirements.noteCount,
  });

  return Response.json({
    success: true,
    token,
    mode: claims.mode,
    trackId: claims.trackId,
    minSubmitAt: new Date(claims.nbf * 1000).toISOString(),
    expiresAt: new Date(claims.exp * 1000).toISOString(),
    noteCount: requirements.noteCount,
  });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
