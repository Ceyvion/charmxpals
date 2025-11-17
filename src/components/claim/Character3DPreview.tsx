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

  const getRarityColor = (rarity?: number) => {
    if (!rarity) return 'from-gray-500 to-gray-600';
    if (rarity >= 5) return 'from-yellow-400 to-orange-500';
    if (rarity >= 4) return 'from-purple-500 to-pink-500';
    return 'from-cyan-400 to-blue-500';
  };

  const getRarityLabel = (rarity?: number) => {
    if (!rarity) return 'Common';
    if (rarity >= 5) return 'Legendary';
    if (rarity >= 4) return 'Epic';
    return 'Rare';
  };

  return (
    <div className="relative">
      {/* Status Banner */}
      <div
        className={`mb-6 rounded-2xl border-2 p-6 ${
          unitStatus === 'available'
            ? 'border-green-400/50 bg-gradient-to-br from-green-500/20 to-emerald-500/20'
            : unitStatus === 'claimed'
            ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/20 to-orange-500/20'
            : 'border-red-400/50 bg-gradient-to-br from-red-500/20 to-rose-500/20'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              unitStatus === 'available' ? 'bg-green-400' : unitStatus === 'claimed' ? 'bg-amber-400' : 'bg-red-400'
            }`}
          >
            {unitStatus === 'available' ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">
              {unitStatus === 'available'
                ? 'Available to Claim'
                : unitStatus === 'claimed'
                ? 'Already Claimed'
                : 'Unavailable'}
            </h3>
            <p className="text-white/80 text-sm">
              {unitStatus === 'available'
                ? 'This CharmXPal is ready to be claimed'
                : unitStatus === 'claimed'
                ? 'This CharmXPal belongs to another collector'
                : 'This code cannot be claimed'}
            </p>
          </div>
        </div>
      </div>

      {/* 3D Card */}
      <div
        ref={cardRef}
        className="relative preserve-3d"
        style={{ perspective: '1000px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="relative rounded-3xl overflow-hidden transition-transform duration-300 ease-out"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(1.02)`,
          }}
        >
          {/* Card Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500" />
          <div className="absolute inset-0 bg-grid-overlay opacity-20" />

          {/* Depth Layers */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"
            style={{
              transform: `translate3d(${rotation.y * 0.5}px, ${rotation.x * 0.5}px, 0)`,
            }}
          />

          {/* Content */}
          <div className="relative p-8">
            {/* Top Badges */}
            <div className="flex justify-between items-start mb-32">
              <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getRarityColor(character.rarity)} font-black text-white text-sm`}>
                {getRarityLabel(character.rarity)}
              </div>
              <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 font-black text-white text-lg">
                {((character.rarity ?? 3) + 2.7).toFixed(1)}
              </div>
            </div>

            {/* Character Icon Placeholder */}
            <div className="flex justify-center mb-32">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center animate-float">
                <div className="text-8xl">✨</div>
              </div>
            </div>

            {/* Bottom Info */}
            <div className="space-y-3">
              {character.realm && (
                <div className="inline-block px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {character.realm}
                  </span>
                </div>
              )}

              <h3 className="font-display font-black text-5xl text-white leading-tight">
                {character.name}
              </h3>

              {character.title && (
                <p className="text-xl font-bold text-white/90">{character.title}</p>
              )}

              {(character.tagline || character.description) && (
                <p className="text-white/80 leading-relaxed">
                  {character.tagline || character.description}
                </p>
              )}

              {/* View Button */}
              {hasUnlocked && (
                <Link
                  href={`/character/${character.id}`}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-black hover:bg-white/90 transition-all duration-300 hover:scale-105"
                >
                  <span>View Character</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Glow Effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-50 blur-3xl -z-10 animate-pulse" />
      </div>

      {/* Interaction Hint */}
      <div className="text-center mt-6 opacity-60">
        <div className="inline-flex items-center gap-2 text-white text-sm font-bold">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
          <span>Drag to rotate</span>
        </div>
      </div>
    </div>
  );
}
