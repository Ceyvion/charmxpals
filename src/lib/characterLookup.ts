import { characterLore, loreBySlug } from '@/data/characterLore';
import type { Character, Repo } from '@/lib/repo';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const loreByNameSlug = characterLore.reduce<Map<string, (typeof characterLore)[number]>>((acc, entry) => {
  acc.set(slugify(entry.name), entry);
  return acc;
}, new Map());

const loreBySeries = characterLore.reduce<Map<string, (typeof characterLore)[number]>>((acc, entry) => {
  acc.set(normalize(entry.series), entry);
  return acc;
}, new Map());

function fromLore(identifier: string): Character | null {
  const normalized = normalize(identifier);
  const slugified = slugify(identifier);

  const lore =
    loreBySlug[normalized] ??
    loreBySlug[slugified] ??
    loreByNameSlug.get(slugified) ??
    loreBySeries.get(normalized) ??
    null;

  if (!lore) return null;

  return {
    id: lore.slug,
    setId: 'legacy-lore',
    name: lore.name,
    description: lore.description,
    rarity: lore.rarity,
    stats: { ...lore.stats },
    artRefs: { ...(lore.artRefs ?? {}) },
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
  };
}

export async function resolveCharacterByIdentifier(repo: Repo, identifier: string): Promise<Character | null> {
  const decoded = safeDecode(identifier);
  const trimmed = decoded.trim();
  if (!trimmed) return null;

  const byId = await repo.getCharacterById(trimmed);
  if (byId) return byId;

  const normalizedInput = normalize(trimmed);
  const slugifiedInput = slugify(trimmed);

  const bySlug =
    (await repo.getCharacterBySlug(normalizedInput)) ??
    (slugifiedInput !== normalizedInput ? await repo.getCharacterBySlug(slugifiedInput) : null);
  if (bySlug) return bySlug;

  const byNameSlug = await repo.getCharacterByNameSlug(slugifiedInput);
  if (byNameSlug) return byNameSlug;

  const byCodeSeries = await repo.getCharacterByCodeSeries(normalizedInput);
  if (byCodeSeries) return byCodeSeries;

  return fromLore(trimmed);
}
