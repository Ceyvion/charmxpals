"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { worldTagline } from '@/data/characterLore';
import { trackEvent } from '@/lib/analyticsClient';

type HeroCharacter = {
  id: string;
  name: string;
  description?: string | null;
  rarity?: number;
  artRefs?: Record<string, string>;
  realm?: string | null;
  title?: string | null;
  tagline?: string | null;
  color?: string | null;
};

const rarityLabel = (rarity = 3) => {
  if (rarity >= 5) return 'Legendary';
  if (rarity >= 4) return 'Epic';
  if (rarity >= 3) return 'Rare';
  return 'Common';
};

export default function UltraHero({ characters = [] }: { characters?: HeroCharacter[] }) {
  const [mounted, setMounted] = useState(false);
  const heroCards = characters.slice(0, 3);

  useEffect(() => {
    setMounted(true);
  }, []);

  const renderCard = (card: HeroCharacter, compact = false) => {
    const rarity = card.rarity ?? 3;
    const label = rarityLabel(rarity);
    const rating = (rarity + 2.7).toFixed(1);
    const media = card.artRefs?.thumbnail || card.artRefs?.full || null;
    const headline = card.tagline || card.description;
    const initials = card.name.slice(0, 2).toUpperCase();

    return (
      <Link
        key={card.id}
        href={`/character/${card.id}`}
        className="group block cursor-pointer"
      >
        <div className="cp-card-hero overflow-hidden">
          <div className={`${compact ? 'h-32' : 'h-36'} relative overflow-hidden bg-[var(--cp-gray-100)]`}>
            {media ? (
              <Image
                src={media}
                alt={card.name}
                fill
                sizes={compact ? "(min-width: 640px) 220px, 100vw" : "(min-width: 640px) 320px, 100vw"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-3xl font-black tracking-[0.2em] text-[var(--cp-gray-300)]">
                {initials}
              </div>
            )}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="cp-chip text-[10px]">{label}</span>
            </div>
            <div className="absolute top-3 right-3 cp-chip text-[10px]">{rating}</div>
            {card.realm && (
              <div className="absolute bottom-3 left-3 rounded-[var(--cp-radius-sm)] bg-[var(--cp-white)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cp-text-secondary)] border border-[var(--cp-border)]">
                {card.realm}
              </div>
            )}
          </div>
          <div className={`${compact ? 'p-4' : 'p-5'} space-y-2`}>
            <div className="space-y-1">
              <h3 className="font-display text-lg font-black text-[var(--cp-text-primary)] truncate">
                {card.name}
              </h3>
              {card.title && (
                <p className="text-xs font-semibold text-[var(--cp-text-secondary)] truncate">{card.title}</p>
              )}
            </div>
            {headline && (
              <p className="text-xs text-[var(--cp-text-muted)] line-clamp-2 leading-relaxed">{headline}</p>
            )}
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--cp-red)]">
              <span>View profile</span>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden cp-section-dark">
      <div className="relative z-10 w-full px-4 py-24">
        <div className="cp-container max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div className="space-y-8" data-testid="home-hero-head">
              <div
                className={`inline-flex items-center gap-3 transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
                }`}
              >
                <span className="cp-pill">Beta Wave 1</span>
                <span className="text-xs font-semibold tracking-[0.3em] uppercase text-[var(--cp-gray-500)]">
                  Live
                </span>
              </div>

              <div
                className={`transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '120ms' }}
              >
                <h1 className="font-display font-black leading-[0.9] tracking-tight text-6xl sm:text-7xl lg:text-8xl">
                  <span className="block text-[var(--cp-white)]">Scan. Boot.</span>
                  <span className="block cp-gradient-text">Own the moment.</span>
                </h1>
              </div>

              <div
                className={`transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '220ms' }}
              >
                <p className="text-xl md:text-2xl text-[var(--cp-gray-300)] leading-relaxed max-w-xl">
                  {worldTagline} Flash your CharmXPal and watch it materialize in under five seconds.
                </p>
                <p className="text-base md:text-lg text-[var(--cp-gray-500)] mt-4 max-w-lg">
                  No apps, no wallets, no friction—just instant play.
                </p>
              </div>

              <div
                className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 ${
                  mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: '320ms' }}
              >
                <Link
                  href="/claim"
                  className="cp-cta-primary font-display"
                  onClick={() => trackEvent('home_cta_click', { target: 'claim', source: 'hero' })}
                >
                  <span>Claim Your Pal</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="/play"
                  className="cp-cta-ghost font-display"
                  onClick={() => trackEvent('home_cta_click', { target: 'play', source: 'hero' })}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Play Demo</span>
                </Link>
              </div>

              <div
                className={`flex flex-wrap items-center gap-4 text-sm font-semibold text-[var(--cp-gray-500)] transition-all duration-700 ${
                  mounted ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transitionDelay: '420ms' }}
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-cyan)]" />
                  <span>Boot in under 5s</span>
                </div>
                <span className="text-[var(--cp-gray-700)]">•</span>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-yellow)]" />
                  <span>One-shot codes</span>
                </div>
                <span className="text-[var(--cp-gray-700)]">•</span>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-[2px] bg-[var(--cp-green)]" />
                  <span>Verified ownership</span>
                </div>
              </div>
            </div>

            <div
              className={`relative transition-all duration-700 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: '240ms' }}
              data-testid="home-hero-deck"
            >
              <div className="relative max-w-lg mx-auto">
                <div className="cp-panel p-6 sm:p-8 bg-[var(--cp-white)]">
                  <div className="flex items-center justify-between text-[0.6rem] sm:text-xs uppercase tracking-[0.3em] text-[var(--cp-text-muted)]">
                    <span>Featured roster</span>
                    <span>Wave 01</span>
                  </div>
                  <div className="mt-6">
                    {heroCards.length === 0 ? (
                      <div className="rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] p-6 text-sm text-[var(--cp-text-muted)]">
                        Seed the roster to unlock featured cards.
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {heroCards.map((card) => renderCard(card, true))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
