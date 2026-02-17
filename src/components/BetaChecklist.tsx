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
    <div className="cp-panel relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-[0_26px_80px_rgba(15,23,42,0.08)]">
      <div className="pointer-events-none absolute -top-20 -right-12 h-48 w-48 rounded-full bg-gradient-to-br from-fuchsia-300/35 via-violet-300/20 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-300/30 to-emerald-300/20 blur-3xl" />
      <div className="relative z-10 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--cp-text-muted)]">
              Mission tracker
            </div>
            <h2 className="text-3xl font-display font-extrabold leading-tight text-[color:var(--cp-text-primary)]">
              Core missions, zero fluff
            </h2>
            <p className="max-w-xl text-sm text-[color:var(--cp-text-secondary)]">
              Beta Progress: {percent}% ({completedCount}/{betaChecklistTasks.length} complete). Work through each target and log issues as you go—we sync progress across devices when you’re signed in.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-5 py-4 text-right shadow-inner shadow-black/5">
            <div className="text-sm font-semibold uppercase tracking-wide text-[color:var(--cp-text-secondary)]">Mission tracker</div>
            <div className="mt-1 text-3xl font-display font-extrabold text-[color:var(--cp-text-primary)]">{percent}%</div>
            <div className="text-xs text-[color:var(--cp-text-secondary)]">{completedCount} of {betaChecklistTasks.length} complete</div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.28em] text-[color:var(--cp-text-muted)]">
              {formattedUpdatedAt ? `Synced ${formattedUpdatedAt}` : isLoading ? 'Syncing…' : 'Not synced yet'}
            </div>
          </div>
        </header>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--cp-gray-200)]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--cp-red)] via-[var(--cp-yellow)] to-[var(--cp-cyan)] shadow-[0_0_18px_rgba(255,59,48,0.22)] transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-xs text-amber-900">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid gap-4">
          {betaChecklistTasks.map((task, index) => {
            const checked = Boolean(progress[task.id]);
            const orderBadge = String(index + 1).padStart(2, '0');
            const linkClasses =
              'inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--cp-text-primary)] hover:text-[var(--cp-red)]';
            const ctaLabel = getCtaLabel(task, checked);

            return (
              <div
                key={task.id}
                className={`group relative overflow-hidden rounded-2xl border px-5 py-5 transition-all duration-300 ${
                  checked
                    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-50 to-transparent shadow-[0_20px_40px_rgba(16,185,129,0.1)]'
                    : 'border-[var(--cp-border)] bg-[var(--cp-white)] hover:border-[var(--cp-border-strong)] hover:bg-[var(--cp-gray-100)]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition duration-200 ${
                      checked
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.3)]'
                        : 'border-[var(--cp-border)] bg-[var(--cp-gray-100)] text-[color:var(--cp-text-muted)] group-hover:border-[var(--cp-border-strong)]'
                    }`}
                    aria-pressed={checked}
                    aria-label={checked ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as done`}
                  >
                    {checked ? (
                      <span className="text-sm font-bold">✓</span>
                    ) : (
                      <span className="text-[10px] font-semibold tracking-[0.2em] text-[color:var(--cp-text-secondary)]">{orderBadge}</span>
                    )}
                  </button>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-semibold text-[color:var(--cp-text-primary)]">{task.title}</div>
                        {checked ? <span className="cp-chip text-[10px]">Done</span> : null}
                      </div>
                      <div className="mt-1 text-sm leading-relaxed text-[color:var(--cp-text-secondary)]">{task.description}</div>
                      {task.tip && (
                        <div className="mt-2 text-xs italic text-[color:var(--cp-text-muted)]">
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
                  <div className="pointer-events-none absolute -right-16 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-gradient-to-br from-pink-300/30 to-violet-300/10 blur-2xl transition group-hover:opacity-100 opacity-0" />
                )}
                {checked && (
                  <div className="pointer-events-none absolute -left-12 top-4 h-16 w-16 rounded-full bg-gradient-to-br from-emerald-300/50 to-emerald-200/10 blur-xl" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 text-xs text-[color:var(--cp-text-secondary)] md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-4 py-1.5 font-semibold uppercase tracking-wide text-[color:var(--cp-text-secondary)] hover:border-[var(--cp-border-strong)] hover:text-[color:var(--cp-text-primary)] disabled:opacity-60"
            disabled={isSaving}
          >
            <span className="text-[10px]">⟲</span>
            Reset progress
          </button>
          <div className="flex items-center gap-3 text-[color:var(--cp-text-secondary)]">
            {isSaving ? <span className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--cp-text-muted)]">Syncing…</span> : null}
            <span>
              Snap screenshots, clips, and repro steps—send them to{' '}
              <a href="mailto:charmxpals.contact@gmail.com" className="text-[color:var(--cp-text-primary)] hover:text-[var(--cp-red)]">charmxpals.contact@gmail.com</a>.
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
      case 'explore':
        return 'Review Explore';
      case 'claim':
        return 'Run claim again';
      case 'viewer':
        return 'Re-check viewer';
      case 'mini-game':
        return 'Another runner lap';
      case 'feedback':
        return 'Send more notes';
      default:
        return 'Revisit';
    }
  }
  switch (task.id) {
    case 'explore':
      return 'Open Explore';
    case 'claim':
      return 'Start test';
    case 'viewer':
      return 'Test viewer';
    case 'mini-game':
      return 'Launch runner';
    case 'feedback':
      return 'Drop feedback';
    default:
      return 'Jump in';
  }
}
