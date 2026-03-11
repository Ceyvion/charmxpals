"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useOwnedCharacterIds } from '@/lib/useOwnedCharacterIds';

type Character = {
  id: string;
  name: string;
  description?: string | null;
  rarity?: number;
  owned?: boolean;
  artRefs?: Record<string, string>;
  slug?: string | null;
  realm?: string | null;
  title?: string | null;
  tagline?: string | null;
};

const rarityLabel = (rarity?: number) => {
  if (rarity && rarity >= 5) return 'Legendary';
  if (rarity && rarity >= 4) return 'Epic';
  return 'Rare';
};

const rarityBorder = (rarity?: number) => {
  if (rarity && rarity >= 5) return 'var(--cp-yellow)';
  if (rarity && rarity >= 4) return 'var(--cp-violet)';
  return 'var(--cp-cyan)';
};

const pushCandidate = (target: string[], seen: Set<string>, value?: string | null) => {
  if (!value) return;
  const normalized = value.trim();
  if (!normalized || seen.has(normalized)) return;
  seen.add(normalized);
  target.push(normalized);
};

const artCandidatesFor = (character: Character): string[] => {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const refs = character.artRefs;

  if (refs) {
    pushCandidate(candidates, seen, refs.thumbnail);
    pushCandidate(candidates, seen, refs.card);
    pushCandidate(candidates, seen, refs.portrait);
    pushCandidate(candidates, seen, refs.banner);
    pushCandidate(candidates, seen, refs.signature);
    pushCandidate(candidates, seen, refs.full);
    pushCandidate(candidates, seen, refs.sprite);
    for (const value of Object.values(refs)) {
      pushCandidate(candidates, seen, value);
    }
  }

  if (character.slug) {
    const base = `/assets/characters/${character.slug}`;
    pushCandidate(candidates, seen, `${base}/thumb.webp`);
    pushCandidate(candidates, seen, `${base}/card.webp`);
    pushCandidate(candidates, seen, `${base}/portrait.webp`);
  }

  pushCandidate(candidates, seen, '/card-placeholder.svg');
  return candidates;
};

export default function HorizontalCharacterShowcase({ characters }: { characters: Character[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mediaIndexById, setMediaIndexById] = useState<Record<string, number>>({});
  const initialOwnedIds = characters.filter((character) => character.owned).map((character) => character.id);
  const ownedIds = useOwnedCharacterIds(initialOwnedIds);
  const ownedSet = new Set(ownedIds);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const scrollRange = scrollWidth - clientWidth;
      const rawProgress = scrollRange > 0 ? scrollLeft / scrollRange : 0;
      const progress = Math.min(1, Math.max(0, rawProgress));
      setScrollProgress(progress);
    };

    const scrollContainer = scrollRef.current;
    scrollContainer?.addEventListener('scroll', handleScroll);
    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative py-20 md:py-32 overflow-hidden cp-section-dark">
      <div className="relative z-10">
        <div className="cp-container max-w-7xl mb-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="cp-kicker">The Roster</span>
            </div>
            <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
              <span className="text-[var(--cp-white)]">Collect Your</span>
              <br />
              <span className="cp-gradient-text">Dream Squad</span>
            </h2>
            <p className="text-xl text-[var(--cp-gray-300)] max-w-2xl mx-auto mb-8">
              Each CharmXPal has unique stats, lore, and rarities. Scroll to explore the roster.
            </p>

            <div className="max-w-md mx-auto">
              <div className="h-1 bg-[var(--cp-gray-700)] rounded-[var(--cp-radius-sm)] overflow-hidden">
                <div
                  className="h-full bg-[var(--cp-white)] transition-all duration-300 ease-out"
                  style={{ width: `${scrollProgress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="horizontal-scroll-container flex gap-8 px-8 md:px-16 pb-8">
          {characters.map((char) => {
            const artCandidates = artCandidatesFor(char);
            const mediaIndex = mediaIndexById[char.id] ?? 0;
            const mediaSrc = artCandidates[Math.min(mediaIndex, artCandidates.length - 1)] ?? '/card-placeholder.svg';

            return (
              <Link
                key={char.id}
                href={`/character/${char.id}`}
                className="horizontal-scroll-item group relative w-[320px] md:w-[400px] flex-shrink-0"
              >
                <div
                  className="relative h-[500px] md:h-[600px] rounded-[var(--cp-radius-lg)] overflow-hidden bg-[var(--cp-gray-900)] border-2 transition-all duration-300 group-hover:border-[var(--cp-white)]"
                  style={{ borderColor: rarityBorder(char.rarity) }}
                >
                  <div className="absolute inset-0">
                    <Image
                      src={mediaSrc}
                      alt={`${char.name} character art`}
                      fill
                      sizes="(min-width: 768px) 400px, 320px"
                      className="object-cover object-center opacity-90 transition-transform duration-500 group-hover:scale-105"
                      onError={() => {
                        const nextIndex = mediaIndex + 1;
                        if (nextIndex >= artCandidates.length) return;
                        setMediaIndexById((prev) => ({ ...prev, [char.id]: nextIndex }));
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/92" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_58%)]" />
                  </div>

                  <div className="relative h-full flex flex-col justify-end p-8">
                    <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                      <div className="flex gap-2">
                        <span className="cp-pill text-[0.6rem]">
                          {rarityLabel(char.rarity)}
                        </span>
                        {ownedSet.has(char.id) && (
                          <span className="cp-pill text-[0.6rem]" style={{ borderColor: 'var(--cp-green)', color: 'var(--cp-green)' }}>
                            Owned
                          </span>
                        )}
                      </div>
                      <div className="cp-chip text-[0.65rem]">
                        {((char.rarity ?? 3) + 2.7).toFixed(1)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {char.realm && (
                        <div className="inline-flex px-3 py-1 rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-gray-700)] bg-black/35 backdrop-blur-[1px]">
                          <span className="text-xs font-semibold text-[var(--cp-gray-300)] uppercase tracking-wider">
                            {char.realm}
                          </span>
                        </div>
                      )}

                      <h3 className="font-display font-black text-4xl md:text-5xl text-[var(--cp-white)] leading-tight">
                        {char.name}
                      </h3>

                      {char.title && (
                        <p className="text-lg font-semibold text-[var(--cp-gray-300)]">{char.title}</p>
                      )}

                      {(char.tagline || char.description) && (
                        <p className="text-sm text-[var(--cp-gray-400)] line-clamp-3 leading-relaxed">
                          {char.tagline || char.description}
                        </p>
                      )}

                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--cp-white)]">
                        <span>View Details</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          <Link
            href="/explore"
            className="horizontal-scroll-item group relative w-[320px] md:w-[400px] flex-shrink-0"
          >
            <div className="relative h-[500px] md:h-[600px] rounded-[var(--cp-radius-lg)] overflow-hidden bg-[var(--cp-gray-900)] border-2 border-[var(--cp-gray-700)] flex items-center justify-center transition-all duration-300 group-hover:border-[var(--cp-white)]">
              <div className="text-center px-8">
                <div className="w-16 h-16 mx-auto mb-6 rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-gray-700)] bg-[var(--cp-gray-800)] flex items-center justify-center group-hover:border-[var(--cp-white)] transition-colors">
                  <svg className="w-7 h-7 text-[var(--cp-gray-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-3xl text-[var(--cp-white)] mb-3">
                  Explore Full<br />Roster
                </h3>
                <p className="text-sm text-[var(--cp-gray-500)] mb-8">
                  Discover every CharmXPal and their unique abilities.
                </p>
                <span className="cp-cta-primary text-sm font-display">
                  View All
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 text-[var(--cp-gray-500)] text-sm font-semibold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>Scroll to explore</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
