"use client";

import CharacterCard, { type CharacterBasic } from "./CharacterCard";

export default function CharacterCarousel({ items }: { items: CharacterBasic[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-8">
      <div className="cp-carousel">
        {items.map((c) => (
          <div key={c.id} className="cp-tilt">
            <CharacterCard c={c} />
          </div>
        ))}
      </div>
    </div>
  );
}

