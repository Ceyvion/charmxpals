import { getServerSession } from 'next-auth';

import { getRepo } from '@/lib/repo';
import Aurora from '@/components/Aurora';
import HeroAtmosphere from '@/components/HeroAtmosphere';
import HeroParticles from '@/components/HeroParticles';
import { withCharacterLore, type CharacterWithLore } from '@/lib/characterLore';
import { authOptions } from '@/lib/auth';
import NewHeroSection from '@/components/NewHeroSection';
import PhysicalDigitalBridge from '@/components/PhysicalDigitalBridge';
import CharacterShowcase from '@/components/CharacterShowcase';
import FeaturesGrid from '@/components/FeaturesGrid';
import CommunityProof from '@/components/CommunityProof';
import FinalCTA from '@/components/FinalCTA';

export default async function Home() {
  const repo = await getRepo();
  const characters = await repo.listCharacters({ limit: 6, offset: 0 });
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden cp-grid-soft">
        <Aurora />
        <HeroParticles />
        <HeroAtmosphere />
        <div className="cp-vignette" />
        <NewHeroSection />
      </section>

      {/* Physical-Digital Bridge */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <PhysicalDigitalBridge />
      </section>

      {/* Character Showcase */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-grid-overlay cp-grid-soft">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/20 to-transparent" />
        <CharacterShowcase
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
      </section>

      {/* Features Grid */}
      <section className="relative py-20 md:py-32">
        <FeaturesGrid />
      </section>

      {/* Community Proof */}
      <section className="relative py-20 md:py-32 overflow-hidden bg-grid-overlay cp-grid-soft">
        <CommunityProof />
      </section>

      {/* Final CTA */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl" />
        </div>
        <FinalCTA />
      </section>
    </div>
  );
}
