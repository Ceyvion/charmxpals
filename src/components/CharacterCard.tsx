"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type CharacterBasic = {
  id: string;
  name: string;
  description: string | null;
  rarity: number;
  artRefs?: Record<string, string>;
};

function rarityInfo(r: number) {
  if (r >= 5) return { label: "Legendary" };
  if (r >= 4) return { label: "Epic" };
  if (r >= 3) return { label: "Rare" };
  return { label: "Common" };
}

export default function CharacterCard({ c, owned = false }: { c: CharacterBasic; owned?: boolean }) {
  const r = rarityInfo(c.rarity);
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>("none");
  const [imgTransform, setImgTransform] = useState<string>("scale(1)");
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    // only enable on hover-capable pointers
    const pointerFine = typeof window !== 'undefined' && 'matchMedia' in window && window.matchMedia('(pointer: fine)').matches;
    if (!el || reduced || !pointerFine) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const rx = py * -8; // tilt up/down
      const ry = px * 10; // tilt left/right
      setTransform(`rotateX(${rx}deg) rotateY(${ry}deg)`);
      setImgTransform(`translate(${px * 8}px, ${py * 8}px) scale(1.06)`);
    };
    const onLeave = () => {
      setTransform("none");
      setImgTransform("scale(1)");
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced]);

  const media = useMemo(() => c.artRefs?.thumbnail || null, [c.artRefs]);

  return (
    <div className="cp-parallax">
      <div ref={ref} className="cp-card-hero relative cp-parallax-card" style={{ transform }}>
        <div className="relative cp-card-media overflow-hidden">
          {/* Media layer: image when available, else gradient */}
          {media ? (
            <>
              <img
                src={media}
                alt={c.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover cp-media-mask cp-parallax-img"
                style={{ transform: imgTransform }}
              />
              <div className="absolute inset-0 cp-inner-shadow pointer-events-none" />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(48,18,67,0.2), rgba(48,18,67,0.04))' }} />
            </>
          ) : (
            <>
              <div className="absolute inset-0" style={{ backgroundImage: "var(--cp-gradient)" }} />
              <div className="absolute inset-0 bg-grid-overlay opacity-25" />
            </>
          )}

          <div className="cp-card-score flex gap-1">
            <span className="cp-chip">{(c.rarity + 2.7).toFixed(1)}</span>
            {owned && <span className="cp-chip" title="You own this">Owned</span>}
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white text-xl font-display font-extrabold truncate pr-2">{c.name}</h3>
            <span className="cp-chip">{r.label}</span>
          </div>
          {c.description && <p className="cp-muted text-sm line-clamp-2">{c.description}</p>}
          <div className="mt-4 flex gap-2">
            <Link href={`/character/${c.id}`} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-bold">View</Link>
            <Link href="/play" className="px-4 py-2 border border-white/20 text-white rounded-lg text-sm font-bold hover:bg-white/5">Play</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(!!m.matches);
    update();
    m.addEventListener ? m.addEventListener('change', update) : m.addListener(update);
    return () => {
      m.removeEventListener ? m.removeEventListener('change', update) : m.removeListener(update);
    };
  }, []);
  return reduced;
}
