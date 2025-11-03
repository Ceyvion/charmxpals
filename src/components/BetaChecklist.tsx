"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Task = {
  id: string;
  title: string;
  description: string;
  href?: string;
  external?: boolean;
};

const TASKS: Task[] = [
  {
    id: 'explore',
    title: 'Tour the Explore page',
    description: 'Browse featured pals and confirm ownership badges render after you claim.',
    href: '/explore',
  },
  {
    id: 'claim',
    title: 'Redeem your collectible code',
    description: 'Use the code we sent at /claim and confirm it appears in My Pals.',
    href: '/claim',
  },
  {
    id: 'viewer',
    title: 'Open the 3D viewer',
    description: 'On your pal detail page, rotate/zoom the model and note any glitches.',
    href: '/me',
  },
  {
    id: 'mini-game',
    title: 'Play a mini-game',
    description: 'Visit Play → Runner, finish a round, and capture any bugs or unfair moments.',
    href: '/play/runner',
  },
  {
    id: 'feedback',
    title: 'Share feedback',
    description: 'Drop notes, screenshots, or ideas in the feedback channel.',
    external: true,
    href: 'mailto:beta@charmxpals.com?subject=Beta%20feedback',
  },
];

type BetaChecklistProps = {
  userId?: string | null;
};

export default function BetaChecklist({ userId }: BetaChecklistProps) {
  const storageKey = useMemo(() => `cxp-beta-checklist:${userId ?? 'anon'}`, [userId]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [isHydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        setProgress(JSON.parse(stored) as Record<string, boolean>);
      } else {
        setProgress({});
      }
    } catch {
      setProgress({});
    }
  }, [storageKey, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // ignore write failures
    }
  }, [progress, storageKey, isHydrated]);

  const completed = TASKS.filter((task) => progress[task.id]).length;
  const percent = Math.round((completed / TASKS.length) * 100);

  const toggleTask = (taskId: string) => {
    setProgress((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const reset = () => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore removal failure
    }
    setProgress({});
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8 shadow-[0_28px_120px_rgba(64,0,128,0.35)]">
      <div className="pointer-events-none absolute -top-20 -right-12 h-48 w-48 rounded-full bg-gradient-to-br from-fuchsia-500/25 via-purple-500/15 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-gradient-to-br from-sky-500/20 to-emerald-400/10 blur-3xl" />
      <div className="relative z-10 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              Beta missions
            </div>
            <h2 className="text-3xl font-display font-extrabold text-white leading-tight">
              Help us ship the glow-up
            </h2>
            <p className="max-w-xl text-sm text-white/70">
              Check off each mission as you explore. We keep progress on this device so you can bounce between sessions.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/6 px-5 py-4 text-right shadow-inner shadow-black/20">
            <div className="text-sm font-semibold uppercase tracking-wide text-white/60">Progress</div>
            <div className="mt-1 text-3xl font-display font-extrabold text-white">{percent}%</div>
            <div className="text-xs text-white/50">{completed} of {TASKS.length} missions</div>
          </div>
        </header>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-sky-400 shadow-[0_0_20px_rgba(244,114,182,0.45)] transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="grid gap-4">
          {TASKS.map((task, index) => {
            const checked = Boolean(progress[task.id]);
            const linkClasses =
              'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white';

            const orderBadge = String(index + 1).padStart(2, '0');

            return (
              <div
                key={task.id}
                className={`group relative overflow-hidden rounded-2xl border px-5 py-5 transition-all duration-300 ${
                  checked
                    ? 'border-emerald-400/60 bg-gradient-to-br from-emerald-400/15 via-emerald-400/8 to-transparent shadow-[0_24px_60px_rgba(16,185,129,0.18)]'
                    : 'border-white/12 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.08]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition duration-200 ${
                      checked
                        ? 'border-white bg-white text-gray-900 shadow-[0_10px_30px_rgba(255,255,255,0.35)]'
                        : 'border-white/20 bg-white/5 text-white/40 group-hover:border-white/40'
                    }`}
                    aria-pressed={checked}
                    aria-label={checked ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as done`}
                  >
                    {checked ? (
                      <span className="text-sm font-bold">✓</span>
                    ) : (
                      <span className="text-[10px] font-semibold tracking-[0.2em] text-white/50">{orderBadge}</span>
                    )}
                  </button>
                  <div className="space-y-3">
                    <div>
                      <div className="text-lg font-semibold text-white">{task.title}</div>
                      <div className="mt-1 text-sm leading-relaxed text-white/70">{task.description}</div>
                    </div>
                    {task.href ? (
                      task.external ? (
                        <a href={task.href} target="_blank" rel="noreferrer" className={linkClasses}>
                          Open feedback channel
                          <span aria-hidden>↗</span>
                        </a>
                      ) : (
                        <Link href={task.href} className={linkClasses}>
                          Jump there
                          <span aria-hidden>⇢</span>
                        </Link>
                      )
                    ) : null}
                  </div>
                </div>
                {!checked && (
                  <div className="pointer-events-none absolute -right-16 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-gradient-to-br from-pink-500/15 to-purple-500/5 blur-2xl transition group-hover:opacity-100 opacity-0" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-semibold uppercase tracking-wide text-white/70 hover:border-white/30 hover:text-white"
          >
            <span className="text-[10px]">⟲</span>
            Reset progress
          </button>
          <span>Snap screenshots, capture vibes, and reply to your invite email or <a href="mailto:beta@charmxpals.com" className="text-white/80 hover:text-white">beta@charmxpals.com</a>.</span>
        </div>
      </div>
    </div>
  );
}
