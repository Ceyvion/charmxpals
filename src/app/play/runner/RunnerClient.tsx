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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white font-display">Endless Runner</h1>
            <p className="text-white/80">Tap to jump • Swipe down to slide. Collect coins and survive.</p>
          </div>
          <label className="flex items-center gap-2 text-white/80 text-sm select-none">
            <input type="checkbox" checked={audioEnabled} onChange={(e) => setAudioEnabled(e.target.checked)} />
            Audio
          </label>
        </div>
        <Runner stats={stats} audio={audio} onGameOver={(s, c) => submitScore(s, c)} />
        {lastScore && (
          <div className="mt-3 text-center text-white/80 text-sm">Submitted score {lastScore.score} • Coins {lastScore.coins}</div>
        )}
        <TopRuns mode="runner" />
        <div className="mt-6 text-center">
          <Link href="/play" className="px-5 py-2.5 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Game Hub</Link>
        </div>
      </div>
    </div>
  );
}

