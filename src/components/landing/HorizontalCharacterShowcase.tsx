"use client";

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

type Character = {
  id: string;
  name: string;
  description?: string | null;
  rarity?: number;
  owned?: boolean;
  realm?: string | null;
  title?: string | null;
  tagline?: string | null;
};

const rarityLabel = (rarity?: number) => {
  if (rarity && rarity >= 5) return 'Legendary';
  if (rarity && rarity >= 4) return 'Epic';
  return 'Rare';
};

const rarityAccent = (rarity?: number) => {
  if (rarity && rarity >= 5) return 'rgba(255, 198, 150, 0.32)';
  if (rarity && rarity >= 4) return 'rgba(174, 186, 255, 0.3)';
  return 'rgba(120, 224, 255, 0.28)';
};

export default function HorizontalCharacterShowcase({ characters }: { characters: Character[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const progress = scrollLeft / (scrollWidth - clientWidth || 1);
      setScrollProgress(progress);
    };

    const scrollContainer = scrollRef.current;
    scrollContainer?.addEventListener('scroll', handleScroll);
    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-grid-overlay cp-grid-soft opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-amber-950/20" />

      <div className="relative z-10">
        <div className="cp-container max-w-7xl mb-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="cp-kicker">The Roster</span>
            </div>
            <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
              <span className="text-white">Collect Your</span>
              <br />
              <span className="cp-gradient-text">Dream Squad</span>
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
              Drag to explore. Each CharmXPal has unique stats, lore, and rarities.
            </p>

            <div className="max-w-md mx-auto">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-300/80 via-blue-200/70 to-amber-200/70 transition-all duration-300 ease-out"
                  style={{ width: `${scrollProgress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="horizontal-scroll-container flex gap-8 px-8 md:px-16 pb-8">
          {characters.map((char) => (
            <Link
              key={char.id}
              href={`/character/${char.id}`}
              className="horizontal-scroll-item group relative w-[320px] md:w-[400px] flex-shrink-0"
            >
              <div
                className="relative h-[500px] md:h-[600px] rounded-3xl overflow-hidden cp-surface-neo transition-all duration-500 group-hover:scale-[1.02]"
                style={{ '--surface-accent': rarityAccent(char.rarity) } as CSSProperties}
              >
                <div className="absolute inset-0 bg-grid-overlay cp-grid-soft opacity-25" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />

                <div className="relative h-full flex flex-col justify-end p-8">
                  <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                    <div className="flex gap-2">
                      <span className="cp-pill text-[0.6rem]">
                        {rarityLabel(char.rarity)}
                      </span>
                      {char.owned && (
                        <span
                          className="cp-pill text-[0.6rem]"
                          style={{
                            '--pill-bg': 'rgba(16, 120, 86, 0.25)',
                            '--pill-border': 'rgba(167, 243, 208, 0.45)',
                            '--pill-color': 'rgba(236, 253, 245, 0.95)',
                          } as CSSProperties}
                        >
                          Owned
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[0.65rem] uppercase tracking-[0.3em] text-white/60">
                      {((char.rarity ?? 3) + 2.7).toFixed(1)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {char.realm && (
                      <div className="inline-flex px-3 py-1 rounded-full border border-white/10 bg-white/5">
                        <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                          {char.realm}
                        </span>
                      </div>
                    )}

                    <h3 className="font-display font-black text-4xl md:text-5xl text-white leading-tight">
                      {char.name}
                    </h3>

                    {char.title && (
                      <p className="text-lg font-semibold text-white/80">{char.title}</p>
                    )}

                    {(char.tagline || char.description) && (
                      <p className="text-sm text-white/70 line-clamp-3 leading-relaxed">
                        {char.tagline || char.description}
                      </p>
                    )}

                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white/80">
                      <span>View Details</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          <Link
            href="/explore"
            className="horizontal-scroll-item group relative w-[320px] md:w-[400px] flex-shrink-0"
          >
            <div className="relative h-[500px] md:h-[600px] rounded-3xl overflow-hidden cp-surface-neo flex items-center justify-center transition-all duration-500 group-hover:scale-[1.02]">
              <div className="text-center px-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl border border-white/15 bg-white/5 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-3xl text-white mb-4">
                  Explore Full<br />Roster
                </h3>
                <p className="text-white/70 mb-6">
                  Discover every CharmXPal and their unique abilities.
                </p>
                <div className="inline-flex items-center gap-2 text-cyan-200 font-semibold group-hover:gap-3 transition-all">
                  <span>View All</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="text-center mt-8 opacity-60">
          <div className="inline-flex items-center gap-2 text-white text-sm font-semibold">
            <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>Drag to explore</span>
            <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)', animationDelay: '0.2s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
