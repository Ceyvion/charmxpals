import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getRepo } from '@/lib/repo';
import { notFound } from 'next/navigation';
import Cosmetics from './Cosmetics';
import CharacterShowcaseCard from '@/components/CharacterShowcaseCard';
import { getModelUrl } from '@/data/characterModels';
import RevealOnView from '@/components/RevealOnView';
import CharacterStats from '@/components/CharacterStats';

const CharacterViewer3D = dynamic(() => import('@/components/CharacterViewer3D'), { ssr: false });

export default async function CharacterPage({ params }: { params: { id: string } }) {
  const repo = await getRepo();
  const character = await repo.getCharacterById(params.id);

  if (!character) return notFound();

  const stats = character.stats as Record<string, number>;
  // Now show the 3D viewer on character pages (client-only component via dynamic import).

  return (
    <div className="min-h-screen py-12 px-4 bg-grid-overlay">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/explore" className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5">← Explore</Link>
          <div className="flex gap-3">
            <Link href="/compare" className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/5">Compare</Link>
            <Link href="/3d" className="px-4 py-2 rounded-lg bg-white text-gray-900 font-semibold hover:bg-gray-100">View 3D</Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <RevealOnView className="cp-panel p-4 mb-6 bg-white/5 border border-white/10 rounded-2xl">
              <div className="cp-kicker">Character</div>
              <CharacterViewer3D modelUrl={getModelUrl(character)} height={380} />
            </RevealOnView>
            <RevealOnView>
              <CharacterShowcaseCard
                name={character.name}
                rarity={character.rarity}
                image={character.artRefs?.thumbnail || null}
                rating={Number((character.rarity + 2.7).toFixed(1))}
              />
            </RevealOnView>
            {character.description && (
              <p className="mt-6 text-white/80 text-lg max-w-prose cp-swiss-body">{character.description}</p>
            )}
          </div>
          <div className="lg:col-span-2">
            <RevealOnView className="cp-panel p-6 mb-6">
              <h2 className="cp-kicker mb-2">Stats</h2>
              {stats && <CharacterStats stats={stats} />}

              <div className="mt-6 flex gap-3">
                <Link href="/play/runner" className="px-5 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors">Play Mini-Game</Link>
                <Link href="/claim" className="px-5 py-3 bg-transparent border border-white/20 text-white rounded-lg font-medium hover:bg-white/5 transition-colors">Claim Another</Link>
              </div>
            </RevealOnView>

            <RevealOnView className="cp-panel p-6">
              <h2 className="cp-kicker mb-2">Outfits</h2>
              <Cosmetics characterId={character.id} />
            </RevealOnView>
          </div>
        </div>
      </div>
    </div>
  );
}
