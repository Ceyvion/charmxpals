import { describe, expect, it } from 'vitest';

import type { Repo, Character } from '@/lib/repo';
import { resolveCharacterByIdentifier } from '@/lib/characterLookup';

function createRepo(characters: Character[]): Repo {
  const normalize = (value: string) => value.trim().toLowerCase();
  const slugify = (value: string) =>
    normalize(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

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
    async listOwnedAvatarIdsByUser() {
      return [];
    },
    async getCharacterById(id) {
      return characters.find((character) => character.id === id) ?? null;
    },
    async getCharacterBySlug(slug) {
      const normalizedSlug = normalize(slug);
      return characters.find((character) => normalize(character.slug ?? '') === normalizedSlug) ?? null;
    },
    async getCharacterByNameSlug(nameSlug) {
      const normalizedNameSlug = normalize(nameSlug);
      return characters.find((character) => slugify(character.name) === normalizedNameSlug) ?? null;
    },
    async getCharacterByCodeSeries(codeSeries) {
      const normalizedCodeSeries = normalize(codeSeries);
      return characters.find((character) => normalize(character.codeSeries ?? '') === normalizedCodeSeries) ?? null;
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
    expect(character?.artRefs?.thumbnail).toBe('/assets/characters/shadow-mantis/thumb.webp');
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

  it('does not scan paginated roster on unknown identifiers', async () => {
    const repo = createRepo([]);
    repo.listCharacters = async () => {
      throw new Error('listCharacters should not be called');
    };
    const character = await resolveCharacterByIdentifier(repo, 'unknown-character-key');
    expect(character).toBeNull();
  });
});
