import { getServerSession } from 'next-auth';

import { getRepo } from '@/lib/repo';
import { withCharacterLore, type CharacterWithLore } from '@/lib/characterLore';
import { authOptions } from '@/lib/auth';
import UltraHero from '@/components/landing/UltraHero';
import Interactive3DScanner from '@/components/landing/Interactive3DScanner';
import HorizontalCharacterShowcase from '@/components/landing/HorizontalCharacterShowcase';
import BentoFeatures from '@/components/landing/BentoFeatures';
import LiveStatsMarquee from '@/components/landing/LiveStatsMarquee';
import Interactive3DPreview from '@/components/landing/Interactive3DPreview';
import MagneticCTA from '@/components/landing/MagneticCTA';

export default async function Home() {
  const repo = await getRepo();
  const characters = await repo.listCharacters({ limit: 8, offset: 0 });
  const enriched = characters
    .map((character) => withCharacterLore(character))
    .filter((value): value is CharacterWithLore => Boolean(value));
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  const ownedIds = new Set<string>();
  if (userId) {
    const ownerships = await repo.listOwnershipsByUser(userId);
    for (const o of ownerships) ownedIds.add(o.characterId);
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Ultra Hero - Split Screen with 3D */}
      <UltraHero />

      {/* Live Stats Marquee */}
      <LiveStatsMarquee />

      {/* Interactive 3D Scanner Demo */}
      <Interactive3DScanner />

      {/* Horizontal Scroll Character Showcase */}
      <HorizontalCharacterShowcase
        characters={enriched.map((c) => ({
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

      {/* Bento Box Features */}
      <BentoFeatures />

      {/* Interactive 3D Character Preview */}
      <Interactive3DPreview />

      {/* Magnetic CTA */}
      <MagneticCTA />
    </div>
  );
}
