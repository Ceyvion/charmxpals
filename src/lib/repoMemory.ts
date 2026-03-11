import { randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import { hashClaimCode } from './crypto';
import type { Repo, User, Character, PhysicalUnit, ClaimChallenge, Ownership } from './repo';
import { characterLore } from '@/data/characterLore';

type CharacterSet = { id: string; name: string; description: string | null };

const now = () => new Date();

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SPRITE_PATH_RE = /\/assets\/characters\/([^/]+)\/sprite\.[a-z0-9]+(?:[?#].*)?$/i;

function parseAvatarIdFromSpriteRef(spriteRef: unknown): string | null {
  if (typeof spriteRef !== 'string') return null;
  const match = spriteRef.trim().match(SPRITE_PATH_RE);
  if (!match) return null;
  const avatarId = normalize(match[1]);
  return avatarId || null;
}

function toAvatarId(character: Character | null): string | null {
  if (!character) return null;
  const fromSlug = normalize(character.slug ?? '');
  if (fromSlug) return fromSlug;
  return parseAvatarIdFromSpriteRef(character.artRefs?.sprite);
}

// Demo data (mirrors the default Redis seed)
const data = (() => {
  const set: CharacterSet = {
    id: uuid(),
    name: 'Dance Across Dimensions',
    description: 'CharmXPals champions defending the MotionXChange Arena.',
  };

const isProdLike = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
let memorySecret = process.env.CODE_HASH_SECRET || null;
if (!memorySecret) {
  if (isProdLike) {
    throw new Error('CODE_HASH_SECRET missing');
  }
  memorySecret = 'memory-dev-secret';
  if (process.env.NODE_ENV !== 'test') {
    console.warn('[memoryRepo] CODE_HASH_SECRET missing; using fallback dev secret for in-memory data seeding.');
  }
  process.env.CODE_HASH_SECRET = memorySecret;
}

  const characters: Character[] = characterLore.map((entry) => {
    const artRefs = entry.artRefs && Object.keys(entry.artRefs).length > 0
      ? entry.artRefs
      : { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' };
    return {
      id: uuid(),
      setId: set.id,
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
    };
  });

  const sampleUnits = [
    { code: 'CHARM-XPAL-001', series: 'Red Dash' },
    { code: 'CHARM-XPAL-002', series: 'Blue Dash' },
    { code: 'CHARM-XPAL-003', series: 'Pink Dash' },
  ];
  const units: PhysicalUnit[] = sampleUnits.reduce<PhysicalUnit[]>((acc, { code, series }) => {
    const character = characters.find((c) => c.codeSeries === series);
    if (!character) return acc;
    acc.push({
      id: uuid(),
      characterId: character.id,
      codeHash: hashClaimCode(code, memorySecret!),
      secureSalt: randomBytes(32).toString('hex'),
      status: 'available',
      claimedBy: null,
      claimedAt: null,
    });
    return acc;
  }, []);

  return {
    users: [] as User[],
    sets: [set],
    characters,
    units,
    challenges: [] as ClaimChallenge[],
    abuse: [] as unknown[],
    ownerships: [] as Ownership[],
  };
})();

function upsertUser(email: string, handle: string): User {
  let u = data.users.find((x) => x.email === email);
  if (!u) {
    u = { id: uuid(), email, handle };
    data.users.push(u);
  } else {
    u.handle = handle;
  }
  return u;
}

export const memoryRepo: Repo = {
  kind: 'memory',
  async upsertDevUser({ handle, email }) {
    return upsertUser(email, handle);
  },
  async getUserById(id) {
    return data.users.find((u) => u.id === id) || null;
  },
  async getUserByHandle(handle) {
    return data.users.find((u) => (u.handle || '').toLowerCase() === (handle || '').toLowerCase()) || null;
  },

  async createChallenge({ codeHash, nonce, timestamp, challengeDigest, expiresAt, userId }) {
    const c: ClaimChallenge = {
      id: uuid(),
      codeHash,
      nonce,
      timestamp,
      challengeDigest,
      expiresAt: new Date(expiresAt),
      userId: userId ?? null,
      consumed: false,
      unitId: null,
      secureSalt: null,
    };
    data.challenges.push(c);
    return c;
  },
  async startClaimChallenge({ codeHash, userId, nonce, timestamp, expiresAt }) {
    const unit = data.units.find((candidate) => candidate.codeHash === codeHash) || null;
    if (!unit) {
      return { ok: false as const, reason: 'not_found' as const };
    }
    if (unit.status !== 'available') {
      return { ok: false as const, reason: 'unavailable' as const };
    }
    const challenge: ClaimChallenge = {
      id: uuid(),
      codeHash,
      nonce,
      timestamp,
      challengeDigest: '',
      expiresAt: new Date(expiresAt),
      userId: userId ?? null,
      consumed: false,
      unitId: unit.id,
      secureSalt: unit.secureSalt,
    };
    data.challenges.push(challenge);
    return { ok: true as const, challenge, secureSalt: unit.secureSalt };
  },
  async getChallengeById(id) {
    return data.challenges.find((c) => c.id === id) || null;
  },
  async consumeChallenge(id) {
    const c = data.challenges.find((x) => x.id === id);
    if (c) c.consumed = true;
  },

  async findUnitByCodeHash(codeHash) {
    return data.units.find((u) => u.codeHash === codeHash) || null;
  },
  async getUnitById(id) {
    return data.units.find((unit) => unit.id === id) || null;
  },
  async claimUnitAndCreateOwnership({ unitId, userId, challengeId }) {
    const unit = data.units.find((u) => u.id === unitId);
    if (!unit) throw new Error('Unit not found');
    if (unit.status !== 'available') {
      throw new Error('Unit no longer available');
    }
    if (challengeId) {
      const challenge = data.challenges.find((c) => c.id === challengeId);
      if (!challenge) throw new Error('Challenge not found');
      if (challenge.consumed) throw new Error('Challenge already consumed');
      challenge.consumed = true;
    }
    const claimedAt = now();
    unit.status = 'claimed';
    unit.claimedBy = userId;
    unit.claimedAt = claimedAt;
    data.ownerships.push({ id: uuid(), userId, characterId: unit.characterId, source: 'claim', cosmetics: [], createdAt: claimedAt });
    return { characterId: unit.characterId, claimedAt };
  },
  async listOwnershipsByUser(userId) {
    return data.ownerships.filter((o) => o.userId === userId);
  },
  async listOwnershipsWithCharactersByUser(userId) {
    const byCharacterId = new Map(data.characters.map((character) => [character.id, character]));
    return data.ownerships
      .filter((ownership) => ownership.userId === userId)
      .map((ownership) => ({
        ownership,
        character: byCharacterId.get(ownership.characterId) ?? null,
      }));
  },
  async listOwnedCharacterIdsByUser(userId) {
    const characterIds = new Set<string>();
    for (const ownership of data.ownerships) {
      if (ownership.userId === userId) {
        characterIds.add(ownership.characterId);
      }
    }
    return Array.from(characterIds);
  },
  async listOwnedAvatarIdsByUser(userId) {
    const ownerships = data.ownerships.filter((ownership) => ownership.userId === userId);
    if (ownerships.length === 0) return [];

    const byCharacterId = new Map(data.characters.map((character) => [character.id, character]));
    const avatarIds = new Set<string>();
    for (const ownership of ownerships) {
      const avatarId = toAvatarId(byCharacterId.get(ownership.characterId) ?? null);
      if (avatarId) avatarIds.add(avatarId);
    }
    return Array.from(avatarIds);
  },
  async getClaimVerifyPreview(codeHash) {
    const unit = data.units.find((candidate) => candidate.codeHash === codeHash) || null;
    if (!unit) return null;
    const character = data.characters.find((candidate) => candidate.id === unit.characterId) || null;
    return {
      status: unit.status,
      character,
    };
  },

  async getCharacterById(id) {
    return data.characters.find((c) => c.id === id) || null;
  },
  async resolveCharacterIdentifier({ raw, normalized, slugified }) {
    return (
      data.characters.find((character) => character.id === raw) ||
      data.characters.find((character) => normalize(character.slug ?? '') === normalized) ||
      (slugified !== normalized
        ? data.characters.find((character) => normalize(character.slug ?? '') === slugified)
        : null) ||
      data.characters.find((character) => slugify(character.name) === slugified) ||
      data.characters.find((character) => normalize(character.codeSeries ?? '') === normalized) ||
      null
    );
  },
  async getCharacterBySlug(slug) {
    const normalizedSlug = normalize(slug);
    if (!normalizedSlug) return null;
    return data.characters.find((character) => normalize(character.slug ?? '') === normalizedSlug) ?? null;
  },
  async getCharacterByNameSlug(nameSlug) {
    const normalizedNameSlug = normalize(nameSlug);
    if (!normalizedNameSlug) return null;
    return data.characters.find((character) => slugify(character.name) === normalizedNameSlug) ?? null;
  },
  async getCharacterByCodeSeries(codeSeries) {
    const normalizedSeries = normalize(codeSeries);
    if (!normalizedSeries) return null;
    return data.characters.find((character) => normalize(character.codeSeries ?? '') === normalizedSeries) ?? null;
  },
  async getCharactersByIds(ids) {
    if (!ids.length) return [];
    const byId = new Map(data.characters.map((character) => [character.id, character]));
    const seen = new Set<string>();
    const results: Character[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const character = byId.get(id);
      if (character) results.push(character);
    }
    return results;
  },
  async listCharacters(params) {
    const limit = params?.limit ?? data.characters.length;
    const offset = params?.offset ?? 0;
    return data.characters.slice(offset, offset + limit);
  },

  async logAbuse(event) {
    data.abuse.push({ id: uuid(), createdAt: now(), ...event });
  },
};
