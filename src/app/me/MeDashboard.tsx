'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ── Types ── */

type CharacterDisplay = {
  id: string;
  name: string;
  title?: string | null;
  tagline?: string | null;
  stats: Record<string, number>;
  artRefs: Record<string, string>;
  color?: string | null;
  rarity?: number;
  ownedAtIso: string | null;
};

type MeDashboardProps = {
  userDisplayName: string;
  ownedCount: number;
  characters: CharacterDisplay[];
  lastClaimAtIso: string | null;
  newestPalName: string | null;
};

type QuickAction = {
  id: string;
  label: string;
  href: string;
  tagline: string;
  icon: string;
  external?: boolean;
};

/* ── Constants ── */

const RARITY_ACCENT: Record<string, { accent: string; glow: string; label: string }> = {
  legendary: { accent: '#fbbf24', glow: 'rgba(251,191,36,0.25)', label: 'Legendary' },
  epic: { accent: '#a855f7', glow: 'rgba(168,85,247,0.25)', label: 'Epic' },
  rare: { accent: '#38bdf8', glow: 'rgba(56,189,248,0.25)', label: 'Rare' },
  common: { accent: '#737373', glow: 'rgba(115,115,115,0.15)', label: 'Common' },
};

const STAT_COLORS: Record<string, string> = {
  rhythm: '#38bdf8',
  style: '#e879f9',
  power: '#fb7185',
  flow: '#34d399',
  teamwork: '#a78bfa',
};

function getRarityKey(rarity?: number): string {
  if (!rarity) return 'rare';
  if (rarity >= 5) return 'legendary';
  if (rarity >= 4) return 'epic';
  if (rarity >= 3) return 'rare';
  return 'common';
}

function pickPreview(artRefs?: Record<string, string>): string | null {
  if (!artRefs) return null;
  return (
    artRefs.portrait ||
    artRefs.card ||
    artRefs.thumbnail ||
    artRefs.banner ||
    artRefs.full ||
    artRefs.signature ||
    Object.values(artRefs)[0] ||
    null
  );
}

/* ── Component ── */

export default function MeDashboard({
  userDisplayName,
  ownedCount,
  characters,
  lastClaimAtIso,
  newestPalName,
}: MeDashboardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    characters.length > 0 ? characters[0].id : null,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedId) ?? characters[0] ?? null,
    [characters, selectedId],
  );

  useEffect(() => {
    if (characters.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !characters.some((character) => character.id === selectedId)) {
      setSelectedId(characters[0].id);
    }
  }, [characters, selectedId]);

  const accentColor = useMemo(() => {
    if (selectedCharacter?.color) return selectedCharacter.color;
    const key = getRarityKey(selectedCharacter?.rarity);
    return RARITY_ACCENT[key]?.accent ?? '#38bdf8';
  }, [selectedCharacter]);

  const quickActions: QuickAction[] = useMemo(
    () => [
      { id: 'claim', label: 'Claim a Pal', href: '/claim', tagline: 'Scan or enter a code', icon: '\u2726' },
      { id: 'play', label: 'Play', href: '/play', tagline: 'Chase today\'s high score', icon: '\u25B6' },
      { id: 'plaza', label: 'Enter Plaza', href: '/plaza', tagline: 'Link up in the social hub', icon: '\u2302' },
      { id: 'arena', label: 'Arena', href: '/arena', tagline: 'Queue live 2D battles', icon: '\u2694' },
      { id: 'compare', label: 'Compare', href: '/compare', tagline: 'Stack stats head-to-head', icon: '\u21C4' },
      {
        id: 'feedback',
        label: 'Feedback',
        href: 'mailto:charmxpals.contact@gmail.com',
        tagline: 'Share what you found',
        icon: '\u2709',
        external: true,
      },
    ],
    [],
  );

  const lastClaimRelative = useMemo(() => {
    if (!lastClaimAtIso) return null;
    const parsedDate = new Date(lastClaimAtIso);
    if (Number.isNaN(parsedDate.getTime())) return null;
    return formatRelativeShort(parsedDate, new Date());
  }, [lastClaimAtIso]);

  return (
    <div
      className="relative min-h-screen bg-[#060610]"
      style={{ '--accent-color': accentColor } as React.CSSProperties}
    >
      {/* ── Ambient background ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          className="cp-profile-glow absolute -top-32 left-[15%] h-[500px] w-[500px] rounded-full blur-[120px]"
          style={{ background: `${accentColor}15` }}
        />
        <div
          className="cp-profile-glow absolute -bottom-40 right-[10%] h-[400px] w-[400px] rounded-full blur-[100px]"
          style={{ background: `${accentColor}10`, animationDelay: '2s' }}
        />
        <HubParticles count={12} accentColor={accentColor} />
      </div>

      <div className="relative z-10">
        {/* ── Hero section ── */}
        <section className="px-4 pb-6 pt-10 sm:pt-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">
                  Player Hub
                </p>
                <h1 className="font-display text-5xl font-black leading-[0.92] text-white md:text-6xl">
                  {userDisplayName}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: accentColor }}
                    />
                    {ownedCount} {ownedCount === 1 ? 'Pal' : 'Pals'}
                  </span>
                  {lastClaimRelative && (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
                      Last claim {lastClaimRelative}
                    </span>
                  )}
                  {newestPalName && (
                    <span className="max-w-[220px] truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
                      Newest {newestPalName}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/claim"
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition-all hover:brightness-110"
                  style={{ background: accentColor }}
                >
                  Claim Pal
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center rounded-lg border border-white/[0.1] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white/50 transition-all hover:border-white/25 hover:text-white/80"
                >
                  Explore All
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="cp-section-divider mx-auto max-w-6xl" />

        {/* ── Character gallery ── */}
        <section className="px-4 py-10" id="gallery">
          <div className="mx-auto max-w-6xl">
            {characters.length > 0 ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">
                      Your Collection
                    </p>
                    <h2 className="mt-1 font-display text-3xl font-bold text-white">
                      {ownedCount} {ownedCount === 1 ? 'Pal' : 'Pals'} Synced
                    </h2>
                  </div>
                </div>

                {/* Showcase: selected character detail */}
                {selectedCharacter && (
                  <CharacterShowcase
                    character={selectedCharacter}
                    accentColor={accentColor}
                  />
                )}

                {/* Gallery grid */}
                <div ref={galleryRef}>
                  <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-white/35">
                    {characters.length > 1 ? 'Select a pal' : 'Your pal'}
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {characters.map((c) => (
                      <GalleryCard
                        key={c.id}
                        character={c}
                        isSelected={c.id === selectedId}
                        isHovered={c.id === hoveredId}
                        onSelect={() => setSelectedId(c.id)}
                        onHover={() => setHoveredId(c.id)}
                        onLeave={() => setHoveredId(null)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="cp-section-divider mx-auto max-w-6xl" />

        {/* ── Quick actions ── */}
        <section className="px-4 py-10">
          <div className="mx-auto max-w-6xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/40">
              Quick Actions
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {quickActions.map((action) => {
                const body = (
                  <div className="flex h-full flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.06]">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                      style={{
                        background: `${accentColor}15`,
                        color: accentColor,
                      }}
                    >
                      {action.icon}
                    </span>
                    <span className="text-sm font-semibold text-white">{action.label}</span>
                    <span className="text-[11px] leading-snug text-white/40">{action.tagline}</span>
                  </div>
                );

                return action.external ? (
                  <a
                    key={action.id}
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-xl"
                  >
                    {body}
                  </a>
                ) : (
                  <Link
                    key={action.id}
                    href={action.href}
                    className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-xl"
                  >
                    {body}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Bottom spacer ── */}
        <div className="h-16" />
      </div>
    </div>
  );
}

/* ── Character Showcase ── */

function CharacterShowcase({
  character,
  accentColor,
}: {
  character: CharacterDisplay;
  accentColor: string;
}) {
  const preview = pickPreview(character.artRefs);
  const rarityKey = getRarityKey(character.rarity);
  const rarityInfo = RARITY_ACCENT[rarityKey];
  const statsEntries = Object.entries(character.stats ?? {});
  const mouseRef = useRef<HTMLDivElement>(null);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = mouseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setParallax({ x: px * -8, y: py * -5 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setParallax({ x: 0, y: 0 });
  }, []);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Art panel */}
      <div
        ref={mouseRef}
        className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Glow behind art */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-40 blur-[80px]"
          style={{ background: accentColor }}
        />

        {preview ? (
          <img
            src={preview}
            alt={character.name}
            className="relative z-10 aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out will-change-transform"
            style={{
              transform: `scale(1.05) translate(${parallax.x}px, ${parallax.y}px)`,
            }}
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="relative z-10 flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-white/[0.04] to-transparent">
            <span className="font-display text-6xl font-black tracking-[0.14em] text-white/10">
              {character.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* Scanline overlay */}
        <div className="pointer-events-none absolute inset-0 z-20 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.03)_2px,rgba(0,0,0,0.03)_4px)]" />

        {/* Top label */}
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
          <span
            className="rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{
              background: `${rarityInfo.accent}20`,
              color: rarityInfo.accent,
              border: `1px solid ${rarityInfo.accent}30`,
            }}
          >
            {rarityInfo.label}
          </span>
        </div>
      </div>

      {/* Info panel */}
      <div className="space-y-5">
        <div>
          <h3 className="font-display text-3xl font-black leading-tight text-white">
            {character.name}
          </h3>
          {character.title && (
            <p className="mt-1 text-sm font-medium text-white/50">{character.title}</p>
          )}
          {character.tagline && (
            <p
              className="mt-3 border-l-2 pl-3 text-sm leading-relaxed text-white/60"
              style={{ borderColor: `${accentColor}60` }}
            >
              {character.tagline}
            </p>
          )}
        </div>

        {/* Stats */}
        {statsEntries.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/35">
              Stats
            </p>
            {statsEntries.map(([key, value]) => {
              const numericValue = Number(value);
              const v = Number.isFinite(numericValue)
                ? Math.max(0, Math.min(100, numericValue))
                : 0;
              const color = STAT_COLORS[key] ?? accentColor;
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="capitalize text-white/50">{key}</span>
                    <span className="font-bold text-white/80">{v}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${v}%`,
                        background: color,
                        boxShadow: `0 0 8px ${color}66`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Link
            href={`/character/${character.id}`}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition-all hover:brightness-110"
            style={{ background: accentColor }}
          >
            View Profile
          </Link>
          <Link
            href={`/character/${character.id}/art`}
            className="inline-flex items-center rounded-lg border border-white/[0.1] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/50 transition-all hover:border-white/25 hover:text-white/80"
          >
            Art Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Gallery Card ── */

function GalleryCard({
  character,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onLeave,
}: {
  character: CharacterDisplay;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const preview = pickPreview(character.artRefs);
  const rarityKey = getRarityKey(character.rarity);
  const rarityInfo = RARITY_ACCENT[rarityKey];
  const accentColor = character.color ?? rarityInfo.accent;

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        isSelected
          ? 'border-white/30 bg-white/[0.08]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.05]'
      }`}
      aria-pressed={isSelected}
      aria-label={`Select ${character.name}`}
    >
      {/* Glow on selected */}
      {isSelected && (
        <div
          className="pointer-events-none absolute inset-0 opacity-20 blur-2xl"
          style={{ background: accentColor }}
        />
      )}

      {/* Art */}
      <div className="relative aspect-square overflow-hidden">
        {preview ? (
          <img
            src={preview}
            alt={character.name}
            className={`h-full w-full object-cover transition-transform duration-300 ${
              isSelected || isHovered ? 'scale-110' : 'scale-100'
            }`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-white/[0.04] to-transparent">
            <span className="font-display text-2xl font-black tracking-[0.14em] text-white/10">
              {character.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* Selected indicator bar */}
        {isSelected && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{
              background: accentColor,
              boxShadow: `0 0 12px ${accentColor}`,
            }}
          />
        )}
      </div>

      {/* Label */}
      <div className="relative z-10 px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-white">{character.name}</p>
        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
          {rarityInfo.label}
        </p>
      </div>
    </button>
  );
}

/* ── Empty State ── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-2xl text-white/20">
        {'\u2726'}
      </div>
      <h3 className="mt-5 font-display text-2xl font-bold text-white">No pals yet</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/40">
        Claim a code to add your first pal. Once collected, your character gallery will come alive here.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/claim"
          className="inline-flex items-center rounded-lg bg-[var(--cp-cyan)] px-6 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all hover:brightness-110"
        >
          Claim a Pal
        </Link>
        <Link
          href="/explore"
          className="inline-flex items-center rounded-lg border border-white/[0.1] px-6 py-3 text-sm font-bold uppercase tracking-wider text-white/50 transition-all hover:border-white/25 hover:text-white/80"
        >
          Explore
        </Link>
      </div>
    </div>
  );
}

/* ── Hub Particles ── */

function HubParticles({ count, accentColor }: { count: number; accentColor: string }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="cp-profile-particle"
          style={{
            '--accent-color': accentColor,
            left: `${8 + (i * 84) / count}%`,
            bottom: '0%',
            animationDuration: `${10 + i * 1.2}s`,
            animationDelay: `${i * 0.7}s`,
            opacity: 0,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/* ── Helpers ── */

function formatRelativeShort(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs <= 0) return 'just now';

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
