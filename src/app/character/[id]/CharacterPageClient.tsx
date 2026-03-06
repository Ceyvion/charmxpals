'use client';

import { useEffect, useMemo, useState, useRef, useCallback, type CSSProperties } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';

import RevealOnView from '@/components/RevealOnView';
import HexRadar from '@/components/champion/HexRadar';
import StatBar from '@/components/champion/StatBar';
import LoreCodex from '@/components/champion/LoreCodex';
import CharacterGallery from '@/components/champion/CharacterGallery';
import TraitBadge from '@/components/champion/TraitBadge';

const FiberOpticBackground = dynamic(
  () =>
    import('@/components/champion/FiberOpticBackground')
      .then((mod) => mod.default)
      .catch(() => () => null),
  { ssr: false, loading: () => null },
);

const DISABLE_3D_EFFECTS = /^(1|true|yes|on)$/i.test(
  process.env.NEXT_PUBLIC_DISABLE_3D ?? '',
);

/* ── Types ── */

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
  slug?: string | null;
  vibe?: string | null;
  danceStyle?: string | null;
  coreCharm?: string | null;
  personality?: string | null;
  color?: string | null;
};

/* ── Constants ── */

const RARITY_CONFIG = [
  { test: (r: number) => r >= 5, label: 'Legendary', gradient: 'from-yellow-300 via-orange-400 to-yellow-600', accent: '#fbbf24', glow: 'rgba(251,191,36,0.3)' },
  { test: (r: number) => r >= 4, label: 'Epic', gradient: 'from-purple-300 via-fuchsia-400 to-purple-600', accent: '#a855f7', glow: 'rgba(168,85,247,0.3)' },
  { test: () => true, label: 'Rare', gradient: 'from-sky-300 via-blue-400 to-indigo-500', accent: '#38bdf8', glow: 'rgba(56,189,248,0.3)' },
] as const;

const STAT_COLORS: Record<string, string> = {
  rhythm: '#38bdf8',
  style: '#e879f9',
  power: '#fb7185',
  flow: '#34d399',
  teamwork: '#a78bfa',
};

const TRAIT_ICONS: Record<string, string> = {
  coreCharm: '\u2756',
  danceStyle: '\u2740',
  vibe: '\u2734',
  personality: '\u2662',
  codeSeries: '\u25C8',
  realm: '\u2726',
};

const TRAIT_LABELS: Record<string, string> = {
  coreCharm: 'Core Charm',
  danceStyle: 'Dance Style',
  vibe: 'Stage Vibe',
  personality: 'Personality',
  codeSeries: 'Code Series',
  realm: 'Realm',
};

type SectionId = 'lore' | 'stats' | 'gallery' | 'traits';

/* ── Helpers ── */

function getRarity(rarity: number) {
  return RARITY_CONFIG.find((r) => r.test(rarity)) ?? RARITY_CONFIG[RARITY_CONFIG.length - 1];
}

function pickHeroArt(artRefs?: Record<string, string>): string | null {
  if (!artRefs) return null;
  return artRefs.signature || artRefs.banner || artRefs.full || artRefs.portrait || artRefs.card || artRefs.thumbnail || Object.values(artRefs)[0] || null;
}

function buildArtCandidates(artRefs?: Record<string, string>, slug?: string | null): string[] {
  const candidates: string[] = [];
  const push = (v: string | undefined | null) => { if (v) candidates.push(v); };
  if (artRefs) {
    push(artRefs.signature); push(artRefs.banner); push(artRefs.portrait); push(artRefs.card);
    push(artRefs.thumbnail); push(artRefs.full); push(artRefs.sprite);
    for (const v of Object.values(artRefs)) push(v);
  }
  if (slug) {
    const base = `/assets/characters/${slug}`;
    push(`${base}/signature.webp`); push(`${base}/banner.webp`);
    push(`${base}/portrait.webp`); push(`${base}/card.webp`); push(`${base}/thumb.webp`);
  }
  push('/card-placeholder.svg');
  return [...new Set(candidates)];
}

function buildGallery(artRefs?: Record<string, string>): Array<{ key: string; src: string }> {
  if (!artRefs) return [];
  const order = ['signature', 'banner', 'portrait', 'card', 'thumbnail', 'full', 'sprite'];
  const seen = new Set<string>();
  const gallery: Array<{ key: string; src: string }> = [];
  for (const key of order) {
    const v = artRefs[key];
    if (!v || seen.has(v)) continue;
    seen.add(v);
    gallery.push({ key, src: v });
  }
  for (const [key, v] of Object.entries(artRefs)) {
    if (!v || seen.has(v)) continue;
    seen.add(v);
    gallery.push({ key, src: v });
  }
  return gallery;
}

function buildTraits(character: Character) {
  const keys = ['coreCharm', 'danceStyle', 'vibe', 'personality', 'codeSeries', 'realm'] as const;
  return keys
    .filter((k) => character[k])
    .map((k) => ({
      id: k,
      label: TRAIT_LABELS[k] ?? k,
      value: String(character[k]),
      icon: TRAIT_ICONS[k] ?? '\u2022',
    }));
}

function prettifyStat(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function normalizeStats(stats?: Record<string, number> | null): Record<string, number> {
  if (!stats) return {};
  const normalized: Record<string, number> = {};
  for (const [key, raw] of Object.entries(stats)) {
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    normalized[key] = Math.min(100, Math.max(0, Math.round(value)));
  }
  return normalized;
}

/* ── Floating particles ── */
function Particles({ count, color }: { count: number; color: string }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 2,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 10,
      opacity: 0.2 + Math.random() * 0.4,
    }));
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="cp-profile-particle"
          style={{
            '--accent-color': color,
            left: p.left,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
            background: color,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

/* ── Main Component ── */

export default function CharacterPageClient({ character }: { character: Character }) {
  const rarity = useMemo(() => getRarity(character.rarity), [character.rarity]);
  const artCandidates = useMemo(() => buildArtCandidates(character.artRefs, character.slug), [character.artRefs, character.slug]);
  const heroArt = useMemo(() => pickHeroArt(character.artRefs) ?? artCandidates[0] ?? null, [character.artRefs, artCandidates]);
  const gallery = useMemo(() => buildGallery(character.artRefs), [character.artRefs]);
  const traits = useMemo(() => buildTraits(character), [character]);
  const stats = useMemo(() => normalizeStats(character.stats), [character.stats]);
  const statEntries = useMemo(
    () => Object.entries(stats).sort((a, b) => Number(b[1]) - Number(a[1])),
    [stats],
  );
  const hasLoreSection = Boolean(character.description);
  const hasStandaloneTraits = !hasLoreSection && traits.length > 0;
  const accentColor = character.color ?? rarity.accent;
  const realmLabel = character.realm ? character.realm.toUpperCase() : 'UNKNOWN REALM';
  const [artIndex, setArtIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionId>('lore');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => { setArtIndex(0); }, [character.id]);

  const currentArt = artCandidates[artIndex] ?? heroArt;

  // Hero parallax on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  // Compute overall power rating
  const avgStat = statEntries.length > 0 ? Math.round(statEntries.reduce((s, [, v]) => s + Number(v), 0) / statEntries.length) : 0;

  const sections: { id: SectionId; label: string; available: boolean }[] = [
    { id: 'lore', label: 'Lore', available: hasLoreSection },
    { id: 'stats', label: 'Stats', available: statEntries.length > 0 },
    { id: 'gallery', label: 'Gallery', available: gallery.length > 0 },
    { id: 'traits', label: 'Identity', available: hasStandaloneTraits },
  ];

  const availableSections = sections.filter((s) => s.available);

  useEffect(() => {
    if (!availableSections.length) return;
    if (availableSections.some((s) => s.id === activeSection)) return;
    setActiveSection(availableSections[0].id);
  }, [availableSections, activeSection]);

  return (
    <div
      className="min-h-screen bg-[#060610] text-white"
      style={{ '--accent-color': accentColor } as CSSProperties}
    >
      {/* ═══ HERO SECTION ═══ */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        onMouseMove={handleMouseMove}
      >
        {/* Background layers */}
        <div className="absolute inset-0">
          {/* Base image with heavy overlay */}
          {heroArt && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out"
              style={{
                backgroundImage: `url(${heroArt})`,
                transform: `scale(1.05) translate(${mousePos.x * -8}px, ${mousePos.y * -5}px)`,
                filter: 'blur(2px) saturate(0.6)',
              }}
            />
          )}
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#060610]/80 via-[#060610]/60 to-[#060610]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060610]/90 via-transparent to-[#060610]/70" />
          {/* Accent glow */}
          <div
            className="cp-profile-glow pointer-events-none absolute left-1/4 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
            style={{ backgroundColor: `${accentColor}15` }}
          />
          <div
            className="cp-profile-glow pointer-events-none absolute bottom-0 right-1/4 h-[300px] w-[400px] rounded-full blur-[100px]"
            style={{ backgroundColor: `${accentColor}10`, animationDelay: '2s' }}
          />
        </div>

        {/* Fiber optic light strands */}
        {!DISABLE_3D_EFFECTS && (
          <FiberOpticBackground accentColor={accentColor} fiberCount={10} />
        )}

        {/* Particles */}
        <Particles count={15} color={accentColor} />

        {/* Hero content */}
        <div className="relative mx-auto grid max-w-7xl gap-8 px-6 pb-8 pt-16 md:px-10 lg:grid-cols-[1fr_0.85fr] lg:gap-12 lg:pb-12 lg:pt-24">
          {/* Left: Character info */}
          <RevealOnView className="flex flex-col justify-center space-y-6">
            {/* Realm & faction kicker */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}10`,
                  color: `${accentColor}cc`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                {realmLabel}
              </span>
              {character.codeSeries && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
                  {character.codeSeries}
                </span>
              )}
            </div>

            {/* Name */}
            <div>
              <h1 className="font-display text-6xl font-black leading-[0.88] tracking-tight md:text-8xl">
                <span className="block text-white">{character.name}</span>
              </h1>
              {character.title && (
                <p
                  className="mt-3 text-sm font-semibold uppercase tracking-[0.25em] md:text-base"
                  style={{ color: `${accentColor}99` }}
                >
                  {character.title}
                </p>
              )}
            </div>

            {/* Rarity + Power */}
            <div className="flex flex-wrap items-center gap-4">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r px-3 py-1.5 text-xs font-black uppercase tracking-wider ${rarity.gradient} text-black`}
              >
                <span className="h-1 w-1 rounded-full bg-black/40" />
                {rarity.label}
              </span>
              {avgStat > 0 && (
                <span className="flex items-baseline gap-1.5 text-sm text-white/50">
                  Power
                  <span className="font-display text-xl font-bold text-white">{avgStat}</span>
                </span>
              )}
            </div>

            {/* Tagline */}
            {character.tagline && (
              <p className="max-w-lg border-l-2 pl-4 text-lg italic leading-relaxed text-white/50 md:text-xl" style={{ borderColor: `${accentColor}55` }}>
                &ldquo;{character.tagline}&rdquo;
              </p>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/arena"
                className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all duration-200 hover:brightness-110"
                style={{ backgroundColor: accentColor }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13.2 3.5 6.5 13h5l-.7 7.5 6.7-9.5h-5l.7-7.5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Battle Arena
              </Link>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white/70 transition-colors duration-200 hover:border-white/30 hover:text-white"
              >
                Back to Roster
              </Link>
            </div>
          </RevealOnView>

          {/* Right: Character art */}
          <RevealOnView delay={100} className="relative flex items-center justify-center">
            <div className="relative w-full max-w-[480px]">
              {/* Art glow backdrop */}
              <div
                className="cp-profile-glow pointer-events-none absolute inset-0 scale-110 rounded-3xl blur-3xl"
                style={{ backgroundColor: `${accentColor}12` }}
              />

              {/* Art frame */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30 backdrop-blur-sm">
                {/* Top bar */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Signature Art</span>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    <span className="text-[10px] text-white/25">LIVE</span>
                  </div>
                </div>

                {/* Image */}
                <div className="relative h-[55vh] min-h-[380px] w-full">
                  {currentArt ? (
                    <Image
                      src={currentArt}
                      alt={character.name}
                      fill
                      priority
                      sizes="(min-width: 1280px) 480px, (min-width: 1024px) 45vw, 100vw"
                      className="object-cover object-center transition-transform duration-700 ease-out"
                      style={{
                        transform: `scale(1.02) translate(${mousePos.x * 4}px, ${mousePos.y * 3}px)`,
                      }}
                      onError={() => {
                        setArtIndex((i) => (i >= artCandidates.length - 1 ? i : i + 1));
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-white/[0.02] text-5xl font-black text-white/10">
                      {character.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Scanline effect */}
                <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.01)_2px,rgba(255,255,255,0.01)_4px)]" />
              </div>
            </div>
          </RevealOnView>
        </div>

        {/* Bottom fade into content */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#060610] to-transparent" />
      </section>

      {/* ═══ SECTION NAVIGATION ═══ */}
      {availableSections.length > 1 && (
        <nav className="sticky top-14 z-30 border-b border-white/[0.06] bg-[#060610]/80 backdrop-blur-xl" aria-label="Profile sections">
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6 md:px-10">
            {availableSections.map((section) => (
              <button
                key={section.id}
                className="cp-profile-tab"
                data-active={activeSection === section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={{ '--accent-color': accentColor } as CSSProperties}
              >
                {section.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ═══ CONTENT SECTIONS ═══ */}
      <div className="relative mx-auto max-w-7xl space-y-0 px-6 md:px-10">

        {/* ── LORE SECTION ── */}
        {hasLoreSection && (
          <section id="section-lore" className="scroll-mt-24 py-16">
            <RevealOnView>
              <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
                {/* Lore codex */}
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                      style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                    >
                      &#x270E;
                    </div>
                    <h2 className="font-display text-3xl font-bold tracking-tight">Codex</h2>
                  </div>
                  <LoreCodex
                    description={character.description ?? ''}
                    tagline={character.tagline}
                    personality={character.personality}
                    vibe={character.vibe}
                    coreCharm={character.coreCharm}
                    danceStyle={character.danceStyle}
                    realm={character.realm}
                    accentColor={accentColor}
                  />
                </div>

                {/* Trait badges */}
                {traits.length > 0 && (
                  <div>
                    <div className="mb-6 flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                        style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                      >
                        &#x2662;
                      </div>
                      <h2 className="font-display text-3xl font-bold tracking-tight">Identity</h2>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {traits.map((trait) => (
                        <TraitBadge
                          key={trait.id}
                          label={trait.label}
                          value={trait.value}
                          icon={trait.icon}
                          accentColor={accentColor}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </RevealOnView>

            <div className="cp-section-divider mt-16" style={{ '--accent-color': accentColor } as CSSProperties} />
          </section>
        )}

        {/* ── IDENTITY SECTION (fallback when no lore block) ── */}
        {hasStandaloneTraits && (
          <section id="section-traits" className="scroll-mt-24 py-16">
            <RevealOnView>
              <div className="mb-6 flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                >
                  &#x2662;
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight">Identity</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {traits.map((trait) => (
                  <TraitBadge
                    key={trait.id}
                    label={trait.label}
                    value={trait.value}
                    icon={trait.icon}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            </RevealOnView>

            <div className="cp-section-divider mt-16" style={{ '--accent-color': accentColor } as CSSProperties} />
          </section>
        )}

        {/* ── STATS SECTION ── */}
        {statEntries.length > 0 && (
          <section id="section-stats" className="scroll-mt-24 py-16">
            <RevealOnView>
              <div className="mb-8 flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                >
                  &#x2B23;
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight">Combat Stats</h2>
                <span className="ml-auto rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  {statEntries.length} attributes
                </span>
              </div>

              <div className="grid gap-10 lg:grid-cols-[0.9fr_1fr]">
                {/* Hex radar */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                  {statEntries.length >= 3 ? (
                    <>
                      <HexRadar stats={stats} accentColor={accentColor} size={280} />
                      <p className="mt-4 text-center text-xs text-white/30">
                        Core Attribute Radar
                      </p>
                    </>
                  ) : (
                    <p className="max-w-xs text-center text-sm leading-relaxed text-white/45">
                      Radar view unlocks when at least three attributes are available.
                    </p>
                  )}
                </div>

                {/* Segmented bars */}
                <div className="space-y-5">
                  {statEntries.map(([key, value], i) => (
                    <StatBar
                      key={key}
                      label={prettifyStat(key)}
                      value={Number(value)}
                      color={STAT_COLORS[key.toLowerCase()] ?? accentColor}
                      delay={i * 100}
                    />
                  ))}

                  {/* Overall summary */}
                  <div className="mt-4 flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Overall</span>
                      <span className="font-display text-3xl font-bold" style={{ color: accentColor }}>{avgStat}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        {statEntries.map(([key, value]) => {
                          const v = Number(value);
                          const diff = v - avgStat;
                          const trend = diff > 0 ? 'above' : diff < 0 ? 'below' : 'equal';
                          return (
                            <span
                              key={key}
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold"
                              style={{
                                borderColor:
                                  trend === 'above'
                                    ? 'rgba(52,211,153,0.3)'
                                    : trend === 'below'
                                      ? 'rgba(251,113,133,0.2)'
                                      : 'rgba(148,163,184,0.24)',
                                color:
                                  trend === 'above'
                                    ? '#34d399'
                                    : trend === 'below'
                                      ? '#fb7185'
                                      : '#94a3b8',
                                backgroundColor:
                                  trend === 'above'
                                    ? 'rgba(52,211,153,0.08)'
                                    : trend === 'below'
                                      ? 'rgba(251,113,133,0.06)'
                                      : 'rgba(148,163,184,0.08)',
                              }}
                            >
                              {trend === 'above' ? '\u25B2' : trend === 'below' ? '\u25BC' : '\u2022'} {prettifyStat(key)} {diff > 0 ? '+' : ''}{diff}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </RevealOnView>

            <div className="cp-section-divider mt-16" style={{ '--accent-color': accentColor } as CSSProperties} />
          </section>
        )}

        {/* ── GALLERY SECTION ── */}
        {gallery.length > 0 && (
          <section id="section-gallery" className="scroll-mt-24 py-16">
            <RevealOnView>
              <div className="mb-8 flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                >
                  &#x25A3;
                </div>
                <h2 className="font-display text-3xl font-bold tracking-tight">Gallery</h2>
                <span className="ml-auto rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                  {gallery.length} variants
                </span>
              </div>

              <CharacterGallery
                items={gallery}
                characterName={character.name}
                accentColor={accentColor}
              />
            </RevealOnView>

            <div className="cp-section-divider mt-16" style={{ '--accent-color': accentColor } as CSSProperties} />
          </section>
        )}

        {/* ── QUICK ACTIONS ── */}
        <section className="py-16">
          <RevealOnView>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: '/claim', label: 'Claim Codes', icon: '\u2693' },
                { href: '/compare', label: 'Stat Compare', icon: '\u21C5' },
                { href: '/plaza', label: 'Social Plaza', icon: '\u2605' },
                { href: '/arena', label: 'Rift Arena', icon: '\u2694' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors"
                    style={{ backgroundColor: `${accentColor}10`, color: `${accentColor}88` }}
                  >
                    {link.icon}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50 transition-colors group-hover:text-white/80">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </RevealOnView>
        </section>
      </div>
    </div>
  );
}
