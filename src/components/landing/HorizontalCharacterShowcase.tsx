"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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

export default function HorizontalCharacterShowcase({ characters }: { characters: Character[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const progress = scrollLeft / (scrollWidth - clientWidth);
      setScrollProgress(progress);
    };

    const scrollContainer = scrollRef.current;
    scrollContainer?.addEventListener('scroll', handleScroll);
    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-grid-overlay">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 via-transparent to-purple-950/30" />

      <div className="relative z-10">
        {/* Header */}
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

            {/* Progress Bar */}
            <div className="max-w-md mx-auto">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 transition-all duration-300 ease-out"
                  style={{ width: `${scrollProgress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Container */}
        <div
          ref={scrollRef}
          className="horizontal-scroll-container flex gap-8 px-8 md:px-16 pb-8"
        >
          {characters.map((char, index) => (
            <Link
              key={char.id}
              href={`/character/${char.id}`}
              className="horizontal-scroll-item group relative w-[320px] md:w-[400px] flex-shrink-0"
            >
              {/* Card */}
              <div className="relative h-[500px] md:h-[600px] rounded-3xl overflow-hidden transform transition-all duration-500 hover:scale-105">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-grid-overlay opacity-20" />

                {/* Animated Mesh Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent group-hover:from-white/30 transition-all duration-500" />

                {/* Content */}
                <div className="relative h-full flex flex-col justify-end p-8">
                  {/* Top Badges */}
                  <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
                    <div className="flex gap-2">
                      <span className="cp-chip text-xs bg-black/30 backdrop-blur-sm">
                        {char.rarity && char.rarity >= 5
                          ? 'Legendary'
                          : char.rarity && char.rarity >= 4
                          ? 'Epic'
                          : 'Rare'}
                      </span>
                      {char.owned && (
                        <span className="cp-chip text-xs bg-green-500/30 border-green-400/50 backdrop-blur-sm">
                          Owned
                        </span>
                      )}
                    </div>
                    <div className="cp-chip text-base font-black bg-black/30 backdrop-blur-sm">
                      {((char.rarity ?? 3) + 2.7).toFixed(1)}
                    </div>
                  </div>

                  {/* Character Info */}
                  <div className="space-y-3">
                    {char.realm && (
                      <div className="inline-block px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {char.realm}
                        </span>
                      </div>
                    )}

                    <h3 className="font-display font-black text-4xl md:text-5xl text-white leading-tight">
                      {char.name}
                    </h3>

                    {char.title && (
                      <p className="text-lg font-bold text-white/90">{char.title}</p>
                    )}

                    {(char.tagline || char.description) && (
                      <p className="text-sm text-white/80 line-clamp-3 leading-relaxed">
                        {char.tagline || char.description}
                      </p>
                    )}

                    {/* View Button */}
                    <button className="mt-4 px-6 py-3 rounded-xl bg-white text-gray-900 font-black text-sm hover:bg-white/90 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2">
                      <span>View Details</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Hover Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-500 -z-10" />
              </div>

              {/* 3D Tilt Effect Indicator */}
              <div className="absolute top-4 right-4 w-8 h-8 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </Link>
          ))}

          {/* Final CTA Card */}
          <Link
            href="/explore"
            className="horizontal-scroll-item group relative w-[320px] md:w-[400px] flex-shrink-0"
          >
            <div className="relative h-[500px] md:h-[600px] rounded-3xl overflow-hidden cp-card flex items-center justify-center hover:scale-105 transition-all duration-500">
              <div className="text-center px-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-3xl text-white mb-4">
                  Explore Full<br />Roster
                </h3>
                <p className="text-white/70 mb-6">
                  Discover all CharmXPals and their unique abilities
                </p>
                <div className="inline-flex items-center gap-2 text-cyan-400 font-bold group-hover:gap-3 transition-all">
                  <span>View All</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Scroll Hint */}
        <div className="text-center mt-8 opacity-60">
          <div className="inline-flex items-center gap-2 text-white text-sm font-bold">
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
