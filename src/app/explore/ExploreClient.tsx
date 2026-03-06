"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { worldTagline } from '@/data/characterLore';
import { useSfx } from '@/lib/sfx';

type Character = {
  id: string;
  name: string;
  description: string | null;
  rarity: number;
  artRefs?: Record<string, string>;
  realm?: string | null;
  title?: string | null;
  tagline?: string | null;
  codeSeries?: string | null;
  danceStyle?: string | null;
  coreCharm?: string | null;
  color?: string | null;
  vibe?: string | null;
  personality?: string | null;
  stats?: Record<string, number>;
};

type RarityKey = 'legendary' | 'epic' | 'rare';

const RARITY_META: Record<RarityKey, { label: string; description: string }> = {
  legendary: {
    label: 'Legendary',
    description: 'Mentors, DJs, and mythic anchors that hold the realms together.',
  },
  epic: {
    label: 'Epic',
    description: 'Headline performers with signature moves and realm-shaping styles.',
  },
  rare: {
    label: 'Rare',
    description: 'Crew specialists that round out your squad with unique edges.',
  },
};

export default function ExploreClient({ characters, ownedIds }: { characters: Character[]; ownedIds: string[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | RarityKey>('all');
  const [sortBy, setSortBy] = useState<'rarity' | 'name'>('rarity');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { playHover, playClick } = useSfx();

  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);

  const filtered = useMemo(() => {
    let list = characters;
    if (filter !== 'all') {
      list = list.filter((c) => {
        if (filter === 'legendary') return c.rarity >= 5;
        if (filter === 'epic') return c.rarity >= 4 && c.rarity < 5;
        return c.rarity >= 3 && c.rarity < 4;
      });
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => {
        const haystack = [
          c.name,
          c.description || '',
          c.realm || '',
          c.title || '',
          c.tagline || '',
          c.codeSeries || '',
          c.danceStyle || '',
          c.coreCharm || '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (sortBy === 'rarity') list = [...list].sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [characters, filter, query, sortBy]);

  const groups = useMemo(() => {
    const by = (min: number, max: number | null) => filtered.filter((c) => c.rarity >= min && (max == null || c.rarity < max));
    return {
      legendary: by(5, null),
      epic: by(4, 5),
      rare: by(3, 4),
    };
  }, [filtered]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((c) => c.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(() => {
    if (!filtered.length) return null;
    if (!selectedId) return filtered[0] ?? null;
    return filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  const selectedMedia = useMemo(() => (selected ? pickMedia(selected.artRefs) : null), [selected]);
  const selectedOwned = useMemo(() => (selected ? ownedSet.has(selected.id) : false), [ownedSet, selected]);

  const sections = useMemo(() => {
    const rarityFilter: RarityKey | null = filter === 'all' ? null : filter;
    if (rarityFilter) {
      return [
        {
          key: rarityFilter,
          characters: filtered,
        },
      ];
    }
    return (['legendary', 'epic', 'rare'] as RarityKey[])
      .map((key) => ({
        key,
        characters: groups[key],
      }))
      .filter((section) => section.characters.length > 0);
  }, [filter, filtered, groups]);

  return (
    <div className="cp-explore-page">
      <div className="mb-7">
        <div className="cp-kicker mb-1">Build Your Crew</div>
        <h1 className="font-display text-3xl font-extrabold leading-tight text-[var(--cp-text-primary)] md:text-5xl">Recruit Across Dimensions</h1>
        <p className="cp-muted mt-2 max-w-prose text-sm leading-relaxed sm:text-base">
          {worldTagline} Preview every champion before you scan—compare realms, study Core Charms, and line up the next unlock without jumping between
          tabs.
        </p>
      </div>

      <div className="relative z-10 mb-6 md:sticky md:top-20 md:z-20 md:mb-8">
        <div className="cp-panel grid gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,auto)] lg:items-center">
          <div className="cp-rarity-filter-set">
            <button
              type="button"
              data-filter="all"
              data-active={filter === 'all' ? 'true' : 'false'}
              data-tone="aqua"
              className="cp-rarity-filter"
              onMouseEnter={playHover}
              onFocus={playHover}
              onClick={() => {
                setFilter('all');
                playClick();
              }}
            >
              <span>All Pals</span>
            </button>
            <button
              type="button"
              data-filter="legendary"
              data-active={filter === 'legendary' ? 'true' : 'false'}
              data-tone="sunrise"
              className="cp-rarity-filter"
              onMouseEnter={playHover}
              onFocus={playHover}
              onClick={() => {
                setFilter('legendary');
                playClick();
              }}
            >
              <span>Legendary</span>
            </button>
            <button
              type="button"
              data-filter="epic"
              data-active={filter === 'epic' ? 'true' : 'false'}
              data-tone="violet"
              className="cp-rarity-filter"
              onMouseEnter={playHover}
              onFocus={playHover}
              onClick={() => {
                setFilter('epic');
                playClick();
              }}
            >
              <span>Epic</span>
            </button>
            <button
              type="button"
              data-filter="rare"
              data-active={filter === 'rare' ? 'true' : 'false'}
              data-tone="mint"
              className="cp-rarity-filter"
              onMouseEnter={playHover}
              onFocus={playHover}
              onClick={() => {
                setFilter('rare');
                playClick();
              }}
            >
              <span>Rare</span>
            </button>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="cp-search w-full sm:min-w-[220px]"
              aria-label="Search characters"
              onFocus={playHover}
            />
            <select
              value={sortBy}
              className="cp-search w-full pr-10 sm:w-auto"
              aria-label="Sort characters"
              onFocus={playHover}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                playClick();
              }}
            >
              <option value="rarity">Sort: Rarity</option>
              <option value="name">Sort: Name</option>
            </select>
            <Link
              href="/claim"
              className="inline-flex w-full items-center justify-center rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-black)] bg-[var(--cp-black)] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--cp-white)] transition-colors hover:bg-[var(--cp-gray-900)] sm:w-auto"
            >
              Scan &amp; Claim
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
        <div className="order-1 space-y-8 lg:order-1">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="cp-kicker">{RARITY_META[section.key].label}</div>
                  <p className="text-[13px] leading-relaxed text-[var(--cp-text-secondary)] sm:text-xs sm:uppercase sm:tracking-[0.2em] sm:text-[var(--cp-text-muted)]">
                    {RARITY_META[section.key].description}
                  </p>
                </div>
                <span className="cp-pill">{section.characters.length}</span>
              </div>
              <ul className="space-y-3">
                {section.characters.map((character) => {
                  const media = pickMedia(character.artRefs);
                  const accent = character.color || 'rgba(0, 122, 255, 0.45)';
                  const isActive = selected?.id === character.id;
                  const owned = ownedSet.has(character.id);
                  return (
                    <li key={character.id}>
                      <div
                        className={`group relative flex cursor-pointer items-stretch gap-4 overflow-hidden rounded-[var(--cp-radius-lg)] border-2 px-4 py-4 transition-colors duration-150 focus-within:border-[var(--cp-border-strong)] ${
                          isActive
                            ? 'border-[var(--cp-border-strong)] bg-[var(--cp-gray-100)]'
                            : 'border-[var(--cp-border)] bg-[var(--cp-white)] hover:border-[var(--cp-border-strong)] hover:bg-[var(--cp-gray-100)]'
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isActive}
                        data-roster-item
                        data-active={isActive ? 'true' : 'false'}
                        data-rarity={section.key}
                        onClick={() => {
                          setSelectedId(character.id);
                          playClick();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedId(character.id);
                            playClick();
                          }
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="absolute bottom-3 left-0 top-3 w-1 rounded-full opacity-75"
                          style={{ background: accent }}
                        />
                        <div className="flex flex-1 items-center gap-4">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[var(--cp-radius-md)] border border-[var(--cp-border)] bg-[var(--cp-gray-100)]">
                            {media ? (
                              <Image src={media} alt={character.name} fill sizes="64px" className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[var(--cp-gray-100)] text-sm font-bold uppercase tracking-[0.2em] text-[var(--cp-text-muted)]">
                                {character.name.slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            {character.realm && (
                              <div className="cp-kicker text-[10px] tracking-[0.24em]">{character.realm}</div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-display text-lg font-extrabold text-[var(--cp-text-primary)]" data-roster-name>
                                {character.name}
                              </h3>
                              <span className="rounded-[var(--cp-radius-sm)] border border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--cp-text-secondary)]">
                                {RARITY_META[section.key].label}
                              </span>
                            </div>
                            {character.title && <p className="text-xs text-[var(--cp-text-secondary)]">{character.title}</p>}
                            {(character.tagline || character.description) && (
                              <p className="line-clamp-2 text-sm text-[var(--cp-text-muted)]">{character.tagline || character.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="hidden w-[140px] shrink-0 flex-col items-end justify-center gap-2 text-sm sm:flex">
                          {owned && (
                            <span className="rounded-[var(--cp-radius-sm)] bg-[rgba(48,209,88,0.16)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(18,111,46,1)]">
                              Owned
                            </span>
                          )}
                          <Link
                            href={`/character/${character.id}`}
                            className="inline-flex min-w-[6.5rem] items-center justify-center rounded-[var(--cp-radius-sm)] border border-[var(--cp-border)] bg-[var(--cp-white)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:text-[var(--cp-text-primary)]"
                            data-explore-action
                            onClick={(event) => event.stopPropagation()}
                          >
                            Profile
                          </Link>
                          <Link
                            href="/play"
                            className="inline-flex min-w-[6.5rem] items-center justify-center rounded-[var(--cp-radius-sm)] border border-[var(--cp-border)] bg-[var(--cp-white)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:text-[var(--cp-text-primary)]"
                            data-explore-action
                            onClick={(event) => event.stopPropagation()}
                          >
                            Play Mode
                          </Link>
                        </div>
                      </div>
                      {isActive && (
                        <div className="mt-3 lg:hidden">
                          <SpotlightCard character={character} media={media} owned={owned} variant="mobile" />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {filtered.length === 0 && (
            <div className="cp-panel p-8 text-center">
              <p className="cp-muted">No matches. Try a different filter or clear your search.</p>
            </div>
          )}
        </div>

        <aside className="order-2 hidden lg:sticky lg:top-28 lg:block" data-roster-spotlight>
          {selected ? (
            <SpotlightCard character={selected} media={selectedMedia} owned={selectedOwned} variant="desktop" />
          ) : (
            <div className="cp-panel h-full min-h-[320px] p-8 text-center">
              <p className="cp-muted">Filter the roster to start building your spotlight.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

type SpotlightCardProps = {
  character: Character;
  media: string | null;
  owned: boolean;
  variant: 'desktop' | 'mobile';
};

function SpotlightCard({ character, media, owned, variant }: SpotlightCardProps) {
  const rarity = getRarity(character.rarity);
  const rarityLabel = RARITY_META[rarity].label;
  const accent = character.color || 'rgba(0, 122, 255, 0.25)';

  return (
    <div
      data-spotlight-card
      className={`relative overflow-hidden rounded-[var(--cp-radius-lg)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] ${
        variant === 'mobile' ? 'shadow-[0_10px_34px_rgba(10,10,10,0.06)]' : ''
      }`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-80"
        style={{ background: `linear-gradient(115deg, ${accent}, rgba(250,250,250,0))` }}
      />
      <div className="relative p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[var(--cp-radius-lg)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] md:h-32 md:w-32">
              {media ? (
                <Image
                  src={media}
                  alt={character.name}
                  fill
                  sizes="(min-width: 768px) 128px, 112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--cp-gray-100)] text-lg font-bold uppercase tracking-[0.2em] text-[var(--cp-text-muted)]">
                  {character.name.slice(0, 2)}
                </div>
              )}
          </div>
          <div className="min-w-0 flex-1">
            {character.realm && <div className="cp-kicker">{character.realm}</div>}
            <h2 className="font-display text-2xl font-extrabold leading-tight text-[var(--cp-text-primary)] md:text-3xl" data-spotlight-name>
              {character.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-[var(--cp-radius-sm)] border border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--cp-text-secondary)]">
                {rarityLabel}
              </span>
              {owned && (
                <span className="rounded-[var(--cp-radius-sm)] bg-[rgba(48,209,88,0.16)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(18,111,46,1)]">
                  You own this
                </span>
              )}
              {character.codeSeries && (
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--cp-text-muted)]">Series: {character.codeSeries}</span>
              )}
            </div>
            {character.title && <p className="mt-2 text-sm text-[var(--cp-text-secondary)]">{character.title}</p>}
          </div>
        </div>

        {(character.tagline || character.description) && (
          <p className="mt-6 text-base leading-relaxed text-[var(--cp-text-secondary)]">{character.tagline || character.description}</p>
        )}

        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          {character.coreCharm && (
            <div>
              <dt className="text-xs uppercase tracking-[0.26em] text-[var(--cp-text-muted)]">Core Charm</dt>
              <dd className="mt-1 text-[var(--cp-text-primary)]">{character.coreCharm}</dd>
            </div>
          )}
          {character.danceStyle && (
            <div>
              <dt className="text-xs uppercase tracking-[0.26em] text-[var(--cp-text-muted)]">Signature Moves</dt>
              <dd className="mt-1 text-[var(--cp-text-primary)]">{character.danceStyle}</dd>
            </div>
          )}
          {character.vibe && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.26em] text-[var(--cp-text-muted)]">Realm Vibe</dt>
              <dd className="mt-1 text-[var(--cp-text-primary)]">{character.vibe}</dd>
            </div>
          )}
          {character.personality && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-[0.26em] text-[var(--cp-text-muted)]">Personality</dt>
              <dd className="mt-1 text-[var(--cp-text-primary)]">{character.personality}</dd>
            </div>
          )}
        </dl>

        {Object.keys(character.stats ?? {}).length > 0 && (
          <div className="mt-6">
            <div className="text-xs uppercase tracking-[0.28em] text-[var(--cp-text-muted)]">Crew Stats</div>
            <div className="mt-3 space-y-3">
              {Object.entries(character.stats!)
                .sort((a, b) => b[1] - a[1])
                .map(([label, value]) => (
                  <div key={label} className="flex items-center gap-3 text-sm text-[var(--cp-text-primary)]">
                    <span className="w-28 uppercase tracking-[0.22em] text-[var(--cp-text-muted)]">{label}</span>
                    <div className="cp-stat-bar flex-1">
                      <div className="cp-stat-bar-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
                    </div>
                    <span className="w-10 text-right text-[var(--cp-text-secondary)]">{Math.round(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-[var(--cp-border)] pt-6">
          <Link
            href={`/character/${character.id}`}
            className="inline-flex w-full items-center justify-center rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-black)] bg-[var(--cp-black)] px-5 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-[var(--cp-white)] transition-colors hover:bg-[var(--cp-gray-900)] md:w-auto"
            data-spotlight-action
          >
            Open full profile
          </Link>
          <Link
            href="/play"
            className="inline-flex w-full items-center justify-center rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border-strong)] px-5 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-[var(--cp-text-primary)] transition-colors hover:bg-[var(--cp-gray-100)] md:w-auto"
            data-spotlight-action
          >
            Launch battle prep
          </Link>
        </div>
      </div>
    </div>
  );
}

function pickMedia(artRefs?: Record<string, string>): string | null {
  if (!artRefs) return null;
  return artRefs.thumbnail || artRefs.card || artRefs.portrait || artRefs.square || Object.values(artRefs)[0] || null;
}

function getRarity(rarity: number): RarityKey {
  if (rarity >= 5) return 'legendary';
  if (rarity >= 4) return 'epic';
  return 'rare';
}
