import { withCharacterLore } from '@/lib/characterLore';
import type { Character } from '@/lib/repo';

const AVATAR_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SPRITE_PATH_RE = /\/assets\/characters\/([^/]+)\/sprite\.[a-z0-9]+(?:[?#].*)?$/i;

export function normalizeAvatarId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return AVATAR_ID_RE.test(normalized) ? normalized : null;
}

export function avatarIdFromSpriteRef(spriteRef: unknown): string | null {
  if (typeof spriteRef !== 'string') return null;
  const trimmed = spriteRef.trim();
  if (!trimmed) return null;

  const directMatch = trimmed.match(SPRITE_PATH_RE);
  if (directMatch) return normalizeAvatarId(directMatch[1]);

  try {
    const url = new URL(trimmed);
    const pathMatch = url.pathname.match(SPRITE_PATH_RE);
    if (pathMatch) return normalizeAvatarId(pathMatch[1]);
  } catch {
    // Not an absolute URL; no-op.
  }

  return null;
}

export function resolveAvatarId(character: Character): string | null {
  const enriched = withCharacterLore(character) ?? character;
  return normalizeAvatarId(enriched.slug) ?? avatarIdFromSpriteRef(enriched.artRefs?.sprite);
}
