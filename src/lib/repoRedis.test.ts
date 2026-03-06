import { describe, it, expect, beforeEach, vi } from 'vitest';

class FakeRedis {
  strings = new Map<string, string>();
  hashes = new Map<string, Map<string, string>>();
  lists = new Map<string, string[]>();

  async get(key: string) {
    return this.strings.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.strings.set(key, String(value));
    return 'OK';
  }

  async del(key: string) {
    return this.strings.delete(key) ? 1 : 0;
  }

  async hget(key: string, field: string) {
    return this.hashes.get(key)?.get(field) ?? null;
  }

  async hset(key: string, data: Record<string, string>) {
    let bucket = this.hashes.get(key);
    if (!bucket) {
      bucket = new Map();
      this.hashes.set(key, bucket);
    }
    for (const [field, value] of Object.entries(data)) {
      bucket.set(field, String(value));
    }
    return Object.keys(data).length;
  }

  async hvals(key: string) {
    return Array.from(this.hashes.get(key)?.values() ?? []);
  }

  async lpush(key: string, value: string) {
    const list = this.lists.get(key) ?? [];
    list.unshift(String(value));
    this.lists.set(key, list);
    return list.length;
  }

  async lrange(key: string, start: number, stop: number) {
    const list = this.lists.get(key) ?? [];
    if (stop === -1) return list.slice(start);
    return list.slice(start, stop + 1);
  }

  async eval(lua: string, keys: string[], args: string[]) {
    if (keys.length === 1) {
      const value = this.strings.get(keys[0]) ?? null;
      if (value !== null) this.strings.delete(keys[0]);
      return value;
    }

    if (keys.length === 5 && args.length === 5 && lua.includes('LPUSH')) {
      const [unitsKey, challengesKey, ownershipKey, charactersKey, ownershipAvatarKey] = keys;
      const [unitId, challengeId, userId, claimedAtIso, ownershipId] = args;
      const unitRaw = this.hashes.get(unitsKey)?.get(unitId) ?? null;
      if (!unitRaw) return [0, 'unit_not_found'];
      const unit = JSON.parse(unitRaw) as any;
      if (unit.status !== 'available') return [0, 'unit_unavailable'];
      const challengeRaw = this.hashes.get(challengesKey)?.get(challengeId) ?? null;
      if (!challengeRaw) return [0, 'challenge_not_found'];
      const challenge = JSON.parse(challengeRaw) as any;
      if (challenge.consumed) return [0, 'challenge_consumed'];

      challenge.consumed = true;
      const challengeBucket = this.hashes.get(challengesKey)!;
      challengeBucket.set(challengeId, JSON.stringify(challenge));

      unit.status = 'claimed';
      unit.claimedBy = userId;
      unit.claimedAt = claimedAtIso;
      const unitBucket = this.hashes.get(unitsKey)!;
      unitBucket.set(unitId, JSON.stringify(unit));

      const characterRaw = this.hashes.get(charactersKey)?.get(unit.characterId) ?? null;
      const character = characterRaw ? (JSON.parse(characterRaw) as any) : null;
      const avatarId = typeof character?.slug === 'string' && character.slug.trim().length > 0
        ? character.slug.trim().toLowerCase()
        : null;
      const ownership = {
        id: ownershipId,
        userId,
        characterId: unit.characterId,
        source: 'claim',
        cosmetics: [],
        createdAt: claimedAtIso,
        avatarId,
      };
      const list = this.lists.get(ownershipKey) ?? [];
      list.unshift(JSON.stringify(ownership));
      this.lists.set(ownershipKey, list);
      this.strings.delete(ownershipAvatarKey);

      return [1, unit.characterId, claimedAtIso];
    }

    throw new Error('Unsupported eval script');
  }
}

let fakeRedis: FakeRedis;
vi.mock('@/lib/redis', () => ({
  getRedis: () => fakeRedis,
}));

describe('repoRedis atomic claim', () => {
  beforeEach(async () => {
    vi.resetModules();
    process.env.CODE_HASH_SECRET = 'test-secret';
    fakeRedis = new FakeRedis();
  });

  it('allows only one concurrent claim for the same challenge', async () => {
    const { repoRedis, redisKeys } = await import('./repoRedis');

    await fakeRedis.set(redisKeys.seeded, new Date().toISOString());
    const nowIso = new Date().toISOString();
    const unitId = 'unit-1';
    const challengeId = 'challenge-1';
    const userId = 'user-1';

    await fakeRedis.hset(redisKeys.units, {
      [unitId]: JSON.stringify({
        id: unitId,
        characterId: 'char-1',
        codeHash: 'hash-1',
        secureSalt: 'salt-1',
        status: 'available',
        claimedBy: null,
        claimedAt: null,
        createdAt: nowIso,
      }),
    });

    await fakeRedis.hset(redisKeys.challenges, {
      [challengeId]: JSON.stringify({
        id: challengeId,
        codeHash: 'hash-1',
        nonce: 'nonce',
        timestamp: '123',
        challengeDigest: 'digest',
        expiresAt: nowIso,
        userId,
        consumed: false,
        createdAt: nowIso,
      }),
    });
    await fakeRedis.hset(redisKeys.characters, {
      'char-1': JSON.stringify({
        id: 'char-1',
        setId: 'set-1',
        name: 'Test Character',
        description: null,
        rarity: 3,
        stats: {},
        artRefs: { sprite: '/assets/characters/neon-city/sprite.webp' },
        slug: 'neon-city',
        createdAt: nowIso,
        order: 1,
      }),
    });

    const results = await Promise.allSettled([
      repoRedis.claimUnitAndCreateOwnership({ unitId, userId, challengeId }),
      repoRedis.claimUnitAndCreateOwnership({ unitId, userId, challengeId }),
    ]);

    const successes = results.filter((result) => result.status === 'fulfilled');
    const failures = results.filter((result) => result.status === 'rejected');
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    const storedUnitRaw = await fakeRedis.hget(redisKeys.units, unitId);
    const storedUnit = storedUnitRaw ? JSON.parse(storedUnitRaw) : null;
    expect(storedUnit?.status).toBe('claimed');

    const storedChallengeRaw = await fakeRedis.hget(redisKeys.challenges, challengeId);
    const storedChallenge = storedChallengeRaw ? JSON.parse(storedChallengeRaw) : null;
    expect(storedChallenge?.consumed).toBe(true);
  });
});
