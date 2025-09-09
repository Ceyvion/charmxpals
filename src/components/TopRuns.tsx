"use client";

import { useEffect, useState } from 'react';

type Entry = { score: number; coins?: number; at: string; name?: string };

export default function TopRuns({ mode = 'runner' }: { mode?: 'runner' | 'timeTrial' | 'battle' }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/score?mode=${mode}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setEntries(j.top || []); })
      .catch((e) => { if (!cancelled) setError('Failed to load leaderboard'); console.warn(e); });
    return () => { cancelled = true; };
  }, [mode]);

  return (
    <div className="mt-6">
      <div className="text-white/90 font-semibold mb-2">Today’s Top Runs</div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {!entries && !error && <div className="text-white/60 text-sm">Loading…</div>}
      {entries && entries.length === 0 && <div className="text-white/60 text-sm">No scores yet. Be the first!</div>}
      {entries && entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.slice(0, 10).map((e, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/90">
              <div className="text-sm">#{i + 1} • {e.name || 'Anonymous'}</div>
              <div className="text-sm font-semibold">Score {e.score}{typeof e.coins === 'number' ? ` • Coins ${e.coins}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

