"use client";

import { useEffect, useMemo, useState } from 'react';

type Props = { characterId: string };

const SAMPLE_COSMETICS = [
  { id: 'default', name: 'Default', rarity: 'Common' },
  { id: 'neon-dream', name: 'Neon Dream', rarity: 'Rare' },
  { id: 'mono-gloss', name: 'Mono Gloss', rarity: 'Epic' },
  { id: 'prism-shift', name: 'Prism Shift', rarity: 'Legendary' },
];

export default function Cosmetics({ characterId }: Props) {
  const storageKey = useMemo(() => `cp:cosmetic:${characterId}`,[characterId]);
  const [equipped, setEquipped] = useState<string>('default');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (saved) setEquipped(saved);
  }, [storageKey]);

  const equip = (id: string) => {
    setEquipped(id);
    if (typeof window !== 'undefined') localStorage.setItem(storageKey, id);
  };

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Cosmetics</h2>
        <div className="text-sm text-gray-600">Equipped: <span className="font-semibold">{equipped}</span></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {SAMPLE_COSMETICS.map((c) => (
          <button
            key={c.id}
            onClick={() => equip(c.id)}
            className={`text-left rounded-xl border p-4 hover:shadow-sm transition ${
              equipped === c.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="h-20 w-full rounded-md bg-gradient-to-tr from-gray-200 to-gray-100 mb-3" />
            <div className="font-semibold text-gray-900">{c.name}</div>
            <div className="text-xs text-gray-600">{c.rarity}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
