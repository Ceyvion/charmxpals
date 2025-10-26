"use client";

import Link from "next/link";
import RevealOnView from "@/components/RevealOnView";
import type { CharacterWithLore } from "@/lib/characterLore";

type Props = {
  items: CharacterWithLore[];
};

function hexToRgba(hex: string | null | undefined, alpha: number): string {
  if (!hex) return `rgba(188,154,255,${alpha})`;
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function topStats(stats: Record<string, number> | null | undefined) {
  if (!stats) return [];
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

export default function RealmSpotlights({ items }: Props) {
  if (!items.length) return null;
  return (
    <section className="relative py-16 sm:py-20 lg:py-24">
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f9f4ff]/70 to-transparent pointer-events-none -z-10" />
      <div className="cp-container space-y-12">
        <RevealOnView className="text-center space-y-3">
          <span className="cp-pill inline-flex">Worlds in Motion</span>
          <h2 className="text-3xl md:text-4xl font-display font-extrabold text-white">
            Step into the realms your pals defend.
          </h2>
          <p className="cp-muted max-w-2xl mx-auto text-base md:text-lg">
            Each claim unlocks more than a model—it syncs you to a living realm, with signature rhythms, hazards,
            and squad boosts. Start feeling the beat before you even queue up.
          </p>
        </RevealOnView>

        <div className="grid gap-6 lg:gap-8 md:grid-cols-2 xl:grid-cols-3">
          {items.map((character, idx) => {
            const accent = character.color || '#BC9AFF';
            const accentStrong = hexToRgba(accent, 0.58);
            const accentSoft = hexToRgba(accent, 0.2);
            const stats = topStats(character.stats || null);
            return (
              <RevealOnView key={character.id} className="h-full" delay={idx * 80}>
                <article className="cp-spotlight-card h-full">
                  <div
                    className="cp-spotlight-backdrop"
                    style={{
                      background: `radial-gradient(120% 120% at 20% 20%, ${accentStrong} 0%, ${accentSoft} 36%, rgba(16,7,32,0) 74%)`,
                    }}
                  />
                  <header className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="cp-pill">{character.realm || 'Unknown Realm'}</span>
                      <span className="cp-chip text-xs uppercase tracking-[0.2em]">Series • {character.codeSeries || 'TBA'}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-extrabold text-white">{character.name}</h3>
                      {character.title && <p className="text-white/70 text-sm font-semibold">{character.title}</p>}
                    </div>
                    {character.tagline && <p className="cp-muted text-sm">{character.tagline}</p>}
                    {character.vibe && (
                      <p className="cp-muted text-sm leading-relaxed">
                        {character.vibe}
                      </p>
                    )}
                  </header>

                  {stats.length > 0 && (
                    <div className="cp-spotlight-stats mt-6">
                      {stats.map(([label, value]) => (
                        <div key={label}>
                          <span className="cp-kicker text-[0.65rem] tracking-[0.28em] text-white/60">{label}</span>
                          <span className="text-white text-xl font-semibold">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <footer className="mt-8 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/character/${character.id}`}
                      className="cp-spotlight-link"
                    >
                      View character
                    </Link>
                    <Link
                      href="/claim"
                      className="cp-spotlight-outline"
                    >
                      Claim this vibe
                    </Link>
                  </footer>
                </article>
              </RevealOnView>
            );
          })}
        </div>
      </div>
    </section>
  );
}
