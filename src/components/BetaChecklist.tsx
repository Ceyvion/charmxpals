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
    <div className="cp-panel p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white font-display">Beta Test Checklist</h2>
          <p className="text-sm text-white/70">
            Mark tasks off as you go—your progress stays on this device.
          </p>
        </div>
        <div className="text-right">
          <div className="text-white font-semibold text-lg">{percent}% complete</div>
          <div className="text-xs text-white/60">{completed} / {TASKS.length} tasks</div>
        </div>
      </div>
      <div className="grid gap-4">
        {TASKS.map((task) => {
          const checked = Boolean(progress[task.id]);
          const linkClasses =
            'inline-flex items-center text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white';

          const content = (
            <>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={`mt-1 h-5 w-5 rounded border transition ${
                    checked
                      ? 'bg-white text-gray-900 border-white'
                      : 'border-white/30 text-white/30 hover:border-white/60'
                  }`}
                  aria-pressed={checked}
                  aria-label={checked ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as done`}
                >
                  {checked ? '✓' : ''}
                </button>
                <div className="space-y-1">
                  <div className="text-base font-semibold text-white">{task.title}</div>
                  <div className="text-sm text-white/70">{task.description}</div>
                </div>
              </div>
              {task.href ? (
                task.external ? (
                  <a href={task.href} target="_blank" rel="noreferrer" className={linkClasses}>
                    Open link →
                  </a>
                ) : (
                  <Link href={task.href} className={linkClasses}>
                    Go to page →
                  </Link>
                )
              ) : null}
            </>
          );

          return (
            <div
              key={task.id}
              className={`rounded-xl border px-4 py-3 md:px-6 md:py-4 transition ${
                checked ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-white/10 bg-white/5'
              }`}
            >
              {content}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={reset}
          className="text-xs font-semibold uppercase tracking-wide text-white/60 hover:text-white"
        >
          Reset checklist
        </button>
        <span className="text-xs text-white/60">Have ideas? Reply to your invite email anytime.</span>
      </div>
    </div>
  );
}
