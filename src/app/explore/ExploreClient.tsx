"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CharacterCard from '@/components/CharacterCard';
import RevealOnView from '@/components/RevealOnView';

type Character = {
  id: string;
  name: string;
  description: string | null;
  rarity: number;
  artRefs?: Record<string, string>;
};

export default function ExploreClient({ characters, ownedIds }: { characters: Character[]; ownedIds: string[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'legendary' | 'epic' | 'rare'>('all');
  const [sortBy, setSortBy] = useState<'rarity' | 'name'>('rarity');

  const ownedSet = useMemo(() => new Set(ownedIds), [ownedIds]);

  const filtered = useMemo(() => {
    let list = characters;
    if (filter !== 'all') {
      list = list.filter((c) => {
        if (filter === 'legendary') return c.rarity >= 5;
        if (filter === 'epic') return c.rarity >= 4 && c.rarity < 5;
        if (filter === 'rare') return c.rarity >= 3 && c.rarity < 4;
        return true;
      });
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    }
    if (sortBy === 'rarity') list = [...list].sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [characters, filter, query, sortBy]);

  const groups = useMemo(() => {
    const by = (min: number, max: number | null) => filtered.filter((c) => (c.rarity >= min) && (max == null || c.rarity < max));
    return {
      legendary: by(5, null),
      epic: by(4, 5),
      rare: by(3, 4),
    };
  }, [filtered]);

  return (
    <div>
      {/* Title */}
      <div className="mb-4">
        <div className="cp-kicker mb-1">Explore</div>
        <h1 className="text-3xl md:text-5xl font-extrabold font-display leading-tight">Meet the CharmPals</h1>
        <p className="mt-2 cp-muted max-w-prose">Browse by rarity, search by name, or view them all in a tidy grid.</p>
      </div>

      {/* Sticky controls */}
      <div className="sticky top-16 z-10">
        <div className="cp-panel p-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilter('all')} className={`cp-chip ${filter==='all' ? 'ring-2 ring-white/30' : ''}`}>All</button>
            <button onClick={() => setFilter('legendary')} className={`cp-chip ${filter==='legendary' ? 'ring-2 ring-white/30' : ''}`}>Legendary</button>
            <button onClick={() => setFilter('epic')} className={`cp-chip ${filter==='epic' ? 'ring-2 ring-white/30' : ''}`}>Epic</button>
            <button onClick={() => setFilter('rare')} className={`cp-chip ${filter==='rare' ? 'ring-2 ring-white/30' : ''}`}>Rare</button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/70 min-w-[200px]"
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white">
              <option value="rarity">Sort: Rarity</option>
              <option value="name">Sort: Name</option>
            </select>
            <Link href="/claim" className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold">Scan & Claim</Link>
          </div>
        </div>
      </div>

      {/* Grouped by rarity if All selected; otherwise show a single group */}
      <div className="mt-6 space-y-10">
        {(filter === 'all' || filter === 'legendary') && groups.legendary.length > 0 && (
          <RevealOnView>
            <div className="flex items-center justify-between mb-4">
              <div className="cp-kicker">Legendary</div>
              <span className="cp-pill">{groups.legendary.length}</span>
            </div>
            <div className="cp-explore-grid">
              {groups.legendary.map((c) => (
                <div key={c.id} className="cp-card">
                  <CharacterCard c={c} owned={ownedSet.has(c.id)} />
                </div>
              ))}
            </div>
          </RevealOnView>
        )}

        {(filter === 'all' || filter === 'epic') && groups.epic.length > 0 && (
          <RevealOnView>
            <div className="flex items-center justify-between mb-4">
              <div className="cp-kicker">Epic</div>
              <span className="cp-pill">{groups.epic.length}</span>
            </div>
            <div className="cp-explore-grid">
              {groups.epic.map((c) => (
                <div key={c.id} className="cp-card">
                  <CharacterCard c={c} owned={ownedSet.has(c.id)} />
                </div>
              ))}
            </div>
          </RevealOnView>
        )}

        {(filter === 'all' || filter === 'rare') && groups.rare.length > 0 && (
          <RevealOnView>
            <div className="flex items-center justify-between mb-4">
              <div className="cp-kicker">Rare</div>
              <span className="cp-pill">{groups.rare.length}</span>
            </div>
            <div className="cp-explore-grid">
              {groups.rare.map((c) => (
                <div key={c.id} className="cp-card">
                  <CharacterCard c={c} owned={ownedSet.has(c.id)} />
                </div>
              ))}
            </div>
          </RevealOnView>
        )}

        {/* If a filter is active and yields empty, show empty state */}
        {filtered.length === 0 && (
          <div className="cp-panel p-8 text-center">
            <p className="cp-muted">No matches. Try a different filter or clear your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
