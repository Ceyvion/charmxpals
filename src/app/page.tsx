import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { cookies } from 'next/headers';
import HeroDeck from '@/components/HeroDeck';
import Aurora from '@/components/Aurora';

export default async function Home() {
  const repo = await getRepo();
  const characters = await repo.listCharacters({ limit: 5, offset: 0 });
  const userId = cookies().get('cp_user')?.value || null;
  const ownedIds = new Set<string>();
  if (userId) {
    const ownerships = await repo.listOwnershipsByUser(userId);
    for (const o of ownerships) ownedIds.add(o.characterId);
  }

  return (
    <div className="min-h-screen bg-grid-overlay">
      <section className="relative py-16 cp-hero-warp overflow-hidden">
        <Aurora />
        <div className="cp-container">
          <div className="text-center max-w-4xl mx-auto" data-testid="home-hero-head">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="cp-chip">Season One • Free Access</span>
            </div>
            <h1 className="font-display font-extrabold leading-tight text-6xl md:text-8xl" data-testid="home-hero-title">Scan a Charm.<br />Meet Your Pal.</h1>
            <p className="mt-3 cp-muted text-lg md:text-xl">Unlock a 3D pal from your physical charm and jump into quick arcade games. No app—play in seconds.</p>
            <div className="mt-6 flex items-center justify-center">
              <div className="cp-cta">
                <Link href="/claim" className="px-5 py-2.5 bg-white text-gray-900 rounded-lg font-bold">Claim Your Pal</Link>
                <Link href="/play" className="px-5 py-2.5 border border-white/20 text-white rounded-lg font-bold hover:bg-white/5">Try a Game</Link>
                <Link href="/explore" className="hidden md:inline-flex px-5 py-2.5 border border-white/20 text-white rounded-lg font-bold hover:bg-white/5">Explore the Squad</Link>
              </div>
            </div>
          </div>

          <div className="mt-8">
            {/* Mark owned cards inline */}
            <HeroDeck items={characters.map((c) => ({ ...c, owned: ownedIds.has(c.id) })) as any} />
          </div>
        </div>
      </section>
    </div>
  );
}
