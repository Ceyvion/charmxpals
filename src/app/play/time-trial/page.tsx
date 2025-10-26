'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loreBySlug } from '@/data/characterLore';

type Target = { x: number; y: number; r: number };

type PhaseConfig = {
  slug: string;
  threshold: number;
  prompt: string;
};

const phases: PhaseConfig[] = [
  {
    slug: 'rhythm-reef',
    threshold: 0,
    prompt: 'Kai Tidal floods the course with tide orbs. Tap each crest before it sinks.',
  },
  {
    slug: 'wildbeat-jungle',
    threshold: 6,
    prompt: 'Tarin Pulse sprouts percussion blooms—land them clean or they wilt.',
  },
  {
    slug: 'solar-spire',
    threshold: 12,
    prompt: 'Helio Trace opens sunstep runways. Tag every flare to keep the portal open.',
  },
];

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(94, 234, 212, ${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const pickPhase = (score: number) => {
  let current = phases[0];
  for (const phase of phases) {
    if (score >= phase.threshold) current = phase;
  }
  return current;
};

export default function TimeTrial() {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [target, setTarget] = useState<Target | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);

  const phase = useMemo(() => pickPhase(score), [score]);
  const champion = loreBySlug[phase.slug];
  const accentColor = champion?.color ?? '#2dd4bf';

  const start = () => {
    setScore(0);
    setTimeLeft(20);
    spawnNewTarget();
  };

  useEffect(() => {
    if (timeLeft <= 0) {
      clearTimers();
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft]);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (spawnRef.current) clearTimeout(spawnRef.current);
  };

  const spawnNewTarget = () => {
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const r = 20;
    const x = Math.random() * (rect.width - r * 2) + r;
    const y = Math.random() * (rect.height - r * 2) + r;
    setTarget({ x, y, r });

    if (spawnRef.current) clearTimeout(spawnRef.current);
    const nextDelay = 720 + Math.random() * 520;
    spawnRef.current = setTimeout(spawnNewTarget, nextDelay);
  };

  const onAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timeLeft <= 0) return;
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const t = target;
    if (t) {
      const dx = cx - t.x;
      const dy = cy - t.y;
      const hit = dx * dx + dy * dy <= t.r * t.r;
      if (hit) {
        setScore((s) => s + 1);
        spawnNewTarget();
        return;
      }
    }
    setTimeLeft((t) => Math.max(0, t - 2));
  };

  const cardStyle = {
    borderColor: hexToRgba(accentColor, 0.35),
    background: `linear-gradient(140deg, ${hexToRgba(accentColor, 0.22)}, rgba(15, 23, 42, 0.85))`,
  };

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div
        className="mx-auto flex max-w-xl flex-col gap-5 rounded-3xl border bg-slate-900/60 p-6 text-white shadow-[0_18px_90px_rgba(34,211,238,0.25)] backdrop-blur"
        style={cardStyle}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Realm Relay Trials</p>
          <h1 className="mt-2 text-3xl font-extrabold font-display">Signal Split Challenge</h1>
          <p className="mt-2 text-sm text-white/70">
            {champion?.name ?? 'The crew'} • {champion?.realm ?? 'Unknown realm'}
          </p>
          <p className="mt-3 text-sm text-white/80">{phase.prompt}</p>
        </div>

        <div className="flex items-center justify-center gap-8 text-sm uppercase tracking-[0.2em] text-white/60">
          <div className="flex flex-col items-center">
            <span>Time</span>
            <span className="mt-1 text-3xl font-semibold text-white">{timeLeft}s</span>
          </div>
          <div className="flex flex-col items-center">
            <span>Beacons</span>
            <span className="mt-1 text-3xl font-semibold text-white">{score}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={start}
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Launch relay
          </button>
          <Link
            href="/play"
            className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white/70 transition hover:text-white hover:bg-white/5"
          >
            Game Hub
          </Link>
        </div>

        <div
          ref={areaRef}
          onClick={onAreaClick}
          className="relative mx-auto h-64 w-full max-w-md rounded-2xl border border-white/10 bg-black/30"
        >
          {target && timeLeft > 0 && (
            <div
              className="absolute rounded-full shadow-lg"
              style={{
                left: target.x - target.r,
                top: target.y - target.r,
                width: target.r * 2,
                height: target.r * 2,
                background: hexToRgba(accentColor, 0.9),
                boxShadow: `0 0 15px ${hexToRgba(accentColor, 0.7)}`,
              }}
            />
          )}
          {timeLeft <= 0 && (
            <div className="absolute inset-0 grid place-items-center text-sm text-white/70">
              Launch a relay to reopen the portal.
            </div>
          )}
        </div>

        {timeLeft === 0 && score > 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80">
            <p>
              Relay complete. {champion?.name ?? 'The crew'} logged <span className="font-semibold text-white">{score}</span> beacons.
              Tag in another pilot to push the record.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
