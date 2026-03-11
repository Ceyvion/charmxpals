import { describe, it, expect, beforeEach, vi } from 'vitest';

class FakeRedis {
  strings = new Map<string, string>();
  hashes = new Map<string, Map<string, string>>();
  lists = new Map<string, string[]>();
  sets = new Map<string, Set<string>>();

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

  async hgetall(key: string) {
    const bucket = this.hashes.get(key);
    if (!bucket) return {};
    return Object.fromEntries(bucket.entries());
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

  async sadd(key: string, ...values: string[]) {
    const bucket = this.sets.get(key) ?? new Set<string>();
    for (const value of values) {
      bucket.add(String(value));
    }
    this.sets.set(key, bucket);
    return bucket.size;
  }

  async smembers(key: string) {
    return Array.from(this.sets.get(key) ?? []);
  }

  async eval(lua: string, keys: string[], args: string[]) {
    if (keys.length === 1) {
      const value = this.strings.get(keys[0]) ?? null;
      if (value !== null) this.strings.delete(keys[0]);
      return value;
    }

    if (keys.length === 2 && args.length === 0 && lua.includes('LRANGE')) {
      const [ownershipKey, charactersKey] = keys;
      const items = this.lists.get(ownershipKey) ?? [];
      const ownerships = items.map((item) => JSON.parse(item) as any);
      const result: string[] = [];
      for (const ownership of ownerships) {
        const characterRaw = this.hashes.get(charactersKey)?.get(ownership.characterId) ?? null;
        result.push(
          JSON.stringify({
            ownership,
            character: characterRaw ? JSON.parse(characterRaw) : null,
          }),
        );
      }
      return result;
    }

    if (keys.length === 6 && args.length === 5 && lua.includes('LPUSH')) {
      const [unitsKey, challengesKey, ownershipKey, charactersKey, ownershipCharacterKey, ownershipAvatarKey] = keys;
      const [unitId, challengeId, userId, claimedAtIso, ownershipId] = args;
      const unitRaw = this.hashes.get(unitsKey)?.get(unitId) ?? null;
      if (!unitRaw) return [0, 'unit_not_found'];
      const unit = JSON.parse(unitRaw) as any;
      if (unit.status !== 'available') return [0, 'unit_unavailable'];
      const challengeRaw = this.strings.get(`${challengesKey}:${challengeId}`) ?? this.hashes.get(challengesKey)?.get(challengeId) ?? null;
      if (!challengeRaw) return [0, 'challenge_not_found'];
      const challenge = JSON.parse(challengeRaw) as any;
      if (challenge.consumed) return [0, 'challenge_consumed'];

      this.strings.delete(`${challengesKey}:${challengeId}`);
      const challengeBucket = this.hashes.get(challengesKey);
      challengeBucket?.delete(challengeId);

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
      const characterSet = this.sets.get(ownershipCharacterKey) ?? new Set<string>();
      characterSet.add(unit.characterId);
      this.sets.set(ownershipCharacterKey, characterSet);
      if (avatarId) {
        const avatarSet = this.sets.get(ownershipAvatarKey) ?? new Set<string>();
        avatarSet.add(avatarId);
        this.sets.set(ownershipAvatarKey, avatarSet);
      }

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
    expect(storedChallengeRaw).toBeNull();

    const avatarIds = await repoRedis.listOwnedAvatarIdsByUser(userId);
    expect(avatarIds).toEqual(['neon-city']);

    const characterIds = await repoRedis.listOwnedCharacterIdsByUser?.(userId);
    expect(characterIds).toEqual(['char-1']);
  });

  it('hydrates ownerships with character records in list order', async () => {
    const { repoRedis, redisKeys } = await import('./repoRedis');

    await fakeRedis.set(redisKeys.seeded, new Date().toISOString());
    const nowIso = new Date().toISOString();
    const userId = 'user-2';
    const ownershipKey = `${redisKeys.ownershipsPrefix}:${userId}`;

    await fakeRedis.hset(redisKeys.characters, {
      'char-1': JSON.stringify({
        id: 'char-1',
        setId: 'set-1',
        name: 'Alpha',
        description: null,
        rarity: 3,
        stats: {},
        artRefs: {},
        slug: 'alpha',
        createdAt: nowIso,
        order: 1,
      }),
      'char-2': JSON.stringify({
        id: 'char-2',
        setId: 'set-1',
        name: 'Beta',
        description: null,
        rarity: 4,
        stats: {},
        artRefs: {},
        slug: 'beta',
        createdAt: nowIso,
        order: 2,
      }),
    });

    await fakeRedis.lpush(
      ownershipKey,
      JSON.stringify({
        id: 'own-older',
        userId,
        characterId: 'char-2',
        source: 'claim',
        cosmetics: [],
        createdAt: new Date('2026-03-10T10:00:00.000Z').toISOString(),
      }),
    );
    await fakeRedis.lpush(
      ownershipKey,
      JSON.stringify({
        id: 'own-newer',
        userId,
        characterId: 'char-1',
        source: 'claim',
        cosmetics: [],
        createdAt: new Date('2026-03-11T10:00:00.000Z').toISOString(),
      }),
    );

    const inventory = await repoRedis.listOwnershipsWithCharactersByUser?.(userId);
    expect(inventory).toHaveLength(2);
    expect(inventory?.[0]?.ownership.id).toBe('own-newer');
    expect(inventory?.[0]?.character?.name).toBe('Alpha');
    expect(inventory?.[1]?.ownership.id).toBe('own-older');
    expect(inventory?.[1]?.character?.name).toBe('Beta');
  });
});
