"use client";

import { useState, useRef } from 'react';
import Link from 'next/link';

type VerifyStatus = 'available' | 'claimed' | 'blocked' | 'not_found';

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
  unitStatus: VerifyStatus | null;
  hasUnlocked: boolean;
}

export default function Character3DPreview({ character, unitStatus, hasUnlocked }: Props) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    setRotation({
      x: y * 15,
      y: x * -15,
    });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  const getRarityTone = (rarity?: number) => {
    if (!rarity) return { label: 'Common', bg: 'var(--cp-gray-200)', text: 'var(--cp-text-primary)', border: 'var(--cp-border)' };
    if (rarity >= 5) return { label: 'Legendary', bg: 'var(--cp-yellow)', text: 'var(--cp-black)', border: 'var(--cp-yellow)' };
    if (rarity >= 4) return { label: 'Epic', bg: 'var(--cp-violet)', text: 'var(--cp-white)', border: 'var(--cp-violet)' };
    return { label: 'Rare', bg: 'var(--cp-cyan)', text: 'var(--cp-black)', border: 'var(--cp-cyan)' };
  };

  const rarity = getRarityTone(character.rarity);

  const statusTone =
    unitStatus === 'available'
      ? { border: 'var(--cp-green)', bg: 'var(--cp-green)', iconText: 'var(--cp-black)' }
      : unitStatus === 'claimed'
      ? { border: 'var(--cp-yellow)', bg: 'var(--cp-yellow)', iconText: 'var(--cp-black)' }
      : { border: 'var(--cp-red)', bg: 'var(--cp-red)', iconText: 'var(--cp-white)' };

  return (
    <div className="relative">
      <div
        className="mb-6 rounded-[var(--cp-radius-lg)] border-2 bg-[var(--cp-white)] p-5"
        style={{ borderColor: statusTone.border }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[var(--cp-radius-sm)]"
            style={{ background: statusTone.bg, color: statusTone.iconText }}
          >
            {unitStatus === 'available' ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--cp-text-primary)]">
              {unitStatus === 'available'
                ? 'Available to Claim'
                : unitStatus === 'claimed'
                ? 'Already Claimed'
                : 'Unavailable'}
            </h3>
            <p className="text-sm text-[var(--cp-text-secondary)]">
              {unitStatus === 'available'
                ? 'This CharmXPal is ready to be claimed'
                : unitStatus === 'claimed'
                ? 'This CharmXPal belongs to another collector'
                : 'This code cannot be claimed'}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={cardRef}
        className="relative"
        style={{ perspective: '1000px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="cp-panel transition-transform duration-300 ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          }}
        >
          <div className="relative p-8">
            <div className="mb-8 flex items-start justify-between">
              <span
                className="rounded-[var(--cp-radius-sm)] border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]"
                style={{ background: rarity.bg, color: rarity.text, borderColor: rarity.border }}
              >
                {rarity.label}
              </span>
              <div className="cp-chip">
                {((character.rarity ?? 3) + 2.7).toFixed(1)}
              </div>
            </div>

            <div className="mb-8 flex justify-center">
              <div className="flex h-40 w-40 items-center justify-center rounded-full border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)]">
                <div className="text-8xl">✨</div>
              </div>
            </div>

            <div className="space-y-3">
              {character.realm && (
                <span className="cp-chip">{character.realm}</span>
              )}

              <h3 className="font-display text-4xl font-black leading-tight text-[var(--cp-text-primary)] md:text-5xl">
                {character.name}
              </h3>

              {character.title && (
                <p className="text-lg font-semibold text-[var(--cp-text-secondary)]">{character.title}</p>
              )}

              {(character.tagline || character.description) && (
                <p className="leading-relaxed text-[var(--cp-text-secondary)]">
                  {character.tagline || character.description}
                </p>
              )}

              {hasUnlocked && (
                <Link
                  href={`/character/${character.id}`}
                  className="cp-cta-primary mt-4"
                >
                  <span>View Character</span>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--cp-text-muted)]">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
          <span>Drag to rotate</span>
        </div>
      </div>
    </div>
  );
}
