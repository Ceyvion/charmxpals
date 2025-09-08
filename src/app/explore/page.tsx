import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import CharacterCard from '@/components/CharacterCard';
import { cookies } from 'next/headers';

export default async function ExplorePage() {
  const repo = await getRepo();
  const characters = await repo.listCharacters({ limit: 24, offset: 0 });
  const userId = cookies().get('cp_user')?.value || null;
  const ownedIds = new Set<string>();
  if (userId) {
    const ownerships = await repo.listOwnershipsByUser(userId);
    for (const o of ownerships) ownedIds.add(o.characterId);
  }

  return (
    <div className="min-h-screen py-12">
      <div className="cp-container">
        <div className="cp-panel p-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="cp-kicker mb-2">Explore</div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display leading-tight">Meet the CharmPals</h1>
              <p className="mt-2 cp-muted text-base md:text-lg max-w-prose">Explore our carefully crafted squad. Collect IRL, flex online, and jump into mini‑games.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="cp-chip">All</span>
              <span className="cp-chip">Legendary</span>
              <span className="cp-chip">Epic</span>
              <span className="cp-chip">Rare</span>
              <Link href="/claim" className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold">Scan & Claim</Link>
            </div>
          </div>
        </div>

        {characters.length > 0 ? (
          <div className="mt-8 cp-explore-grid">
            {characters.map((c) => (
              <div key={c.id} className="cp-card">
                <CharacterCard c={c} owned={ownedIds.has(c.id)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-8 text-center p-8 border border-white/10 rounded-2xl bg-white/5">
            <p className="cp-muted">No characters yet. Seed data or use memory mode.</p>
            <div className="mt-4">
              <Link href="/claim" className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold">Claim instead</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
