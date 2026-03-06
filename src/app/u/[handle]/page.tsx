import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { withCharacterLore, type CharacterWithLore } from '@/lib/characterLore';
import CharacterCard from '@/components/CharacterCard';

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const repo = await getRepo();
  const user = await repo.getUserByHandle(params.handle);
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
  const user = await repo.getUserByHandle(params.handle);
  if (!user) return notFound();

  const ownerships = await repo.listOwnershipsByUser(user.id);
  const rawCharacters = await Promise.all(ownerships.map((ownership) => repo.getCharacterById(ownership.characterId)));
  const characters = rawCharacters
    .map((character) => withCharacterLore(character ?? null))
    .filter((character): character is CharacterWithLore => Boolean(character));

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
