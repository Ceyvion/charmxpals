import type { Metadata } from 'next';
import Link from 'next/link';

import ExploreClient from './ExploreClient';
import { withCharacterLore, type CharacterWithLore } from '@/lib/characterLore';
import { getCachedCharacters } from '@/lib/cachedCharacters';

export const metadata: Metadata = {
  title: 'Explore the Roster',
  description: 'Browse the CharmPals roster, compare stats, and preview who to claim next.',
  alternates: {
    canonical: '/explore',
  },
};

export const dynamic = 'force-dynamic';

export default async function ExplorePage() {
  const characters = await getCachedCharacters(96, 0);
  const enriched = characters
    .map((character) => withCharacterLore(character))
    .filter((value): value is CharacterWithLore => Boolean(value));
  return (
    <div className="min-h-screen py-12">
      <div className="cp-container">
        {enriched.length > 0 ? (
          <ExploreClient characters={enriched} ownedIds={[]} />
        ) : (
          <div className="cp-panel mt-8 rounded-2xl p-8 text-center">
            <p className="cp-muted">No characters yet. Seed data or use memory mode.</p>
            <div className="mt-4">
              <Link
                href="/claim"
                className="inline-flex rounded-lg border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-6 py-3 text-[var(--cp-text-secondary)] font-semibold transition-colors hover:border-[var(--cp-border-strong)] hover:text-[var(--cp-text-primary)]"
              >
                Claim instead
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
