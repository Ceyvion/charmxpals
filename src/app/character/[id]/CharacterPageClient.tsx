'use client';

import { useMemo, useState } from 'react';
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

type TraitHighlight = {
  id: string;
  label: string;
  title: string;
  helper: string;
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

const rarityPalette = [
  {
    test: (rarity: number) => rarity >= 5,
    label: 'Legendary',
    gradient: 'from-yellow-300 via-orange-400 to-yellow-600',
    accent: '#fbbf24'
  },
  {
    test: (rarity: number) => rarity >= 4,
    label: 'Epic',
    gradient: 'from-purple-300 via-fuchsia-400 to-purple-600',
    accent: '#a855f7'
  },
  {
    test: () => true,
    label: 'Rare',
    gradient: 'from-sky-300 via-blue-400 to-indigo-500',
    accent: '#38bdf8'
  }
];

function pickPrimaryArt(artRefs?: Record<string, string>): string | null {
  if (!artRefs) return null;
  return (
    artRefs.full ||
    artRefs.portrait ||
    artRefs.banner ||
    artRefs.card ||
    artRefs.thumbnail ||
    Object.values(artRefs)[0] ||
    null
  );
}

function getRarityDetails(rarity: number) {
  return rarityPalette.find((entry) => entry.test(rarity)) ?? rarityPalette[rarityPalette.length - 1];
}

function buildTraitHighlights(character: Character): TraitHighlight[] {
  const blueprint: Array<{ id: string; key: keyof Character; label: string; helper: string }> = [
    {
      id: 'coreCharm',
      key: 'coreCharm',
      label: 'Core Charm',
      helper: 'Signature charm energy that powers every performance.'
    },
    {
      id: 'danceStyle',
      key: 'danceStyle',
      label: 'Dance Style',
      helper: 'Preferred rhythm and movement when the beat drops.'
    },
    {
      id: 'vibe',
      key: 'vibe',
      label: 'Stage Vibe',
      helper: 'Atmosphere they bring to a session with the crew.'
    },
    {
      id: 'personality',
      key: 'personality',
      label: 'Personality',
      helper: 'How teammates describe them off-stage.'
    },
    {
      id: 'codeSeries',
      key: 'codeSeries',
      label: 'Code Series',
      helper: 'Internal designation tracing their prototype lineage.'
    }
  ];

  return blueprint
    .map((item) => {
      const value = character[item.key];
      if (!value) return null;
      return {
        id: item.id,
        label: item.label,
        title: String(value),
        helper: item.helper
      };
    })
    .filter((item): item is TraitHighlight => Boolean(item));
}

export default function CharacterPageClient({ character, modelUrl }: { character: Character; modelUrl: string }) {
  const rarity = useMemo(() => getRarityDetails(character.rarity), [character.rarity]);
  const heroArt = useMemo(() => pickPrimaryArt(character.artRefs), [character.artRefs]);
  const highlights = useMemo(() => buildTraitHighlights(character), [character]);
  const [activeTraitId, setActiveTraitId] = useState<string | null>(highlights[0]?.id ?? null);
  const activeTrait = useMemo(
    () => highlights.find((trait) => trait.id === activeTraitId) ?? highlights[0] ?? null,
    [highlights, activeTraitId]
  );
  const stats = useMemo(() => character.stats ?? {}, [character.stats]);
  const featuredSkins = useMemo(() => SKINS.slice(0, 4), []);

  const rarityBadge = (
    <span className={`inline-flex items-center px-4 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${rarity.gradient}`}>
      {rarity.label}
    </span>
  );

  const realmLabel = character.realm ? character.realm.toUpperCase() : 'UNKNOWN REALM';
  const accentColor = character.color ?? rarity.accent;
  const fallbackHeroBackground = `radial-gradient(circle at top, ${accentColor}22, transparent 55%), #050510`;

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      <section className="relative min-h-[80vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: heroArt
              ? `linear-gradient(120deg, rgba(5,5,16,0.9) 15%, rgba(5,5,16,0.75) 38%, rgba(5,5,16,0.45) 65%), url(${heroArt})`
              : fallbackHeroBackground
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050510] via-[#050510]/80 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[#050510]/75 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-20 lg:py-28 grid gap-16 lg:grid-cols-[1.2fr,0.8fr] items-start">
          <RevealOnView className="space-y-8">
            <div className="flex flex-wrap items-center gap-4 text-sm uppercase tracking-[0.35em] text-white/60">
              <span>{realmLabel}</span>
              <span className="h-px w-12 bg-white/30" />
              <span>Champion Profile</span>
            </div>

            <div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight drop-shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
                {character.name}
              </h1>
              {character.title && (
                <p className="mt-3 text-xl text-white/70 uppercase tracking-[0.25em]">{character.title}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {rarityBadge}
              <span className="text-sm font-semibold text-white/70">
                Power Index <span className="text-white">{(character.rarity + 2.7).toFixed(1)}</span>
              </span>
            </div>

            {character.tagline && (
              <p className="text-2xl md:text-3xl italic text-white/80 max-w-3xl leading-relaxed">“{character.tagline}”</p>
            )}

            {character.description && (
              <div className="max-w-3xl text-base md:text-lg leading-7 text-white/80 space-y-4">
                {character.description.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph.trim()}</p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/play"
                className="group inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-sm font-semibold uppercase tracking-widest transition-all hover:shadow-[0_10px_35px_rgba(168,85,247,0.35)]"
              >
                Battle Mode
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-white/20 text-sm font-semibold uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                Back to roster
              </Link>
            </div>
          </RevealOnView>

          <RevealOnView>
            <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.45)]">
              <div className="absolute -inset-1 rounded-[26px]" style={{ background: `linear-gradient(140deg, ${accentColor}44, transparent 55%)` }} />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4 text-xs uppercase tracking-[0.3em] text-white/60">
                  <span>Holo Model</span>
                  <span>Interactive</span>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/50 overflow-hidden">
                  <CharacterViewer3D modelUrl={modelUrl} height={420} />
                </div>
              </div>
            </div>
          </RevealOnView>
        </div>
      </section>

      <section className="border-t border-white/5 bg-[#06091a]">
        <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-20 grid gap-12 lg:grid-cols-[1.05fr,0.95fr]">
          <RevealOnView className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Performance Metrics</h2>
              <div className="h-px flex-1 mx-6 bg-white/10" />
              <span className="text-xs uppercase tracking-[0.4em] text-white/60">Stats</span>
            </div>
            {Object.keys(stats).length > 0 ? (
              <CharacterStats stats={stats} />
            ) : (
              <p className="text-white/60 text-sm">
                Detailed performance metrics are coming online soon for this champion.
              </p>
            )}
          </RevealOnView>

          <RevealOnView className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8">
              <h3 className="text-2xl font-bold tracking-tight mb-6">Identity Highlights</h3>
              <div className="space-y-5">
                {(character.coreCharm || character.personality || character.danceStyle || character.vibe) ? (
                  <>
                    {character.coreCharm && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-2">Core Charm</p>
                        <p className="text-lg font-semibold text-white">{character.coreCharm}</p>
                      </div>
                    )}
                    {character.danceStyle && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-2">Dance Style</p>
                        <p className="text-lg text-white/90">{character.danceStyle}</p>
                      </div>
                    )}
                    {character.vibe && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-2">Stage Vibe</p>
                        <p className="text-lg text-white/90">{character.vibe}</p>
                      </div>
                    )}
                    {character.personality && (
                      <div>
                        <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-2">Personality</p>
                        <p className="text-lg text-white/90">{character.personality}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-white/60 text-sm">This champion is still keeping their secrets close.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8">
              <h3 className="text-2xl font-bold tracking-tight mb-6">Support Links</h3>
              <div className="space-y-4 text-sm text-white/70">
                <p className="leading-relaxed">
                  Dive deeper into this champion’s origin stories, cosmetics, and crew synergy. These resources update
                  as new drops hit the plaza.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 text-sm uppercase tracking-[0.2em]">
                  <Link href="/claim" className="rounded-xl border border-white/15 px-4 py-3 text-center hover:bg-white/10 transition-colors">
                    Claim Codes
                  </Link>
                  <Link href="/friends" className="rounded-xl border border-white/15 px-4 py-3 text-center hover:bg-white/10 transition-colors">
                    Crew Synergy
                  </Link>
                  <Link href="/compare" className="rounded-xl border border-white/15 px-4 py-3 text-center hover:bg-white/10 transition-colors">
                    Stat Compare
                  </Link>
                  <Link href="/plaza" className="rounded-xl border border-white/15 px-4 py-3 text-center hover:bg-white/10 transition-colors">
                    Plaza Events
                  </Link>
                </div>
              </div>
            </div>
          </RevealOnView>
        </div>
      </section>

      {highlights.length > 0 && (
        <section className="bg-[#050510] py-16 border-t border-white/5">
          <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-16">
            <RevealOnView className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-10 space-y-10">
              <div className="flex items-end justify-between flex-wrap gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-3">Signature Traits</p>
                  <h2 className="text-3xl font-bold tracking-tight">Abilities & Flair</h2>
                </div>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.35em] text-white/40">
                  <span>SELECT A TRAIT</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {highlights.map((trait) => (
                  <button
                    key={trait.id}
                    onClick={() => setActiveTraitId(trait.id)}
                    className={`group relative overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all ${
                      activeTrait?.id === trait.id
                        ? 'border-white/80 bg-white/10'
                        : 'border-white/10 bg-white/5 hover:border-white/40 hover:bg-white/10'
                    }`}
                  >
                    <div
                      className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity"
                      style={{
                        background: `linear-gradient(140deg, ${accentColor}33, transparent 60%)`
                      }}
                    />
                    <div className="relative space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">{trait.label}</p>
                      <p className="text-lg font-semibold">{trait.title}</p>
                      {activeTrait?.id === trait.id && <p className="text-sm text-white/70">{trait.helper}</p>}
                    </div>
                  </button>
                ))}
              </div>

              {activeTrait && (
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-3">{activeTrait.label}</p>
                  <h3 className="text-2xl font-semibold mb-4">{activeTrait.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {activeTrait.helper} As their legend grows, new animations and highlights will be unlocked here.
                  </p>
                </div>
              )}
            </RevealOnView>
          </div>
        </section>
      )}

      <section className="bg-[#040512] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 py-20 space-y-10">
          <RevealOnView className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-3">Featured Skins</p>
                <h2 className="text-3xl font-bold tracking-tight">Style Library</h2>
              </div>
              <Link
                href="/claim"
                className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/20 text-xs font-semibold uppercase tracking-[0.3em] hover:bg-white/10 transition-colors"
              >
                Visit Skin Shop →
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredSkins.map((skin) => (
                <RevealOnView key={skin.id} className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/5">
                  <div
                    className="h-48 bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(140deg, rgba(5,5,16,0.4), rgba(5,5,16,0.6)), linear-gradient(120deg, ${skin.colors.primary}, ${skin.colors.secondary}, ${skin.colors.accent})`
                    }}
                  />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold">{skin.name}</p>
                      <span className="text-xs uppercase tracking-[0.35em] text-white/50">{skin.rarity}</span>
                    </div>
                    {skin.effects && skin.effects.length > 0 && (
                      <ul className="space-y-1 text-sm text-white/60">
                        {skin.effects.slice(0, 3).map((effect, index) => (
                          <li key={index}>• {effect}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/50">
                      {skin.locked ? <span>Locked</span> : <span>Unlocked</span>}
                      {skin.price && <span>{skin.price} 💎</span>}
                    </div>
                  </div>
                </RevealOnView>
              ))}
            </div>
          </RevealOnView>
        </div>
      </section>
    </div>
  );
}
