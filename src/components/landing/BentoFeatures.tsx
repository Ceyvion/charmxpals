"use client";

import Link from 'next/link';
import { useState } from 'react';

export default function BentoFeatures() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="cp-container max-w-7xl relative z-10">
        {/* Header */}
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

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Large Card - Mini Games */}
          <Link
            href="/play"
            className="md:col-span-2 lg:row-span-2 bento-card relative overflow-hidden rounded-3xl group"
            onMouseEnter={() => setHoveredCard(0)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-full min-h-[400px] p-8 md:p-10 flex flex-col justify-between bg-gradient-to-br from-pink-500/90 via-rose-500/90 to-red-500/90">
              <div className="absolute inset-0 bg-grid-overlay opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent group-hover:from-white/30 transition-opacity duration-500" />

              <div className="relative">
                <div className="w-16 h-16 mb-6 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl">
                  🎮
                </div>
                <h3 className="font-display font-black text-4xl text-white mb-4">
                  Epic Mini-Games
                </h3>
                <p className="text-lg text-white/90 leading-relaxed max-w-md">
                  Time Trial, Runner, Battle Arena. Test your skills, climb leaderboards, earn legendary rewards.
                </p>
              </div>

              <div className="relative flex items-center gap-2 text-white font-bold group-hover:gap-3 transition-all">
                <span>Start Playing</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Square Card - Plaza */}
          <Link
            href="/plaza"
            className="md:col-span-1 bento-card relative overflow-hidden rounded-3xl group"
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-full min-h-[250px] p-6 md:p-8 flex flex-col justify-between bg-gradient-to-br from-cyan-500/90 to-blue-500/90">
              <div className="absolute inset-0 bg-grid-overlay opacity-20" />

              <div className="relative">
                <div className="w-12 h-12 mb-4 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                  🏛️
                </div>
                <h3 className="font-display font-black text-2xl text-white mb-2">
                  Social Plaza
                </h3>
                <p className="text-sm text-white/90">
                  Meet players, chat, emote, trade in real-time
                </p>
              </div>

              <div className="relative inline-flex items-center gap-1 text-white text-sm font-bold">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>Live Now</span>
              </div>
            </div>
          </Link>

          {/* Tall Card - Customization */}
          <div
            className="md:col-span-1 lg:row-span-2 bento-card relative overflow-hidden rounded-3xl group"
            onMouseEnter={() => setHoveredCard(2)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-full min-h-[400px] p-6 md:p-8 flex flex-col justify-between bg-gradient-to-br from-purple-500/90 via-indigo-500/90 to-violet-500/90">
              <div className="absolute inset-0 bg-grid-overlay opacity-20" />

              <div className="relative">
                <div className="w-12 h-12 mb-4 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                  🎨
                </div>
                <h3 className="font-display font-black text-3xl text-white mb-4">
                  Endless Customization
                </h3>
                <p className="text-white/90 leading-relaxed">
                  Unlock skins, badges, nameplates, emotes. Make your Pal truly yours.
                </p>
              </div>

              {/* Mock Customization Icons */}
              <div className="relative grid grid-cols-3 gap-3">
                {['🔥', '⚡', '💎', '🌟', '🎭', '👑'].map((icon, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl hover:bg-white/20 transition-all duration-300 hover:scale-110"
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Wide Card - Leaderboards */}
          <Link
            href="/compare"
            className="md:col-span-2 bento-card relative overflow-hidden rounded-3xl group"
            onMouseEnter={() => setHoveredCard(3)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-full min-h-[250px] p-6 md:p-8 flex items-center justify-between bg-gradient-to-br from-emerald-500/90 to-green-500/90">
              <div className="absolute inset-0 bg-grid-overlay opacity-20" />

              <div className="relative">
                <div className="w-12 h-12 mb-4 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                  🏆
                </div>
                <h3 className="font-display font-black text-3xl text-white mb-2">
                  Global Leaderboards
                </h3>
                <p className="text-white/90 max-w-md">
                  Compete for top rankings across all game modes
                </p>
              </div>

              {/* Mock Leaderboard */}
              <div className="relative hidden lg:flex flex-col gap-2">
                {[1, 2, 3].map((rank) => (
                  <div key={rank} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                    <span className="font-black text-white text-lg">#{rank}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500" />
                    <span className="text-white font-bold text-sm">Player</span>
                    <span className="text-white/80 text-sm ml-auto">{1000 - rank * 50}pts</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>

          {/* Square Card - Anti-Fraud */}
          <div
            className="md:col-span-1 bento-card relative overflow-hidden rounded-3xl group"
            onMouseEnter={() => setHoveredCard(4)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-full min-h-[250px] p-6 md:p-8 flex flex-col justify-between bg-gradient-to-br from-orange-500/90 to-amber-500/90">
              <div className="absolute inset-0 bg-grid-overlay opacity-20" />

              <div className="relative">
                <div className="w-12 h-12 mb-4 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                  🔒
                </div>
                <h3 className="font-display font-black text-2xl text-white mb-2">
                  Anti-Fraud
                </h3>
                <p className="text-sm text-white/90">
                  Blockchain verified, one-time codes, tamper-proof
                </p>
              </div>

              <div className="relative flex items-center gap-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-white font-bold text-sm">Protected</span>
              </div>
            </div>
          </div>

          {/* Wide Card - Character Stats */}
          <Link
            href="/explore"
            className="md:col-span-2 lg:col-span-1 bento-card relative overflow-hidden rounded-3xl group"
            onMouseEnter={() => setHoveredCard(5)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="relative h-full min-h-[250px] p-6 md:p-8 flex flex-col justify-between bg-gradient-to-br from-fuchsia-500/90 to-pink-500/90">
              <div className="absolute inset-0 bg-grid-overlay opacity-20" />

              <div className="relative">
                <div className="w-12 h-12 mb-4 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                  ⚡
                </div>
                <h3 className="font-display font-black text-2xl text-white mb-2">
                  Unique Stats
                </h3>
                <p className="text-sm text-white/90">
                  Every Pal has distinct attributes and abilities
                </p>
              </div>

              {/* Mock Stat Bars */}
              <div className="relative space-y-2">
                {[80, 65, 90].map((value, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-white to-white/80 rounded-full transition-all duration-1000"
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
