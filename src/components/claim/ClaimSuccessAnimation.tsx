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
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                backgroundColor: ['#FF3B30', '#AF52DE', '#00D4AA', '#FFD60A', '#30D158'][i % 5],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`relative transition-all duration-1000 ${
          animationPhase === 'entrance'
            ? 'opacity-0 scale-90 rotate-12'
            : animationPhase === 'pulse'
            ? 'opacity-100 scale-110 rotate-0'
            : 'opacity-100 scale-100 rotate-0'
        }`}
      >
        {animationPhase === 'pulse' && (
          <>
            <div className="absolute -inset-4 rounded-[var(--cp-radius-lg)] border-2 border-[var(--cp-green)] opacity-60 animate-pulse-ring" />
            <div className="absolute -inset-7 rounded-[var(--cp-radius-lg)] border-2 border-[var(--cp-green)] opacity-40 animate-pulse-ring" style={{ animationDelay: '0.2s' }} />
          </>
        )}

        <div className="cp-panel border-[var(--cp-green)] p-8 text-center md:p-10">
          <div className="space-y-7">
            <div className="flex justify-center">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--cp-green)] text-[var(--cp-black)]">
                  <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-5xl font-black leading-tight text-[var(--cp-text-primary)] md:text-6xl">
                Claimed!
              </h2>
              <p className="text-2xl font-bold text-[var(--cp-text-primary)]">
                {character.name} is now yours
              </p>
              {character.title && (
                <p className="text-lg text-[var(--cp-text-secondary)]">{character.title}</p>
              )}
            </div>

            <div className="inline-flex items-center gap-2 rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-4 py-2">
              {character.realm && (
                <>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--cp-text-secondary)]">{character.realm}</span>
                  <span className="text-[var(--cp-text-muted)]">•</span>
                </>
              )}
              <span className="text-sm font-bold text-[var(--cp-text-primary)]">
                Rarity: {((character.rarity ?? 3) + 2.7).toFixed(1)}
              </span>
            </div>

            {claimedAt && (
              <p className="text-sm text-[var(--cp-text-secondary)]">
                Claimed {new Date(claimedAt).toLocaleString()}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href={`/character/${character.id}`}
                className="cp-cta-primary"
              >
                <span>View Character</span>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href="/me"
                className="cp-cta-ghost"
              >
                <span>My Collection</span>
              </Link>
            </div>

            <div className="border-t-2 border-[var(--cp-border)] pt-4">
              <p className="mb-3 text-sm text-[var(--cp-text-secondary)]">
                Share your new CharmXPal with friends!
              </p>
              <div className="flex justify-center gap-3">
                <button className="flex h-9 w-9 items-center justify-center rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:bg-[var(--cp-white)]">
                  <span>X</span>
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:bg-[var(--cp-white)]">
                  <span>F</span>
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:bg-[var(--cp-white)]">
                  <span>IG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
