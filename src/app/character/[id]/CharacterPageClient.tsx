'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function CharacterPageClient({ character }: { character: Character }) {
  const rarity = useMemo(() => getRarityDetails(character.rarity), [character.rarity]);
  const artCandidates = useMemo(() => buildArtCandidates(character.artRefs, character.slug), [character.artRefs, character.slug]);
  const heroArt = useMemo(() => pickPrimaryArt(character.artRefs) ?? artCandidates[0] ?? null, [character.artRefs, artCandidates]);
  const defaultSignatureArt = useMemo(() => pickSignatureArt(character.artRefs) ?? artCandidates[0] ?? null, [character.artRefs, artCandidates]);
  const gallery = useMemo(() => pickGallery(character.artRefs), [character.artRefs]);
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
              <h3 className="font-display text-2xl font-semibold text-[var(--cp-text-primary)]">Identity Highlights</h3>
              {highlights.length > 0 ? (
                <dl className="mt-6 space-y-4">
                  {highlights.map((trait) => (
                    <div key={trait.id} className="rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-4 py-4">
                      <dt className="text-[11px] uppercase tracking-[0.3em] text-[var(--cp-text-muted)]">{trait.label}</dt>
                      <dd className="mt-2 text-base leading-relaxed text-[var(--cp-text-primary)]">{trait.value}</dd>
                    </div>
                  ))}
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
        <section className="border-t-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] py-14">
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <RevealOnView className="space-y-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.34em] text-[var(--cp-text-muted)]">Asset Set</p>
                  <h2 className="font-display text-3xl font-bold text-[var(--cp-text-primary)]">Character Gallery</h2>
                </div>
                <span className="rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[var(--cp-text-secondary)]">
                  {gallery.length} assets
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((item) => (
                  <div key={item.key} className="cp-card overflow-hidden">
                    <img
                      src={item.src}
                      alt={`${character.name} ${item.key}`}
                      className="h-44 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={(event) => {
                        event.currentTarget.src = '/card-placeholder.svg';
                      }}
                    />
                    <div className="border-t-2 border-[var(--cp-border)] px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-[var(--cp-text-muted)]">{item.key}</div>
                  </div>
                ))}
              </div>
            </RevealOnView>
          </div>
        </section>
      )}
    </div>
  );
}
