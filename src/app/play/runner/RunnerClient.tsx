"use client";

import Link from 'next/link';
import Runner from '@/components/Runner';
import TopRuns from '@/components/TopRuns';
import { useEffect, useMemo, useState } from 'react';
import { TinyAudioOnce } from '@/lib/audio';

export default function RunnerClient({ cid }: { cid?: string }) {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [lastScore, setLastScore] = useState<{ score: number; coins: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!cid) { setStats(null); return; }
    fetch(`/api/character/${cid}`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setStats(j?.character?.stats || null); })
      .catch(() => { if (!cancelled) setStats(null); });
    return () => { cancelled = true; };
  }, [cid]);

  const audio = useMemo(() => ({
    enabled: audioEnabled,
    playJump: () => { if (audioEnabled) TinyAudioOnce.jump(); },
    playCoin: () => { if (audioEnabled) TinyAudioOnce.coin(); },
  }), [audioEnabled]);

  const submitScore = async (score: number, coins: number) => {
    setLastScore({ score, coins });
    try {
      await fetch('/api/score', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ mode: 'runner', score, coins }) });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-rose-50/70 to-sky-50 py-10 px-4">
      <div className="max-w-4xl mx-auto rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_90px_rgba(59,130,246,0.18)] backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-3xl font-extrabold text-slate-900 font-display md:text-4xl">Breakline Runner</h1>
            <p className="text-slate-600">Tap to jump • Swipe down to slide • Stay on beat with Vexa&apos;s tempo gates.</p>
            {stats && (
              <div className="mt-1 text-sm text-slate-500">
                Flow {stats.flow ?? '—'} • Rhythm {stats.rhythm ?? '—'} — dialed in from your collectible&apos;s sheet.
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
            <input type="checkbox" checked={audioEnabled} onChange={(e) => setAudioEnabled(e.target.checked)} />
            Audio
          </label>
        </div>
        <Runner stats={stats} audio={audio} onGameOver={(s, c) => submitScore(s, c)} />
        {lastScore && (
          <div className="mt-3 text-center text-sm text-slate-500">Submitted score {lastScore.score} • Coins {lastScore.coins}</div>
        )}
        <TopRuns mode="runner" />
        <div className="mt-6 text-center">
          <Link href="/play" className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-white/70 hover:text-slate-900 transition">
            Game Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
