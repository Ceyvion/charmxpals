import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import CharacterCard from '@/components/CharacterCard';
import ExploreClient from './ExploreClient';
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

  const owned = Array.from(ownedIds);
  return (
    <div className="min-h-screen py-12">
      <div className="cp-container">
        {characters.length > 0 ? (
          <ExploreClient characters={characters as any} ownedIds={owned} />
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
