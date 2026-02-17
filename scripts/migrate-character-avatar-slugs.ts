import { createHash } from 'crypto';

import { getRedis } from '../src/lib/redis';
import { characterLore } from '../src/data/characterLore';

type StoredCharacter = {
  id: string;
  name?: string | null;
  slug?: string | null;
  artRefs?: Record<string, string> | null;
  [key: string]: unknown;
};

type MigrationMode = 'dry-run' | 'apply';

const REDIS_CHARACTERS_KEY = 'charmxpals:characters';
const AVATAR_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SPRITE_PATH_RE = /\/assets\/characters\/([^/]+)\/sprite\.png(?:[?#].*)?$/i;
const PLACEHOLDER_ART = '/card-placeholder.svg';
const DEFAULT_FALLBACK_SLUG = 'neon-city';

const LEGACY_NAME_TO_SLUG: Record<string, string> = {
  'obsidian panther': 'shadow-stage',
  'tidal serpent': 'rhythm-reef',
  'aero falcon': 'cloudline-harbor',
  'storm leviathan': 'storm-spine',
  'frost wolf': 'glacier-hall',
  'volt lynx': 'aurora-circuit',
  'terra golem': 'terra-tempo',
  'blaze the dragon': 'volcanic-lab',
  'nova kitsune': 'lunar-lux',
  'pyro beetle': 'ember-heights',
  'vine warden': 'moss-ruins',
  'aurora stag': 'aurora-circuit',
  'quartz sentinel': 'crystal-kingdom',
  'shadow mantis': 'shadow-stage',
  'crystal nymph': 'crystal-kingdom',
};

function normalizeSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return AVATAR_ID_RE.test(normalized) ? normalized : null;
}

function avatarIdFromSpriteRef(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const directMatch = trimmed.match(SPRITE_PATH_RE);
  if (directMatch) return normalizeSlug(directMatch[1]);
  return null;
}

function buildArtRefs(slug: string): Record<string, string> {
  const base = `/assets/characters/${slug}`;
  return {
    signature: `${base}/signature.png`,
    thumbnail: `${base}/thumb.png`,
    card: `${base}/card.png`,
    portrait: `${base}/portrait.png`,
    banner: `${base}/banner.png`,
    full: `${base}/portrait.png`,
    sprite: `${base}/sprite.png`,
  };
}

function allPlaceholderArt(artRefs: Record<string, string> | null | undefined): boolean {
  if (!artRefs) return true;
  const values = Object.values(artRefs).filter((value) => typeof value === 'string');
  if (values.length === 0) return true;
  return values.every((value) => value.includes(PLACEHOLDER_ART));
}

function deterministicSlug(id: string, pool: string[]): string {
  if (!pool.length) return DEFAULT_FALLBACK_SLUG;
  const digest = createHash('sha256').update(id).digest();
  const n = digest.readUInt32BE(0);
  return pool[n % pool.length];
}

function parseArgs(): MigrationMode {
  const args = new Set(process.argv.slice(2));
  if (args.has('--apply')) return 'apply';
  return 'dry-run';
}

function safeParseCharacter(raw: unknown): StoredCharacter | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as StoredCharacter;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') return raw as StoredCharacter;
  return null;
}

async function run(mode: MigrationMode) {
  const redis = getRedis();
  const validSlugs = Array.from(new Set(characterLore.map((entry) => entry.slug).filter(Boolean))).sort();
  const validSlugSet = new Set(validSlugs);

  const rawValues = (await redis.hvals(REDIS_CHARACTERS_KEY)) as unknown[] | null;
  const storedCharacters = (rawValues || []).map(safeParseCharacter).filter((value): value is StoredCharacter => Boolean(value));

  const updates: Record<string, string> = {};
  const preview: Array<{ id: string; name: string; fromSlug: string | null; toSlug: string; strategy: 'legacy-map' | 'deterministic' }> = [];

  for (const character of storedCharacters) {
    if (!character.id) continue;
    const slugFromField = normalizeSlug(character.slug);
    const slugFromSprite = avatarIdFromSpriteRef(character.artRefs?.sprite);
    const alreadyResolvable = Boolean(slugFromField || slugFromSprite);
    if (alreadyResolvable) continue;

    const normalizedName = typeof character.name === 'string' ? character.name.trim().toLowerCase() : '';
    const legacyCandidate = normalizeSlug(LEGACY_NAME_TO_SLUG[normalizedName]);
    const mappedSlug =
      legacyCandidate && validSlugSet.has(legacyCandidate)
        ? legacyCandidate
        : deterministicSlug(character.id, validSlugs);
    const strategy: 'legacy-map' | 'deterministic' =
      legacyCandidate && validSlugSet.has(legacyCandidate) ? 'legacy-map' : 'deterministic';

    const artRefs = buildArtRefs(mappedSlug);
    const existingArtRefs =
      character.artRefs && typeof character.artRefs === 'object'
        ? (character.artRefs as Record<string, string>)
        : null;

    const mergedArtRefs = allPlaceholderArt(existingArtRefs)
      ? artRefs
      : { ...artRefs, ...(existingArtRefs || {}) };

    const updated: StoredCharacter = {
      ...character,
      slug: mappedSlug,
      artRefs: mergedArtRefs,
    };

    updates[character.id] = JSON.stringify(updated);
    preview.push({
      id: character.id,
      name: character.name || '(unnamed)',
      fromSlug: slugFromField ?? null,
      toSlug: mappedSlug,
      strategy,
    });
  }

  if (preview.length === 0) {
    console.log('[migrate-character-avatar-slugs] No unresolved records found. Nothing to do.');
    return;
  }

  console.log(
    JSON.stringify(
      {
        mode,
        totalCharacters: storedCharacters.length,
        changesPlanned: preview.length,
        preview,
      },
      null,
      2,
    ),
  );

  if (mode === 'dry-run') {
    console.log('[migrate-character-avatar-slugs] Dry run complete. Re-run with --apply to persist changes.');
    return;
  }

  await redis.hset(REDIS_CHARACTERS_KEY, updates);
  console.log(`[migrate-character-avatar-slugs] Applied ${preview.length} record updates.`);
}

run(parseArgs()).catch((error) => {
  console.error('[migrate-character-avatar-slugs] Failed:', error);
  process.exitCode = 1;
});
