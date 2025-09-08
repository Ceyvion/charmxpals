'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Fighter = { name: string; stats: Record<string, number> };

const STAT_KEYS = ['strength', 'speed', 'intelligence', 'defense'] as const;

export default function BattlePage() {
  const [you, setYou] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [roundStat, setRoundStat] = useState<string>('strength');

  // Lightweight sample fighters
  const roster: Fighter[] = useMemo(() => [
    { name: 'Blaze the Dragon', stats: { strength: 85, speed: 92, intelligence: 78, defense: 80 } },
    { name: 'Frost Wolf', stats: { strength: 78, speed: 88, intelligence: 85, defense: 82 } },
    { name: 'Tidal Serpent', stats: { strength: 90, speed: 75, intelligence: 88, defense: 85 } },
  ], []);

  const roll = () => Math.floor(Math.random() * roster.length);

  const start = () => {
    const a = roster[roll()];
    let b = roster[roll()];
    if (b.name === a.name) b = roster[(roll() + 1) % roster.length];
    setYou(a); setFoe(b); setResult(null);
    const stat = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
    setRoundStat(stat);
  };

  useEffect(() => { start(); }, []);

  const fight = () => {
    if (!you || !foe) return;
    const ya = (you as any)?.stats?.[roundStat] ?? 0;
    const fb = (foe as any)?.stats?.[roundStat] ?? 0;
    const outcome = ya === fb ? 'draw' : ya > fb ? 'win' : 'lose';
    setResult(outcome);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500/30 to-amber-400/30 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-white font-display">Stat Battle</h1>
          <p className="text-white/80">Highest {roundStat} wins this round.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 p-4 bg-white/5">
            <div className="text-sm text-white/70">You</div>
            <div className="text-xl font-bold text-white font-display">{you?.name}</div>
            <div className="mt-2 text-white/80">{roundStat}: <span className="font-semibold">{(you as any)?.stats?.[roundStat] ?? 0}</span></div>
          </div>
          <div className="rounded-xl border border-white/10 p-4 bg-white/5">
            <div className="text-sm text-white/70">Foe</div>
            <div className="text-xl font-bold text-white font-display">{foe?.name}</div>
            <div className="mt-2 text-white/80">{roundStat}: <span className="font-semibold">{(foe as any)?.stats?.[roundStat] ?? 0}</span></div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button onClick={fight} className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100">Fight</button>
          <button onClick={start} className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Rematch</button>
          <Link href="/play" className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Game Hub</Link>
        </div>

        {result && (
          <div className={`mt-6 text-center text-lg font-semibold ${
            result === 'win' ? 'text-green-400' : result === 'lose' ? 'text-red-400' : 'text-white/90'
          }`}>
            {result === 'win' ? 'You win!' : result === 'lose' ? 'You lose!' : 'It\'s a draw!'}
          </div>
        )}
      </div>
    </div>
  );
}
