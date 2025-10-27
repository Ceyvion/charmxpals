'use client';

import Link from 'next/link';
import type { CharacterLore } from '@/data/characterLore';
import { loreBySlug, worldTagline } from '@/data/characterLore';

type StatKey = keyof CharacterLore['stats'];

type GameConfig = {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  intro: string;
  cta: string;
  roster: string[];
  focus: Array<{ key: StatKey; blurb: string }>;
};

const statLabels: Record<StatKey, string> = {
  rhythm: 'Rhythm',
  style: 'Style',
  power: 'Power',
  flow: 'Flow',
  teamwork: 'Teamwork',
};

const gameConfigs: GameConfig[] = [
  {
    id: 'plaza',
    title: 'Signal Plaza (Preview)',
    slug: '/plaza',
    tagline: 'Nightly link-up inside the Skylink Atrium.',
    intro:
      'DJ Prismix keeps a shard between realms stable so crews can sync strats, swap charm loadouts, and show off new footwork without the Break listening in.',
    cta: 'Drop in',
    roster: ['prism-pulse', 'lunar-lux', 'solar-spire'],
    focus: [
      { key: 'teamwork', blurb: 'Boost call-and-response emotes and crew shoutouts.' },
      { key: 'style', blurb: 'High style streaks unlock spotlight loops at the DJ pod.' },
    ],
  },
  {
    id: 'runner',
    title: 'Skylink Pulsegrid',
    slug: '/play/runner',
    tagline: 'Sync taps across the Skylink beat rail before the Break fractures the mix.',
    intro:
      'DJ Prismix spun a four-lane pulsegrid through the transit spine. Ride imported K-pop beat tapes, chain perfect strikes, and let Vexa Volt bend the tempo when the Break surges.',
    cta: 'Queue the mix',
    roster: ['neon-city', 'rhythm-reef', 'shadow-stage'],
    focus: [
      { key: 'rhythm', blurb: 'High rhythm tightens the perfect window during each beat impact.' },
      { key: 'flow', blurb: 'Flow steadies note travel when Prismix spikes the mix speed mid-track.' },
    ],
  },
  {
    id: 'battle',
    title: 'Vaulted Stat Clashes',
    slug: '/play/battle',
    tagline: 'Quick-turn showdowns staged in the Crystal Vault.',
    intro:
      'Seraphine Gliss referees head-to-head stat gambits. Anchor your strongest charm, bluff your cooldowns, and let Raze Ember handle the counterstrikes.',
    cta: 'Queue a clash',
    roster: ['crystal-kingdom', 'ember-heights', 'shadow-stage'],
    focus: [
      { key: 'power', blurb: 'Explosive power swings decide the final round in sudden-death.' },
      { key: 'rhythm', blurb: 'Rhythm parries tempo spikes and turns them into combo fuel.' },
    ],
  },
  {
    id: 'time-trial',
    title: 'Realm Relay Trials',
    slug: '/play/time-trial',
    tagline: 'Timed runs weaving Wildbeat Jungle, Rhythm Reef, and Solar Spire.',
    intro:
      'Kai Tidal, Tarin Pulse, and Helio Trace rotate realm chores—chase sonic blooms, rebuild beat bridges, and hand off charms before the timer stutters.',
    cta: 'Start a relay',
    roster: ['rhythm-reef', 'wildbeat-jungle', 'solar-spire'],
    focus: [
      { key: 'teamwork', blurb: 'Clean hand-offs unlock shortcut portals between legs.' },
      { key: 'flow', blurb: 'Flow keeps momentum when terrain flips mid-route.' },
    ],
  },
];

type FocusStat = {
  key: StatKey;
  label: string;
  blurb: string;
  bestValue: number | null;
  bestName: string | null;
};

type PresentedGame = GameConfig & {
  champions: CharacterLore[];
  focusStats: FocusStat[];
  accentColor: string;
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(148, 163, 184, ${alpha})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildGame = (config: GameConfig): PresentedGame => {
  const champions = config.roster
    .map((slug) => loreBySlug[slug])
    .filter((entry): entry is CharacterLore => Boolean(entry));

  const accentColor = champions[0]?.color ?? '#7c3aed';

  const focusStats: FocusStat[] = config.focus.map((focus) => {
    const best = champions.reduce<{ value: number; name: string } | null>((acc, champ) => {
      const value = champ.stats?.[focus.key];
      if (typeof value !== 'number') return acc;
      if (!acc || value > acc.value) return { value, name: champ.name };
      return acc;
    }, null);

    return {
      key: focus.key,
      label: statLabels[focus.key],
      blurb: focus.blurb,
      bestValue: best?.value ?? null,
      bestName: best?.name ?? null,
    };
  });

  return {
    ...config,
    champions,
    focusStats,
    accentColor,
  };
};

const presentedGames = gameConfigs.map(buildGame);

export default function GameHub() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-rose-50/70 to-sky-50 py-16 px-4 text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,203,230,0.45),_transparent_55%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(165,243,252,0.38),_transparent_52%)]" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12">
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-500">Playgrounds</p>
          <h1 className="mt-3 text-4xl font-bold font-display text-slate-900 md:text-5xl">Pick Tonight&apos;s Stage</h1>
          <p className="mt-4 text-lg text-slate-600 md:text-xl">
            {worldTagline} Choose a mode curated by the crew and lean into the strengths your collectible already carries.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {presentedGames.map((game) => {
            const cardBg = `linear-gradient(140deg, ${hexToRgba(game.accentColor, 0.18)}, rgba(255,255,255,0.92))`;
            const borderColor = hexToRgba(game.accentColor, 0.32);
            return (
              <div
                key={game.id}
                className="relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white/80 p-8 shadow-[0_25px_90px_rgba(15,23,42,0.08)] backdrop-blur"
                style={{ borderColor, background: cardBg }}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold font-display text-slate-900">{game.title}</h2>
                      <p className="mt-1 text-sm text-slate-600">{game.tagline}</p>
                    </div>
                    <div className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.3em] text-slate-500">
                      Mode
                    </div>
                  </div>

                  <p className="text-base text-slate-700">{game.intro}</p>

                  {game.focusStats.length > 0 && (
                    <div className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-[0_12px_40px_rgba(148,163,184,0.18)]">
                      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Focus Stats</div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {game.focusStats.map((focus) => (
                          <div key={focus.key}>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900">{focus.label}</span>
                              {typeof focus.bestValue === 'number' && (
                                <span className="text-xs text-slate-500">
                                  {focus.bestValue} • {focus.bestName}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{focus.blurb}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {game.champions.length > 0 && (
                    <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Crew On Call</div>
                      <ul className="mt-3 space-y-3">
                        {game.champions.map((champion) => (
                          <li key={champion.slug} className="flex flex-col">
                            <span className="font-semibold text-slate-900">{champion.name}</span>
                            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{champion.realm}</span>
                            <p className="mt-1 text-sm text-slate-600">{champion.tagline}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between gap-3">
                  <Link
                    href={game.slug}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(15,23,42,0.25)] transition hover:bg-slate-800"
                  >
                    {game.cta}
                  </Link>
                  <Link href="/explore" className="text-sm font-semibold text-slate-600 transition hover:text-slate-900">
                    Browse characters
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
