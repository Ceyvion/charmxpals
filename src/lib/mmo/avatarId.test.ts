import { describe, it, expect } from 'vitest';

import type { Character } from '@/lib/repo';
import { avatarIdFromSpriteRef, normalizeAvatarId, resolveAvatarId } from './avatarId';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'char-1',
    setId: 'set-1',
    name: 'Raze Ember',
    description: null,
    rarity: 4,
    stats: {},
    artRefs: {
      sprite: '/assets/characters/ember-heights/sprite.png',
    },
    codeSeries: 'Red Dash',
    slug: 'ember-heights',
    realm: null,
    color: null,
    title: null,
    vibe: null,
    danceStyle: null,
    coreCharm: null,
    personality: null,
    tagline: null,
    ...overrides,
  };
}

describe('avatar ID mapping', () => {
  it('normalizes valid slug IDs and rejects invalid identifiers', () => {
    expect(normalizeAvatarId('  Ember-Heights  ')).toBe('ember-heights');
    expect(normalizeAvatarId('')).toBeNull();
    expect(normalizeAvatarId('ember_heights')).toBeNull();
    expect(normalizeAvatarId('eMber heights')).toBeNull();
  });

  it('extracts avatar IDs from sprite refs (path or absolute URL)', () => {
    expect(avatarIdFromSpriteRef('/assets/characters/NEON-city/sprite.png?v=2')).toBe('neon-city');
    expect(avatarIdFromSpriteRef('https://cdn.example.com/assets/characters/rhythm-reef/sprite.png?x=1')).toBe('rhythm-reef');
    expect(avatarIdFromSpriteRef('/assets/characters/neon-city/thumb.png')).toBeNull();
  });

  it('resolves from lore fallback when legacy records miss slug/art mapping', () => {
    const legacy = makeCharacter({
      id: 'legacy-red-dash',
      name: 'Legacy Red Dash',
      slug: null,
      artRefs: {
        thumbnail: '/card-placeholder.svg',
        full: '/card-placeholder.svg',
      },
    });
    expect(resolveAvatarId(legacy)).toBe('ember-heights');
  });

  it('returns null only when no slug, no lore match, and no parseable sprite path exist', () => {
    const unknown = makeCharacter({
      id: 'unknown',
      name: 'Unknown Pal',
      codeSeries: null,
      slug: null,
      artRefs: {},
    });
    expect(resolveAvatarId(unknown)).toBeNull();
  });
});
