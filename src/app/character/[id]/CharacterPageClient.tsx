'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import CharacterStats from '@/components/CharacterStats';
import RevealOnView from '@/components/RevealOnView';

const CharacterViewer3D = dynamic(() => import('@/components/CharacterViewer3D'), { ssr: false });

type Character = {
  id: string;
  name: string;
  description?: string | null;
  rarity: number;
  artRefs?: Record<string, string>;
  stats?: Record<string, number> | null;
  realm?: string | null;
  title?: string | null;
  tagline?: string | null;
  codeSeries?: string | null;
  vibe?: string | null;
  danceStyle?: string | null;
  coreCharm?: string | null;
  personality?: string | null;
  color?: string | null;
};

type Skin = {
  id: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  preview: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  effects?: string[];
  locked?: boolean;
  price?: number;
};

const SKINS: Skin[] = [
  {
    id: 'default',
    name: 'Origin Protocol',
    rarity: 'Common',
    preview: '/api/placeholder/200/300',
    colors: { primary: '#8B6DFF', secondary: '#FF7CE3', accent: '#52E1FF' },
    effects: []
  },
  {
    id: 'neon-dream',
    name: 'Neon Dream',
    rarity: 'Rare',
    preview: '/api/placeholder/200/300',
    colors: { primary: '#00FFFF', secondary: '#FF00FF', accent: '#FFFF00' },
    effects: ['Glow trails', 'Neon aura'],
    locked: true,
    price: 100
  },
  {
    id: 'chrome-luxe',
    name: 'Chrome Luxe',
    rarity: 'Epic',
    preview: '/api/placeholder/200/300',
    colors: { primary: '#C0C0C0', secondary: '#FFD700', accent: '#FFFFFF' },
    effects: ['Metallic sheen', 'Mirror finish', 'Light refraction'],
    locked: true,
    price: 250
  },
  {
    id: 'void-walker',
    name: 'Void Walker',
    rarity: 'Legendary',
    preview: '/api/placeholder/200/300',
    colors: { primary: '#0A0A0A', secondary: '#6B00FF', accent: '#FF0080' },
    effects: ['Shadow tendrils', 'Void particles', 'Dimension shift', 'Reality glitch'],
    locked: true,
    price: 500
  },
  {
    id: 'quantum-flux',
    name: 'Quantum Flux',
    rarity: 'Mythic',
    preview: '/api/placeholder/200/300',
    colors: { primary: '#FF00FF', secondary: '#00FFFF', accent: '#FFFF00' },
    effects: ['Holographic body', 'Particle storm', 'Time distortion', 'Quantum entanglement', 'Reality breach'],
    locked: true,
    price: 1000
  }
];

const rarityConfig = {
  Common: { gradient: 'from-gray-400 to-gray-600', glow: 'rgba(156, 163, 175, 0.4)' },
  Rare: { gradient: 'from-blue-400 to-cyan-600', glow: 'rgba(56, 189, 248, 0.5)' },
  Epic: { gradient: 'from-purple-400 to-violet-600', glow: 'rgba(167, 139, 250, 0.6)' },
  Legendary: { gradient: 'from-yellow-400 to-orange-600', glow: 'rgba(251, 191, 36, 0.7)' },
  Mythic: { gradient: 'from-pink-400 via-purple-400 to-cyan-400', glow: 'rgba(236, 72, 153, 0.8)' }
};

export default function CharacterPageClient({ character, modelUrl }: { character: Character; modelUrl: string }) {
  const [selectedSkin, setSelectedSkin] = useState('default');
  const [showSkinDetails, setShowSkinDetails] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const storageKey = useMemo(() => `cp:skin:${character.id}`, [character.id]);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && SKINS.some(s => s.id === saved)) {
      setSelectedSkin(saved);
    }
  }, [storageKey]);

  const handleSkinSelect = (skinId: string) => {
    const skin = SKINS.find(s => s.id === skinId);
    if (skin && !skin.locked) {
      setSelectedSkin(skinId);
      localStorage.setItem(storageKey, skinId);
      // Trigger rotation animation
      setRotating(true);
      setTimeout(() => setRotating(false), 1000);
    }
  };

  const currentSkin = SKINS.find(s => s.id === selectedSkin) || SKINS[0];
  const stats = character.stats || {};

  function getRarityLabel(rarity: number): string {
    if (rarity >= 5) return 'Legendary';
    if (rarity >= 4) return 'Epic';
    return 'Rare';
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dynamic background based on selected skin */}
      <div 
        className="fixed inset-0 -z-20 transition-all duration-1000"
        style={{
          background: `radial-gradient(120% 120% at 50% -20%, ${currentSkin.colors.primary}20, transparent), 
                       radial-gradient(80% 80% at 20% 50%, ${currentSkin.colors.secondary}15, transparent),
                       radial-gradient(80% 80% at 80% 50%, ${currentSkin.colors.accent}15, transparent),
                       #0a0a0a`
        }}
      />
      
      {/* Animated grid */}
      <div className="fixed inset-0 -z-10 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3Cpattern%20id%3D%22grid%22%20width%3D%2260%22%20height%3D%2260%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Cpath%20d%3D%22M%2060%200%20L%200%200%200%2060%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.03)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fpattern%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23grid)%22%2F%3E%3C%2Fsvg%3E')]" />

      <div className="relative py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <Link 
              href="/explore" 
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10 transition-all"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
              Back to Roster
            </Link>
            <div className="flex gap-3">
              <Link 
                href="/compare" 
                className="px-5 py-2.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10 transition-all"
              >
                Compare Stats
              </Link>
              <Link 
                href="/play" 
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-105"
              >
                Battle Mode
              </Link>
            </div>
          </div>

          {/* Main content grid */}
          <div className="grid lg:grid-cols-[1.2fr,1fr] gap-8">
            {/* Left column - 3D viewer and character info */}
            <div className="space-y-6">
              {/* 3D Viewer with skin preview */}
              <RevealOnView>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <div 
                    ref={viewerRef}
                    className={`relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6 overflow-hidden ${rotating ? 'animate-spin-slow' : ''}`}
                  >
                    {/* Skin effect overlay */}
                    {currentSkin.effects && currentSkin.effects.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 animate-pulse" />
                        {currentSkin.id === 'void-walker' && (
                          <div className="absolute inset-0 bg-purple-900/20 mix-blend-screen animate-pulse" />
                        )}
                        {currentSkin.id === 'quantum-flux' && (
                          <div className="absolute inset-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 animate-gradient" />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/60">3D Model</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${rarityConfig[currentSkin.rarity].gradient} text-white`}>
                          {currentSkin.name}
                        </span>
                      </div>
                      <button 
                        onClick={() => setRotating(!rotating)}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                    <CharacterViewer3D modelUrl={modelUrl} height={420} />
                  </div>
                </div>
              </RevealOnView>

              {/* Character showcase card */}
              <RevealOnView>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 overflow-hidden">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        {character.realm && (
                          <div className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">
                            {character.realm}
                          </div>
                        )}
                        <h1 className="text-5xl md:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white">
                          {character.name}
                        </h1>
                        {character.title && (
                          <p className="text-xl text-gray-300 mt-2">{character.title}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${
                          character.rarity >= 5 ? 'from-yellow-400 to-orange-600' :
                          character.rarity >= 4 ? 'from-purple-400 to-violet-600' :
                          'from-blue-400 to-cyan-600'
                        } text-white`}>
                          {getRarityLabel(character.rarity)}
                        </span>
                        <span className="text-3xl font-bold text-white/90">
                          {(character.rarity + 2.7).toFixed(1)}
                        </span>
                      </div>
                    </div>

                    {character.tagline && (
                      <p className="text-lg text-gray-300 mb-6 italic">"{character.tagline}"</p>
                    )}

                    {character.description && (
                      <div className="space-y-4 border-t border-white/10 pt-6">
                        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400">Lore</h3>
                        <p className="text-gray-300 leading-relaxed">{character.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-6 mt-8">
                      {character.vibe && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">Stage Vibe</h4>
                          <p className="text-white/80">{character.vibe}</p>
                        </div>
                      )}
                      {character.danceStyle && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">Dance Style</h4>
                          <p className="text-white/80">{character.danceStyle}</p>
                        </div>
                      )}
                      {character.coreCharm && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">Core Charm</h4>
                          <p className="text-white/80">{character.coreCharm}</p>
                        </div>
                      )}
                      {character.personality && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">Personality</h4>
                          <p className="text-white/80">{character.personality}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </RevealOnView>
            </div>

            {/* Right column - Stats and skins */}
            <div className="space-y-6">
              {/* Stats panel */}
              <RevealOnView>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
                    <h2 className="text-2xl font-display font-black text-white mb-6">Battle Stats</h2>
                    {Object.keys(stats).length > 0 ? (
                      <CharacterStats stats={stats} />
                    ) : (
                      <p className="text-gray-400">No stats available</p>
                    )}
                    
                    {character.codeSeries && (
                      <div className="mt-6 pt-6 border-t border-white/10">
                        <h4 className="text-xs font-bold uppercase tracking-[0.3em] text-purple-400 mb-2">Series Code</h4>
                        <p className="text-white/80 font-mono">{character.codeSeries}</p>
                      </div>
                    )}

                    <div className="mt-8 flex gap-3">
                      <Link 
                        href="/play/runner" 
                        className="flex-1 px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-105 text-center"
                      >
                        Play Now
                      </Link>
                      <Link 
                        href="/claim" 
                        className="flex-1 px-5 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition-all text-center"
                      >
                        Claim More
                      </Link>
                    </div>
                  </div>
                </div>
              </RevealOnView>

              {/* Skins panel */}
              <RevealOnView>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                  <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-display font-black text-white">Skins & Styles</h2>
                      <span className="text-sm text-purple-400 font-semibold">
                        {SKINS.filter(s => !s.locked).length}/{SKINS.length} Unlocked
                      </span>
                    </div>

                    <div className="space-y-3">
                      {SKINS.map((skin) => (
                        <div
                          key={skin.id}
                          className={`relative group/skin cursor-pointer transition-all ${
                            selectedSkin === skin.id ? 'scale-[1.02]' : ''
                          }`}
                          onClick={() => !skin.locked && handleSkinSelect(skin.id)}
                          onMouseEnter={() => setShowSkinDetails(skin.id)}
                          onMouseLeave={() => setShowSkinDetails(null)}
                        >
                          <div className={`relative overflow-hidden rounded-2xl border transition-all ${
                            selectedSkin === skin.id 
                              ? 'border-purple-500 bg-purple-500/10' 
                              : 'border-white/10 bg-white/5 hover:bg-white/10'
                          } ${skin.locked ? 'opacity-60' : ''}`}>
                            <div className="p-4 flex items-center gap-4">
                              {/* Skin preview */}
                              <div 
                                className="relative w-20 h-24 rounded-xl overflow-hidden flex-shrink-0"
                                style={{
                                  background: `linear-gradient(135deg, ${skin.colors.primary}, ${skin.colors.secondary}, ${skin.colors.accent})`,
                                  boxShadow: `0 4px 20px ${rarityConfig[skin.rarity].glow}`
                                }}
                              >
                                {selectedSkin === skin.id && (
                                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                )}
                                {skin.locked && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* Skin info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-white truncate">{skin.name}</h3>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r ${rarityConfig[skin.rarity].gradient} text-white`}>
                                    {skin.rarity}
                                  </span>
                                </div>
                                {skin.effects && skin.effects.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {skin.effects.slice(0, 3).map((effect, i) => (
                                      <span key={i} className="text-xs text-purple-400">
                                        {effect}{i < Math.min(2, skin.effects.length - 1) && ' •'}
                                      </span>
                                    ))}
                                    {skin.effects.length > 3 && (
                                      <span className="text-xs text-purple-400">+{skin.effects.length - 3}</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Price/Status */}
                              <div className="text-right">
                                {skin.locked ? (
                                  <div className="text-sm">
                                    <div className="text-yellow-400 font-bold">{skin.price} 💎</div>
                                    <div className="text-xs text-gray-400">Locked</div>
                                  </div>
                                ) : selectedSkin === skin.id ? (
                                  <span className="text-sm text-green-400 font-bold">Equipped</span>
                                ) : (
                                  <span className="text-sm text-gray-400">Owned</span>
                                )}
                              </div>
                            </div>

                            {/* Hover details */}
                            {showSkinDetails === skin.id && skin.effects && skin.effects.length > 0 && (
                              <div className="absolute -top-2 left-0 right-0 transform -translate-y-full z-10">
                                <div className="bg-black/90 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                                  <p className="text-xs font-bold text-purple-400 mb-1">Visual Effects:</p>
                                  <div className="space-y-0.5">
                                    {skin.effects.map((effect, i) => (
                                      <p key={i} className="text-xs text-gray-300">• {effect}</p>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                      <button className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-bold hover:from-yellow-400 hover:to-orange-400 transition-all hover:scale-105 flex items-center justify-center gap-2">
                        <span>Visit Skin Shop</span>
                        <span className="text-lg">→</span>
                      </button>
                    </div>
                  </div>
                </div>
              </RevealOnView>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { transform: translateX(0%); }
          50% { transform: translateX(-100%); }
        }
        
        .animate-gradient {
          animation: gradient 6s ease infinite;
          background-size: 200% 200%;
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow 3s linear;
        }
      `}</style>
    </div>
  );
}
