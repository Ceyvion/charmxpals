import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createScoreAttemptRecord,
  createScoreSession,
  getRunnerAttemptRequirements,
  getRunnerScoreLimits,
  getScoreAttemptRecord,
  resetScoreAttemptStoreForTests,
  updateScoreAttemptProgress,
  validateRunnerScoreAttempt,
  verifyScoreSession,
} from '@/lib/scoreSession';

const ORIGINAL_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIGINAL_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ORIGINAL_CODE_HASH_SECRET = process.env.CODE_HASH_SECRET;

describe('scoreSession', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.CODE_HASH_SECRET = ORIGINAL_CODE_HASH_SECRET || 'test-secret';
    resetScoreAttemptStoreForTests();
  });

  afterAll(() => {
    if (ORIGINAL_REDIS_URL) process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_REDIS_URL;
    else delete process.env.UPSTASH_REDIS_REST_URL;

    if (ORIGINAL_REDIS_TOKEN) process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_REDIS_TOKEN;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;

    if (ORIGINAL_CODE_HASH_SECRET) process.env.CODE_HASH_SECRET = ORIGINAL_CODE_HASH_SECRET;
    else delete process.env.CODE_HASH_SECRET;

    resetScoreAttemptStoreForTests();
  });

  it('creates and verifies a runner score session token', () => {
    const { token, claims } = createScoreSession({
      userId: 'user-1',
      mode: 'runner',
      trackId: 'luwan-house',
      ttlSeconds: 120,
      minAgeSeconds: 30,
    });

    const parsed = verifyScoreSession(token);
    expect(parsed).not.toBeNull();
    expect(parsed?.sub).toBe('user-1');
    expect(parsed?.trackId).toBe('luwan-house');
    expect(parsed?.mode).toBe('runner');
    expect(parsed?.nonce).toBe(claims.nonce);
  });

  it('computes runner score ceilings from track notes', () => {
    const limits = getRunnerScoreLimits('sunshine');
    expect(limits).not.toBeNull();
    expect(limits?.maxCombo).toBeGreaterThan(1000);
    expect(limits?.maxScore).toBeGreaterThan(1_000_000);
  });

  it('tracks runner attempt progress on the server-owned attempt record', async () => {
    const requirements = getRunnerAttemptRequirements('luwan-house');
    expect(requirements).not.toBeNull();

    const { claims } = createScoreSession({
      userId: 'user-1',
      mode: 'runner',
      trackId: 'luwan-house',
      ttlSeconds: 120,
      minAgeSeconds: requirements?.minAgeSeconds,
    });

    await createScoreAttemptRecord({
      claims,
      noteCount: requirements?.noteCount ?? 0,
    });

    await updateScoreAttemptProgress({
      nonce: claims.nonce,
      userId: 'user-1',
      trackId: 'luwan-house',
      progress: 0.42,
      furthestNoteIndex: 420,
    });
    await updateScoreAttemptProgress({
      nonce: claims.nonce,
      userId: 'user-1',
      trackId: 'luwan-house',
      progress: 0.91,
      furthestNoteIndex: 930,
    });

    const attempt = await getScoreAttemptRecord(claims.nonce);
    expect(attempt).not.toBeNull();
    expect(attempt?.maxProgress).toBe(0.91);
    expect(attempt?.maxNoteIndex).toBe(930);
    expect(attempt?.checkpointCount).toBe(2);
  });

  it('requires tracked progress before accepting high runner scores', async () => {
    const requirements = getRunnerAttemptRequirements('sunshine');
    const limits = getRunnerScoreLimits('sunshine');
    expect(requirements).not.toBeNull();
    expect(limits).not.toBeNull();

    const { claims } = createScoreSession({
      userId: 'user-1',
      mode: 'runner',
      trackId: 'sunshine',
      ttlSeconds: 120,
      minAgeSeconds: requirements?.minAgeSeconds,
    });

    await createScoreAttemptRecord({
      claims,
      noteCount: requirements?.noteCount ?? 0,
    });

    await updateScoreAttemptProgress({
      nonce: claims.nonce,
      userId: 'user-1',
      trackId: 'sunshine',
      progress: 0.22,
      furthestNoteIndex: 220,
    });

    const incomplete = await getScoreAttemptRecord(claims.nonce);
    expect(validateRunnerScoreAttempt(incomplete, limits, Math.floor((limits?.maxScore ?? 0) * 0.95))).toBe(false);

    await updateScoreAttemptProgress({
      nonce: claims.nonce,
      userId: 'user-1',
      trackId: 'sunshine',
      progress: 0.96,
      furthestNoteIndex: requirements?.noteCount ?? 0,
    });

    const complete = await getScoreAttemptRecord(claims.nonce);
    expect(validateRunnerScoreAttempt(complete, limits, Math.floor((limits?.maxScore ?? 0) * 0.95))).toBe(true);
  });
});
