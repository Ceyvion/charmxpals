import type { Character } from '@/lib/repo';
import { characterLore, loreBySeries, loreBySlug } from '@/data/characterLore';
import type { CharacterLore } from '@/data/characterLore';

export type CharacterWithLore = Character & {
  lore: CharacterLore | null;
};

function pickLore(character: Partial<Character>): CharacterLore | null {
  if (character.codeSeries && loreBySeries[character.codeSeries]) {
    return loreBySeries[character.codeSeries];
  }
  if (character.slug && loreBySlug[character.slug]) {
    return loreBySlug[character.slug];
  }
  if (character.name && loreBySeries[character.name]) {
    return loreBySeries[character.name];
  }
  return null;
}

export function withCharacterLore(character: Character | null | undefined): CharacterWithLore | null {
  if (!character) return null;
  const lore = pickLore(character) ?? null;

  const stats =
    character.stats && Object.keys(character.stats).length > 0
      ? character.stats
      : lore?.stats
        ? { ...lore.stats }
        : {};

  const artRefs =
    character.artRefs && Object.keys(character.artRefs).length > 0
      ? character.artRefs
      : lore?.artRefs ?? {};

  return {
    ...character,
    name: character.name || lore?.name || '',
    description: character.description ?? lore?.description ?? null,
    stats,
    artRefs,
    codeSeries: character.codeSeries ?? lore?.series ?? null,
    slug: character.slug ?? lore?.slug ?? null,
    realm: character.realm ?? lore?.realm ?? null,
    color: character.color ?? lore?.color ?? null,
    title: character.title ?? lore?.title ?? null,
    vibe: character.vibe ?? lore?.vibe ?? null,
    danceStyle: character.danceStyle ?? lore?.danceStyle ?? null,
    coreCharm: character.coreCharm ?? lore?.coreCharm ?? null,
    personality: character.personality ?? lore?.personality ?? null,
    tagline: character.tagline ?? lore?.tagline ?? null,
    lore,
  };
}

export function listRosterByOrder(): CharacterLore[] {
  return [...characterLore].sort((a, b) => a.order - b.order);
}
