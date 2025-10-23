import { v4 as uuid } from 'uuid';
import { hashClaimCode } from './crypto';
import type { Repo, User, Character, PhysicalUnit, ClaimChallenge } from './repo';

type CharacterSet = { id: string; name: string; description: string | null };

const now = () => new Date();

// Demo data (mirrors the default Redis seed)
const data = (() => {
  const set1: CharacterSet = { id: uuid(), name: 'Fantasy Collection', description: 'Mystical creatures from a magical realm' };
  const set2: CharacterSet = { id: uuid(), name: 'Elemental Forces', description: 'Masters of the fundamental elements' };

  const blaze: Character = {
    id: uuid(),
    setId: set1.id,
    name: 'Blaze the Dragon',
    description: 'A fierce fire-breathing dragon with incredible speed and agility.',
    rarity: 5,
    stats: { strength: 85, speed: 92, intelligence: 78, defense: 80 },
    artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
  };
  const frost: Character = {
    id: uuid(),
    setId: set1.id,
    name: 'Frost Wolf',
    description: 'A cunning wolf with ice-blue fur and razor-sharp claws.',
    rarity: 4,
    stats: { strength: 78, speed: 88, intelligence: 85, defense: 82 },
    artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
  };
  const tidal: Character = {
    id: uuid(),
    setId: set2.id,
    name: 'Tidal Serpent',
    description: 'A massive sea serpent that commands the power of the ocean.',
    rarity: 5,
    stats: { strength: 90, speed: 75, intelligence: 88, defense: 85 },
    artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' },
  };

  // Additional characters to fill out the grid
  const extras: Character[] = [
    { id: uuid(), setId: set1.id, name: 'Volt Lynx', description: 'Crackling with static speed.', rarity: 4, stats: { strength: 70, speed: 95, intelligence: 82, defense: 60 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set1.id, name: 'Terra Golem', description: 'Unshakable mountain defender.', rarity: 3, stats: { strength: 88, speed: 40, intelligence: 65, defense: 95 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set1.id, name: 'Aero Falcon', description: 'Master of the jetstream.', rarity: 4, stats: { strength: 68, speed: 97, intelligence: 70, defense: 55 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set1.id, name: 'Shadow Mantis', description: 'Silent strikes from the dark.', rarity: 5, stats: { strength: 85, speed: 90, intelligence: 90, defense: 70 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set2.id, name: 'Crystal Nymph', description: 'Prism magic and light bends.', rarity: 3, stats: { strength: 55, speed: 72, intelligence: 93, defense: 61 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set2.id, name: 'Pyro Beetle', description: 'Molten armor, blazing trail.', rarity: 4, stats: { strength: 82, speed: 70, intelligence: 68, defense: 74 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set2.id, name: 'Storm Leviathan', description: 'Tidal thunder reign.', rarity: 5, stats: { strength: 92, speed: 78, intelligence: 84, defense: 88 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set2.id, name: 'Quartz Sentinel', description: 'Shards of unbreakable will.', rarity: 3, stats: { strength: 76, speed: 55, intelligence: 72, defense: 89 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set2.id, name: 'Vine Warden', description: 'Roots that never yield.', rarity: 4, stats: { strength: 79, speed: 64, intelligence: 77, defense: 83 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set1.id, name: 'Nova Kitsune', description: 'Starlit trickster fox.', rarity: 5, stats: { strength: 81, speed: 93, intelligence: 94, defense: 66 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set1.id, name: 'Aurora Stag', description: 'Dawnsong guardian.', rarity: 4, stats: { strength: 75, speed: 82, intelligence: 80, defense: 72 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
    { id: uuid(), setId: set1.id, name: 'Obsidian Panther', description: 'Night-glass hunter.', rarity: 5, stats: { strength: 88, speed: 94, intelligence: 76, defense: 69 }, artRefs: { thumbnail: '/card-placeholder.svg', full: '/card-placeholder.svg' } },
  ];

  const secureSalt = 'super-secret-salt';
  const units: PhysicalUnit[] = [
    { id: uuid(), characterId: blaze.id, codeHash: hashClaimCode('CHARM-XPAL-001'), secureSalt, status: 'available', claimedBy: null, claimedAt: null },
    { id: uuid(), characterId: frost.id, codeHash: hashClaimCode('CHARM-XPAL-002'), secureSalt, status: 'available', claimedBy: null, claimedAt: null },
    { id: uuid(), characterId: tidal.id, codeHash: hashClaimCode('CHARM-XPAL-003'), secureSalt, status: 'available', claimedBy: null, claimedAt: null },
  ];

  return {
    users: [] as User[],
    sets: [set1, set2],
    characters: [blaze, frost, tidal, ...extras],
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

  async createChallenge({ codeHash, nonce, timestamp, challengeDigest, expiresAt }) {
    const c: ClaimChallenge = {
      id: uuid(),
      codeHash,
      nonce,
      timestamp,
      challengeDigest,
      expiresAt: new Date(expiresAt),
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
    unit.status = 'claimed';
    unit.claimedBy = userId;
    unit.claimedAt = now();
    data.ownerships.push({ id: uuid(), userId, characterId: unit.characterId, source: 'claim', cosmetics: [], createdAt: now() });
    return { characterId: unit.characterId };
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
