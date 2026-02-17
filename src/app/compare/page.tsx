import Link from "next/link";

import CompareClient, { type CompareCharacter } from "./CompareClient";
import { getRepo } from "@/lib/repo";
import { withCharacterLore, type CharacterWithLore } from "@/lib/characterLore";

export default async function ComparePage() {
  const repo = await getRepo();
  const characters = await repo.listCharacters({ limit: 48, offset: 0 });
  const enriched = characters
    .map((character) => withCharacterLore(character))
    .filter((value): value is CharacterWithLore => Boolean(value));

  if (enriched.length === 0) {
    return (
      <div className="min-h-screen py-12">
        <div className="cp-container">
          <div className="cp-panel border-dashed p-10 text-center">
            <h1 className="font-display text-3xl font-bold text-[var(--cp-text-primary)]">Compare &amp; Amplify</h1>
            <p className="mx-auto mt-3 max-w-lg text-base text-[var(--cp-text-secondary)]">
              We couldn&apos;t find any characters in the roster yet. Seed data or claim a pal to unlock the matchup view.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-semibold">
              <Link
                href="/explore"
                className="rounded-lg border-2 border-[var(--cp-border-strong)] bg-[var(--cp-text-primary)] px-4 py-2 text-[var(--cp-text-inverse)] transition-colors hover:bg-[var(--cp-gray-800)]"
              >
                Explore roster
              </Link>
              <Link
                href="/claim"
                className="rounded-lg border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-2 text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:text-[var(--cp-text-primary)]"
              >
                Claim a pal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sorted = enriched
    .map((character) => ({
      order: character.lore?.order ?? Number.MAX_SAFE_INTEGER,
      card: {
        id: character.id,
        name: character.name,
        slug: character.slug ?? character.lore?.slug ?? null,
        tagline: character.tagline ?? character.lore?.tagline ?? null,
        realm: character.realm ?? character.lore?.realm ?? null,
        title: character.title ?? character.lore?.title ?? null,
        vibe: character.vibe ?? character.lore?.vibe ?? null,
        coreCharm: character.coreCharm ?? character.lore?.coreCharm ?? null,
        danceStyle: character.danceStyle ?? character.lore?.danceStyle ?? null,
        personality: character.personality ?? character.lore?.personality ?? null,
        stats: Object.keys(character.stats ?? {}).length > 0 ? character.stats : character.lore?.stats ?? {},
        rarity: character.rarity,
        color: character.color ?? character.lore?.color ?? null,
        art: {
          thumbnail: character.artRefs?.thumbnail ?? null,
          portrait: character.artRefs?.portrait ?? null,
        },
      },
    }))
    .sort((a, b) => a.order - b.order);

  const payload: CompareCharacter[] = sorted.map((entry) => entry.card);

  return (
    <div className="min-h-screen py-12">
      <div className="cp-container space-y-10">
        <CompareClient characters={payload} />
      </div>
    </div>
  );
}
