import type { Character } from '@/lib/repo';
import { characterLore, loreBySeries, loreBySlug } from '@/data/characterLore';
import type { CharacterLore } from '@/data/characterLore';

export type CharacterWithLore = Character & {
  lore: CharacterLore | null;
};

const loreByName = characterLore.reduce<Record<string, CharacterLore>>((acc, entry) => {
  acc[entry.name.toLowerCase()] = entry;
  return acc;
}, {});

const legacyArtSlugByName: Record<string, string> = {
  'blaze the dragon': 'volcanic-lab',
};

function buildArtRefsFromSlug(slug: string): Record<string, string> {
  const base = `/assets/characters/${slug}`;
  return {
    signature: `${base}/signature.webp`,
    thumbnail: `${base}/thumb.webp`,
    card: `${base}/card.webp`,
    portrait: `${base}/portrait.webp`,
    banner: `${base}/banner.webp`,
    full: `${base}/portrait.webp`,
    sprite: `${base}/sprite.webp`,
  };
}

function pickLore(character: Partial<Character>): CharacterLore | null {
  if (character.codeSeries && loreBySeries[character.codeSeries]) {
    return loreBySeries[character.codeSeries];
  }
  if (character.slug && loreBySlug[character.slug]) {
    return loreBySlug[character.slug];
  }
  if (character.name) {
    const byName = loreByName[character.name.trim().toLowerCase()];
    if (byName) return byName;
  }
  if (character.name && loreBySeries[character.name]) {
    return loreBySeries[character.name];
  }
  return null;
}

function isPlaceholderArt(artRefs: Record<string, string> | null | undefined): boolean {
  if (!artRefs) return false;
  const values = Object.values(artRefs).filter(Boolean);
  if (values.length === 0) return false;
  return values.every((value) => value.includes('card-placeholder.svg'));
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

  const useLoreArt =
    !character.artRefs ||
    Object.keys(character.artRefs).length === 0 ||
    isPlaceholderArt(character.artRefs);
  const legacySlug = character.name ? legacyArtSlugByName[character.name.trim().toLowerCase()] : null;
  const artFallbackFromSlug = character.slug ? buildArtRefsFromSlug(character.slug) : legacySlug ? buildArtRefsFromSlug(legacySlug) : null;
  const artRefs = useLoreArt ? lore?.artRefs ?? artFallbackFromSlug ?? character.artRefs ?? {} : character.artRefs;

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

export function listPublicCharacters(): CharacterWithLore[] {
  return listRosterByOrder().map((lore) => ({
    id: lore.slug,
    setId: 'public-roster',
    name: lore.name,
    description: lore.description,
    rarity: lore.rarity,
    stats: { ...lore.stats },
    artRefs: lore.artRefs ?? buildArtRefsFromSlug(lore.slug),
    codeSeries: lore.series,
    slug: lore.slug,
    realm: lore.realm,
    color: lore.color,
    title: lore.title,
    vibe: lore.vibe,
    danceStyle: lore.danceStyle,
    coreCharm: lore.coreCharm,
    personality: lore.personality,
    tagline: lore.tagline,
    lore,
  }));
}
