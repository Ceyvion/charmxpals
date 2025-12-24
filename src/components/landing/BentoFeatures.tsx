"use client";

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';

export default function BentoFeatures() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="cp-container max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="cp-kicker">Features</span>
          </div>
          <h2 className="font-display font-black text-5xl md:text-6xl lg:text-7xl leading-tight">
            <span className="text-white">More Than</span>
            <br />
            <span className="cp-gradient-text">Just Collecting</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          <Link
            href="/play"
            className="md:col-span-2 lg:row-span-2 bento-card group"
            onMouseEnter={() => setHoveredCard(0)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ '--bento-accent': 'rgba(120, 224, 255, 0.3)' } as CSSProperties}
          >
            <div className="relative h-full min-h-[400px] p-8 md:p-10 flex flex-col justify-between">
              <div>
                <div className="bento-icon mb-6">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-4xl text-white mb-4">
                  Arcade Mini-Games
                </h3>
                <p className="text-lg text-white/80 leading-relaxed max-w-md">
                  Time Trial, Runner, Battle Arena. Fast rounds, big rewards, and bragging rights.
                </p>
              </div>

              <div className="relative flex items-center gap-2 text-white/80 font-semibold group-hover:gap-3 transition-all">
                <span>Start Playing</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/plaza"
            className="md:col-span-1 bento-card group"
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ '--bento-accent': 'rgba(255, 185, 154, 0.28)' } as CSSProperties}
          >
            <div className="relative h-full min-h-[250px] p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="bento-icon mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-5-4m-6 6h6m-6 0v-2a4 4 0 00-6-4m6 6H7m5-10a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-2xl text-white mb-2">
                  Social Plaza
                </h3>
                <p className="text-sm text-white/75">
                  Meet players, trade, and emote together in real time.
                </p>
              </div>

              <div className="relative inline-flex items-center gap-2 text-white/70 text-sm font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-300/80" />
                <span>Live now</span>
              </div>
            </div>
          </Link>

          <div
            className="md:col-span-1 lg:row-span-2 bento-card group"
            onMouseEnter={() => setHoveredCard(2)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ '--bento-accent': 'rgba(146, 168, 255, 0.3)' } as CSSProperties}
          >
            <div className="relative h-full min-h-[400px] p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="bento-icon mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3v3m4.5-3v3M4.5 9h15M5.25 6h13.5A1.5 1.5 0 0120.25 7.5v11.25A1.5 1.5 0 0118.75 20.25H5.25A1.5 1.5 0 013.75 18.75V7.5A1.5 1.5 0 015.25 6z" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-3xl text-white mb-4">
                  Endless Customization
                </h3>
                <p className="text-white/80 leading-relaxed">
                  Skins, badges, nameplates, emotes. Style your Pal with every drop.
                </p>
              </div>

              <div className="relative grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
                  >
                    <div className="h-3 w-3 rounded-full bg-gradient-to-r from-cyan-300/80 to-amber-200/80" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/compare"
            className="md:col-span-2 bento-card group"
            onMouseEnter={() => setHoveredCard(3)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ '--bento-accent': 'rgba(120, 255, 220, 0.28)' } as CSSProperties}
          >
            <div className="relative h-full min-h-[250px] p-6 md:p-8 flex items-center justify-between">
              <div>
                <div className="bento-icon mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M12 3l2.09 6.26L21 10l-5 4.91L17.18 21 12 17.77 6.82 21 8 14.91 3 10l6.91-0.74L12 3z" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-3xl text-white mb-2">
                  Global Leaderboards
                </h3>
                <p className="text-white/80 max-w-md">
                  Compete for top rankings across every mode and season.
                </p>
              </div>

              <div className="relative hidden lg:flex flex-col gap-2">
                {[1, 2, 3].map((rank) => (
                  <div key={rank} className="flex items-center gap-3 rounded-xl px-4 py-2 bg-white/5 border border-white/10">
                    <span className="font-black text-white text-lg">#{rank}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-300/60 to-amber-200/70" />
                    <span className="text-white/80 text-sm">Player</span>
                    <span className="text-white/60 text-sm ml-auto">{1000 - rank * 50} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          <div
            className="md:col-span-1 bento-card group"
            onMouseEnter={() => setHoveredCard(4)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ '--bento-accent': 'rgba(255, 200, 160, 0.26)' } as CSSProperties}
          >
            <div className="relative h-full min-h-[250px] p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="bento-icon mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-2xl text-white mb-2">
                  Anti-Fraud
                </h3>
                <p className="text-sm text-white/75">
                  One-time codes, verified claims, tamper-proof security.
                </p>
              </div>

              <div className="relative flex items-center gap-2 text-white/70 text-sm font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-300/70" />
                <span>Protected</span>
              </div>
            </div>
          </div>

          <Link
            href="/explore"
            className="md:col-span-2 lg:col-span-1 bento-card group"
            onMouseEnter={() => setHoveredCard(5)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ '--bento-accent': 'rgba(125, 231, 255, 0.28)' } as CSSProperties}
          >
            <div className="relative h-full min-h-[250px] p-6 md:p-8 flex flex-col justify-between">
              <div>
                <div className="bento-icon mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
                  </svg>
                </div>
                <h3 className="font-display font-black text-2xl text-white mb-2">
                  Unique Stats
                </h3>
                <p className="text-sm text-white/75">
                  Every Pal has distinct attributes and abilities.
                </p>
              </div>

              <div className="relative space-y-2">
                {[82, 67, 92].map((value, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-200/80 to-amber-200/80 rounded-full transition-all duration-700"
                        style={{ width: hoveredCard === 5 ? `${value}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
