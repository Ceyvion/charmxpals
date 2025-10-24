import { v4 as uuid } from 'uuid';
import type { Redis } from '@upstash/redis';

import { getRedis } from '@/lib/redis';
import { hashClaimCode } from '@/lib/crypto';
import type { Repo, User, Character, PhysicalUnit, ClaimChallenge } from './repo';
import { characterLore } from '@/data/characterLore';

const PREFIX = 'charmxpals';
export const redisKeys = {
  seeded: `${PREFIX}:seeded`,
  users: `${PREFIX}:users`,
  userByEmail: `${PREFIX}:user:email`,
  userByHandle: `${PREFIX}:user:handle`,
  characters: `${PREFIX}:characters`,
  characterSets: `${PREFIX}:characterSets`,
  units: `${PREFIX}:units`,
  unitByCodeHash: `${PREFIX}:unit:code`,
  ownershipsPrefix: `${PREFIX}:ownerships`,
  challenges: `${PREFIX}:challenges`,
  abuse: `${PREFIX}:abuse`,
} as const;

const KEYS = redisKeys;

type StoredUser = User & { createdAt: string; updatedAt: string };
type StoredCharacter = Character & { createdAt: string; order: number };
type StoredUnit = Omit<PhysicalUnit, 'claimedAt'> & { createdAt: string; claimedAt: string | null };
type StoredOwnership = { id: string; userId: string; characterId: string; source: string; cosmetics: string[]; createdAt: string };
type StoredChallenge = Omit<ClaimChallenge, 'expiresAt'> & { createdAt: string; expiresAt: string };

const redis = getRedis();

let readyPromise: Promise<void> | null = null;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = seedIfNeeded(redis).catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  await readyPromise;
}

async function seedIfNeeded(client: Redis): Promise<void> {
  const alreadySeeded = (await client.get(KEYS.seeded)) as string | null;
  if (alreadySeeded) return;

  const secret = process.env.CODE_HASH_SECRET;
  if (!secret) {
    throw new Error('CODE_HASH_SECRET missing; required for Redis persistence.');
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const rosterSetId = uuid();
  const rosterSetSlug = 'dance-across-dimensions';
  const rosterSetName = 'Dance Across Dimensions';

  const characters: Array<{ data: Character; order: number }> = characterLore.map((entry, idx) => {
    const artRefs = entry.artRefs && Object.keys(entry.artRefs).length > 0
      ? entry.artRefs
      : { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' };
    return {
      order: entry.order ?? idx + 1,
      data: {
        id: uuid(),
        setId: rosterSetId,
        name: entry.name,
        description: entry.description,
        rarity: entry.rarity,
        stats: entry.stats,
        artRefs,
        codeSeries: entry.series,
        slug: entry.slug,
        realm: entry.realm,
        color: entry.color,
        title: entry.title,
        vibe: entry.vibe,
        danceStyle: entry.danceStyle,
        coreCharm: entry.coreCharm,
        personality: entry.personality,
        tagline: entry.tagline,
      },
    };
  });

  const secureSalt = 'super-secret-salt';
  const sampleUnits = [
    { code: 'CHARM-XPAL-001', series: 'Red Dash' },
    { code: 'CHARM-XPAL-002', series: 'Blue Dash' },
    { code: 'CHARM-XPAL-003', series: 'Pink Dash' },
  ];

  const units: StoredUnit[] = sampleUnits.reduce<StoredUnit[]>((acc, { code, series }) => {
    const characterEntry = characters.find((entry) => entry.data.codeSeries === series);
    if (!characterEntry) return acc;
    acc.push({
      id: uuid(),
      characterId: characterEntry.data.id,
      codeHash: hashClaimCode(code, secret),
      secureSalt,
      status: 'available',
      claimedBy: null,
      claimedAt: null,
      createdAt: nowIso,
    });
    return acc;
  }, []);

  const characterEntries = characters.map(({ data, order }) => [
    data.id,
    JSON.stringify({ ...data, createdAt: nowIso, order }),
  ] as const);

  if (characterEntries.length) {
    await client.hset(KEYS.characters, Object.fromEntries(characterEntries));
  }

  await client.hset(KEYS.characterSets, {
    [rosterSetSlug]: JSON.stringify({ id: rosterSetId, name: rosterSetName }),
  });

  for (const unit of units) {
    await client.hset(KEYS.units, { [unit.id]: JSON.stringify(unit) });
    await client.hset(KEYS.unitByCodeHash, { [unit.codeHash]: unit.id });
  }

  await client.set(KEYS.seeded, nowIso);
}

function ownershipKey(userId: string): string {
  return `${KEYS.ownershipsPrefix}:${userId}`;
}

function parseJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') {
    return value as T;
  }
  return null;
}

async function readUser(id: string): Promise<User | null> {
  const raw = await redis.hget(KEYS.users, id);
  const stored = parseJson<StoredUser>(raw);
  if (!stored) return null;
  return { id: stored.id, email: stored.email, handle: stored.handle ?? null };
}

function parseUnit(raw: unknown): PhysicalUnit | null {
  const stored = parseJson<StoredUnit>(raw);
  if (!stored) return null;
  return {
    id: stored.id,
    characterId: stored.characterId,
    codeHash: stored.codeHash,
    secureSalt: stored.secureSalt,
    status: stored.status,
    claimedBy: stored.claimedBy,
    claimedAt: stored.claimedAt ? new Date(stored.claimedAt) : null,
  };
}

function parseChallenge(raw: unknown): ClaimChallenge | null {
  const stored = parseJson<StoredChallenge>(raw);
  if (!stored) return null;
  return {
    id: stored.id,
    codeHash: stored.codeHash,
    nonce: stored.nonce,
    timestamp: stored.timestamp,
    challengeDigest: stored.challengeDigest,
    expiresAt: new Date(stored.expiresAt),
    consumed: stored.consumed,
  };
}

function toCharacter(raw: unknown): Character | null {
  const stored = parseJson<StoredCharacter>(raw);
  if (!stored) return null;
  return {
    id: stored.id,
    setId: stored.setId,
    name: stored.name,
    description: stored.description,
    rarity: stored.rarity,
    stats: stored.stats,
    artRefs: stored.artRefs ?? {},
    codeSeries: stored.codeSeries ?? null,
    slug: stored.slug ?? null,
    realm: stored.realm ?? null,
    color: stored.color ?? null,
    title: stored.title ?? null,
    vibe: stored.vibe ?? null,
    danceStyle: stored.danceStyle ?? null,
    coreCharm: stored.coreCharm ?? null,
    personality: stored.personality ?? null,
    tagline: stored.tagline ?? null,
  };
}

export const repoRedis: Repo = {
  kind: 'redis',
  async upsertDevUser({ handle, email }) {
    await ensureReady();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedHandle = handle.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    const existingId = (await redis.hget(KEYS.userByEmail, normalizedEmail)) as string | null;

    if (existingId) {
      const userRaw = await redis.hget(KEYS.users, existingId);
      if (!userRaw) {
        await redis.hdel(KEYS.userByEmail, normalizedEmail);
        return repoRedis.upsertDevUser({ handle, email });
      }

      const stored = parseJson<StoredUser>(userRaw);
      if (!stored) {
        await redis.hdel(KEYS.userByEmail, normalizedEmail);
        return repoRedis.upsertDevUser({ handle, email });
      }
      if (stored.handle && stored.handle.toLowerCase() !== normalizedHandle) {
        await redis.hdel(KEYS.userByHandle, stored.handle.toLowerCase());
      }
      stored.handle = handle;
      stored.updatedAt = nowIso;
      await redis.hset(KEYS.users, { [stored.id]: JSON.stringify(stored) });
      if (handle) {
        await redis.hset(KEYS.userByHandle, { [normalizedHandle]: stored.id });
      }
      return { id: stored.id, email: stored.email, handle: stored.handle };
    }

    const userId = uuid();
    const newUser: StoredUser = {
      id: userId,
      email,
      handle,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await redis.hset(KEYS.users, { [userId]: JSON.stringify(newUser) });
    await redis.hset(KEYS.userByEmail, { [normalizedEmail]: userId });
    if (handle) {
      await redis.hset(KEYS.userByHandle, { [normalizedHandle]: userId });
    }

    return { id: userId, email, handle } satisfies User;
  },

  async getUserById(id) {
    await ensureReady();
    return readUser(id);
  },

  async getUserByHandle(handle) {
    await ensureReady();
    if (!handle) return null;
    const normalized = handle.trim().toLowerCase();
    if (!normalized) return null;
    const userId = (await redis.hget(KEYS.userByHandle, normalized)) as string | null;
    if (!userId) return null;
    return readUser(userId);
  },

  async createChallenge({ codeHash, nonce, timestamp, challengeDigest, expiresAt }) {
    await ensureReady();
    const id = uuid();
    const stored: StoredChallenge = {
      id,
      codeHash,
      nonce,
      timestamp,
      challengeDigest,
      expiresAt: expiresAt.toISOString(),
      consumed: false,
      createdAt: new Date().toISOString(),
    };
    await redis.hset(KEYS.challenges, { [id]: JSON.stringify(stored) });
    return {
      id,
      codeHash,
      nonce,
      timestamp,
      challengeDigest,
      expiresAt,
      consumed: false,
    } satisfies ClaimChallenge;
  },

  async getChallengeById(id) {
    await ensureReady();
    const raw = await redis.hget(KEYS.challenges, id);
    return parseChallenge(raw);
  },

  async consumeChallenge(id) {
    await ensureReady();
    const raw = await redis.hget(KEYS.challenges, id);
    if (!raw) return;
    const stored = parseJson<StoredChallenge>(raw);
    if (!stored) return;
    stored.consumed = true;
    await redis.hset(KEYS.challenges, { [id]: JSON.stringify(stored) });
  },

  async findUnitByCodeHash(codeHash) {
    await ensureReady();
    const unitId = (await redis.hget(KEYS.unitByCodeHash, codeHash)) as string | null;
    if (!unitId) return null;
    const raw = await redis.hget(KEYS.units, unitId);
    return parseUnit(raw);
  },

  async claimUnitAndCreateOwnership({ unitId, userId }) {
    await ensureReady();
    const raw = await redis.hget(KEYS.units, unitId);
    if (!raw) throw new Error('Unit not found');
    const stored = parseJson<StoredUnit>(raw);
    if (!stored) throw new Error('Unit not found');
    if (stored.status !== 'available') {
      throw new Error('Unit no longer available');
    }

    stored.status = 'claimed';
    stored.claimedBy = userId;
    const claimedAtIso = new Date().toISOString();
    stored.claimedAt = claimedAtIso;

    await redis.hset(KEYS.units, { [unitId]: JSON.stringify(stored) });

    const ownership: StoredOwnership = {
      id: uuid(),
      userId,
      characterId: stored.characterId,
      source: 'claim',
      cosmetics: [],
      createdAt: claimedAtIso,
    };

    await redis.lpush(ownershipKey(userId), JSON.stringify(ownership));

    return { characterId: stored.characterId };
  },

  async listOwnershipsByUser(userId) {
    await ensureReady();
    const items = (await redis.lrange(ownershipKey(userId), 0, -1)) as string[] | null;
    return (items || []).map((entry) => {
      const parsed = JSON.parse(entry) as StoredOwnership;
      return {
        id: parsed.id,
        userId: parsed.userId,
        characterId: parsed.characterId,
        source: parsed.source,
        cosmetics: parsed.cosmetics,
        createdAt: new Date(parsed.createdAt),
      };
    });
  },

  async getCharacterById(id) {
    await ensureReady();
    const raw = await redis.hget(KEYS.characters, id);
    return toCharacter(raw);
  },

  async listCharacters(params) {
    await ensureReady();
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;

    const raw = await redis.hvals(KEYS.characters);
    const parsed = (raw || [])
      .map((entry: unknown) => parseJson<StoredCharacter>(entry))
      .filter((entry: StoredCharacter | null): entry is StoredCharacter => Boolean(entry));
    parsed.sort((a: StoredCharacter, b: StoredCharacter) => {
      const orderA = typeof a.order === 'number' ? a.order : 0;
      const orderB = typeof b.order === 'number' ? b.order : 0;
      return orderA - orderB;
    });
    return parsed.slice(offset, offset + limit).map((character: StoredCharacter) => ({
      id: character.id,
      setId: character.setId,
      name: character.name,
      description: character.description,
      rarity: character.rarity,
      stats: character.stats,
      artRefs: character.artRefs ?? {},
      codeSeries: character.codeSeries ?? null,
      slug: character.slug ?? null,
      realm: character.realm ?? null,
      color: character.color ?? null,
      title: character.title ?? null,
      vibe: character.vibe ?? null,
      danceStyle: character.danceStyle ?? null,
      coreCharm: character.coreCharm ?? null,
      personality: character.personality ?? null,
      tagline: character.tagline ?? null,
    } satisfies Character));
  },

  async logAbuse({ type, actorRef, metadata }) {
    await ensureReady();
    const entry = {
      id: uuid(),
      type,
      actorRef,
      metadata,
      createdAt: new Date().toISOString(),
    };
    await redis.lpush(KEYS.abuse, JSON.stringify(entry));
  },
};
