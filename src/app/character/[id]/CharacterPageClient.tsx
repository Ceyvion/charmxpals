'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';

import CharacterStats from '@/components/CharacterStats';
import RevealOnView from '@/components/RevealOnView';

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

type TraitHighlight = {
  id: string;
  label: string;
  value: string;
};

type HighlightTone = {
  border: string;
  surface: string;
  halo: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
};

type GalleryTone = {
  border: string;
  labelBg: string;
  labelText: string;
  glow: string;
};

const rarityPalette = [
  {
    test: (rarity: number) => rarity >= 5,
    label: 'Legendary',
    gradient: 'from-yellow-300 via-orange-400 to-yellow-600',
    accent: '#fbbf24',
  },
  {
    test: (rarity: number) => rarity >= 4,
    label: 'Epic',
    gradient: 'from-purple-300 via-fuchsia-400 to-purple-600',
    accent: '#a855f7',
  },
  {
    test: () => true,
    label: 'Rare',
    gradient: 'from-sky-300 via-blue-400 to-indigo-500',
    accent: '#38bdf8',
  },
];

const HIGHLIGHT_TONES: Record<string, HighlightTone> = {
  coreCharm: {
    border: '#fda4af',
    surface: 'linear-gradient(145deg, rgba(255, 230, 238, 0.98), rgba(255, 241, 223, 0.96))',
    halo: 'radial-gradient(circle, rgba(251, 113, 133, 0.34), transparent 70%)',
    chipBg: 'rgba(255, 228, 232, 0.95)',
    chipBorder: 'rgba(251, 113, 133, 0.6)',
    chipText: '#9f1239',
  },
  danceStyle: {
    border: '#93c5fd',
    surface: 'linear-gradient(145deg, rgba(226, 240, 255, 0.98), rgba(237, 252, 255, 0.95))',
    halo: 'radial-gradient(circle, rgba(96, 165, 250, 0.32), transparent 72%)',
    chipBg: 'rgba(224, 242, 254, 0.95)',
    chipBorder: 'rgba(59, 130, 246, 0.55)',
    chipText: '#1e3a8a',
  },
  vibe: {
    border: '#a7f3d0',
    surface: 'linear-gradient(145deg, rgba(228, 255, 241, 0.97), rgba(241, 255, 249, 0.95))',
    halo: 'radial-gradient(circle, rgba(52, 211, 153, 0.3), transparent 72%)',
    chipBg: 'rgba(209, 250, 229, 0.95)',
    chipBorder: 'rgba(16, 185, 129, 0.52)',
    chipText: '#065f46',
  },
  personality: {
    border: '#c4b5fd',
    surface: 'linear-gradient(145deg, rgba(238, 233, 255, 0.98), rgba(249, 240, 255, 0.95))',
    halo: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 72%)',
    chipBg: 'rgba(237, 233, 254, 0.95)',
    chipBorder: 'rgba(139, 92, 246, 0.52)',
    chipText: '#5b21b6',
  },
  codeSeries: {
    border: '#fcd34d',
    surface: 'linear-gradient(145deg, rgba(255, 248, 226, 0.98), rgba(255, 240, 206, 0.95))',
    halo: 'radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent 72%)',
    chipBg: 'rgba(254, 243, 199, 0.95)',
    chipBorder: 'rgba(217, 119, 6, 0.5)',
    chipText: '#92400e',
  },
  realm: {
    border: '#67e8f9',
    surface: 'linear-gradient(145deg, rgba(224, 253, 255, 0.98), rgba(236, 254, 255, 0.95))',
    halo: 'radial-gradient(circle, rgba(6, 182, 212, 0.3), transparent 72%)',
    chipBg: 'rgba(207, 250, 254, 0.95)',
    chipBorder: 'rgba(8, 145, 178, 0.52)',
    chipText: '#155e75',
  },
};

const DEFAULT_HIGHLIGHT_TONE: HighlightTone = {
  border: '#cbd5e1',
  surface: 'linear-gradient(145deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.95))',
  halo: 'radial-gradient(circle, rgba(148, 163, 184, 0.28), transparent 72%)',
  chipBg: 'rgba(241, 245, 249, 0.98)',
  chipBorder: 'rgba(148, 163, 184, 0.5)',
  chipText: '#334155',
};

const GALLERY_TONES: Record<string, GalleryTone> = {
  signature: {
    border: '#fda4af',
    labelBg: '#ffe4e6',
    labelText: '#9f1239',
    glow: 'radial-gradient(circle, rgba(251, 113, 133, 0.24), transparent 70%)',
  },
  banner: {
    border: '#67e8f9',
    labelBg: '#cffafe',
    labelText: '#155e75',
    glow: 'radial-gradient(circle, rgba(34, 211, 238, 0.24), transparent 70%)',
  },
  portrait: {
    border: '#a7f3d0',
    labelBg: '#d1fae5',
    labelText: '#065f46',
    glow: 'radial-gradient(circle, rgba(16, 185, 129, 0.24), transparent 70%)',
  },
  card: {
    border: '#c4b5fd',
    labelBg: '#ede9fe',
    labelText: '#5b21b6',
    glow: 'radial-gradient(circle, rgba(139, 92, 246, 0.24), transparent 70%)',
  },
  thumbnail: {
    border: '#fcd34d',
    labelBg: '#fef3c7',
    labelText: '#92400e',
    glow: 'radial-gradient(circle, rgba(245, 158, 11, 0.22), transparent 72%)',
  },
  full: {
    border: '#93c5fd',
    labelBg: '#dbeafe',
    labelText: '#1e3a8a',
    glow: 'radial-gradient(circle, rgba(59, 130, 246, 0.24), transparent 72%)',
  },
  sprite: {
    border: '#fdba74',
    labelBg: '#ffedd5',
    labelText: '#9a3412',
    glow: 'radial-gradient(circle, rgba(249, 115, 22, 0.2), transparent 72%)',
  },
};

const DEFAULT_GALLERY_TONE: GalleryTone = {
  border: '#cbd5e1',
  labelBg: '#f1f5f9',
  labelText: '#334155',
  glow: 'radial-gradient(circle, rgba(100, 116, 139, 0.2), transparent 72%)',
};

function pickPrimaryArt(artRefs?: Record<string, string>): string | null {
  if (!artRefs) return null;
  return (
    artRefs.signature ||
    artRefs.banner ||
    artRefs.full ||
    artRefs.portrait ||
    artRefs.card ||
    artRefs.thumbnail ||
    Object.values(artRefs)[0] ||
    null
  );
}

function pickSignatureArt(artRefs?: Record<string, string>): string | null {
  if (!artRefs) return null;
  return (
    artRefs.signature ||
    artRefs.banner ||
    artRefs.portrait ||
    artRefs.card ||
    artRefs.thumbnail ||
    artRefs.full ||
    Object.values(artRefs)[0] ||
    null
  );
}

function pickGallery(artRefs?: Record<string, string>): Array<{ key: string; src: string }> {
  if (!artRefs) return [];
  const preferredOrder = ['signature', 'banner', 'portrait', 'card', 'thumbnail', 'full', 'sprite'];
  const seen = new Set<string>();
  const gallery: Array<{ key: string; src: string }> = [];
  for (const key of preferredOrder) {
    const value = artRefs[key];
    if (!value || seen.has(value)) continue;
    seen.add(value);
    gallery.push({ key, src: value });
  }
  for (const [key, value] of Object.entries(artRefs)) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    gallery.push({ key, src: value });
  }
  return gallery;
}

function buildArtCandidates(artRefs?: Record<string, string>, slug?: string | null): string[] {
  const candidates: string[] = [];
  const push = (value: string | null | undefined) => {
    if (value) candidates.push(value);
  };

  if (artRefs) {
    push(artRefs.signature);
    push(artRefs.banner);
    push(artRefs.portrait);
    push(artRefs.card);
    push(artRefs.thumbnail);
    push(artRefs.full);
    push(artRefs.sprite);
    for (const value of Object.values(artRefs)) push(value);
  }

  if (slug) {
    const base = `/assets/characters/${slug}`;
    push(`${base}/signature.png`);
    push(`${base}/banner.png`);
    push(`${base}/portrait.png`);
    push(`${base}/card.png`);
    push(`${base}/thumb.png`);
  }

  push('/card-placeholder.svg');
  return [...new Set(candidates)];
}

function getRarityDetails(rarity: number) {
  return rarityPalette.find((entry) => entry.test(rarity)) ?? rarityPalette[rarityPalette.length - 1];
}

function buildTraitHighlights(character: Character): TraitHighlight[] {
  const rows: Array<{ id: string; label: string; value: string | null | undefined }> = [
    { id: 'coreCharm', label: 'Core Charm', value: character.coreCharm },
    { id: 'danceStyle', label: 'Dance Style', value: character.danceStyle },
    { id: 'vibe', label: 'Stage Vibe', value: character.vibe },
    { id: 'personality', label: 'Personality', value: character.personality },
    { id: 'codeSeries', label: 'Code Series', value: character.codeSeries },
    { id: 'realm', label: 'Realm', value: character.realm },
  ];
  return rows
    .filter((row) => Boolean(row.value))
    .map((row) => ({
      id: row.id,
      label: row.label,
      value: String(row.value),
    }));
}

function getHighlightTone(id: string): HighlightTone {
  return HIGHLIGHT_TONES[id] ?? DEFAULT_HIGHLIGHT_TONE;
}

function getGalleryTone(key: string): GalleryTone {
  return GALLERY_TONES[key] ?? DEFAULT_GALLERY_TONE;
}

export default function CharacterPageClient({ character }: { character: Character }) {
  const rarity = useMemo(() => getRarityDetails(character.rarity), [character.rarity]);
  const artCandidates = useMemo(() => buildArtCandidates(character.artRefs, character.slug), [character.artRefs, character.slug]);
  const heroArt = useMemo(() => pickPrimaryArt(character.artRefs) ?? artCandidates[0] ?? null, [character.artRefs, artCandidates]);
  const defaultSignatureArt = useMemo(() => pickSignatureArt(character.artRefs) ?? artCandidates[0] ?? null, [character.artRefs, artCandidates]);
  const gallery = useMemo(() => pickGallery(character.artRefs), [character.artRefs]);
  const galleryPreview = useMemo(() => gallery.slice(0, 5), [gallery]);
  const highlights = useMemo(() => buildTraitHighlights(character), [character]);
  const stats = useMemo(() => character.stats ?? {}, [character.stats]);
  const accentColor = character.color ?? rarity.accent;
  const realmLabel = character.realm ? character.realm.toUpperCase() : 'UNKNOWN REALM';
  const [signatureIndex, setSignatureIndex] = useState(0);

  useEffect(() => {
    setSignatureIndex(0);
  }, [character.id]);

  const signatureArt = artCandidates[signatureIndex] ?? defaultSignatureArt;

  return (
    <div className="min-h-screen bg-[var(--cp-bg)] text-[var(--cp-text-primary)]">
      <section className="relative overflow-hidden cp-section-dark">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: heroArt
              ? `linear-gradient(120deg, rgba(10,10,10,0.93) 10%, rgba(10,10,10,0.84) 42%, rgba(10,10,10,0.74) 70%, rgba(10,10,10,0.88) 100%), url(${heroArt})`
              : `radial-gradient(circle at 12% 22%, ${accentColor}55, transparent 46%), linear-gradient(140deg, rgba(8,13,26,0.9), rgba(13,25,48,0.75))`,
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-14 md:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <RevealOnView className="space-y-7">
            <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.32em] text-[var(--cp-gray-400)] md:text-sm">
              <span>{realmLabel}</span>
              <span className="h-px w-10 bg-[var(--cp-gray-700)]" />
              <span>Champion Profile</span>
            </div>

            <div>
              <h1 className="font-display text-6xl font-black leading-[0.86] tracking-tight text-[var(--cp-white)] md:text-7xl">{character.name}</h1>
              {character.title && <p className="mt-3 text-sm uppercase tracking-[0.28em] text-[var(--cp-gray-400)] md:text-base">{character.title}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <span className={`inline-flex items-center rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-black)] bg-gradient-to-r px-3 py-1 text-xs font-black ${rarity.gradient} text-[var(--cp-black)]`}>
                {rarity.label}
              </span>
              <span className="text-sm font-semibold text-[var(--cp-gray-300)]">
                Power Index <span className="text-[var(--cp-white)]">{(character.rarity + 2.7).toFixed(1)}</span>
              </span>
            </div>

            {character.tagline && <p className="max-w-3xl text-2xl italic text-[var(--cp-gray-100)] md:text-3xl">“{character.tagline}”</p>}

            {character.description && (
              <p className="max-w-3xl text-sm leading-7 text-[var(--cp-gray-300)] md:text-base">
                {character.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/arena" className="cp-cta-primary">
                Battle Arena
              </Link>
              <Link href="/play" className="cp-cta-ghost">
                Game Hub
              </Link>
              <Link href="/explore" className="cp-cta-ghost">
                Back to Roster
              </Link>
            </div>
          </RevealOnView>

          <RevealOnView>
            <div className="overflow-hidden rounded-[var(--cp-radius-lg)] border-2 border-[var(--cp-gray-700)] bg-[rgba(10,10,10,0.7)]">
              <div className="border-b-2 border-[var(--cp-gray-700)] px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-[var(--cp-gray-400)]">Signature Art</div>
              {signatureArt ? (
                <img
                  src={signatureArt}
                  alt={character.name}
                  className="h-[62vh] min-h-[420px] w-full object-cover object-center"
                  loading="eager"
                  decoding="async"
                  onError={() => {
                    setSignatureIndex((index) => {
                      if (index >= artCandidates.length - 1) return index;
                      return index + 1;
                    });
                  }}
                />
              ) : (
                <div className="flex h-[420px] items-center justify-center bg-[var(--cp-gray-900)] text-5xl font-black text-[var(--cp-gray-400)]">
                  {character.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </RevealOnView>
        </div>
      </section>

      <section className="border-t-2 border-[var(--cp-border)] bg-[var(--cp-bg)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:px-10 lg:grid-cols-[1.1fr_0.9fr]">
          <RevealOnView className="cp-panel p-8">
            <div className="mb-7 flex items-center justify-between">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--cp-text-primary)]">Performance Metrics</h2>
              <span className="text-[11px] uppercase tracking-[0.3em] text-[var(--cp-text-muted)]">Stats</span>
            </div>
            {Object.keys(stats).length > 0 ? (
              <div className="rounded-[var(--cp-radius-lg)] border-2 border-[var(--cp-gray-700)] bg-[var(--cp-black)] p-4">
                <CharacterStats stats={stats} />
              </div>
            ) : (
              <p className="text-sm text-[var(--cp-text-muted)]">Detailed metrics are syncing for this character.</p>
            )}
          </RevealOnView>

          <RevealOnView className="space-y-6">
            <div className="cp-panel p-8">
              <div className="flex items-end justify-between gap-3">
                <h3 className="font-display text-2xl font-semibold text-[var(--cp-text-primary)]">Identity Highlights</h3>
                <span className="rounded-[var(--cp-radius-sm)] border border-[var(--cp-border)] bg-[var(--cp-white)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--cp-text-muted)]">
                  Spotlight
                </span>
              </div>
              {highlights.length > 0 ? (
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  {highlights.map((trait) => {
                    const tone = getHighlightTone(trait.id);
                    const cardStyle: CSSProperties = {
                      borderColor: tone.border,
                      backgroundImage: tone.surface,
                    };
                    const chipStyle: CSSProperties = {
                      backgroundColor: tone.chipBg,
                      borderColor: tone.chipBorder,
                      color: tone.chipText,
                    };

                    return (
                      <div
                        key={trait.id}
                        className="group relative overflow-hidden rounded-[var(--cp-radius-md)] border-2 px-4 py-4 transition-transform duration-200 hover:-translate-y-0.5"
                        style={cardStyle}
                      >
                        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl" style={{ backgroundImage: tone.halo }} />
                        <dt className="relative">
                          <span className="inline-flex items-center rounded-[var(--cp-radius-sm)] border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]" style={chipStyle}>
                            {trait.label}
                          </span>
                        </dt>
                        <dd className="relative mt-3 text-sm leading-relaxed text-[var(--cp-text-primary)]">{trait.value}</dd>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <p className="mt-4 text-sm text-[var(--cp-text-muted)]">Profile metadata is still being expanded for this champion.</p>
              )}
            </div>

            <div className="cp-panel p-8">
              <h3 className="font-display text-2xl font-semibold text-[var(--cp-text-primary)]">Quick Links</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Link href="/claim" className="rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:text-[var(--cp-text-primary)]">
                  Claim Codes
                </Link>
                <Link href="/compare" className="rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:text-[var(--cp-text-primary)]">
                  Stat Compare
                </Link>
                <Link href="/plaza" className="rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:text-[var(--cp-text-primary)]">
                  Social Plaza
                </Link>
                <Link href="/arena" className="rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:text-[var(--cp-text-primary)]">
                  Rift Arena
                </Link>
              </div>
            </div>
          </RevealOnView>
        </div>
      </section>

      {gallery.length > 0 && (
        <section className="border-t-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] py-10">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <RevealOnView className="cp-panel p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.34em] text-[var(--cp-text-muted)]">Asset Set</p>
                  <h2 className="font-display text-3xl font-bold text-[var(--cp-text-primary)]">Character Gallery</h2>
                  <p className="mt-1 text-sm text-[var(--cp-text-muted)]">Compact reel of the key visual variants.</p>
                </div>
                <span className="rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--cp-text-secondary)]">
                  {gallery.length} assets
                </span>
              </div>
              <div className="mt-5 flex gap-3 overflow-x-auto pb-2 pr-1">
                {galleryPreview.map((item, index) => {
                  const tone = getGalleryTone(item.key);
                  return (
                    <figure
                      key={`${item.key}-${item.src}`}
                      className="group relative min-w-[152px] overflow-hidden rounded-[var(--cp-radius-md)] border-2 bg-[var(--cp-white)]"
                      style={{ borderColor: tone.border }}
                    >
                      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-70 blur-xl" style={{ backgroundImage: tone.glow }} />
                      <img
                        src={item.src}
                        alt={`${character.name} ${item.key}`}
                        className={`${index === 0 ? 'h-28' : 'h-24'} w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]`}
                        loading="lazy"
                        decoding="async"
                        onError={(event) => {
                          event.currentTarget.src = '/card-placeholder.svg';
                        }}
                      />
                      <figcaption
                        className="flex items-center justify-between border-t-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
                        style={{ borderColor: tone.border, backgroundColor: tone.labelBg, color: tone.labelText }}
                      >
                        <span>{item.key}</span>
                        <span>{index + 1}</span>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
              {gallery.length > galleryPreview.length && (
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--cp-text-muted)]">
                  +{gallery.length - galleryPreview.length} additional assets hidden to keep this profile focused.
                </p>
              )}
            </RevealOnView>
          </div>
        </section>
      )}
    </div>
  );
}
