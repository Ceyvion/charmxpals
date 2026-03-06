"use client";

import { useEffect, useMemo, useState } from 'react';

import { pulsegridTracks } from '@/data/pulsegridTracks';

type Entry = {
  id: string;
  score: number;
  coins?: number;
  at: string;
  displayName?: string;
  name?: string;
};

export default function TopRuns({
  mode = 'runner',
  trackId,
  coinsLabel = 'Coins',
}: {
  mode?: 'runner' | 'timeTrial' | 'battle';
  trackId?: string | null;
  coinsLabel?: string;
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trackLabel = useMemo(() => {
    if (mode !== 'runner' || !trackId) return null;
    return pulsegridTracks.find((track) => track.id === trackId)?.title ?? null;
  }, [mode, trackId]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ mode });
    if (trackId) {
      params.set('trackId', trackId);
    }

    setEntries(null);
    setError(null);

    fetch(`/api/score?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) {
          setEntries(Array.isArray(j.top) ? j.top : []);
        }
      })
      .catch((e) => {
        if (!cancelled) setError('Failed to load leaderboard');
        console.warn(e);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, trackId]);

  return (
    <div className="mt-6">
      <div className="mb-2">
        <div className="font-semibold text-white/90">Today’s Top Runs</div>
        {trackLabel ? <div className="text-xs uppercase tracking-[0.28em] text-white/45">{trackLabel}</div> : null}
      </div>
      {error && <div className="text-sm text-red-400">{error}</div>}
      {!entries && !error && <div className="text-sm text-white/60">Loading…</div>}
      {entries && entries.length === 0 && (
        <div className="text-sm text-white/60">
          {trackLabel ? 'No scores yet on this track. Be the first!' : 'No scores yet. Be the first!'}
        </div>
      )}
      {entries && entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.slice(0, 10).map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/90"
            >
              <div className="text-sm">#{index + 1} • {entry.displayName || entry.name || 'Player'}</div>
              <div className="text-sm font-semibold">
                Score {entry.score}
                {typeof entry.coins === 'number' ? ` • ${coinsLabel} ${entry.coins}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
