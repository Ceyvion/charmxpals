import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getRepo } from '@/lib/repo';
import { notFound } from 'next/navigation';
import Cosmetics from './Cosmetics';
import CharacterShowcaseCard from '@/components/CharacterShowcaseCard';
import { getModelUrl } from '@/data/characterModels';

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
            <div className="cp-panel p-4 mb-6 bg-white/5 border border-white/10 rounded-2xl">
              <CharacterViewer3D modelUrl={getModelUrl(character)} height={380} />
            </div>
            <CharacterShowcaseCard
              name={character.name}
              rarity={character.rarity}
              image={character.artRefs?.thumbnail || null}
              rating={Number((character.rarity + 2.7).toFixed(1))}
            />
            {character.description && (
              <p className="mt-6 text-white/80 text-lg max-w-prose">{character.description}</p>
            )}
          </div>
          <div className="lg:col-span-2">
            <div className="cp-panel p-6 mb-6">
              <h2 className="text-xl font-bold text-white font-display mb-4">Stats</h2>
              {stats && (
                <div className="space-y-3">
                  {Object.entries(stats).map(([key, value]) => {
                    const v = Math.max(0, Math.min(100, Number(value)));
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                          <span className="capitalize">{key}</span>
                          <span className="font-semibold text-white">{v}</span>
                        </div>
                        <div className="cp-bar"><div className="cp-bar-fill" style={{ width: `${v}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                <Link href="/play/runner" className="px-5 py-3 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors">Play Mini-Game</Link>
                <Link href="/claim" className="px-5 py-3 bg-transparent border border-white/20 text-white rounded-lg font-medium hover:bg-white/5 transition-colors">Claim Another</Link>
              </div>
            </div>

            <div className="cp-panel p-6">
              <h2 className="text-xl font-bold text-white font-display mb-3">Cosmetics</h2>
              <Cosmetics characterId={character.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
