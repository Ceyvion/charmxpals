'use client';

import { useEffect, useRef, type CSSProperties } from 'react';

type Props = {
  label: string;
  value: number;
  color: string;
  delay?: number;
};

const THRESHOLDS = [
  { min: 92, label: 'S', bg: 'rgba(251,191,36,0.18)', border: 'rgba(251,191,36,0.5)', text: '#fbbf24' },
  { min: 84, label: 'A', bg: 'rgba(167,139,250,0.16)', border: 'rgba(167,139,250,0.45)', text: '#a78bfa' },
  { min: 70, label: 'B', bg: 'rgba(56,189,248,0.14)', border: 'rgba(56,189,248,0.4)', text: '#38bdf8' },
  { min: 55, label: 'C', bg: 'rgba(251,146,60,0.14)', border: 'rgba(251,146,60,0.4)', text: '#fb923c' },
  { min: 0, label: 'D', bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)', text: '#94a3b8' },
] as const;

function getTier(value: number) {
  return THRESHOLDS.find((t) => value >= t.min) ?? THRESHOLDS[THRESHOLDS.length - 1];
}

export default function StatBar({ label, value, color, delay = 0 }: Props) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const numRef = useRef<HTMLSpanElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const clamped = Math.min(100, Math.max(0, value));
  const tier = getTier(clamped);

  useEffect(() => {
    const bar = barRef.current;
    const num = numRef.current;
    if (!bar || !num) return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReduced) {
      bar.style.width = `${clamped}%`;
      num.textContent = String(clamped);
      return;
    }

    bar.style.width = '0%';
    num.textContent = '0';

    const timeout = setTimeout(() => {
      const start = performance.now();
      const duration = 900;

      function animate(now: number) {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(2, -10 * t);
        const current = Math.round(clamped * ease);

        if (bar) bar.style.width = `${current}%`;
        if (num) num.textContent = String(current);

        if (t < 1) frameRef.current = requestAnimationFrame(animate);
      }

      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [clamped, delay]);

  const fillStyle: CSSProperties = {
    backgroundColor: color,
    boxShadow: `0 0 12px ${color}66, 0 0 4px ${color}44`,
    width: '0%',
    transition: 'none',
  };

  const tierStyle: CSSProperties = {
    backgroundColor: tier.bg,
    borderColor: tier.border,
    color: tier.text,
  };

  // Threshold markers at 55, 70, 84, 92
  const markers = [55, 70, 84, 92];

  return (
    <div className="group relative">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">{label}</span>
          <span
            className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={tierStyle}
          >
            {tier.label}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span ref={numRef} className="font-display text-lg font-semibold text-white">0</span>
          <span className="text-[10px] text-white/40">/100</span>
        </div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        {markers.map((m) => (
          <div
            key={m}
            className="absolute top-0 h-full w-px bg-white/[0.08]"
            style={{ left: `${m}%` }}
          />
        ))}
        <div ref={barRef} className="relative h-full rounded-full" style={fillStyle}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}
