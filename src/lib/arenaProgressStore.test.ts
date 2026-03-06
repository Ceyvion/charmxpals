import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import {
  applyArenaProgressDelta,
  getArenaProgress,
  resetArenaProgressStoreForTests,
} from '@/lib/arenaProgressStore';

const ORIGINAL_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIGINAL_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ORIGINAL_CODE_HASH_SECRET = process.env.CODE_HASH_SECRET;

describe.sequential('arenaProgressStore', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.CODE_HASH_SECRET = ORIGINAL_CODE_HASH_SECRET || 'test-secret';
    resetArenaProgressStoreForTests();
  });

  afterAll(() => {
    if (ORIGINAL_REDIS_URL) process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_REDIS_URL;
    else delete process.env.UPSTASH_REDIS_REST_URL;

    if (ORIGINAL_REDIS_TOKEN) process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_REDIS_TOKEN;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;

    if (ORIGINAL_CODE_HASH_SECRET) process.env.CODE_HASH_SECRET = ORIGINAL_CODE_HASH_SECRET;
    else delete process.env.CODE_HASH_SECRET;

    resetArenaProgressStoreForTests();
  });

  it('increments daily arena progress on the server-owned store', async () => {
    const initial = await getArenaProgress('user-1', '2026-03-06');
    expect(initial.pulses).toBe(0);
    expect(initial.eliminations).toBe(0);
    expect(initial.matches).toBe(0);

    await applyArenaProgressDelta('user-1', { pulses: 1 }, '2026-03-06');
    await applyArenaProgressDelta('user-1', { eliminations: 1 }, '2026-03-06');
    const updated = await applyArenaProgressDelta('user-1', { matches: 1 }, '2026-03-06');

    expect(updated.dateKey).toBe('2026-03-06');
    expect(updated.pulses).toBe(1);
    expect(updated.eliminations).toBe(1);
    expect(updated.matches).toBe(1);
  });

  it('resets progress when the arena day rolls over', async () => {
    await applyArenaProgressDelta('user-1', { pulses: 1 }, '2026-03-06');

    const beforeReset = await getArenaProgress('user-1', '2026-03-06');
    expect(beforeReset.pulses).toBe(1);
    expect(beforeReset.dateKey).toBe('2026-03-06');

    const afterReset = await getArenaProgress('user-1', '2026-03-07');
    expect(afterReset.pulses).toBe(0);
    expect(afterReset.eliminations).toBe(0);
    expect(afterReset.matches).toBe(0);
    expect(afterReset.dateKey).toBe('2026-03-07');
  });
});
