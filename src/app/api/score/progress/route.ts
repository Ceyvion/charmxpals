import { NextRequest } from 'next/server';

import { getClientIp } from '@/lib/ip';
import { rateLimitCheck } from '@/lib/rateLimit';
import { updateScoreAttemptProgress, verifyScoreSession } from '@/lib/scoreSession';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.url, request.headers);
  const rateLimitResult = await rateLimitCheck(`score-progress:${ip}`, {
    max: 180,
    windowMs: 60_000,
    prefix: 'score',
  });
  if (!rateLimitResult.allowed) {
    return Response.json({ success: false, error: 'rate limit exceeded' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'invalid_json' }, { status: 400 });
  }

  const mode = typeof (body as { mode?: unknown })?.mode === 'string' ? (body as { mode: string }).mode : '';
  const trackId = typeof (body as { trackId?: unknown })?.trackId === 'string' ? (body as { trackId: string }).trackId : '';
  const progress = Number((body as { progress?: unknown })?.progress ?? 0);
  const furthestNoteIndex = Number((body as { furthestNoteIndex?: unknown })?.furthestNoteIndex ?? 0);
  const sessionToken =
    typeof (body as { sessionToken?: unknown })?.sessionToken === 'string'
      ? (body as { sessionToken: string }).sessionToken
      : '';

  if (mode !== 'runner' || !trackId || !sessionToken) {
    return Response.json({ success: false, error: 'invalid_request' }, { status: 400 });
  }
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    return Response.json({ success: false, error: 'invalid_progress' }, { status: 400 });
  }
  if (!Number.isFinite(furthestNoteIndex) || furthestNoteIndex < 0) {
    return Response.json({ success: false, error: 'invalid_note_index' }, { status: 400 });
  }

  const claims = verifyScoreSession(sessionToken);
  if (!claims || claims.mode !== 'runner' || claims.trackId !== trackId) {
    return Response.json({ success: false, error: 'invalid_score_session' }, { status: 400 });
  }

  const record = await updateScoreAttemptProgress({
    nonce: claims.nonce,
    userId: claims.sub,
    trackId,
    progress,
    furthestNoteIndex,
  });
  if (!record) {
    return Response.json({ success: false, error: 'missing_score_attempt' }, { status: 404 });
  }

  return Response.json({
    success: true,
    record: {
      maxProgress: record.maxProgress,
      maxNoteIndex: record.maxNoteIndex,
      checkpointCount: record.checkpointCount,
    },
  });
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
