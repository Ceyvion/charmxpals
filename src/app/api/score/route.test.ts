import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import {
  createScoreAttemptRecord,
  createScoreSession,
  getRunnerAttemptRequirements,
  getRunnerScoreLimits,
  resetScoreAttemptStoreForTests,
  updateScoreAttemptProgress,
} from '@/lib/scoreSession';

vi.mock('@/lib/rateLimit', () => ({
  rateLimitCheck: vi.fn(async () => ({ allowed: true, resetAt: Date.now() + 10_000 })),
}));

function makeReq(body: Record<string, unknown>) {
  return {
    url: 'http://local/api/score',
    headers: new Headers(),
    json: async () => body,
  } as unknown as NextRequest;
}

describe('/api/score', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.CODE_HASH_SECRET = 'test-secret';
    resetScoreAttemptStoreForTests();
  });

  it('rejects runner leaderboard submission even after forged progress telemetry', async () => {
    const { POST } = await import('./route');
    const requirements = getRunnerAttemptRequirements('sunshine');
    const limits = getRunnerScoreLimits('sunshine');
    expect(requirements).not.toBeNull();
    expect(limits).not.toBeNull();

    const { token, claims } = createScoreSession({
      userId: 'user-1',
      mode: 'runner',
      trackId: 'sunshine',
      ttlSeconds: 120,
      minAgeSeconds: 0,
    });
    await createScoreAttemptRecord({ claims, noteCount: requirements?.noteCount ?? 0 });
    await updateScoreAttemptProgress({
      nonce: claims.nonce,
      userId: claims.sub,
      trackId: 'sunshine',
      progress: 1,
      furthestNoteIndex: requirements?.noteCount ?? 0,
    });
    await updateScoreAttemptProgress({
      nonce: claims.nonce,
      userId: claims.sub,
      trackId: 'sunshine',
      progress: 1,
      furthestNoteIndex: requirements?.noteCount ?? 0,
    });

    const response = await POST(makeReq({
      mode: 'runner',
      trackId: 'sunshine',
      score: limits?.maxScore ?? 1,
      coins: limits?.maxCombo ?? 1,
      sessionToken: token,
    }));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json).toEqual({ success: false, error: 'runner_score_verification_unavailable' });
  });
});
