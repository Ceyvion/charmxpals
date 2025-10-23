import { v4 as uuid } from 'uuid';
import type { Redis } from '@upstash/redis';

import { getRedis } from '@/lib/redis';
import { hashClaimCode } from '@/lib/crypto';
import type { Repo, User, Character, PhysicalUnit, ClaimChallenge } from './repo';

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
type StoredUnit = PhysicalUnit & { createdAt: string; claimedAt: string | null };
type StoredOwnership = { id: string; userId: string; characterId: string; source: string; cosmetics: string[]; createdAt: string };
type StoredChallenge = ClaimChallenge & { createdAt: string; expiresAt: string };

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
  const alreadySeeded = await client.get<string | null>(KEYS.seeded);
  if (alreadySeeded) return;

  const secret = process.env.CODE_HASH_SECRET;
  if (!secret) {
    throw new Error('CODE_HASH_SECRET missing; required for Redis persistence.');
  }

  const now = new Date();
  const nowIso = now.toISOString();

  const fantasySetId = uuid();
  const elementalSetId = uuid();

  const characters: Array<{ data: Character; order: number }> = [
    {
      order: 1,
      data: {
        id: uuid(),
        setId: fantasySetId,
        name: 'Blaze the Dragon',
        description: 'A fierce fire-breathing dragon with incredible speed and agility.',
        rarity: 5,
        stats: { strength: 85, speed: 92, intelligence: 78, defense: 80 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 2,
      data: {
        id: uuid(),
        setId: fantasySetId,
        name: 'Frost Wolf',
        description: 'A cunning wolf with ice-blue fur and razor-sharp claws.',
        rarity: 4,
        stats: { strength: 78, speed: 88, intelligence: 85, defense: 82 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 3,
      data: {
        id: uuid(),
        setId: elementalSetId,
        name: 'Tidal Serpent',
        description: 'A massive sea serpent that commands the power of the ocean.',
        rarity: 5,
        stats: { strength: 90, speed: 75, intelligence: 88, defense: 85 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 4,
      data: {
        id: uuid(),
        setId: fantasySetId,
        name: 'Volt Lynx',
        description: 'Crackling with static speed.',
        rarity: 4,
        stats: { strength: 70, speed: 95, intelligence: 82, defense: 60 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 5,
      data: {
        id: uuid(),
        setId: fantasySetId,
        name: 'Terra Golem',
        description: 'Unshakable mountain defender.',
        rarity: 3,
        stats: { strength: 88, speed: 40, intelligence: 65, defense: 95 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 6,
      data: {
        id: uuid(),
        setId: fantasySetId,
        name: 'Aero Falcon',
        description: 'Master of the jetstream.',
        rarity: 4,
        stats: { strength: 68, speed: 97, intelligence: 70, defense: 55 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 7,
      data: {
        id: uuid(),
        setId: fantasySetId,
        name: 'Shadow Mantis',
        description: 'Silent strikes from the dark.',
        rarity: 5,
        stats: { strength: 85, speed: 90, intelligence: 90, defense: 70 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 8,
      data: {
        id: uuid(),
        setId: elementalSetId,
        name: 'Crystal Nymph',
        description: 'Prism magic and light bends.',
        rarity: 3,
        stats: { strength: 55, speed: 72, intelligence: 93, defense: 61 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 9,
      data: {
        id: uuid(),
        setId: elementalSetId,
        name: 'Pyro Beetle',
        description: 'Molten armor, blazing trail.',
        rarity: 4,
        stats: { strength: 82, speed: 70, intelligence: 68, defense: 74 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 10,
      data: {
        id: uuid(),
        setId: elementalSetId,
        name: 'Storm Leviathan',
        description: 'Tidal thunder reign.',
        rarity: 5,
        stats: { strength: 92, speed: 78, intelligence: 84, defense: 88 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 11,
      data: {
        id: uuid(),
        setId: elementalSetId,
        name: 'Quartz Sentinel',
        description: 'Shards of unbreakable will.',
        rarity: 3,
        stats: { strength: 76, speed: 55, intelligence: 72, defense: 89 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 12,
      data: {
        id: uuid(),
        setId: elementalSetId,
        name: 'Vine Warden',
        description: 'Roots that never yield.',
        rarity: 4,
        stats: { strength: 79, speed: 64, intelligence: 77, defense: 83 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 13,
      data: {
        id: uuid(),
        setId: fantasySetId,
        name: 'Nova Kitsune',
        description: 'Starlit trickster fox.',
        rarity: 5,
        stats: { strength: 81, speed: 93, intelligence: 94, defense: 66 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 14,
      data: {
        id: uuid(),
        setId: fantasySetId,
        name: 'Aurora Stag',
        description: 'Dawnsong guardian.',
        rarity: 4,
        stats: { strength: 75, speed: 82, intelligence: 80, defense: 72 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
    {
      order: 15,
      data: {
        id: uuid(),
        setId: fantasySetId,
        name: 'Obsidian Panther',
        description: 'Night-glass hunter.',
        rarity: 5,
        stats: { strength: 88, speed: 94, intelligence: 76, defense: 69 },
        artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
      },
    },
  ];

  const secureSalt = 'super-secret-salt';

  const units: StoredUnit[] = [
    {
      id: uuid(),
      characterId: characters[0]?.data.id ?? '',
      codeHash: hashClaimCode('CHARM-XPAL-001', secret),
      secureSalt,
      status: 'available',
      claimedBy: null,
      claimedAt: null,
      createdAt: nowIso,
    },
    {
      id: uuid(),
      characterId: characters[1]?.data.id ?? '',
      codeHash: hashClaimCode('CHARM-XPAL-002', secret),
      secureSalt,
      status: 'available',
      claimedBy: null,
      claimedAt: null,
      createdAt: nowIso,
    },
    {
      id: uuid(),
      characterId: characters[2]?.data.id ?? '',
      codeHash: hashClaimCode('CHARM-XPAL-003', secret),
      secureSalt,
      status: 'available',
      claimedBy: null,
      claimedAt: null,
      createdAt: nowIso,
    },
  ];

  const characterEntries = characters.map(({ data, order }) => [
    data.id,
    JSON.stringify({ ...data, createdAt: nowIso, order }),
  ] as const);

  if (characterEntries.length) {
    await client.hset(KEYS.characters, Object.fromEntries(characterEntries));
  }

  for (const unit of units) {
    await client.hset(KEYS.units, { [unit.id]: JSON.stringify(unit) });
    await client.hset(KEYS.unitByCodeHash, { [unit.codeHash]: unit.id });
  }

  await client.set(KEYS.seeded, nowIso);
}

function ownershipKey(userId: string): string {
  return `${KEYS.ownershipsPrefix}:${userId}`;
}

async function readUser(id: string): Promise<User | null> {
  const raw = await redis.hget<string>(KEYS.users, id);
  if (!raw) return null;
  const stored = JSON.parse(raw) as StoredUser;
  return { id: stored.id, email: stored.email, handle: stored.handle ?? null };
}

function parseUnit(raw: string | null): PhysicalUnit | null {
  if (!raw) return null;
  const stored = JSON.parse(raw) as StoredUnit;
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

function parseChallenge(raw: string | null): ClaimChallenge | null {
  if (!raw) return null;
  const stored = JSON.parse(raw) as StoredChallenge;
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

function toCharacter(raw: string | null): Character | null {
  if (!raw) return null;
  const stored = JSON.parse(raw) as StoredCharacter;
  return {
    id: stored.id,
    setId: stored.setId,
    name: stored.name,
    description: stored.description,
    rarity: stored.rarity,
    stats: stored.stats,
    artRefs: stored.artRefs,
  };
}

export const repoRedis: Repo = {
  kind: 'redis',
  async upsertDevUser({ handle, email }) {
    await ensureReady();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedHandle = handle.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    const existingId = await redis.hget<string>(KEYS.userByEmail, normalizedEmail);

    if (existingId) {
      const userRaw = await redis.hget<string>(KEYS.users, existingId);
      if (!userRaw) {
        await redis.hdel(KEYS.userByEmail, normalizedEmail);
        return repoRedis.upsertDevUser({ handle, email });
      }

      const stored = JSON.parse(userRaw) as StoredUser;
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
    const userId = await redis.hget<string>(KEYS.userByHandle, normalized);
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
    const raw = await redis.hget<string>(KEYS.challenges, id);
    return parseChallenge(raw);
  },

  async consumeChallenge(id) {
    await ensureReady();
    const raw = await redis.hget<string>(KEYS.challenges, id);
    if (!raw) return;
    const stored = JSON.parse(raw) as StoredChallenge;
    stored.consumed = true;
    await redis.hset(KEYS.challenges, { [id]: JSON.stringify(stored) });
  },

  async findUnitByCodeHash(codeHash) {
    await ensureReady();
    const unitId = await redis.hget<string>(KEYS.unitByCodeHash, codeHash);
    if (!unitId) return null;
    const raw = await redis.hget<string>(KEYS.units, unitId);
    return parseUnit(raw);
  },

  async claimUnitAndCreateOwnership({ unitId, userId }) {
    await ensureReady();
    const raw = await redis.hget<string>(KEYS.units, unitId);
    if (!raw) throw new Error('Unit not found');
    const stored = JSON.parse(raw) as StoredUnit;
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
    const items = await redis.lrange<string[]>(ownershipKey(userId), 0, -1);
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
    const raw = await redis.hget<string>(KEYS.characters, id);
    return toCharacter(raw);
  },

  async listCharacters(params) {
    await ensureReady();
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;

    const raw = await redis.hvals<string[]>(KEYS.characters);
    const parsed = (raw || []).map((entry) => JSON.parse(entry) as StoredCharacter);
    parsed.sort((a, b) => b.order - a.order);
    return parsed.slice(offset, offset + limit).map((character) => ({
      id: character.id,
      setId: character.setId,
      name: character.name,
      description: character.description,
      rarity: character.rarity,
      stats: character.stats,
      artRefs: character.artRefs,
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
