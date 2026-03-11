import { randomBytes } from 'crypto';
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
  characterOrder: `${PREFIX}:character:order`,
  characterBySlug: `${PREFIX}:character:slug`,
  characterByNameSlug: `${PREFIX}:character:nameSlug`,
  characterByCodeSeries: `${PREFIX}:character:series`,
  characterIndexVersion: `${PREFIX}:character:indexVersion`,
  characterSets: `${PREFIX}:characterSets`,
  units: `${PREFIX}:units`,
  unitByCodeHash: `${PREFIX}:unit:code`,
  ownershipsPrefix: `${PREFIX}:ownerships`,
  ownershipCharacterIdsPrefix: `${PREFIX}:ownership:characterIds`,
  ownershipAvatarIdsPrefix: `${PREFIX}:ownership:avatarIds`,
  challenges: `${PREFIX}:challenges`,
  abuse: `${PREFIX}:abuse`,
} as const;

const KEYS = redisKeys;
const CHARACTER_INDEX_VERSION = '1';
const AVATAR_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SPRITE_PATH_RE = /\/assets\/characters\/([^/]+)\/sprite\.[a-z0-9]+(?:[?#].*)?$/i;

type StoredUser = User & { createdAt: string; updatedAt: string };
type StoredCharacter = Character & { createdAt: string; order: number };
type StoredUnit = Omit<PhysicalUnit, 'claimedAt'> & { createdAt: string; claimedAt: string | null };
type StoredOwnership = { id: string; userId: string; characterId: string; source: string; cosmetics: string[]; createdAt: string; avatarId?: string | null };
type StoredChallenge = Omit<ClaimChallenge, 'expiresAt'> & { createdAt: string; expiresAt: string };

const redis = getRedis();

let readyPromise: Promise<void> | null = null;
let characterIndexPromise: Promise<void> | null = null;

async function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = seedIfNeeded(redis).catch((error) => {
      readyPromise = null;
      throw error;
    });
  }
  await readyPromise;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toCharacterOrder(value: unknown): number {
  if (value && typeof value === 'object' && 'order' in value) {
    const orderValue = (value as { order?: unknown }).order;
    if (typeof orderValue === 'number' && Number.isFinite(orderValue)) return orderValue;
  }
  return 0;
}

async function rebuildCharacterIndexes(client: Redis): Promise<void> {
  const raw = await client.hvals(KEYS.characters);
  const parsed = (raw || [])
    .map((entry: unknown) => parseJson<StoredCharacter>(entry))
    .filter((entry: StoredCharacter | null): entry is StoredCharacter => Boolean(entry));

  parsed.sort((a: StoredCharacter, b: StoredCharacter) => toCharacterOrder(a) - toCharacterOrder(b));

  const orderedIds: string[] = [];
  const bySlug: Record<string, string> = {};
  const byNameSlug: Record<string, string> = {};
  const byCodeSeries: Record<string, string> = {};

  for (const character of parsed) {
    orderedIds.push(character.id);

    const slug = normalize(character.slug ?? '');
    if (slug && !bySlug[slug]) {
      bySlug[slug] = character.id;
    }

    const nameSlug = slugify(character.name);
    if (nameSlug && !byNameSlug[nameSlug]) {
      byNameSlug[nameSlug] = character.id;
    }

    const codeSeries = normalize(character.codeSeries ?? '');
    if (codeSeries && !byCodeSeries[codeSeries]) {
      byCodeSeries[codeSeries] = character.id;
    }
  }

  await client.del(KEYS.characterOrder);
  await client.del(KEYS.characterBySlug);
  await client.del(KEYS.characterByNameSlug);
  await client.del(KEYS.characterByCodeSeries);

  if (orderedIds.length > 0) {
    await client.rpush(KEYS.characterOrder, ...orderedIds);
  }
  if (Object.keys(bySlug).length > 0) {
    await client.hset(KEYS.characterBySlug, bySlug);
  }
  if (Object.keys(byNameSlug).length > 0) {
    await client.hset(KEYS.characterByNameSlug, byNameSlug);
  }
  if (Object.keys(byCodeSeries).length > 0) {
    await client.hset(KEYS.characterByCodeSeries, byCodeSeries);
  }

  await client.set(KEYS.characterIndexVersion, CHARACTER_INDEX_VERSION);
}

async function ensureCharacterIndexes(): Promise<void> {
  const currentVersion = (await redis.get(KEYS.characterIndexVersion)) as string | null;
  if (currentVersion === CHARACTER_INDEX_VERSION) return;

  if (!characterIndexPromise) {
    characterIndexPromise = rebuildCharacterIndexes(redis).finally(() => {
      characterIndexPromise = null;
    });
  }
  await characterIndexPromise;
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
      secureSalt: randomBytes(32).toString('hex'),
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

  const orderedIds = [...characters]
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.data.id);
  const slugIndex: Record<string, string> = {};
  const nameSlugIndex: Record<string, string> = {};
  const seriesIndex: Record<string, string> = {};

  for (const entry of [...characters].sort((a, b) => a.order - b.order)) {
    const id = entry.data.id;
    const normalizedSlug = normalize(entry.data.slug ?? '');
    if (normalizedSlug && !slugIndex[normalizedSlug]) {
      slugIndex[normalizedSlug] = id;
    }
    const nameSlug = slugify(entry.data.name);
    if (nameSlug && !nameSlugIndex[nameSlug]) {
      nameSlugIndex[nameSlug] = id;
    }
    const series = normalize(entry.data.codeSeries ?? '');
    if (series && !seriesIndex[series]) {
      seriesIndex[series] = id;
    }
  }

  if (orderedIds.length) {
    await client.rpush(KEYS.characterOrder, ...orderedIds);
  }
  if (Object.keys(slugIndex).length) {
    await client.hset(KEYS.characterBySlug, slugIndex);
  }
  if (Object.keys(nameSlugIndex).length) {
    await client.hset(KEYS.characterByNameSlug, nameSlugIndex);
  }
  if (Object.keys(seriesIndex).length) {
    await client.hset(KEYS.characterByCodeSeries, seriesIndex);
  }
  await client.set(KEYS.characterIndexVersion, CHARACTER_INDEX_VERSION);

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

function ownershipCharacterIdsKey(userId: string): string {
  return `${KEYS.ownershipCharacterIdsPrefix}:${userId}`;
}

function ownershipAvatarIdsKey(userId: string): string {
  return `${KEYS.ownershipAvatarIdsPrefix}:${userId}`;
}

function challengeKey(challengeId: string): string {
  return `${KEYS.challenges}:${challengeId}`;
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

function normalizeAvatarId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = normalize(value);
  if (!normalized) return null;
  return AVATAR_ID_RE.test(normalized) ? normalized : null;
}

function parseAvatarIdFromSpriteRef(spriteRef: unknown): string | null {
  if (typeof spriteRef !== 'string') return null;
  const trimmed = spriteRef.trim();
  if (!trimmed) return null;

  const directMatch = trimmed.match(SPRITE_PATH_RE);
  if (directMatch) return normalizeAvatarId(directMatch[1]);

  try {
    const url = new URL(trimmed);
    const pathMatch = url.pathname.match(SPRITE_PATH_RE);
    if (pathMatch) return normalizeAvatarId(pathMatch[1]);
  } catch {
    // Not an absolute URL; no-op.
  }

  return null;
}

function avatarIdFromCharacter(character: Character | null): string | null {
  if (!character) return null;
  return normalizeAvatarId(character.slug) ?? parseAvatarIdFromSpriteRef(character.artRefs?.sprite);
}

async function readUser(id: string): Promise<User | null> {
  const raw = await redis.hget(KEYS.users, id);
  return toUser(raw);
}

function toUser(raw: unknown): User | null {
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
    userId: stored.userId ?? null,
    consumed: stored.consumed,
    unitId: stored.unitId ?? null,
    secureSalt: stored.secureSalt ?? null,
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
      if ((stored.handle ?? '') === handle) {
        return { id: stored.id, email: stored.email, handle: stored.handle };
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
    const raw = await redis.eval(
      `
        local userId = redis.call("HGET", KEYS[1], ARGV[1])
        if not userId then return nil end
        return redis.call("HGET", KEYS[2], userId)
      `,
      [KEYS.userByHandle, KEYS.users],
      [normalized],
    );
    return toUser(raw);
  },

  async createChallenge({ codeHash, nonce, timestamp, challengeDigest, expiresAt, userId }) {
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
      userId: userId ?? null,
      unitId: null,
      secureSalt: null,
    };
    const ttlSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    await redis.set(challengeKey(id), JSON.stringify(stored), { ex: ttlSeconds });
    return {
      id,
      codeHash,
      nonce,
      timestamp,
      challengeDigest,
      expiresAt,
      userId: stored.userId ?? null,
      consumed: false,
      unitId: stored.unitId ?? null,
      secureSalt: stored.secureSalt ?? null,
    } satisfies ClaimChallenge;
  },

  async startClaimChallenge({ codeHash, userId, nonce, timestamp, expiresAt }) {
    await ensureReady();
    const id = uuid();
    const ttlSeconds = Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    const createdAt = new Date().toISOString();
    const result = (await redis.eval(
      `
        local unitId = redis.call("HGET", KEYS[1], ARGV[1])
        if not unitId then return {0, "not_found"} end
        local unit = redis.call("HGET", KEYS[2], unitId)
        if not unit then return {0, "not_found"} end
        local unitObj = cjson.decode(unit)
        if unitObj.status ~= "available" then return {0, "unavailable"} end

        local challengeObj = {
          id = ARGV[2],
          codeHash = ARGV[1],
          nonce = ARGV[3],
          timestamp = ARGV[4],
          challengeDigest = "",
          expiresAt = ARGV[5],
          userId = ARGV[6],
          consumed = false,
          createdAt = ARGV[7],
          unitId = unitId,
          secureSalt = unitObj.secureSalt
        }

        redis.call("SET", KEYS[3] .. ":" .. ARGV[2], cjson.encode(challengeObj), "EX", ARGV[8])
        return {1, unitId, unitObj.secureSalt}
      `,
      [KEYS.unitByCodeHash, KEYS.units, KEYS.challenges],
      [
        codeHash,
        id,
        nonce,
        timestamp,
        expiresAt.toISOString(),
        userId ?? '',
        createdAt,
        ttlSeconds.toString(),
      ],
    )) as Array<string | number>;

    if (Number(result?.[0]) !== 1) {
      return {
        ok: false as const,
        reason: String(result?.[1] ?? 'not_found') === 'unavailable' ? 'unavailable' : 'not_found',
      };
    }

    const secureSalt = String(result[2] ?? '');
    const challenge: ClaimChallenge = {
      id,
      codeHash,
      nonce,
      timestamp,
      challengeDigest: '',
      expiresAt,
      userId: userId ?? null,
      consumed: false,
      unitId: String(result[1] ?? ''),
      secureSalt,
    };
    return { ok: true as const, challenge, secureSalt };
  },

  async getChallengeById(id) {
    await ensureReady();
    const raw = (await redis.get(challengeKey(id))) ?? (await redis.hget(KEYS.challenges, id));
    return parseChallenge(raw);
  },

  async consumeChallenge(id) {
    await ensureReady();
    const challengeStorageKey = challengeKey(id);
    const raw = (await redis.get(challengeStorageKey)) ?? (await redis.hget(KEYS.challenges, id));
    if (!raw) return;
    const stored = parseJson<StoredChallenge>(raw);
    if (!stored) return;
    stored.consumed = true;
    const ttlSeconds = Math.max(1, Math.ceil((new Date(stored.expiresAt).getTime() - Date.now()) / 1000));
    await redis.set(challengeStorageKey, JSON.stringify(stored), { ex: ttlSeconds });
    await redis.hdel(KEYS.challenges, id);
  },

  async findUnitByCodeHash(codeHash) {
    await ensureReady();
    const raw = await redis.eval(
      `
        local unitId = redis.call("HGET", KEYS[1], ARGV[1])
        if not unitId then return nil end
        return redis.call("HGET", KEYS[2], unitId)
      `,
      [KEYS.unitByCodeHash, KEYS.units],
      [codeHash],
    );
    return parseUnit(raw);
  },

  async getUnitById(id) {
    await ensureReady();
    const raw = await redis.hget(KEYS.units, id);
    return parseUnit(raw);
  },

  async claimUnitAndCreateOwnership({ unitId, userId, challengeId }) {
    await ensureReady();
    const claimedAtIso = new Date().toISOString();
    const claimedAtDate = new Date(claimedAtIso);
    const userOwnershipKey = ownershipKey(userId);
    const userOwnershipCharacterIdsKey = ownershipCharacterIdsKey(userId);
    const userOwnershipAvatarIdsKey = ownershipAvatarIdsKey(userId);

    if (challengeId) {
      const ownershipId = uuid();
      const lua = `
        local unit = redis.call("HGET", KEYS[1], ARGV[1])
        if not unit then return {0, "unit_not_found"} end
        local unitObj = cjson.decode(unit)
        if unitObj.status ~= "available" then return {0, "unit_unavailable"} end
        local challengeKey = KEYS[2] .. ":" .. ARGV[2]
        local challenge = redis.call("GET", challengeKey)
        local challengeFromHash = 0
        if not challenge then
          challenge = redis.call("HGET", KEYS[2], ARGV[2])
          challengeFromHash = 1
        end
        if not challenge then return {0, "challenge_not_found"} end
        local challengeObj = cjson.decode(challenge)
        if challengeObj.consumed then return {0, "challenge_consumed"} end
        if challengeFromHash == 1 then
          redis.call("HDEL", KEYS[2], ARGV[2])
        else
          redis.call("DEL", challengeKey)
        end
        unitObj.status = "claimed"
        unitObj.claimedBy = ARGV[3]
        unitObj.claimedAt = ARGV[4]
        redis.call("HSET", KEYS[1], ARGV[1], cjson.encode(unitObj))
        local avatarId = ""
        local character = redis.call("HGET", KEYS[4], unitObj.characterId)
        if character then
          local characterObj = cjson.decode(character)
          if characterObj and characterObj.slug and string.len(characterObj.slug) > 0 then
            avatarId = string.lower(characterObj.slug)
          end
        end
        local ownershipObj = {id=ARGV[5], userId=ARGV[3], characterId=unitObj.characterId, source="claim", cosmetics={}, createdAt=ARGV[4]}
        if avatarId ~= "" then ownershipObj.avatarId = avatarId end
        redis.call("LPUSH", KEYS[3], cjson.encode(ownershipObj))
        redis.call("SADD", KEYS[5], unitObj.characterId)
        if avatarId ~= "" then redis.call("SADD", KEYS[6], avatarId) end
        return {1, unitObj.characterId, ARGV[4]}
      `;
      const result = (await redis.eval(
        lua,
        [KEYS.units, KEYS.challenges, userOwnershipKey, KEYS.characters, userOwnershipCharacterIdsKey, userOwnershipAvatarIdsKey],
        [unitId, challengeId, userId, claimedAtIso, ownershipId],
      )) as unknown;
      if (Array.isArray(result) && Number(result[0]) === 1) {
        return { characterId: String(result[1]), claimedAt: new Date(String(result[2])) };
      }
      const reason = Array.isArray(result) ? String(result[1]) : 'claim_failed';
      throw new Error(reason);
    }

    const raw = await redis.hget(KEYS.units, unitId);
    if (!raw) throw new Error('Unit not found');
    const stored = parseJson<StoredUnit>(raw);
    if (!stored) throw new Error('Unit not found');
    if (stored.status !== 'available') {
      throw new Error('Unit no longer available');
    }

    stored.status = 'claimed';
    stored.claimedBy = userId;
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
    const characterRaw = await redis.hget(KEYS.characters, stored.characterId);
    const avatarId = avatarIdFromCharacter(toCharacter(characterRaw));
    if (avatarId) {
      ownership.avatarId = avatarId;
    }

    await redis.lpush(userOwnershipKey, JSON.stringify(ownership));
    await redis.sadd(userOwnershipCharacterIdsKey, stored.characterId);
    if (avatarId) {
      await redis.sadd(userOwnershipAvatarIdsKey, avatarId);
    }

    return { characterId: stored.characterId, claimedAt: claimedAtDate };
  },

  async listOwnershipsByUser(userId) {
    await ensureReady();
    const items = (await redis.lrange(ownershipKey(userId), 0, -1)) as string[] | null;
    return (items || [])
      .map((entry) => parseJson<StoredOwnership>(entry))
      .filter((parsed): parsed is StoredOwnership => Boolean(parsed))
      .map((parsed) => ({
        id: parsed.id,
        userId: parsed.userId,
        characterId: parsed.characterId,
        source: parsed.source,
        cosmetics: parsed.cosmetics,
        createdAt: new Date(parsed.createdAt),
      }));
  },

  async listOwnershipsWithCharactersByUser(userId) {
    await ensureReady();
    if (!userId) return [];

    const raw = (await redis.eval(
      `
        local items = redis.call("LRANGE", KEYS[1], 0, -1)
        if #items == 0 then return {} end

        local ownerships = {}
        local characterIds = {}
        local seenCharacterIds = {}

        for i, item in ipairs(items) do
          local ok, ownership = pcall(cjson.decode, item)
          if ok and ownership and ownership.characterId then
            ownerships[#ownerships + 1] = ownership
            if not seenCharacterIds[ownership.characterId] then
              seenCharacterIds[ownership.characterId] = true
              characterIds[#characterIds + 1] = ownership.characterId
            end
          end
        end

        local characters = {}
        if #characterIds > 0 then
          characters = redis.call("HMGET", KEYS[2], unpack(characterIds))
        end

        local characterById = {}
        for i, characterId in ipairs(characterIds) do
          characterById[characterId] = characters[i]
        end

        local result = {}
        for i, ownership in ipairs(ownerships) do
          local characterRaw = characterById[ownership.characterId]
          result[#result + 1] = cjson.encode({
            ownership = ownership,
            character = characterRaw and cjson.decode(characterRaw) or cjson.null
          })
        end

        return result
      `,
      [ownershipKey(userId), KEYS.characters],
      [],
    )) as string[] | null;

    return (raw || [])
      .map((entry) => parseJson<{ ownership?: StoredOwnership; character?: StoredCharacter | null }>(entry))
      .filter((entry): entry is { ownership: StoredOwnership; character?: StoredCharacter | null } => Boolean(entry?.ownership))
      .map((entry) => ({
        ownership: {
          id: entry.ownership.id,
          userId: entry.ownership.userId,
          characterId: entry.ownership.characterId,
          source: entry.ownership.source,
          cosmetics: entry.ownership.cosmetics,
          createdAt: new Date(entry.ownership.createdAt),
        },
        character: toCharacter(entry.character ?? null),
      }));
  },

  async listOwnedCharacterIdsByUser(userId) {
    await ensureReady();
    if (!userId) return [];

    const characterIdsKey = ownershipCharacterIdsKey(userId);
    const storedCharacterIds = await redis.smembers(characterIdsKey);
    if (Array.isArray(storedCharacterIds) && storedCharacterIds.length > 0) {
      return storedCharacterIds
        .filter((characterId): characterId is string => typeof characterId === 'string' && characterId.length > 0);
    }

    const items = (await redis.lrange(ownershipKey(userId), 0, -1)) as string[] | null;
    const characterIds = Array.from(
      new Set(
        (items || [])
          .map((entry) => parseJson<StoredOwnership>(entry))
          .filter((parsed): parsed is StoredOwnership => Boolean(parsed))
          .map((ownership) => ownership.characterId)
          .filter(Boolean),
      ),
    );
    if (characterIds.length > 0) {
      for (const characterId of characterIds) {
        await redis.sadd(characterIdsKey, characterId);
      }
    }
    return characterIds;
  },

  async listOwnedAvatarIdsByUser(userId) {
    await ensureReady();
    if (!userId) return [];

    const avatarIdsKey = ownershipAvatarIdsKey(userId);
    const storedAvatarIds = await redis.smembers(avatarIdsKey);
    if (Array.isArray(storedAvatarIds) && storedAvatarIds.length > 0) {
      return storedAvatarIds
        .map((entry) => normalizeAvatarId(entry))
        .filter((avatarId): avatarId is string => Boolean(avatarId));
    }

    const items = (await redis.lrange(ownershipKey(userId), 0, -1)) as string[] | null;
    const ownerships = (items || [])
      .map((entry) => parseJson<StoredOwnership>(entry))
      .filter((parsed): parsed is StoredOwnership => Boolean(parsed));
    if (ownerships.length === 0) {
      return [];
    }

    const avatarIds = new Set<string>();
    const unresolvedCharacterIds: string[] = [];

    for (const ownership of ownerships) {
      const avatarId = normalizeAvatarId(ownership.avatarId);
      if (avatarId) {
        avatarIds.add(avatarId);
        continue;
      }
      if (ownership.characterId) {
        unresolvedCharacterIds.push(ownership.characterId);
      }
    }

    if (unresolvedCharacterIds.length > 0) {
      const characters = await repoRedis.getCharactersByIds(Array.from(new Set(unresolvedCharacterIds)));
      for (const character of characters) {
        const avatarId = avatarIdFromCharacter(character);
        if (avatarId) {
          avatarIds.add(avatarId);
        }
      }
    }

    const result = Array.from(avatarIds);
    if (result.length > 0) {
      for (const avatarId of result) {
        await redis.sadd(avatarIdsKey, avatarId);
      }
    }
    return result;
  },

  async getClaimVerifyPreview(codeHash) {
    await ensureReady();
    const raw = (await redis.eval(
      `
        local unitId = redis.call("HGET", KEYS[1], ARGV[1])
        if not unitId then return nil end
        local unit = redis.call("HGET", KEYS[2], unitId)
        if not unit then return nil end
        local unitObj = cjson.decode(unit)
        local character = redis.call("HGET", KEYS[3], unitObj.characterId)
        return {unitObj.status or "", character or ""}
      `,
      [KEYS.unitByCodeHash, KEYS.units, KEYS.characters],
      [codeHash],
    )) as Array<string | null> | null;

    if (!Array.isArray(raw)) return null;
    return {
      status: String(raw[0] ?? 'available') as PhysicalUnit['status'],
      character: toCharacter(raw[1]),
    };
  },

  async getCharacterById(id) {
    await ensureReady();
    const raw = await redis.hget(KEYS.characters, id);
    return toCharacter(raw);
  },

  async resolveCharacterIdentifier({ raw, normalized, slugified }) {
    await ensureReady();
    await ensureCharacterIndexes();
    if (!raw) return null;

    const result = await redis.eval(
      `
        local identifier = ARGV[1]
        local normalized = ARGV[2]
        local slugified = ARGV[3]

        local direct = redis.call("HGET", KEYS[1], identifier)
        if direct then return direct end

        local characterId = redis.call("HGET", KEYS[2], normalized)
        if not characterId and slugified ~= normalized then
          characterId = redis.call("HGET", KEYS[2], slugified)
        end
        if not characterId then
          characterId = redis.call("HGET", KEYS[3], slugified)
        end
        if not characterId then
          characterId = redis.call("HGET", KEYS[4], normalized)
        end
        if not characterId then
          return nil
        end

        return redis.call("HGET", KEYS[1], characterId)
      `,
      [KEYS.characters, KEYS.characterBySlug, KEYS.characterByNameSlug, KEYS.characterByCodeSeries],
      [raw, normalized, slugified],
    );
    return toCharacter(result);
  },

  async getCharacterBySlug(slug) {
    await ensureReady();
    await ensureCharacterIndexes();
    const normalizedSlug = normalize(slug);
    if (!normalizedSlug) return null;
    const id = (await redis.hget(KEYS.characterBySlug, normalizedSlug)) as string | null;
    if (!id) return null;
    const raw = await redis.hget(KEYS.characters, id);
    return toCharacter(raw);
  },

  async getCharacterByNameSlug(nameSlug) {
    await ensureReady();
    await ensureCharacterIndexes();
    const normalizedNameSlug = normalize(nameSlug);
    if (!normalizedNameSlug) return null;
    const id = (await redis.hget(KEYS.characterByNameSlug, normalizedNameSlug)) as string | null;
    if (!id) return null;
    const raw = await redis.hget(KEYS.characters, id);
    return toCharacter(raw);
  },

  async getCharacterByCodeSeries(codeSeries) {
    await ensureReady();
    await ensureCharacterIndexes();
    const normalizedCodeSeries = normalize(codeSeries);
    if (!normalizedCodeSeries) return null;
    const id = (await redis.hget(KEYS.characterByCodeSeries, normalizedCodeSeries)) as string | null;
    if (!id) return null;
    const raw = await redis.hget(KEYS.characters, id);
    return toCharacter(raw);
  },

  async getCharactersByIds(ids) {
    await ensureReady();
    if (!ids.length) return [];
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (!uniqueIds.length) return [];
    const raw = (await redis.hmget(KEYS.characters, ...uniqueIds)) as Record<string, unknown> | null;
    const seen = new Set<string>();
    const results: Character[] = [];
    for (const id of ids) {
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const parsed = toCharacter(raw ? (raw as Record<string, unknown>)[id] : null);
      if (parsed) results.push(parsed);
    }
    return results;
  },

  async listCharacters(params) {
    await ensureReady();
    await ensureCharacterIndexes();
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;
    if (limit <= 0) return [];

    const ids = (await redis.lrange(KEYS.characterOrder, offset, offset + limit - 1)) as string[] | null;
    if (!ids || ids.length === 0) return [];

    const raw = (await redis.hmget(KEYS.characters, ...ids)) as Record<string, unknown> | null;
    return ids
      .map((id) => toCharacter(raw ? raw[id] : null))
      .filter((character): character is Character => Boolean(character));
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
