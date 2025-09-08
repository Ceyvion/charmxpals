"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import CharacterCard from '@/components/CharacterCard';
import CharacterCarousel from '@/components/CharacterCarousel';
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
    const by = (min: number, max: number | null) => characters.filter((c) => (c.rarity >= min) && (max == null || c.rarity < max));
    return {
      legendary: by(5, null),
      epic: by(4, 5),
      rare: by(3, 4),
    };
  }, [characters]);

  const featured = useMemo(() => {
    return [...characters].sort((a, b) => b.rarity - a.rarity)[0] || null;
  }, [characters]);

  return (
    <div>
      {/* Header panel */}
      <div className="cp-panel p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="cp-kicker mb-2">Explore</div>
            <h1 className="text-3xl md:text-5xl font-extrabold font-display leading-tight">Meet the CharmPals</h1>
            <p className="mt-2 cp-muted text-base md:text-lg max-w-prose">Browse by rarity, search by name, or jump straight into a featured pal.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setFilter('all')} className={`cp-chip ${filter==='all' ? 'ring-2 ring-white/30' : ''}`}>All</button>
            <button onClick={() => setFilter('legendary')} className={`cp-chip ${filter==='legendary' ? 'ring-2 ring-white/30' : ''}`}>Legendary</button>
            <button onClick={() => setFilter('epic')} className={`cp-chip ${filter==='epic' ? 'ring-2 ring-white/30' : ''}`}>Epic</button>
            <button onClick={() => setFilter('rare')} className={`cp-chip ${filter==='rare' ? 'ring-2 ring-white/30' : ''}`}>Rare</button>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white">
              <option value="rarity">Sort: Rarity</option>
              <option value="name">Sort: Name</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 px-4 py-3 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/70"
          />
          <Link href="/claim" className="px-4 py-3 bg-white text-gray-900 rounded-lg font-semibold">Scan & Claim</Link>
        </div>
      </div>

      {/* Featured */}
      {featured && (
        <RevealOnView className="mt-8 cp-panel p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <div className="cp-kicker mb-2">Featured</div>
              <div className="max-w-md">
                <CharacterCard c={featured} owned={ownedSet.has(featured.id)} />
              </div>
            </div>
            <div className="flex-1 md:max-w-lg">
              <div className="cp-kicker mb-2">Legendary Picks</div>
              <CharacterCarousel items={groups.legendary.slice(0, 8) as any} />
            </div>
          </div>
        </RevealOnView>
      )}

      {/* Rarity sections (carousels) */}
      <div className="mt-6 space-y-8">
        {groups.epic.length > 0 && (
          <RevealOnView>
            <div className="flex items-center justify-between mb-3">
              <div className="cp-kicker">Epic</div>
              <span className="cp-pill">{groups.epic.length}</span>
            </div>
            <CharacterCarousel items={groups.epic.slice(0, 12) as any} />
          </RevealOnView>
        )}
        {groups.rare.length > 0 && (
          <RevealOnView>
            <div className="flex items-center justify-between mb-3">
              <div className="cp-kicker">Rare</div>
              <span className="cp-pill">{groups.rare.length}</span>
            </div>
            <CharacterCarousel items={groups.rare.slice(0, 12) as any} />
          </RevealOnView>
        )}
      </div>

      {/* All grid (filtered) */}
      <RevealOnView className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div className="cp-kicker">All Pals</div>
          <span className="cp-pill">{filtered.length}</span>
        </div>
        <div className="cp-explore-grid">
          {filtered.map((c) => (
            <div key={c.id} className="cp-card">
              <CharacterCard c={c} owned={ownedSet.has(c.id)} />
            </div>
          ))}
        </div>
      </RevealOnView>
    </div>
  );
}

