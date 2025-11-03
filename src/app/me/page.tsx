import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getServerSession } from 'next-auth';

import { getRepo } from '@/lib/repo';
import { getModelUrl } from '@/data/characterModels';
import Cosmetics from '@/app/character/[id]/Cosmetics';
import { authOptions } from '@/lib/auth';
import BetaChecklist from '@/components/BetaChecklist';

const CharacterViewer3D = dynamic(() => import('@/components/CharacterViewer3D'), { ssr: false });

export default async function MePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return (
      <div className="min-h-screen py-16 px-4 bg-grid-overlay">
        <div className="cp-container max-w-2xl">
          <div className="cp-panel p-8 text-center">
            <h1 className="text-3xl font-extrabold text-white font-display mb-2">Your Pals</h1>
            <p className="cp-muted">Sign in to view your roster, claim new pals, and sync cosmetics across experiences.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/login" className="px-6 py-3 bg-white text-gray-900 rounded-lg font-bold">Sign in</Link>
              <Link href="/explore" className="px-6 py-3 border border-white/20 text-white rounded-lg font-bold hover:bg-white/5">Explore</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const repo = await getRepo();
  const ownerships = await repo.listOwnershipsByUser(userId);
  const characters = await Promise.all(
    ownerships.map(async (o) => (await repo.getCharacterById(o.characterId))!).filter(Boolean)
  );

  return (
    <div className="min-h-screen py-12 px-4 bg-grid-overlay">
      <div className="cp-container">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-white font-display">My Pals</h1>
          <div className="flex gap-2">
            <Link href="/claim" className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold">Claim</Link>
            <Link href="/play" className="px-4 py-2 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Play</Link>
          </div>
        </div>
        <div className="mb-10">
          <BetaChecklist userId={userId} />
        </div>

        {characters.length > 0 ? (
          <div className="space-y-8">
            {characters.map((c) => {
              const stats = (c?.stats || {}) as Record<string, number>;
              return (
                <div key={c!.id} className="cp-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-extrabold text-white font-display">{c!.name}</h2>
                    <div className="flex gap-2">
                      <span className="cp-chip">Owned</span>
                      <Link href={`/character/${c!.id}`} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-semibold">Open</Link>
                    </div>
                  </div>
                  <div className="grid lg:grid-cols-5 gap-6 items-start">
                    <div className="lg:col-span-3">
                      <CharacterViewer3D modelUrl={getModelUrl(c as any)} height={320} />
                    </div>
                    <div className="lg:col-span-2">
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-white font-display mb-3">Stats</h3>
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
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white font-display mb-3">Outfits</h3>
                        <Cosmetics characterId={c!.id} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="cp-panel p-8 text-center">
            <p className="cp-muted">No pals yet. Claim a code to add your first one.</p>
            <div className="mt-4">
              <Link href="/claim" className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold">Claim a Pal</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
