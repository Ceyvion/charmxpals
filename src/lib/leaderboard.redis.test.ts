import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeRedis {
  hashes = new Map<string, Map<string, string>>();
  zsets = new Map<string, Map<string, number>>();
  expirations = new Map<string, number>();

  async eval(_lua: string, keys: string[], args: string[]) {
    const [zsetKey, hashKey] = keys;
    const [memberKey, entryJson, scoreRaw, coinsRaw, ttlRaw, maxEntriesRaw] = args;
    const score = Number(scoreRaw || 0);
    const coins = Number(coinsRaw || -1);
    const ttl = Number(ttlRaw || 0);
    const maxEntries = Number(maxEntriesRaw || 100);

    const hash = this.hashes.get(hashKey) ?? new Map<string, string>();
    const existingRaw = hash.get(memberKey) ?? null;
    if (existingRaw) {
      const existing = JSON.parse(existingRaw) as { score?: number; coins?: number };
      const existingScore = Number(existing.score ?? 0);
      const existingCoins = Number(existing.coins ?? -1);
      const improved = score !== existingScore ? score > existingScore : coins > existingCoins;
      if (!improved) {
        return [0, existingRaw];
      }
    }

    hash.set(memberKey, entryJson);
    this.hashes.set(hashKey, hash);

    const zset = this.zsets.get(zsetKey) ?? new Map<string, number>();
    zset.set(memberKey, score);
    this.zsets.set(zsetKey, zset);

    this.expirations.set(zsetKey, ttl);
    this.expirations.set(hashKey, ttl);

    if (zset.size > maxEntries) {
      const overflow = [...zset.entries()]
        .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
        .slice(0, zset.size - maxEntries)
        .map(([member]) => member);
      for (const member of overflow) {
        zset.delete(member);
        hash.delete(member);
      }
    }

    return [1, entryJson];
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean; withScores?: boolean },
  ) {
    const zset = this.zsets.get(key) ?? new Map<string, number>();
    const sorted = [...zset.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
    const ordered = options?.rev ? [...sorted].reverse() : sorted;
    const slice = ordered.slice(start, stop === -1 ? undefined : stop + 1);
    if (options?.withScores) {
      return slice.map(([member, score]) => ({ member, score }));
    }
    return slice.map(([member]) => member);
  }

  async hmget(key: string, ...fields: string[]) {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    return fields.map((field) => hash.get(field) ?? null);
  }
}

let fakeRedis: FakeRedis;

vi.mock('@/lib/redis', () => ({
  getRedis: () => fakeRedis,
}));

describe.sequential('leaderboard redis path', () => {
  const ORIGINAL_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
  const ORIGINAL_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    vi.resetModules();
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    fakeRedis = new FakeRedis();
  });

  afterAll(() => {
    if (ORIGINAL_REDIS_URL) process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_REDIS_URL;
    else delete process.env.UPSTASH_REDIS_REST_URL;

    if (ORIGINAL_REDIS_TOKEN) process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_REDIS_TOKEN;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('keeps the best concurrent score for a user', async () => {
    const { submitScore, getTopScores, resetLeaderboardForTests } = await import('./leaderboard');
    resetLeaderboardForTests();

    await Promise.all([
      submitScore({
        mode: 'runner',
        trackId: 'luwan-house',
        userId: 'user-1',
        displayName: 'nova',
        score: 1200,
        coins: 12,
      }),
      submitScore({
        mode: 'runner',
        trackId: 'luwan-house',
        userId: 'user-1',
        displayName: 'nova',
        score: 1800,
        coins: 8,
      }),
    ]);

    const top = await getTopScores('runner', 10, 'luwan-house');
    expect(top).toHaveLength(1);
    expect(top[0]?.score).toBe(1800);
    expect(top[0]?.displayName).toBe('nova');
  });

  it('trims overflow members from both zset and hash state', async () => {
    const { submitScore, getTopScores, resetLeaderboardForTests } = await import('./leaderboard');
    resetLeaderboardForTests();

    for (let index = 0; index < 101; index += 1) {
      await submitScore({
        mode: 'runner',
        trackId: 'sunshine',
        userId: `user-${index}`,
        displayName: `user-${index}`,
        score: 1000 + index,
      });
    }

    const top = await getTopScores('runner', 200, 'sunshine');
    expect(top).toHaveLength(100);
    expect(top.some((entry) => entry.userId === 'user-0')).toBe(false);
    expect(top.some((entry) => entry.userId === 'user-100')).toBe(true);
  });
});
