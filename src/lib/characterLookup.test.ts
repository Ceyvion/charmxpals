import { describe, expect, it } from 'vitest';

import type { Repo, Character } from '@/lib/repo';
import { resolveCharacterByIdentifier } from '@/lib/characterLookup';

function createRepo(characters: Character[]): Repo {
  return {
    kind: 'memory',
    async upsertDevUser({ handle, email }) {
      return { id: 'user-1', handle, email };
    },
    async getUserById() {
      return null;
    },
    async getUserByHandle() {
      return null;
    },
    async createChallenge(data) {
      return { id: 'challenge-1', consumed: false, ...data };
    },
    async getChallengeById() {
      return null;
    },
    async consumeChallenge() {
      return;
    },
    async findUnitByCodeHash() {
      return null;
    },
    async claimUnitAndCreateOwnership() {
      return { characterId: 'character-1', claimedAt: new Date() };
    },
    async listOwnershipsByUser() {
      return [];
    },
    async getCharacterById(id) {
      return characters.find((character) => character.id === id) ?? null;
    },
    async getCharactersByIds(ids) {
      return characters.filter((character) => ids.includes(character.id));
    },
    async listCharacters({ limit = characters.length, offset = 0 } = {}) {
      return characters.slice(offset, offset + limit);
    },
    async logAbuse() {
      return;
    },
  };
}

describe('resolveCharacterByIdentifier', () => {
  const sampleCharacters: Character[] = [
    {
      id: 'char-001',
      setId: 'set-1',
      name: 'Storm Leviathan',
      description: 'Tidal thunder reign.',
      rarity: 5,
      stats: { power: 95 },
      artRefs: { thumbnail: '/card-placeholder.svg' },
      slug: 'storm-leviathan',
      codeSeries: 'Legacy Apex',
    },
  ];

  it('returns a character by direct id lookup', async () => {
    const repo = createRepo(sampleCharacters);
    const character = await resolveCharacterByIdentifier(repo, 'char-001');
    expect(character?.name).toBe('Storm Leviathan');
  });

  it('falls back to slug match from listed characters when id lookup misses', async () => {
    const repo = createRepo(sampleCharacters);
    const character = await resolveCharacterByIdentifier(repo, 'storm-leviathan');
    expect(character?.id).toBe('char-001');
  });

  it('builds a lore-backed character when repo has no matching record', async () => {
    const repo = createRepo([]);
    const character = await resolveCharacterByIdentifier(repo, 'shadow-mantis');
    expect(character?.name).toBe('Shadow Mantis');
    expect(character?.artRefs?.thumbnail).toBe('/assets/characters/shadow-stage/thumb.png');
  });

  it('resolves every requested legacy identifier with non-placeholder art', async () => {
    const repo = createRepo([]);
    const requestedIds = [
      'shadow-mantis',
      'storm-leviathan',
      'tidal-serpent',
      'aero-falcon',
      'aurora-stag',
      'frost-wolf',
      'vine-warden',
      'volt-lynx',
      'crystal-nymph',
      'quartz-sentinel',
      'terra-golem',
    ];

    for (const id of requestedIds) {
      const character = await resolveCharacterByIdentifier(repo, id);
      expect(character).not.toBeNull();
      expect(character?.artRefs?.thumbnail).toContain('/assets/characters/');
      expect(character?.artRefs?.thumbnail).not.toContain('card-placeholder.svg');
    }
  });
});
