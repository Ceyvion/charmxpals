import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cache } from 'react';
import { getRepo } from '@/lib/repo';
import { withCharacterLore, type CharacterWithLore } from '@/lib/characterLore';
import CharacterCard from '@/components/CharacterCard';

const getUserByHandleCached = cache(async (handle: string) => {
  const repo = await getRepo();
  return repo.getUserByHandle(handle);
});

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const user = await getUserByHandleCached(params.handle);
  if (!user) {
    return {
      title: 'Profile Not Found',
    };
  }

  return {
    title: `@${user.handle || 'user'}`,
    description: `Public CharmPals profile for @${user.handle || 'user'}.`,
    alternates: {
      canonical: `/u/${user.handle || params.handle}`,
    },
  };
}

export default async function UserProfile({ params }: { params: { handle: string } }) {
  const repo = await getRepo();
  const user = await getUserByHandleCached(params.handle);
  if (!user) return notFound();

  let characters: CharacterWithLore[];
  if (repo.listOwnershipsWithCharactersByUser) {
    characters = (await repo.listOwnershipsWithCharactersByUser(user.id))
      .map((item) => withCharacterLore(item.character))
      .filter((character): character is CharacterWithLore => Boolean(character));
  } else {
    const ownerships = await repo.listOwnershipsByUser(user.id);
    const rawCharacters = await repo.getCharactersByIds(ownerships.map((ownership) => ownership.characterId));
    const characterById = new Map<string, CharacterWithLore>();
    for (const character of rawCharacters) {
      const enriched = withCharacterLore(character ?? null);
      if (!enriched) continue;
      characterById.set(character.id, enriched);
    }
    characters = ownerships
      .map((ownership) => characterById.get(ownership.characterId) ?? null)
      .filter((character): character is CharacterWithLore => Boolean(character));
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-grid-overlay">
      <div className="cp-container">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white font-display">@{user.handle || 'user'}</h1>
            <p className="cp-muted">
              Public roster profile
              {characters.length > 0 ? ` • ${characters.length} ${characters.length === 1 ? 'pal' : 'pals'}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/me" className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold">My Pals</Link>
            <Link href="/claim" className="px-4 py-2 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Claim</Link>
          </div>
        </div>
        {characters.length > 0 ? (
          <div className="cp-explore-grid">
            {characters.map((c) => (
              <CharacterCard key={c.id} c={c} owned />
            ))}
          </div>
        ) : (
          <div className="cp-panel p-8 text-center">
            <p className="cp-muted">No public pals yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
