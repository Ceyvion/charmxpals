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
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="cp-chip">Season One • Free Access</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold font-display leading-tight">
            Meet the CharmPals
          </h1>
          <p className="mt-3 cp-muted text-base md:text-lg">
            Explore our carefully crafted squad. Collect IRL, flex online, and jump into mini‑games.
          </p>
        </div>

        {characters.length > 0 ? (
          <div className="mt-10 cp-explore-grid">
            {characters.map((c) => (
              <CharacterCard key={c.id} c={c} owned={ownedIds.has(c.id)} />
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
