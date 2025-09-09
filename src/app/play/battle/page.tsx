'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Fighter = { name: string; stats: Record<string, number> };

const STAT_KEYS = ['strength', 'speed', 'intelligence', 'defense'] as const;

export default function BattlePage() {
  const [you, setYou] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [roundStat, setRoundStat] = useState<string>('strength');
  const [log, setLog] = useState<string[]>([]);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [usedBoost, setUsedBoost] = useState(false);
  const [usedShield, setUsedShield] = useState(false);
  const [flash, setFlash] = useState<'win' | 'lose' | null>(null);

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
    setYou(a); setFoe(b);
    setRoundIdx(0); setWins(0); setLosses(0); setUsedBoost(false); setUsedShield(false); setLog([]); setFlash(null);
    const stat = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
    setRoundStat(stat);
  };

  useEffect(() => { start(); }, []);

  const runRound = (useBoost: boolean) => {
    if (!you || !foe) return;
    let ya = (you as any)?.stats?.[roundStat] ?? 0;
    const fb = (foe as any)?.stats?.[roundStat] ?? 0;
    if (useBoost && !usedBoost) ya += 10;
    let outcome: 'win'|'lose'|'draw' = ya === fb ? 'draw' : ya > fb ? 'win' : 'lose';
    if (outcome === 'lose' && !usedShield) { outcome = 'draw'; setUsedShield(true); }
    setLog((l) => [...l, `${roundStat}: ${outcome}`]);
    if (outcome === 'win') { setWins((w) => w + 1); setFlash('win'); }
    else if (outcome === 'lose') { setLosses((w) => w + 1); setFlash('lose'); }
    setTimeout(() => setFlash(null), 400);
    // next round
    if (roundIdx < 2) {
      setRoundIdx(roundIdx + 1);
      const stat = STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];
      setRoundStat(stat);
    }
  };

  const matchOver = roundIdx >= 2;
  const result = matchOver ? (wins === losses ? 'draw' : wins > losses ? 'win' : 'lose') : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-500/30 to-amber-400/30 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-white font-display">Stat Battle</h1>
          <p className="text-white/80">Round {roundIdx + 1} of 3 • Highest {roundStat} wins.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded-xl border border-white/10 p-4 bg-white/5 ${flash==='win'?'ring-2 ring-green-400/70':''}`}>
            <div className="text-sm text-white/70">You</div>
            <div className="text-xl font-bold text-white font-display">{you?.name}</div>
            <div className="mt-2 text-white/80">{roundStat}: <span className="font-semibold">{(you as any)?.stats?.[roundStat] ?? 0}{!usedBoost && ' (+10 boost ready)'}</span></div>
          </div>
          <div className={`rounded-xl border border-white/10 p-4 bg-white/5 ${flash==='lose'?'ring-2 ring-red-400/70':''}`}>
            <div className="text-sm text-white/70">Foe</div>
            <div className="text-xl font-bold text-white font-display">{foe?.name}</div>
            <div className="mt-2 text-white/80">{roundStat}: <span className="font-semibold">{(foe as any)?.stats?.[roundStat] ?? 0}</span></div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          {!matchOver && (
            <>
              <button onClick={() => runRound(false)} className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100">Fight</button>
              <button onClick={() => { if (!usedBoost) { setUsedBoost(true); runRound(true); } }} disabled={usedBoost} className="px-6 py-3 bg-amber-400/20 border border-amber-300/30 text-amber-200 rounded-lg font-semibold disabled:opacity-60 hover:bg-amber-400/30">Boost +10</button>
              <button disabled={usedShield} className="px-6 py-3 bg-cyan-400/20 border border-cyan-300/30 text-cyan-200 rounded-lg font-semibold disabled:opacity-60">Shield (auto-draw)</button>
            </>
          )}
          {matchOver && (
            <button onClick={start} className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Rematch</button>
          )}
          <Link href="/play" className="px-6 py-3 bg-transparent border border-white/20 text-white rounded-lg font-semibold hover:bg-white/5">Game Hub</Link>
        </div>

        <div className="mt-4 text-center text-white/80 text-sm">Score {wins} - {losses}{matchOver && result && ` • ${result === 'win' ? 'You win!' : result === 'lose' ? 'You lose!' : 'Draw'}`}</div>

        {log.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {log.map((line, i) => (
              <div key={i} className="text-center text-white/80 text-xs rounded-md border border-white/10 bg-white/5 px-2 py-1">{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
