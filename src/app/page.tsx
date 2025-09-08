import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { cookies } from 'next/headers';
import HeroDeck from '@/components/HeroDeck';

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
      <section className="relative py-16 cp-hero-warp">
        <div className="cp-container">
          <div className="text-center max-w-4xl mx-auto" data-testid="home-hero-head">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="cp-chip">Season One • Free Access</span>
            </div>
            <h1 className="font-display font-extrabold leading-tight text-6xl md:text-8xl" data-testid="home-hero-title">Fun Games<br />CharmPals Arcade</h1>
            <p className="mt-3 cp-muted text-lg md:text-xl">Claim a pal, explore the squad, then jump into mini-games.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link href="/claim" className="px-6 py-3 bg-white text-gray-900 rounded-lg font-bold">Claim Now</Link>
              <Link href="/explore" className="px-6 py-3 border border-white/20 text-white rounded-lg font-bold hover:bg-white/5">Explore All</Link>
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
