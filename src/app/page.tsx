import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { withCharacterLore, type CharacterWithLore } from '@/lib/characterLore';
import { getSafeServerSession } from '@/lib/serverSession';
import UltraHero from '@/components/landing/UltraHero';
import HorizontalCharacterShowcase from '@/components/landing/HorizontalCharacterShowcase';
import BentoFeatures from '@/components/landing/BentoFeatures';
import LiveStatsMarquee from '@/components/landing/LiveStatsMarquee';
import MagneticCTA from '@/components/landing/MagneticCTA';
import Interactive3DScanner from '@/components/landing/Interactive3DScanner';
import Interactive3DPreview from '@/components/landing/Interactive3DPreview';

const LEGACY_ACTIVE_NAMES = new Set(['blaze the dragon']);

function normalizeName(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function buildLandingRoster(characters: CharacterWithLore[]): CharacterWithLore[] {
  const active = characters.filter((character) => Boolean(character.lore) || LEGACY_ACTIVE_NAMES.has(normalizeName(character.name)));

  const loreBacked = active
    .filter((character) => Boolean(character.lore))
    .sort((a, b) => {
      const orderA = a.lore?.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.lore?.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

  const deduped: CharacterWithLore[] = [];
  const seenKeys = new Set<string>();
  for (const character of loreBacked) {
    const identity = character.lore?.slug || character.slug || normalizeName(character.name) || character.id;
    if (seenKeys.has(identity)) continue;
    seenKeys.add(identity);
    deduped.push(character);
  }

  const blaze = active.find((character) => normalizeName(character.name) === 'blaze the dragon');
  if (blaze && !deduped.some((entry) => entry.id === blaze.id)) {
    deduped.splice(Math.min(1, deduped.length), 0, blaze);
  }

  return deduped.slice(0, 8);
}

export default async function Home() {
  const repo = await getRepo();
  const characters = await repo.listCharacters({ limit: 64, offset: 0 });
  const enriched = characters
    .map((character) => withCharacterLore(character))
    .filter((value): value is CharacterWithLore => Boolean(value));
  const landingRoster = buildLandingRoster(enriched);
  const session = await getSafeServerSession();
  const userId = session?.user?.id ?? null;
  const ownedIds = new Set<string>();
  if (userId) {
    const ownerships = await repo.listOwnershipsByUser(userId);
    for (const ownership of ownerships) ownedIds.add(ownership.characterId);
  }

  const heroCharacters = landingRoster.slice(0, 3).map((character) => ({
    id: character.id,
    name: character.name,
    rarity: character.rarity,
    realm: character.realm,
    title: character.title,
    tagline: character.tagline,
    description: character.description,
    artRefs: character.artRefs,
    color: character.color,
  }));

  return (
    <div className="min-h-screen overflow-x-hidden">
      <UltraHero characters={heroCharacters} />

      <LiveStatsMarquee />

      <HorizontalCharacterShowcase
        characters={landingRoster.map((character) => ({
          id: character.id,
          name: character.name,
          rarity: character.rarity,
          owned: ownedIds.has(character.id),
          artRefs: character.artRefs,
          slug: character.slug,
          realm: character.realm,
          title: character.title,
          tagline: character.tagline,
          description: character.description,
        }))}
      />

      <Interactive3DScanner />

      <Interactive3DPreview />

      <BentoFeatures />

      <section className="relative py-20 md:py-28 overflow-hidden cp-section-dark">
        <div className="cp-container max-w-7xl relative z-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] items-center max-w-6xl mx-auto">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2">
                <span className="cp-kicker">Multiplayer</span>
              </div>
              <h2 className="font-display font-black text-5xl md:text-6xl leading-tight">
                <span className="text-[var(--cp-white)]">Rift Arena</span>
                <br />
                <span className="cp-gradient-text">Is Live</span>
              </h2>
              <p className="text-lg text-[var(--cp-gray-300)] leading-relaxed max-w-lg">
                Jump into real-time 2D battles with your selected character. Fast rounds, instant matchmaking, and bragging rights.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/arena" className="cp-cta-primary font-display">
                  <span>Enter Arena</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="/play" className="cp-cta-ghost font-display">
                  Browse Modes
                </Link>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--cp-gray-500)]">
                <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-green)]" />
                <span>Live now</span>
              </div>
            </div>
            <div className="rounded-[var(--cp-radius-lg)] overflow-hidden border-2 border-[var(--cp-gray-700)]">
              <div
                className="relative min-h-[280px] md:min-h-[360px] bg-cover bg-center bg-[var(--cp-gray-900)]"
                style={{
                  backgroundImage: 'url(/assets/arena/maps/neon-grid.png)',
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <MagneticCTA />
    </div>
  );
}
