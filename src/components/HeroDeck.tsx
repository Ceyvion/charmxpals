"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import anime from 'animejs';
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  name: string;
  description?: string | null;
  rarity?: number;
  owned?: boolean;
  realm?: string | null;
  title?: string | null;
  tagline?: string | null;
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
              <div className="sheen" />
              <div className="absolute top-3 left-3 cp-chip text-xs">{c.rarity && c.rarity >= 5 ? 'Legendary' : c.rarity && c.rarity >=4 ? 'Epic' : 'Rare'}</div>
              <div className="absolute top-3 right-3 cp-chip text-xs">{((c.rarity ?? 3) + 2.7).toFixed(1)}</div>
              {c.owned && <div className="absolute bottom-3 left-3 cp-chip text-xs">Owned</div>}
            </div>
            <div className="p-4">
              {c.realm && <div className="cp-kicker text-xs mb-1 uppercase tracking-[0.2em] text-white/70">{c.realm}</div>}
              <div className="text-white font-display text-xl font-extrabold truncate">{c.name}</div>
              {c.title && <div className="text-white/80 text-sm font-medium">{c.title}</div>}
              {c.tagline ? (
                <div className="cp-muted text-sm line-clamp-2 mt-2">{c.tagline}</div>
              ) : c.description ? (
                <div className="cp-muted text-sm line-clamp-2 mt-2">{c.description}</div>
              ) : null}
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
  const closeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Lock scroll during animation
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Set initial position and size
    const startRadius = window.getComputedStyle(el).borderRadius || '24px';
    Object.assign(el.style, {
      position: 'fixed',
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`,
      zIndex: '60',
      willChange: 'left, top, width, height',
    });
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    const vw = vv?.width ?? window.innerWidth;
    const vh = vv?.height ?? window.innerHeight;
    const offsetLeft = vv?.offsetLeft ?? 0;
    const offsetTop = vv?.offsetTop ?? 0;

    const horizontalAllowance = Math.max(260, Math.min(420, vw - 48));
    const baseWidth = Math.min(420, Math.max(280, horizontalAllowance));
    const aspect = from.height > 0 && from.width > 0 ? from.height / from.width : 1.4;
    let targetWidth = Math.round(baseWidth);
    let targetHeight = Math.round(targetWidth * aspect);
    const maxHeight = Math.max(280, vh - 64);
    if (targetHeight > maxHeight) {
      const scale = maxHeight / targetHeight;
      targetHeight = Math.round(targetHeight * scale);
      targetWidth = Math.round(targetWidth * scale);
    }

    const centerX = offsetLeft + vw / 2;
    const centerY = offsetTop + vh / 2;
    const targetLeft = Math.round(centerX - targetWidth / 2);
    const targetTop = Math.round(centerY - targetHeight / 2);

    // Dim backdrop
    const dim = document.createElement('div');
    Object.assign(dim.style, {
      position: 'fixed', inset: '0', background: 'rgba(48,18,67,0.22)', opacity: '0', zIndex: '50', backdropFilter: 'blur(14px)',
    } as CSSStyleDeclaration);
    document.body.appendChild(dim);
    anime({ targets: dim, opacity: [0, 1], duration: 220, easing: 'easeOutQuad' });

    const animation = anime({
      targets: el,
      left: targetLeft,
      top: targetTop,
      width: targetWidth,
      height: targetHeight,
      borderRadius: [startRadius, '28px'],
      easing: 'easeOutCubic',
      duration: 520,
      complete: () => {
        setDone(true);
        Object.assign(el.style, {
          left: `${targetLeft}px`,
          top: `${targetTop}px`,
          width: `${targetWidth}px`,
          height: `${targetHeight}px`,
        });
      },
    });

    let closing = false;
    const close = () => {
      if (closing) return;
      closing = true;
      animation.pause();
      anime({ targets: dim, opacity: [1, 0], duration: 180, easing: 'easeInQuad', complete: () => dim.remove() });
      anime({
        targets: el,
        left: from.left,
        top: from.top,
        width: from.width,
        height: from.height,
        borderRadius: startRadius,
        duration: 280,
        easing: 'easeInCubic',
        complete: () => {
          onClose();
          document.body.style.overflow = prevOverflow;
        },
      });
      window.removeEventListener('keydown', onKey);
      dim.removeEventListener('click', close);
    };

    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    dim.addEventListener('click', close);
    closeRef.current = close;

    return () => {
      try { dim.remove(); } catch {}
      window.removeEventListener('keydown', onKey);
      dim.removeEventListener('click', close);
      document.body.style.overflow = prevOverflow;
      animation.pause();
      closeRef.current = () => {};
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
          {item.realm && <div className="cp-kicker text-xs mb-1 uppercase tracking-[0.2em] text-white/70">{item.realm}</div>}
          <div className="text-white font-display text-xl font-extrabold truncate">{item.name}</div>
          {item.title && <div className="text-white/80 text-sm font-medium">{item.title}</div>}
          {(item.tagline || item.description) && (
            <div className="cp-muted text-sm mt-2">
              {item.tagline || item.description}
            </div>
          )}
          {done && (
            <>
              <p className="cp-muted text-sm mt-3">Scan its charm code to add this champion to your roster in seconds.</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/character/${item.id}`} className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-bold">View Character</Link>
                <button onClick={() => closeRef.current()} className="px-4 py-2 border border-white/20 text-white rounded-lg text-sm font-bold hover:bg-white/5">Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
