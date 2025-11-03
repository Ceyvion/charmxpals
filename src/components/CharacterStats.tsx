"use client";

import { useEffect, useMemo, useRef } from 'react';
import anime from 'animejs';

export default function CharacterStats({ stats }: { stats: Record<string, number> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const entries = useMemo(() => Object.entries(stats || {}), [stats]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const bars = el.querySelectorAll<HTMLElement>('[data-bar]');
    bars.forEach((b) => (b.style.width = '0%'));
    const to = entries.map(([_, v]) => Math.max(0, Math.min(100, Number(v))));
    anime({
      targets: bars,
      width: (_el, index) => `${to[index] ?? 0}%`,
      delay: anime.stagger(60),
      duration: 800,
      easing: 'easeOutCubic',
    });
  }, [entries]);

  return (
    <div ref={containerRef} className="space-y-3">
      {entries.map(([key, value]) => {
        const v = Math.max(0, Math.min(100, Number(value)));
        return (
          <div key={key}>
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span className="uppercase tracking-wider">{key}</span>
              <span className="font-semibold text-white">{v}</span>
            </div>
            <div className="cp-bar"><div className="cp-bar-fill" data-bar style={{ width: '0%' }} /></div>
          </div>
        );
      })}
    </div>
  );
}
