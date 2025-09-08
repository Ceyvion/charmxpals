"use client";

import Link from "next/link";

type Item = {
  id: string;
  name: string;
  description?: string | null;
  rarity?: number;
  owned?: boolean;
};

function overlayOpacity(i: number) { return [0.85, 0.8, 0.78, 0.82, 0.8][i % 5]; }

export default function HeroDeck({ items }: { items: Item[] }) {
  const deck = items.slice(0, 5);
  if (!deck.length) return null;
  return (
    <div className="cp-hero-deck select-none" data-testid="home-hero-deck">
      {deck.map((c, i) => (
        <div key={c.id} className="card">
          <div className="cp-card-hero cp-grad-border">
            <div className="cap relative">
              <div className="absolute inset-0" style={{ backgroundImage: 'var(--cp-gradient)', opacity: overlayOpacity(i) }} />
              <div className="absolute inset-0 bg-grid-overlay opacity-20" />
              <div className="absolute top-3 left-3 cp-chip text-xs">{c.rarity && c.rarity >= 5 ? 'Legendary' : c.rarity && c.rarity >=4 ? 'Epic' : 'Rare'}</div>
              <div className="absolute top-3 right-3 cp-chip text-xs">{((c.rarity ?? 3) + 2.7).toFixed(1)}</div>
              {c.owned && <div className="absolute bottom-3 left-3 cp-chip text-xs">Owned</div>}
            </div>
            <div className="p-4">
              <div className="text-white font-display text-xl font-extrabold truncate">{c.name}</div>
              {c.description && <div className="cp-muted text-sm line-clamp-2">{c.description}</div>}
              <div className="mt-3">
                <Link href={`/character/${c.id}`} className="px-3 py-2 bg-white text-gray-900 rounded-lg text-xs font-bold">Open</Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
