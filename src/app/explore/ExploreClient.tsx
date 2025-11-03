"use client";

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import RevealOnView from '@/components/RevealOnView';
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
    <div>
      <div className="mb-6">
        <div className="cp-kicker mb-1">Build Your Crew</div>
        <h1 className="font-display text-3xl font-extrabold leading-tight md:text-5xl">Recruit Across Dimensions</h1>
        <p className="cp-muted mt-2 max-w-prose">
          {worldTagline} Preview every champion before you scan—compare realms, study Core Charms, and line up the next unlock without jumping between
          tabs.
        </p>
      </div>

      <div className="sticky top-16 z-10">
        <div className="cp-panel flex flex-wrap items-center gap-2 p-3">
          <div className="cp-rarity-filter-set">
            <button
              type="button"
              data-filter="all"
              data-active={filter === 'all' ? 'true' : 'false'}
              data-tone="aqua"
              className="cp-rarity-filter"
              data-magnetic="toggle"
              data-magnetic-color="aqua"
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
              data-magnetic="toggle"
              data-magnetic-color="sunrise"
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
              data-magnetic="toggle"
              data-magnetic-color="violet"
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
              data-magnetic="toggle"
              data-magnetic-color="mint"
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
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="min-w-[200px] rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white placeholder-white/70"
              onFocus={playHover}
            />
            <select
              value={sortBy}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white"
              onFocus={playHover}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                playClick();
              }}
            >
              <option value="rarity">Sort: Rarity</option>
              <option value="name">Sort: Name</option>
            </select>
            <Link href="/claim" className="rounded-lg bg-white px-4 py-2 font-semibold text-gray-900">
              Scan &amp; Claim
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr),minmax(320px,1fr)]">
        <div className="order-2 space-y-8 lg:order-1">
          {sections.map((section) => (
            <RevealOnView key={section.key}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="cp-kicker">{RARITY_META[section.key].label}</div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">{RARITY_META[section.key].description}</p>
                </div>
                <span className="cp-pill">{section.characters.length}</span>
              </div>
              <ul className="space-y-3">
                {section.characters.map((character, index) => {
                  const media = pickMedia(character.artRefs);
                  const accent = character.color || 'rgba(255, 255, 255, 0.45)';
                  const isActive = selected?.id === character.id;
                  const owned = ownedSet.has(character.id);
                  const magnetTint = section.key === 'legendary' ? 'sunrise' : section.key === 'epic' ? 'violet' : 'aqua';
                  return (
                    <li key={character.id}>
                      <div
                        className={`group relative flex cursor-pointer items-stretch gap-4 overflow-hidden rounded-3xl border border-white/12 bg-white/[0.04] px-4 py-4 transition duration-200 hover:border-white/30 hover:bg-white/[0.08] focus-within:border-white/40 focus-within:bg-white/[0.1] cp-roster-item ${
                          isActive ? 'border-white/40 bg-white/[0.12] shadow-[0_26px_70px_rgba(28,10,56,0.45)]' : ''
                        }`}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isActive}
                        data-roster-item
                        data-active={isActive ? 'true' : 'false'}
                        data-rarity={section.key}
                        data-magnetic="roster"
                        data-magnetic-color={magnetTint}
                        data-ripple
                        style={{ '--stagger': String(index) } as CSSProperties}
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
                          className="absolute left-0 top-0 h-full w-1"
                          style={{ background: accent }}
                        />
                        <div className="flex flex-1 items-center gap-4">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                            {media ? (
                              <img src={media} alt={character.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/15 via-white/5 to-transparent text-sm font-bold uppercase tracking-[0.2em] text-white/60">
                                {character.name.slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            {character.realm && (
                              <div className="cp-kicker text-[10px] tracking-[0.24em] text-white/60">{character.realm}</div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-display text-lg font-extrabold text-white" data-roster-name>
                                {character.name}
                              </h3>
                              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                                {RARITY_META[section.key].label}
                              </span>
                            </div>
                            {character.title && <p className="text-xs text-white/60">{character.title}</p>}
                            {(character.tagline || character.description) && (
                              <p className="line-clamp-2 text-sm text-white/60">{character.tagline || character.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex w-[140px] shrink-0 flex-col items-end justify-center gap-2 text-sm">
                          {owned && <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">Owned</span>}
                          <Link
                            href={`/character/${character.id}`}
                            className="text-white/80 transition hover:text-white"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Profile
                          </Link>
                          <Link
                            href="/play"
                            className="text-white/60 transition hover:text-white"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Play Mode
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </RevealOnView>
          ))}

          {filtered.length === 0 && (
            <div className="cp-panel p-8 text-center">
              <p className="cp-muted">No matches. Try a different filter or clear your search.</p>
            </div>
          )}
        </div>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-28" data-roster-spotlight>
          {selected ? (
            <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/[0.05]">
              <div
                className="pointer-events-none absolute -top-20 left-[-30%] h-72 w-72 rounded-full opacity-30 blur-3xl"
                style={{ background: selected.color || 'rgba(127, 234, 255, 0.45)' }}
              />
              <div className="pointer-events-none absolute -bottom-12 right-[-20%] h-60 w-60 rounded-full bg-pink-400/30 opacity-40 blur-3xl" />
              <div className="relative p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start">
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/10 shadow-lg md:h-32 md:w-32">
                    {selectedMedia ? (
                      <img src={selectedMedia} alt={selected.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 via-white/5 to-transparent text-lg font-bold uppercase tracking-[0.2em] text-white/60">
                        {selected.name.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {selected.realm && <div className="cp-kicker text-white/70">{selected.realm}</div>}
                    <h2 className="font-display text-2xl font-extrabold leading-tight text-white md:text-3xl" data-spotlight-name>
                      {selected.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-white/70">
                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]">
                        {RARITY_META[getRarity(selected.rarity)].label}
                      </span>
                      {ownedSet.has(selected.id) && (
                        <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                          You own this
                        </span>
                      )}
                      {selected.codeSeries && (
                        <span className="text-xs uppercase tracking-[0.24em] text-white/60">Series: {selected.codeSeries}</span>
                      )}
                    </div>
                    {selected.title && <p className="mt-2 text-sm text-white/70">{selected.title}</p>}
                  </div>
                </div>

                {(selected.tagline || selected.description) && (
                  <p className="cp-muted mt-6 text-base leading-relaxed">{selected.tagline || selected.description}</p>
                )}

                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                  {selected.coreCharm && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.26em] text-white/50">Core Charm</dt>
                      <dd className="mt-1 text-white/80">{selected.coreCharm}</dd>
                    </div>
                  )}
                  {selected.danceStyle && (
                    <div>
                      <dt className="text-xs uppercase tracking-[0.26em] text-white/50">Signature Moves</dt>
                      <dd className="mt-1 text-white/80">{selected.danceStyle}</dd>
                    </div>
                  )}
                  {selected.vibe && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs uppercase tracking-[0.26em] text-white/50">Realm Vibe</dt>
                      <dd className="mt-1 text-white/80">{selected.vibe}</dd>
                    </div>
                  )}
                  {selected.personality && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs uppercase tracking-[0.26em] text-white/50">Personality</dt>
                      <dd className="mt-1 text-white/80">{selected.personality}</dd>
                    </div>
                  )}
                </dl>

                {Object.keys(selected.stats ?? {}).length > 0 && (
                  <div className="mt-6">
                    <div className="text-xs uppercase tracking-[0.28em] text-white/50">Crew Stats</div>
                    <div className="mt-3 space-y-3">
                      {Object.entries(selected.stats!)
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, value]) => (
                          <div key={label} className="flex items-center gap-3 text-sm text-white">
                            <span className="w-28 uppercase tracking-[0.22em] text-white/60">{label}</span>
                            <div className="h-2 flex-1 rounded-full bg-white/10">
                              <div
                                className="h-2 rounded-full bg-white/80"
                                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-white/70">{Math.round(value)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/character/${selected.id}`}
                    className="rounded-xl bg-white px-5 py-2 font-semibold text-gray-900 transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Open full profile
                  </Link>
                  <Link
                    href="/play"
                    className="rounded-xl border border-white/20 px-5 py-2 font-semibold text-white transition hover:bg-white/10"
                  >
                    Launch battle prep
                  </Link>
                </div>
              </div>
            </div>
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

function pickMedia(artRefs?: Record<string, string>): string | null {
  if (!artRefs) return null;
  return artRefs.portrait || artRefs.thumbnail || artRefs.card || artRefs.square || Object.values(artRefs)[0] || null;
}

function getRarity(rarity: number): RarityKey {
  if (rarity >= 5) return 'legendary';
  if (rarity >= 4) return 'epic';
  return 'rare';
}
