'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { CharacterLore } from '@/data/characterLore';
import { loreBySlug } from '@/data/characterLore';

type Fighter = CharacterLore;
type StatKey = keyof CharacterLore['stats'];
type Phase = 'await-spin' | 'spinning' | 'ready' | 'complete';

type RoundHistory = {
  round: number;
  outcome: 'win' | 'lose' | 'draw';
};

const STAT_KEYS: StatKey[] = ['rhythm', 'style', 'power', 'flow', 'teamwork'];
const ROSTER_SLUGS = ['crystal-kingdom', 'ember-heights', 'shadow-stage', 'neon-city', 'lunar-lux', 'prism-pulse'];
const TOTAL_ROUNDS = 5;

const pickStatKey = (exclude?: StatKey) => {
  const pool = exclude ? STAT_KEYS.filter((key) => key !== exclude) : STAT_KEYS;
  const choices = pool.length > 0 ? pool : STAT_KEYS;
  return choices[Math.floor(Math.random() * choices.length)];
};

const formatStatLabel = (key: StatKey) =>
  key
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');

const clampScore = (value: number) => Math.max(0, Math.round(value));

const hexToRgba = (hex: string | undefined, alpha: number) => {
  if (!hex) return `rgba(148, 163, 210, ${alpha})`;
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(148, 163, 210, ${alpha})`;
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type FighterCardProps = {
  fighter: Fighter | null;
  role: 'you' | 'foe';
  highlight: 'win' | 'lose' | 'draw' | null;
  phase: Phase;
  statKey: StatKey | null;
  spinPreview: StatKey;
};

function FighterCard({ fighter, role, highlight, phase, statKey, spinPreview }: FighterCardProps) {
  const accent = fighter?.color ?? (role === 'you' ? '#38bdf8' : '#f472b6');
  const art =
    fighter?.artRefs?.card ||
    fighter?.artRefs?.portrait ||
    fighter?.artRefs?.square ||
    fighter?.artRefs?.thumbnail ||
    fighter?.artRefs?.banner ||
    null;

  const badgeLabel = role === 'you' ? 'Your Squad' : 'Rival Crew';
  const badgeColor =
    role === 'you'
      ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40'
      : 'bg-rose-400/20 text-rose-200 border border-rose-400/40';
  const ringClass =
    highlight === 'win'
      ? 'ring-2 ring-emerald-400/80'
      : highlight === 'lose'
        ? 'ring-2 ring-rose-400/80'
        : highlight === 'draw'
          ? 'ring-2 ring-sky-300/70'
          : 'ring-1 ring-white/10';

  const statLabel = phase === 'ready' && statKey ? formatStatLabel(statKey) : 'Wheel Preview';
  const statValue =
    fighter && (phase === 'ready' && statKey ? clampScore(fighter.stats?.[statKey] ?? 0) : clampScore(fighter.stats?.[spinPreview] ?? 0));

  const backdropStyle: CSSProperties = {
    backgroundImage: art
      ? `linear-gradient(155deg, rgba(11,17,33,0.92), rgba(7,11,26,0.72)), url(${art})`
      : `linear-gradient(155deg, rgba(11,17,33,0.92), ${hexToRgba(accent, 0.45)})`,
    backgroundSize: art ? 'cover' : 'auto',
    backgroundPosition: 'center',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-white backdrop-blur-xl transition ${ringClass}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-95" style={backdropStyle} />

      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${badgeColor}`}>{badgeLabel}</span>
          <span className="text-xs uppercase tracking-[0.28em] text-white/60">{formatStatLabel(spinPreview)}</span>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-white/45">{fighter?.realm ?? 'Awaiting opponent'}</div>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-tight">{fighter?.name ?? 'Searching...'}</h2>
          <p className="mt-2 text-sm text-white/70">{fighter?.title ?? '---'}</p>
        </div>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="text-xs uppercase tracking-[0.24em] text-white/60">{statLabel}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold">{statValue}</span>
            <span className="text-xs uppercase tracking-[0.22em] text-white/60">Base Stat</span>
          </div>
          {phase !== 'ready' && <p className="mt-2 text-xs text-white/60">Spin to lock the clash stat for this round.</p>}
        </div>
      </div>
    </div>
  );
}

export default function BattlePage() {
  const [you, setYou] = useState<Fighter | null>(null);
  const [foe, setFoe] = useState<Fighter | null>(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('await-spin');
  const [currentStat, setCurrentStat] = useState<StatKey | null>(null);
  const [spinPreview, setSpinPreview] = useState<StatKey>('rhythm');
  const [lockedPreview, setLockedPreview] = useState<StatKey | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const [flash, setFlash] = useState<'win' | 'lose' | 'draw' | null>(null);

  const [overdriveReady, setOverdriveReady] = useState(true);
  const [mirageReady, setMirageReady] = useState(true);
  const [mirageArmed, setMirageArmed] = useState(false);
  const [scoutReady, setScoutReady] = useState(true);

  const spinnerRef = useRef<number | null>(null);

  const roster = useMemo(() => {
    return ROSTER_SLUGS.map((slug) => loreBySlug[slug]).filter((entry): entry is Fighter => Boolean(entry));
  }, []);

  const roll = useCallback(() => Math.floor(Math.random() * roster.length), [roster.length]);

  const startMatch = useCallback(() => {
    if (roster.length < 2) return;
    const a = roster[roll()];
    let b = roster[roll()];
    if (b.slug === a.slug) b = roster[(roll() + 1) % roster.length];
    setYou(a);
    setFoe(b);
    setRoundIdx(0);
    setPhase('await-spin');
    setCurrentStat(null);
    setSpinPreview(pickStatKey());
    setLockedPreview(null);
    setLog([]);
    setHistory([]);
    setWins(0);
    setLosses(0);
    setDraws(0);
    setFlash(null);
    setOverdriveReady(true);
    setMirageReady(true);
    setMirageArmed(false);
    setScoutReady(true);
  }, [roll, roster]);

  useEffect(() => {
    startMatch();
  }, [startMatch]);

  useEffect(
    () => () => {
      if (spinnerRef.current != null) window.clearInterval(spinnerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!flash) return;
    const timeout = window.setTimeout(() => setFlash(null), 560);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  const spinStat = useCallback(() => {
    if (phase !== 'await-spin') return;
    setPhase('spinning');
    setFlash(null);

    const finalStat = lockedPreview ?? pickStatKey(currentStat ?? undefined);
    const spinDuration = lockedPreview ? 700 : 2000;
    const tickInterval = 110;
    let elapsed = 0;

    if (spinnerRef.current != null) {
      window.clearInterval(spinnerRef.current);
      spinnerRef.current = null;
    }

    spinnerRef.current = window.setInterval(() => {
      elapsed += tickInterval;
      if (!lockedPreview) {
        setSpinPreview((prev) => pickStatKey(prev));
      } else {
        setSpinPreview(finalStat);
      }

      if (elapsed >= spinDuration) {
        if (spinnerRef.current != null) {
          window.clearInterval(spinnerRef.current);
          spinnerRef.current = null;
        }
        setCurrentStat(finalStat);
        setSpinPreview(finalStat);
        setPhase('ready');
        setLockedPreview(null);
        const roundNumber = roundIdx + 1;
        setLog((entries) => [...entries, `🎛️ Round ${roundNumber}: Remix wheel locked ${formatStatLabel(finalStat)}.`]);
      }
    }, tickInterval);
  }, [phase, lockedPreview, currentStat, roundIdx]);

  const runRound = useCallback(
    (mode: 'standard' | 'overdrive') => {
      if (phase !== 'ready' || !you || !foe || !currentStat) return;

      const roundNumber = roundIdx + 1;
      const baseYou = you.stats?.[currentStat] ?? 0;
      const baseFoe = foe.stats?.[currentStat] ?? 0;
      const momentum = wins - losses;

      const swingYou = Math.floor(Math.random() * 9) - 3 + Math.max(0, momentum * 2);
      const swingFoe = Math.floor(Math.random() * 9) - 3 + Math.max(0, -momentum * 2);

      let yourScore = baseYou + swingYou;
      const foeScore = baseFoe + swingFoe;

      const notes: string[] = [];

      if (mode === 'overdrive') {
        if (!overdriveReady) return;
        yourScore += 15;
        notes.push('⚡ Overdrive unleashed (+15)');
        setOverdriveReady(false);
      }

      yourScore = clampScore(yourScore);
      const rivalScore = clampScore(foeScore);

      let outcome: 'win' | 'lose' | 'draw';
      if (yourScore === rivalScore) outcome = 'draw';
      else outcome = yourScore > rivalScore ? 'win' : 'lose';

      if (outcome === 'lose' && mirageArmed && mirageReady) {
        setMirageArmed(false);
        setMirageReady(false);
        setPhase('await-spin');
        setCurrentStat(null);
        setSpinPreview(pickStatKey(currentStat));
        setLog((entries) => [
          ...entries,
          `🛡️ Round ${roundNumber}: Mirage Veil phased the loss. Spin again with fresh momentum.`,
        ]);
        return;
      }

      setHistory((entries) => [...entries, { round: roundNumber, outcome }]);

      if (outcome === 'win') {
        setWins((value) => value + 1);
        setFlash('win');
      } else if (outcome === 'lose') {
        setLosses((value) => value + 1);
        setFlash('lose');
      } else {
        setDraws((value) => value + 1);
        setFlash('draw');
      }

      setLog((entries) => [
        ...entries,
        `🎤 Round ${roundNumber}: ${formatStatLabel(currentStat)} • ${yourScore}-${rivalScore} → ${outcome.toUpperCase()}${
          notes.length ? ` (${notes.join(', ')})` : ''
        }`,
      ]);

      setRoundIdx(roundNumber);

      if (roundNumber >= TOTAL_ROUNDS) {
        setPhase('complete');
        setCurrentStat(null);
      } else {
        setPhase('await-spin');
        setCurrentStat(null);
        setSpinPreview(pickStatKey(currentStat));
      }
    },
    [currentStat, foe, mirageArmed, mirageReady, overdriveReady, phase, roundIdx, wins, losses, you],
  );

  const activateScout = useCallback(() => {
    if (!scoutReady || phase !== 'await-spin') return;
    const preview = pickStatKey(spinPreview);
    setLockedPreview(preview);
    setSpinPreview(preview);
    setScoutReady(false);
    setLog((entries) => [...entries, `🛰️ Scout drone locked ${formatStatLabel(preview)} for the upcoming spin.`]);
  }, [phase, scoutReady, spinPreview]);

  const toggleMirage = useCallback(() => {
    if (!mirageReady || phase === 'spinning') return;
    setMirageArmed((armed) => !armed);
  }, [mirageReady, phase]);

  const result = useMemo(() => {
    if (phase !== 'complete') return null;
    if (wins === losses) return 'draw';
    return wins > losses ? 'win' : 'lose';
  }, [phase, wins, losses]);

  const stageDescription = useMemo(() => {
    if (phase === 'await-spin') return 'Deploy the remix wheel to select the next clash stat.';
    if (phase === 'spinning') return 'Wheel accelerating... hold for the downbeat.';
    if (phase === 'ready' && currentStat) return `Lock in your move or fire Overdrive. ${formatStatLabel(currentStat)} decides this round.`;
    if (phase === 'complete') {
      if (result === 'win') return 'Crew supremacy secured. Bask in the afterglow or run it back.';
      if (result === 'lose') return 'Rival crew holds the stage. Rally the squad and try again.';
      return 'Match unresolved. The vault stays contested.';
    }
    return 'Spin the wheel and clash.';
  }, [phase, currentStat, result]);

  const auraStyle = useMemo(
    () => ({
      backgroundImage: `
        radial-gradient(120% 90% at 5% 5%, ${hexToRgba(you?.color, 0.28)} 0%, rgba(8,11,24,0.7) 60%),
        radial-gradient(120% 100% at 95% 8%, ${hexToRgba(foe?.color, 0.3)} 0%, rgba(8,11,24,0.6) 62%),
        linear-gradient(135deg, rgba(4,9,20,0.95), rgba(25,12,56,0.9))`,
    }),
    [you?.color, foe?.color],
  );

  const canSpin = phase === 'await-spin';
  const canDuel = phase === 'ready';

  return (
    <div className="min-h-screen py-14 px-4" style={auraStyle}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 rounded-[32px] border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_40px_140px_rgba(56,189,248,0.18)] backdrop-blur-2xl md:p-10">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">Rift League Gauntlet</p>
          <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">Stat Battle: Harmonic Rift</h1>
          <p className="mt-3 text-sm text-white/70 md:text-base">{stageDescription}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
            Round {Math.min(roundIdx + 1, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}
          </p>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr),minmax(0,280px),minmax(0,1fr)]">
          <FighterCard
            fighter={you}
            role="you"
            highlight={flash === 'win' ? 'win' : flash === 'lose' ? 'lose' : flash === 'draw' ? 'draw' : null}
            phase={phase}
            statKey={currentStat}
            spinPreview={spinPreview}
          />

          <div className="flex flex-col gap-5 rounded-3xl border border-white/12 bg-slate-950/60 p-5 backdrop-blur-xl">
            <div className="text-center">
              <div className="text-xs uppercase tracking-[0.34em] text-white/50">Scoreline</div>
              <div className="mt-2 font-display text-3xl font-semibold">
                {wins} <span className="text-white/40">-</span> {losses}
              </div>
              <p className="text-xs text-white/50">Draws: {draws}</p>
            </div>

            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: TOTAL_ROUNDS }).map((_, idx) => {
                const entry = history[idx];
                const base = 'flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition';
                let tone = 'bg-white/5 text-white/50 border border-white/10';
                if (entry?.outcome === 'win') tone = 'bg-emerald-400/90 text-emerald-950';
                if (entry?.outcome === 'lose') tone = 'bg-rose-400/90 text-rose-950';
                if (entry?.outcome === 'draw') tone = 'bg-sky-300/80 text-sky-950';
                return (
                  <span key={idx} className={`${base} ${tone}`}>
                    {entry ? entry.round : idx + 1}
                  </span>
                );
              })}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={spinStat}
                disabled={!canSpin}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-400/20 transition hover:-translate-y-0.5 hover:shadow-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {phase === 'spinning'
                  ? 'Spinning...'
                  : !canSpin
                    ? 'Spin locked'
                    : lockedPreview
                      ? `Launch locked ${formatStatLabel(lockedPreview)}`
                      : 'Spin Stat Wheel'}
              </button>
              <button
                type="button"
                onClick={() => runRound('standard')}
                disabled={!canDuel}
                className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clash Now
              </button>
              <button
                type="button"
                onClick={() => runRound('overdrive')}
                disabled={!canDuel || !overdriveReady}
                className="w-full rounded-2xl border border-amber-200/30 bg-amber-400/20 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-400/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Overdrive {overdriveReady ? '+15' : 'depleted'}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={toggleMirage}
                disabled={!mirageReady}
                className={`rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] transition ${
                  mirageArmed ? 'border-cyan-300/50 bg-cyan-400/20 text-cyan-50' : 'border-cyan-200/20 bg-cyan-400/10 text-cyan-100'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Mirage Veil {mirageReady ? (mirageArmed ? 'armed' : 'ready') : 'spent'}
              </button>
              <button
                type="button"
                onClick={activateScout}
                disabled={!scoutReady || !canSpin}
                className="rounded-2xl border border-violet-300/30 bg-violet-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-violet-100 transition hover:border-violet-200/60 hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stat Scout {scoutReady ? 'lock' : 'used'}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/65">
              <p>
                Momentum: {wins - losses >= 0 ? '+' : ''}
                {wins - losses}. Overdrive adds +15 once. Mirage converts the next loss into a re-spin if armed. Scout locks the upcoming stat.
              </p>
            </div>
          </div>

          <FighterCard
            fighter={foe}
            role="foe"
            highlight={flash === 'win' ? 'lose' : flash === 'lose' ? 'win' : flash === 'draw' ? 'draw' : null}
            phase={phase}
            statKey={currentStat}
            spinPreview={spinPreview}
          />
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs uppercase tracking-[0.32em] text-white/60">Battle Feed</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={startMatch}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:border-white/30 hover:bg-white/20"
              >
                Reset Match
              </button>
              <Link
                href="/play"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:border-white/30 hover:bg-white/10"
              >
                Game Hub
              </Link>
            </div>
          </div>

          {log.length === 0 ? (
            <p className="mt-4 text-sm text-white/50">Spin to start the feed. Every round log drops here with ability callouts.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm text-white/80">
              {log
                .slice()
                .reverse()
                .map((entry, index) => (
                  <li key={`${entry}-${index}`} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                    {entry}
                  </li>
                ))}
            </ul>
          )}
        </section>

        {phase === 'complete' && (
          <section className="rounded-3xl border border-white/10 bg-emerald-400/10 p-6 text-center backdrop-blur-xl">
            <h2 className="font-display text-2xl font-semibold">
              {result === 'win' ? 'Crew Ascendant!' : result === 'lose' ? 'Rival Ascendant' : 'Stalemate Vibes'}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {result === 'win'
                ? 'Your squad claimed the harmonic vault. Queue up another gauntlet or explore other modes.'
                : result === 'lose'
                  ? 'The rival crew held the beat. Reset the match and reclaim the rift.'
                  : 'Neither side broke the equilibrium. Rally the crew and spark the next battle.'}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
