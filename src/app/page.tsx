import { getRepo } from '@/lib/repo';
import { cookies } from 'next/headers';
import HeroDeck from '@/components/HeroDeck';
import Aurora from '@/components/Aurora';
import HeroHeader from '@/components/HeroHeader';
import HeroAtmosphere from '@/components/HeroAtmosphere';
import HeroParticles from '@/components/HeroParticles';
import RealmSpotlights from '@/components/RealmSpotlights';
import { withCharacterLore, type CharacterWithLore } from '@/lib/characterLore';

export default async function Home() {
  const repo = await getRepo();
  const characters = await repo.listCharacters({ limit: 5, offset: 0 });
  const enriched = characters
    .map((character) => withCharacterLore(character))
    .filter((value): value is CharacterWithLore => Boolean(value));
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
        <HeroParticles />
        <HeroAtmosphere />
        <div className="cp-vignette" />
        <div className="cp-container">
          <HeroHeader />

          <div className="mt-12 md:mt-16 lg:mt-24">
            {/* Mark owned cards inline */}
            <HeroDeck
              items={enriched.map((c) => ({
                id: c.id,
                name: c.name,
                rarity: c.rarity,
                owned: ownedIds.has(c.id),
                realm: c.realm,
                title: c.title,
                tagline: c.tagline,
                description: c.description,
              }))}
            />
          </div>
        </div>
      </section>

      <RealmSpotlights items={enriched.slice(0, 3)} />
    </div>
  );
}
