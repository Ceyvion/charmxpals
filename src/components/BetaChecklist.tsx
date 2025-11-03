"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { betaChecklistTasks, type BetaChecklistTask } from '@/data/betaChecklist';

type ChecklistSnapshot = {
  progress: Record<string, boolean>;
  updatedAtIso: string | null;
};

type BetaChecklistProps = {
  userId?: string | null;
  initialProgress: ChecklistSnapshot;
  onProgressUpdate?: (snapshot: ChecklistSnapshot) => void;
};

const API_ENDPOINT = '/api/beta-checklist';

export default function BetaChecklist({ userId, initialProgress, onProgressUpdate }: BetaChecklistProps) {
  const storageKey = useMemo(() => `cxp-beta-checklist:${userId ?? 'anon'}`, [userId]);
  const [progress, setProgress] = useState<Record<string, boolean>>(initialProgress.progress);
  const [updatedAtIso, setUpdatedAtIso] = useState<string | null>(initialProgress.updatedAtIso);
  const [isLoading, setLoading] = useState<boolean>(Boolean(userId));
  const [isSaving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setProgress(initialProgress.progress);
    setUpdatedAtIso(initialProgress.updatedAtIso);
  }, [initialProgress]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify({ progress, updatedAtIso });
      window.localStorage.setItem(storageKey, payload);
    } catch {
      // ignore write failures
    }
  }, [progress, updatedAtIso, storageKey]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function hydrateFromServer() {
      setLoading(true);
      try {
        const res = await fetch(API_ENDPOINT, { cache: 'no-store', signal: controller.signal });
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        const data = (await res.json()) as { success: boolean; record?: ChecklistSnapshot };
        if (!data.success) throw new Error('Unsuccessful response');
        if (!data.record) {
          setErrorMessage('No missions synced yet—start ticking items below.');
          return;
        }
        if (cancelled) return;
        setProgress(data.record.progress);
        setUpdatedAtIso(data.record.updatedAtIso);
        setErrorMessage(null);
        onProgressUpdate?.(data.record);
      } catch (error) {
        if (cancelled) return;
        if ((error as Error).name === 'AbortError') return;
        const fallback = readLocalStorageFallback(storageKey);
        if (fallback) {
          setProgress(fallback.progress);
          setUpdatedAtIso(fallback.updatedAtIso);
        }
        setErrorMessage('Working offline—changes will sync once you reconnect.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrateFromServer();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userId, storageKey, onProgressUpdate]);

  const completedCount = useMemo(
    () => betaChecklistTasks.filter((task) => progress[task.id]).length,
    [progress],
  );

  const percent = useMemo(() => {
    if (betaChecklistTasks.length === 0) return 0;
    return Math.round((completedCount / betaChecklistTasks.length) * 100);
  }, [completedCount]);

  const formattedUpdatedAt = useMemo(
    () => (updatedAtIso ? formatTimestamp(updatedAtIso) : null),
    [updatedAtIso],
  );

  const persist = useCallback(
    async (nextProgress: Record<string, boolean>) => {
      if (!userId) {
        const offlineUpdated = new Date().toISOString();
        setUpdatedAtIso(offlineUpdated);
        onProgressUpdate?.({ progress: nextProgress, updatedAtIso: offlineUpdated });
        return;
      }
      setSaving(true);
      setErrorMessage(null);
      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: nextProgress }),
        });
        if (!res.ok) throw new Error(`Failed with ${res.status}`);
        const data = (await res.json()) as { success: boolean; record?: ChecklistSnapshot };
        if (!data.success || !data.record) throw new Error('Invalid response');
        setProgress(data.record.progress);
        setUpdatedAtIso(data.record.updatedAtIso);
        onProgressUpdate?.(data.record);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage('Could not sync with the server. Progress is stored locally for now.');
        throw error;
      } finally {
        setSaving(false);
      }
    },
    [userId, onProgressUpdate],
  );

  const toggleTask = useCallback(
    async (taskId: string) => {
      const previous = progress;
      const next = { ...previous, [taskId]: !previous[taskId] };
      setProgress(next);
      try {
        await persist(next);
      } catch {
        setProgress(previous);
      }
    },
    [persist, progress],
  );

  const reset = useCallback(async () => {
    const empty: Record<string, boolean> = {};
    const previousUpdatedAt = updatedAtIso;
    setProgress(empty);
    try {
      await persist(empty);
    } catch {
      setUpdatedAtIso(previousUpdatedAt ?? new Date().toISOString());
    }
  }, [persist, updatedAtIso]);

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
              Work through each mission and capture notes as you go. We sync progress across devices once you’re signed in.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/6 px-5 py-4 text-right shadow-inner shadow-black/20">
            <div className="text-sm font-semibold uppercase tracking-wide text-white/60">Progress</div>
            <div className="mt-1 text-3xl font-display font-extrabold text-white">{percent}%</div>
            <div className="text-xs text-white/50">{completedCount} of {betaChecklistTasks.length} missions</div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.28em] text-white/40">
              {formattedUpdatedAt ? `Synced ${formattedUpdatedAt}` : isLoading ? 'Syncing…' : 'Not synced yet'}
            </div>
          </div>
        </header>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink-400 via-fuchsia-400 to-sky-400 shadow-[0_0_20px_rgba(244,114,182,0.45)] transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-400/15 px-4 py-3 text-xs text-amber-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4">
          {betaChecklistTasks.map((task, index) => {
            const checked = Boolean(progress[task.id]);
            const orderBadge = String(index + 1).padStart(2, '0');
            const linkClasses =
              'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white';
            const ctaLabel = getCtaLabel(task, checked);

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
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold text-white">{task.title}</div>
                        {checked ? <span className="cp-chip text-[10px]">Done</span> : null}
                      </div>
                      <div className="mt-1 text-sm leading-relaxed text-white/70">{task.description}</div>
                      {task.tip && (
                        <div className="mt-2 text-xs italic text-white/60">
                          Pro tip: {task.tip}
                        </div>
                      )}
                    </div>
                    {task.href ? (
                      task.external ? (
                        <a href={task.href} target="_blank" rel="noreferrer" className={linkClasses}>
                          {ctaLabel}
                          <span aria-hidden>↗</span>
                        </a>
                      ) : (
                        <Link href={task.href} className={linkClasses}>
                          {ctaLabel}
                          <span aria-hidden>⇢</span>
                        </Link>
                      )
                    ) : null}
                  </div>
                </div>
                {!checked && (
                  <div className="pointer-events-none absolute -right-16 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-gradient-to-br from-pink-500/15 to-purple-500/5 blur-2xl transition group-hover:opacity-100 opacity-0" />
                )}
                {checked && (
                  <div className="pointer-events-none absolute -left-12 top-4 h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400/25 to-emerald-400/5 blur-xl" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 font-semibold uppercase tracking-wide text-white/70 hover:border-white/30 hover:text-white disabled:opacity-60"
            disabled={isSaving}
          >
            <span className="text-[10px]">⟲</span>
            Reset progress
          </button>
          <div className="flex items-center gap-3 text-white/70">
            {isSaving ? <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">Syncing…</span> : null}
            <span>
              Snap screenshots, capture vibes, and reply to your invite email or{' '}
              <a href="mailto:beta@charmxpals.com" className="text-white/80 hover:text-white">beta@charmxpals.com</a>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function readLocalStorageFallback(key: string): ChecklistSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as { progress?: Record<string, boolean>; updatedAtIso?: string; updatedAt?: string };
    return {
      progress: obj.progress ?? {},
      updatedAtIso: obj.updatedAtIso ?? obj.updatedAt ?? null,
    };
  } catch {
    return null;
  }
}

function getCtaLabel(task: BetaChecklistTask, checked: boolean) {
  if (checked) {
    switch (task.id) {
      case 'claim':
        return 'Review claim flow';
      case 'mini-game':
        return 'Run another lap';
      case 'feedback':
        return 'Send more notes';
      default:
        return 'Revisit';
    }
  }
  switch (task.id) {
    case 'claim':
      return 'Redeem now';
    case 'mini-game':
      return 'Launch runner';
    case 'viewer':
      return 'Open viewer';
    case 'feedback':
      return 'Share feedback';
    default:
      return 'Jump in';
  }
}
