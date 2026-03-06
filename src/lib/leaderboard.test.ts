import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { getTopScores, resetLeaderboardForTests, submitScore } from '@/lib/leaderboard';

const ORIGINAL_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIGINAL_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

describe.sequential('leaderboard', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetLeaderboardForTests();
  });

  afterAll(() => {
    if (ORIGINAL_REDIS_URL) process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_REDIS_URL;
    else delete process.env.UPSTASH_REDIS_REST_URL;

    if (ORIGINAL_REDIS_TOKEN) process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_REDIS_TOKEN;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;

    resetLeaderboardForTests();
  });

  it('keeps only the best run per user on the same runner board', async () => {
    await submitScore({
      mode: 'runner',
      trackId: 'luwan-house',
      userId: 'user-1',
      displayName: 'nova',
      score: 1100,
      coins: 12,
    });

    await submitScore({
      mode: 'runner',
      trackId: 'luwan-house',
      userId: 'user-1',
      displayName: 'nova',
      score: 900,
      coins: 20,
    });

    await submitScore({
      mode: 'runner',
      trackId: 'luwan-house',
      userId: 'user-1',
      displayName: 'nova',
      score: 1500,
      coins: 18,
    });

    const top = await getTopScores('runner', 10, 'luwan-house');
    expect(top).toHaveLength(1);
    expect(top[0]?.score).toBe(1500);
    expect(top[0]?.coins).toBe(18);
    expect(top[0]?.displayName).toBe('nova');
    expect(top[0]?.trackId).toBe('luwan-house');
  });

  it('partitions runner leaderboards by track', async () => {
    await submitScore({
      mode: 'runner',
      trackId: 'luwan-house',
      userId: 'user-1',
      displayName: 'nova',
      score: 1200,
    });

    await submitScore({
      mode: 'runner',
      trackId: 'sunshine',
      userId: 'user-2',
      displayName: 'echo',
      score: 2200,
    });

    const luwanTop = await getTopScores('runner', 10, 'luwan-house');
    const sunshineTop = await getTopScores('runner', 10, 'sunshine');

    expect(luwanTop).toHaveLength(1);
    expect(luwanTop[0]?.displayName).toBe('nova');
    expect(luwanTop[0]?.trackId).toBe('luwan-house');

    expect(sunshineTop).toHaveLength(1);
    expect(sunshineTop[0]?.displayName).toBe('echo');
    expect(sunshineTop[0]?.trackId).toBe('sunshine');
  });
});
