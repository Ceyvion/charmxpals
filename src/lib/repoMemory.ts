import { randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import { hashClaimCode } from './crypto';
import type { Repo, User, Character, PhysicalUnit, ClaimChallenge } from './repo';
import { characterLore } from '@/data/characterLore';

type CharacterSet = { id: string; name: string; description: string | null };

const now = () => new Date();

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
    abuse: [] as any[],
    ownerships: [] as Array<{ id: string; userId: string; characterId: string; source: string; cosmetics: string[]; createdAt: Date }>,
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
    };
    data.challenges.push(c);
    return c;
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
  async claimUnitAndCreateOwnership({ unitId, userId }) {
    const unit = data.units.find((u) => u.id === unitId);
    if (!unit) throw new Error('Unit not found');
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

  async getCharacterById(id) {
    return data.characters.find((c) => c.id === id) || null;
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
