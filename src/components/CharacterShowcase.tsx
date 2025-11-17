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

function overlayOpacity(i: number) {
  return [0.85, 0.8, 0.78, 0.82, 0.8, 0.84][i % 6];
}

export default function CharacterShowcase({ characters }: { characters: Character[] }) {
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="cp-container max-w-7xl relative z-10">
      <div className="text-center mb-16 md:mb-24">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="cp-kicker">The Roster</span>
        </div>
        <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight">
          <span className="text-white">Meet Your</span>
          <br />
          <span className="cp-gradient-text">Battle Idols</span>
        </h2>
        <p className="mt-6 text-lg md:text-xl cp-muted max-w-2xl mx-auto">
          Each CharmXPal has unique stats, rarities, and lore. Collect them all, build your dream squad.
        </p>
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-12">
        {characters.map((char, index) => (
          <Link
            key={char.id}
            href={`/character/${char.id}`}
            className={`group relative transition-all duration-700 ${
              inView
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            <div className="cp-card-hero overflow-hidden h-full transform group-hover:scale-105 transition-all duration-300">
              {/* Card Top - Visual */}
              <div className="relative h-56 overflow-hidden">
                <div
                  className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
                  style={{
                    backgroundImage: 'var(--cp-gradient)',
                    opacity: overlayOpacity(index),
                  }}
                />
                <div className="absolute inset-0 bg-grid-overlay opacity-20" />

                {/* Animated Sheen */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -translate-x-full group-hover:translate-x-full"
                     style={{ transition: 'all 0.7s ease' }} />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="cp-chip text-xs">
                    {char.rarity && char.rarity >= 5
                      ? 'Legendary'
                      : char.rarity && char.rarity >= 4
                      ? 'Epic'
                      : 'Rare'}
                  </span>
                  {char.owned && (
                    <span className="cp-chip text-xs bg-green-500/20 border-green-400/50">
                      Owned
                    </span>
                  )}
                </div>

                {/* Score */}
                <div className="absolute top-3 right-3">
                  <div className="cp-chip text-base font-black">
                    {((char.rarity ?? 3) + 2.7).toFixed(1)}
                  </div>
                </div>

                {/* Realm Badge */}
                {char.realm && (
                  <div className="absolute bottom-3 left-3">
                    <div className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        {char.realm}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Bottom - Content */}
              <div className="p-6">
                <h3 className="font-display font-black text-2xl text-gray-900 mb-1 truncate group-hover:text-purple-600 transition-colors">
                  {char.name}
                </h3>

                {char.title && (
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    {char.title}
                  </p>
                )}

                {(char.tagline || char.description) && (
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                    {char.tagline || char.description}
                  </p>
                )}

                {/* View Button */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-600 font-bold text-sm group-hover:gap-3 transition-all">
                    <span>View Details</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Hover Glow Effect */}
            <div
              className={`absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-[1.5rem] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10`}
            />
          </Link>
        ))}
      </div>

      {/* CTA to Explore All */}
      <div
        className={`text-center transition-all duration-1000 ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transitionDelay: '600ms' }}
      >
        <Link
          href="/explore"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl border-2 border-white/20 backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all duration-300 group"
        >
          <span className="font-display font-black text-xl text-white">
            Explore Full Roster
          </span>
          <svg className="w-6 h-6 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
