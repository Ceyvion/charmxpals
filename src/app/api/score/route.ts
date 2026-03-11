import { NextRequest } from 'next/server';

import { getTopScores, submitScore } from '@/lib/leaderboard';
import { getClientIp } from '@/lib/ip';
import { rateLimitCheck } from '@/lib/rateLimit';
import {
  consumeScoreSessionNonce,
  getRunnerScoreLimits,
  getScoreAttemptRecord,
  validateRunnerScoreAttempt,
  verifyScoreSession,
} from '@/lib/scoreSession';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode') || 'runner';
  const trackId = searchParams.get('trackId');
  const top = await getTopScores(mode, 20, { trackId });
  return Response.json(
    { success: true, top },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } },
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.url, req.headers);
  const rateLimitResult = await rateLimitCheck(`score-submit:${ip}`, {
    max: 30,
    windowMs: 60_000,
    prefix: 'rl',
  });
  if (!rateLimitResult.allowed) {
    return Response.json({ success: false, error: 'rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const mode = (body?.mode as string) || 'runner';
    const score = Number(body?.score ?? 0);
    const coins = typeof body?.coins === 'number' ? Number(body.coins) : undefined;
    const trackId = typeof body?.trackId === 'string' ? body.trackId : null;
    const sessionToken = typeof body?.sessionToken === 'string' ? body.sessionToken : '';

    if (!Number.isFinite(score) || score <= 0) {
      return Response.json({ success: false, error: 'invalid score' }, { status: 400 });
    }
    if (!sessionToken) {
      return Response.json({ success: false, error: 'missing_score_session' }, { status: 400 });
    }

    const claims = verifyScoreSession(sessionToken);
    if (!claims || claims.mode !== mode) {
      return Response.json({ success: false, error: 'invalid_score_session' }, { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (claims.nbf > now) {
      return Response.json({ success: false, error: 'score_session_too_fresh' }, { status: 400 });
    }

    if (mode === 'runner') {
      if (!trackId || claims.trackId !== trackId) {
        return Response.json({ success: false, error: 'track_mismatch' }, { status: 400 });
      }
      const limits = getRunnerScoreLimits(trackId);
      if (!limits) {
        return Response.json({ success: false, error: 'invalid_track' }, { status: 400 });
      }
      if (score > limits.maxScore) {
        return Response.json({ success: false, error: 'score_exceeds_limit' }, { status: 400 });
      }
      if (typeof coins === 'number' && coins > limits.maxCombo) {
        return Response.json({ success: false, error: 'combo_exceeds_limit' }, { status: 400 });
      }
      const attempt = await getScoreAttemptRecord(claims.nonce);
      if (!attempt || attempt.sub !== claims.sub || attempt.trackId !== trackId) {
        return Response.json({ success: false, error: 'missing_score_attempt' }, { status: 400 });
      }
      if (!validateRunnerScoreAttempt(attempt, limits, score)) {
        return Response.json({ success: false, error: 'incomplete_score_attempt' }, { status: 400 });
      }
    }

    const consumed = await consumeScoreSessionNonce(claims.nonce, Math.max(1, claims.exp - now));
    if (!consumed) {
      return Response.json({ success: false, error: 'score_session_already_used' }, { status: 409 });
    }

    const result = await submitScore({
      mode,
      score,
      coins,
      trackId,
      userId: claims.sub,
      displayName: normalizeDisplayName(claims.displayName) || 'Player',
    });
    return Response.json(result);
  } catch {
    return Response.json({ success: false, error: 'bad request' }, { status: 400 });
  }
}

function normalizeDisplayName(value?: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim().slice(0, 32);
  return normalized || null;
}
