"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Character = {
  id: string;
  name: string;
  description?: string | null;
  rarity?: number;
  realm?: string | null;
  title?: string | null;
  tagline?: string | null;
};

interface Props {
  character: Character;
  claimedAt: string | null;
}

export default function ClaimSuccessAnimation({ character, claimedAt }: Props) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [animationPhase, setAnimationPhase] = useState<'entrance' | 'pulse' | 'stable'>('entrance');

  useEffect(() => {
    // Phase transitions
    const entranceTimer = setTimeout(() => setAnimationPhase('pulse'), 500);
    const pulseTimer = setTimeout(() => setAnimationPhase('stable'), 2000);
    const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);

    return () => {
      clearTimeout(entranceTimer);
      clearTimeout(pulseTimer);
      clearTimeout(confettiTimer);
    };
  }, []);

  return (
    <div className="relative">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                backgroundColor: ['#ff7ce3', '#8b6dff', '#52e1ff', '#ffb76a', '#8bffb0'][i % 5],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Success Card */}
      <div
        className={`relative transition-all duration-1000 ${
          animationPhase === 'entrance'
            ? 'opacity-0 scale-90 rotate-12'
            : animationPhase === 'pulse'
            ? 'opacity-100 scale-110 rotate-0'
            : 'opacity-100 scale-100 rotate-0'
        }`}
      >
        {/* Pulsing Rings */}
        {animationPhase === 'pulse' && (
          <>
            <div className="absolute -inset-8 border-4 border-green-400/50 rounded-full animate-pulse-ring" />
            <div className="absolute -inset-12 border-4 border-green-400/30 rounded-full animate-pulse-ring" style={{ animationDelay: '0.2s' }} />
            <div className="absolute -inset-16 border-4 border-green-400/20 rounded-full animate-pulse-ring" style={{ animationDelay: '0.4s' }} />
          </>
        )}

        <div className="relative rounded-3xl overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500" />
          <div className="absolute inset-0 bg-grid-overlay opacity-20" />

          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent animate-sheen" />

          {/* Content */}
          <div className="relative p-8 md:p-12 text-center space-y-8">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center animate-bounce">
                  <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                {/* Orbiting Stars */}
                <div className="absolute top-0 left-1/2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-spin-slow" style={{ transformOrigin: '0 70px' }}>
                  <span className="text-lg">⭐</span>
                </div>
                <div className="absolute top-0 left-1/2 w-8 h-8 bg-pink-400 rounded-full flex items-center justify-center animate-spin-slower" style={{ transformOrigin: '0 80px', animationDelay: '0.5s' }}>
                  <span className="text-lg">✨</span>
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div className="space-y-3">
              <h2 className="font-display font-black text-5xl md:text-6xl text-white leading-tight">
                Claimed!
              </h2>
              <p className="text-2xl font-bold text-white/90">
                {character.name} is now yours
              </p>
              {character.title && (
                <p className="text-lg text-white/80">{character.title}</p>
              )}
            </div>

            {/* Character Info */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
              {character.realm && (
                <>
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {character.realm}
                  </span>
                  <span className="text-white/50">•</span>
                </>
              )}
              <span className="text-sm font-bold text-white">
                Rarity: {((character.rarity ?? 3) + 2.7).toFixed(1)}
              </span>
            </div>

            {/* Claimed At */}
            {claimedAt && (
              <p className="text-sm text-white/70">
                Claimed {new Date(claimedAt).toLocaleString()}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href={`/character/${character.id}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-gray-900 font-black hover:bg-white/90 transition-all duration-300 hover:scale-105"
              >
                <span>View Character</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href="/me"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white font-black hover:bg-white/20 hover:border-white/50 transition-all duration-300"
              >
                <span>My Collection</span>
              </Link>
            </div>

            {/* Share Encouragement */}
            <div className="pt-4 border-t border-white/20">
              <p className="text-white/80 text-sm mb-3">
                Share your new CharmXPal with friends!
              </p>
              <div className="flex justify-center gap-3">
                <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <span>🐦</span>
                </button>
                <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <span>📘</span>
                </button>
                <button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <span>📱</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Outer Glow */}
        <div className="absolute -inset-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 opacity-50 blur-3xl -z-10" />
      </div>
    </div>
  );
}
