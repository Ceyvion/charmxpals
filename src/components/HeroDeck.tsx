"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import anime from 'animejs/lib/anime.es.js';
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  description?: string | null;
  rarity?: number;
  owned?: boolean;
};

function overlayOpacity(i: number) { return [0.85, 0.8, 0.78, 0.82, 0.8][i % 5]; }

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(!!m.matches);
    update();
    m.addEventListener ? m.addEventListener('change', update) : m.addListener(update);
    return () => { m.removeEventListener ? m.removeEventListener('change', update) : m.removeListener(update); };
  }, []);
  return reduced;
}

type FlyState = { item: Item; from: DOMRect } | null;

export default function HeroDeck({ items }: { items: Item[] }) {
  const deck = items.slice(0, 5);
  const router = useRouter();
  const reduced = useReducedMotion();
  const [fly, setFly] = useState<FlyState>(null);
  if (!deck.length) return null;

  const onCardClick = useCallback((e: React.MouseEvent, item: Item) => {
    e.preventDefault();
    const target = (e.currentTarget as HTMLElement);
    const from = target.getBoundingClientRect();
    if (reduced) {
      router.push(`/character/${item.id}`);
      return;
    }
    setFly({ item, from });
  }, [reduced, router]);

  return (
    <div className="cp-hero-deck select-none" data-testid="home-hero-deck">
      {deck.map((c, i) => (
        <div key={c.id} className="card">
          <div className="cp-card-hero cp-grad-border cursor-pointer" onClick={(e) => onCardClick(e, c)}>
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
                <button onClick={(e) => onCardClick(e as any, c)} className="px-3 py-2 bg-white text-gray-900 rounded-lg text-xs font-bold">Open</button>
              </div>
            </div>
          </div>
        </div>
      ))}
      {fly && <FlyOverlay state={fly} onClose={() => setFly(null)} />}
    </div>
  );
}

function FlyOverlay({ state, onClose }: { state: FlyState; onClose: () => void }) {
  const { item, from } = state!;
  const ref = useRef<HTMLDivElement | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Set initial position and size
    Object.assign(el.style, {
      position: 'fixed',
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      transform: 'translate(0px, 0px) scale(1)',
      transformOrigin: 'center center',
      zIndex: '60',
      willChange: 'transform',
    });
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const endW = Math.min(420, Math.max(280, Math.round(vw * 0.8)));
    const scale = endW / from.width;
    const endH = from.height * scale;
    const endLeft = (vw - endW) / 2;
    const endTop = (vh - endH) / 2;
    const dx = endLeft - from.left;
    const dy = endTop - from.top;

    // Dim backdrop
    const dim = document.createElement('div');
    Object.assign(dim.style, {
      position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.6)', opacity: '0', zIndex: '50',
    } as CSSStyleDeclaration);
    document.body.appendChild(dim);
    anime({ targets: dim, opacity: [0, 1], duration: 220, easing: 'easeOutQuad' });

    const tl = anime.timeline({ easing: 'easeOutCubic' });
    tl.add({
      targets: el,
      translateX: dx,
      translateY: dy,
      scale: scale,
      rotateY: ['0deg', '360deg'],
      duration: 700,
    })
    .add({ targets: el, duration: 200, easing: 'linear', complete: () => setDone(true) });

    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);

    function close() {
      anime({ targets: dim, opacity: [1, 0], duration: 180, easing: 'easeInQuad', complete: () => dim.remove() });
      anime({
        targets: el,
        translateX: 0,
        translateY: 0,
        scale: 1,
        rotateY: '0deg',
        duration: 320,
        easing: 'easeInCubic',
        complete: onClose,
      });
      window.removeEventListener('keydown', onKey);
    }

    return () => {
      try { dim.remove(); } catch {}
      window.removeEventListener('keydown', onKey);
    };
  }, [from, onClose]);

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div ref={ref} className="cp-card-hero cp-grad-border" style={{ perspective: '1000px' }}>
        <div className="cap relative">
          <div className="absolute inset-0" style={{ backgroundImage: 'var(--cp-gradient)', opacity: 0.85 }} />
          <div className="absolute inset-0 bg-grid-overlay opacity-20" />
          <div className="absolute top-3 left-3 cp-chip text-xs">Reveal</div>
          <div className="absolute top-3 right-3 cp-chip text-xs">{(item.rarity ?? 3) + 2.7}</div>
        </div>
        <div className="p-4">
          <div className="text-white font-display text-xl font-extrabold truncate">{item.name}</div>
          {item.description && <div className="cp-muted text-sm line-clamp-2">{item.description}</div>}
          {done && (
            <div className="mt-3 flex gap-2">
              <Link href={`/character/${item.id}`} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-bold">View Character</Link>
              <button onClick={onClose} className="px-4 py-2 border border-white/20 text-white rounded-lg text-sm font-bold hover:bg-white/5">Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
