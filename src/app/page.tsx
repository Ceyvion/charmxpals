import { getRepo } from '@/lib/repo';
import { cookies } from 'next/headers';
import HeroDeck from '@/components/HeroDeck';
import Aurora from '@/components/Aurora';
import HeroHeader from '@/components/HeroHeader';

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
      <section className="relative py-12 md:py-16 cp-hero-warp overflow-hidden cp-grid-soft">
        <Aurora />
        <div className="cp-vignette" />
        <div className="cp-container">
          <HeroHeader />

          <div className="mt-10 md:mt-12">
            {/* Mark owned cards inline */}
            <HeroDeck items={characters.map((c) => ({ ...c, owned: ownedIds.has(c.id) })) as any} />
          </div>
        </div>
      </section>
    </div>
  );
}
