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
    <div className="min-h-screen bg-gradient-to-b from-white via-rose-50/70 to-indigo-50/60 py-12 px-4">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-slate-200/80 bg-white/85 p-6 text-slate-900 shadow-[0_25px_120px_rgba(244,114,182,0.28)] backdrop-blur">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Crystal Vault Circuit</p>
          <h1 className="mt-2 text-3xl font-extrabold font-display text-slate-900 md:text-4xl">Vaulted Stat Clashes</h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">
            {roundIdx + 1} / 3 rounds • Highest {roundStat.toUpperCase()} takes the point. Charm Surge adds +10 to your current stat.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div
            className={`rounded-2xl border border-slate-200 bg-white/80 p-5 transition ${flash === 'win' ? 'ring-2 ring-emerald-300/70' : ''}`}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">You</div>
            <div className="mt-2 text-2xl font-semibold font-display text-slate-900">{you?.name ?? '—'}</div>
            <div className="text-sm text-slate-500">{you?.title}</div>
            <div className="mt-3 text-sm text-slate-600">
              {roundStat.toUpperCase()}: <span className="font-semibold text-slate-900">{you?.stats?.[roundStat] ?? 0}</span>
              {!usedBoost && ' • Charm Surge ready'}
            </div>
          </div>
          <div
            className={`rounded-2xl border border-slate-200 bg-white/80 p-5 transition ${flash === 'lose' ? 'ring-2 ring-rose-300/70' : ''}`}
          >
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Opponent</div>
            <div className="mt-2 text-2xl font-semibold font-display text-slate-900">{foe?.name ?? '—'}</div>
            <div className="text-sm text-slate-500">{foe?.title}</div>
            <div className="mt-3 text-sm text-slate-600">
              {roundStat.toUpperCase()}: <span className="font-semibold text-slate-900">{foe?.stats?.[roundStat] ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {!matchOver && (
            <>
              <button
                onClick={() => runRound(false)}
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Clash
              </button>
              <button
                onClick={() => runRound(true)}
                disabled={usedBoost}
                className="rounded-xl border border-amber-200/70 bg-amber-100/70 px-6 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-200/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Charm Surge {usedBoost ? 'used' : '+10'}
              </button>
              <button
                onClick={() => setArmedShield((armed) => !armed)}
                disabled={shieldSpent}
                className={`rounded-xl border border-cyan-200/70 px-6 py-3 text-sm font-semibold transition ${
                  armedShield && !shieldSpent ? 'bg-cyan-200/70 text-cyan-900' : 'bg-cyan-100/70 text-cyan-700'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                Tempo Guard {shieldSpent ? 'spent' : armedShield ? 'armed' : 'arm'}
              </button>
            </>
          )}
          {matchOver && (
            <button
              onClick={start}
              className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white/70 hover:text-slate-900"
            >
              Run it back
            </button>
          )}
          <Link
            href="/play"
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white/70 hover:text-slate-900"
          >
            Game Hub
          </Link>
        </div>

        <div className="text-center text-sm text-slate-600">
          Score {wins} - {losses}
          {matchOver && result && (
            <>
              {' • '}
              {result === 'win' ? 'Victory secured.' : result === 'lose' ? 'Opponent holds the vault.' : 'Vault remains contested.'}
            </>
          )}
        </div>

        {log.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Match Log</div>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              {log.map((line, idx) => (
                <li key={`${line}-${idx}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
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
