'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CharacterLore } from '@/data/characterLore';
import { loreBySlug } from '@/data/characterLore';

type Fighter = CharacterLore;
type StatKey = keyof CharacterLore['stats'];

const STAT_KEYS: StatKey[] = ['rhythm', 'style', 'power', 'flow', 'teamwork'];
const ROSTER_SLUGS = ['crystal-kingdom', 'ember-heights', 'shadow-stage', 'neon-city', 'lunar-lux', 'prism-pulse'];

const pickStatKey = () => STAT_KEYS[Math.floor(Math.random() * STAT_KEYS.length)];

export default function BattlePage() {
  const [you, setYou] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [roundStat, setRoundStat] = useState<StatKey>('rhythm');
  const [log, setLog] = useState<string[]>([]);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [usedBoost, setUsedBoost] = useState(false);
  const [armedShield, setArmedShield] = useState(false);
  const [shieldSpent, setShieldSpent] = useState(false);
  const [flash, setFlash] = useState<'win' | 'lose' | null>(null);

  const roster = useMemo(() => {
    return ROSTER_SLUGS.map((slug) => loreBySlug[slug]).filter((entry): entry is Fighter => Boolean(entry));
  }, []);

  const roll = () => Math.floor(Math.random() * roster.length);

  const start = useCallback(() => {
    if (roster.length < 2) return;
    const a = roster[roll()];
    let b = roster[roll()];
    if (b.slug === a.slug) b = roster[(roll() + 1) % roster.length];
    setYou(a);
    setFoe(b);
    setRoundIdx(0);
    setWins(0);
    setLosses(0);
    setUsedBoost(false);
    setArmedShield(false);
    setShieldSpent(false);
    setLog([]);
    setFlash(null);
    setRoundStat(pickStatKey());
  }, [roster]);

  useEffect(() => {
    start();
  }, [roster.length, start]);

  const runRound = (useBoost: boolean) => {
    if (!you || !foe) return;
    const roundNumber = roundIdx + 1;
    let yourScore = you.stats?.[roundStat] ?? 0;
    const foeScore = foe.stats?.[roundStat] ?? 0;
    if (useBoost && !usedBoost) {
      yourScore += 10;
      setUsedBoost(true);
    }

    let outcome: 'win' | 'lose' | 'draw' = yourScore === foeScore ? 'draw' : yourScore > foeScore ? 'win' : 'lose';

    if (outcome === 'lose' && armedShield && !shieldSpent) {
      outcome = 'draw';
      setShieldSpent(true);
    }

    setLog((entries) => [
      ...entries,
      `Round ${roundNumber} • ${roundStat.toUpperCase()} • ${yourScore}-${foeScore} → ${outcome}`,
    ]);

    if (outcome === 'win') {
      setWins((w) => w + 1);
      setFlash('win');
    } else if (outcome === 'lose') {
      setLosses((l) => l + 1);
      setFlash('lose');
    }

    setTimeout(() => setFlash(null), 360);

    if (roundIdx < 2) {
      setRoundIdx(roundIdx + 1);
      setRoundStat(pickStatKey());
    }
  };

  const matchOver = roundIdx >= 2;
  const result = matchOver ? (wins === losses ? 'draw' : wins > losses ? 'win' : 'lose') : null;

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/40 p-6 text-white shadow-[0_25px_120px_rgba(124,58,237,0.25)] backdrop-blur">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Crystal Vault Circuit</p>
          <h1 className="mt-2 text-3xl font-extrabold font-display md:text-4xl">Vaulted Stat Clashes</h1>
          <p className="mt-2 text-sm text-white/70 md:text-base">
            {roundIdx + 1} / 3 rounds • Highest {roundStat.toUpperCase()} takes the point. Charm Surge adds +10 to your current stat.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div
            className={`rounded-2xl border border-white/10 bg-white/10 p-5 transition ${flash === 'win' ? 'ring-2 ring-emerald-400/70' : ''}`}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-white/50">You</div>
            <div className="mt-2 text-2xl font-semibold font-display">{you?.name ?? '—'}</div>
            <div className="text-sm text-white/60">{you?.title}</div>
            <div className="mt-3 text-sm text-white/70">
              {roundStat.toUpperCase()}: <span className="font-semibold text-white">{you?.stats?.[roundStat] ?? 0}</span>
              {!usedBoost && ' • Charm Surge ready'}
            </div>
          </div>
          <div
            className={`rounded-2xl border border-white/10 bg-white/10 p-5 transition ${flash === 'lose' ? 'ring-2 ring-rose-400/70' : ''}`}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-white/50">Opponent</div>
            <div className="mt-2 text-2xl font-semibold font-display">{foe?.name ?? '—'}</div>
            <div className="text-sm text-white/60">{foe?.title}</div>
            <div className="mt-3 text-sm text-white/70">
              {roundStat.toUpperCase()}: <span className="font-semibold text-white">{foe?.stats?.[roundStat] ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {!matchOver && (
            <>
              <button
                onClick={() => runRound(false)}
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Clash
              </button>
              <button
                onClick={() => runRound(true)}
                disabled={usedBoost}
                className="rounded-xl border border-amber-300/40 bg-amber-400/20 px-6 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Charm Surge {usedBoost ? 'used' : '+10'}
              </button>
              <button
                onClick={() => setArmedShield((armed) => !armed)}
                disabled={shieldSpent}
                className={`rounded-xl border border-cyan-300/40 px-6 py-3 text-sm font-semibold transition ${
                  armedShield && !shieldSpent ? 'bg-cyan-400/40 text-white' : 'bg-cyan-400/15 text-cyan-100'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Tempo Guard {shieldSpent ? 'spent' : armedShield ? 'armed' : 'arm'}
              </button>
            </>
          )}
          {matchOver && (
            <button
              onClick={start}
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Run it back
            </button>
          )}
          <Link
            href="/play"
            className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white/70 transition hover:text-white hover:bg-white/5"
          >
            Game Hub
          </Link>
        </div>

        <div className="text-center text-sm text-white/70">
          Score {wins} - {losses}
          {matchOver && result && (
            <>
              {' • '}
              {result === 'win' ? 'Victory secured.' : result === 'lose' ? 'Opponent holds the vault.' : 'Vault remains contested.'}
            </>
          )}
        </div>

        {log.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-white/50">Match Log</div>
            <ul className="mt-3 space-y-2 text-xs text-white/70">
              {log.map((line, idx) => (
                <li key={`${line}-${idx}`} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
