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
  status: 'live' | 'preview' | 'poc';
  genre: string;
  icon: string;
  accentVar: string;
  layout: 'hero' | 'horizontal' | 'standard';
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
    title: 'Signal Plaza',
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
    status: 'preview',
    genre: 'Social MMO',
    icon: '\u{1F4E1}',
    accentVar: '--cp-yellow',
    layout: 'hero',
  },
  {
    id: 'arena',
    title: 'Rift Arena',
    slug: '/arena',
    tagline: 'Real-time 2D battles inside the Harmonic Rift.',
    intro:
      'Lock in your avatar and drop into a live arena where pulse bursts, movement timing, and positioning decide every clash.',
    cta: 'Queue arena',
    roster: ['ember-heights', 'shadow-stage', 'prism-pulse'],
    focus: [
      { key: 'power', blurb: 'Power decides pulse-burst damage and finishing pressure.' },
      { key: 'flow', blurb: 'Flow keeps movement smooth while dodging and re-engaging.' },
    ],
    status: 'poc',
    genre: '2D Fighter',
    icon: '\u{2694}\u{FE0F}',
    accentVar: '--cp-red',
    layout: 'horizontal',
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
    status: 'live',
    genre: 'Rhythm Runner',
    icon: '\u{1F3B5}',
    accentVar: '--cp-cyan',
    layout: 'standard',
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
    status: 'live',
    genre: 'Turn-Based',
    icon: '\u{1F3B2}',
    accentVar: '--cp-violet',
    layout: 'standard',
  },
  {
    id: 'time-trial',
    title: 'Realm Relay Trials',
    slug: '/play/time-trial',
    tagline: 'Timed runs weaving Wildbeat Jungle, Rhythm Reef, and Solar Spire.',
    intro:
      'Kai Tidal, Tarin Pulse, and Helio Trace rotate realm chores\u2014chase sonic blooms, rebuild beat bridges, and hand off charms before the timer stutters.',
    cta: 'Start a relay',
    roster: ['rhythm-reef', 'wildbeat-jungle', 'solar-spire'],
    focus: [
      { key: 'teamwork', blurb: 'Clean hand-offs unlock shortcut portals between legs.' },
      { key: 'flow', blurb: 'Flow keeps momentum when terrain flips mid-route.' },
    ],
    status: 'preview',
    genre: 'Timed Relay',
    icon: '\u{1F3C3}',
    accentVar: '--cp-green',
    layout: 'horizontal',
  },
];

const accentHexByVar: Record<string, string> = {
  '--cp-red': '#FF3B30',
  '--cp-yellow': '#FFD60A',
  '--cp-green': '#30D158',
  '--cp-violet': '#AF52DE',
  '--cp-cyan': '#00D4AA',
};

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

/* ── Status badge ── */

const statusStyles: Record<GameConfig['status'], { label: string; dot: string }> = {
  live: { label: 'Live', dot: 'var(--cp-green)' },
  preview: { label: 'Preview', dot: 'var(--cp-yellow)' },
  poc: { label: 'POC', dot: 'var(--cp-red)' },
};

function StatusBadge({ status }: { status: GameConfig['status'] }) {
  const s = statusStyles[status];
  return (
    <span className="cp-chip flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

/* ── Card renderers ── */

function HeroCard({ game }: { game: PresentedGame }) {
  const accent = accentHexByVar[game.accentVar] ?? game.accentColor;
  return (
    <div className="bento-card md:col-span-2 lg:col-span-2 flex flex-col overflow-hidden">
      {/* Accent top bar */}
      <div className="h-1 rounded-t-[var(--cp-radius-lg)]" style={{ background: `var(${game.accentVar})` }} />

      {/* Ambient glow strip */}
      <div
        className="pointer-events-none h-24 w-full"
        style={{
          background: `linear-gradient(180deg, ${hexToRgba(accent, 0.08)} 0%, transparent 100%)`,
        }}
      />

      <div className="-mt-24 flex flex-col gap-6 p-8 md:p-10">
        <div className="flex items-center gap-3">
          <div className="bento-icon text-2xl">{game.icon}</div>
          <span className="cp-kicker">{game.genre}</span>
          <span className="ml-auto"><StatusBadge status={game.status} /></span>
        </div>

        <div>
          <h2 className="font-display font-black text-4xl md:text-5xl" style={{ color: 'var(--cp-text-primary)' }}>
            {game.title}
          </h2>
          <p className="mt-2 text-lg" style={{ color: 'var(--cp-text-secondary)' }}>{game.tagline}</p>
        </div>

        <p className="max-w-xl" style={{ color: 'var(--cp-text-secondary)' }}>{game.intro}</p>

        {/* Focus stats + crew row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          {game.focusStats.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {game.focusStats.map((stat) => (
                <span className="cp-pill" key={stat.key}>
                  {stat.label}{typeof stat.bestValue === 'number' ? ` ${stat.bestValue}` : ''}
                </span>
              ))}
            </div>
          )}

          {game.champions.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="cp-kicker">Crew</span>
              {game.champions.map((champ) => (
                <div key={champ.slug} className="flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: champ.color, boxShadow: `0 0 6px ${hexToRgba(champ.color, 0.4)}` }}
                  />
                  <span className="text-sm font-semibold" style={{ color: 'var(--cp-text-secondary)' }}>{champ.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
          <Link href={game.slug} className="cp-cta-primary">{game.cta}</Link>
          <Link href="/explore" className="cp-cta-ghost">Browse Characters</Link>
        </div>
      </div>
    </div>
  );
}

function HorizontalCard({ game }: { game: PresentedGame }) {
  const modeAccentHex = accentHexByVar[game.accentVar] ?? game.accentColor;
  return (
    <div className="bento-card md:col-span-2 lg:col-span-1 flex flex-col sm:flex-row overflow-hidden">
      <div
        className="flex shrink-0 items-center justify-center p-6 text-4xl sm:w-28 sm:p-0"
        style={{ background: hexToRgba(modeAccentHex, 0.1) }}
      >
        {game.icon}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6 md:p-8">
        <div className="flex items-center gap-2">
          <span className="cp-kicker">{game.genre}</span>
          <StatusBadge status={game.status} />
        </div>

        <h2 className="font-display font-black text-2xl" style={{ color: 'var(--cp-text-primary)' }}>
          {game.title}
        </h2>
        <p className="text-sm" style={{ color: 'var(--cp-text-secondary)' }}>{game.tagline}</p>

        {game.focusStats.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {game.focusStats.map((stat) => (
              <span className="cp-chip" key={stat.key}>{stat.label}</span>
            ))}
          </div>
        )}

        {game.champions.length > 0 && (
          <div className="flex items-center gap-2">
            {game.champions.map((champ) => (
              <div
                key={champ.slug}
                className="h-6 w-6 rounded-[var(--cp-radius-sm)]"
                style={{ background: champ.color, border: '2px solid var(--cp-border)' }}
                title={champ.name}
              />
            ))}
            <span className="ml-1 text-xs" style={{ color: 'var(--cp-text-muted)' }}>
              {game.champions.length} on call
            </span>
          </div>
        )}

        <Link href={game.slug} className="cp-cta-primary mt-auto self-start">{game.cta}</Link>
      </div>
    </div>
  );
}

function StandardCard({ game }: { game: PresentedGame }) {
  return (
    <div
      className="bento-card md:col-span-1 flex flex-col"
      style={{ borderLeftWidth: '4px', borderLeftColor: `var(${game.accentVar})` }}
    >
      <div className="flex flex-col gap-4 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{game.icon}</span>
            <span className="cp-kicker">{game.genre}</span>
          </div>
          <StatusBadge status={game.status} />
        </div>

        <h2 className="font-display font-black text-2xl" style={{ color: 'var(--cp-text-primary)' }}>
          {game.title}
        </h2>
        <p className="text-sm" style={{ color: 'var(--cp-text-secondary)' }}>{game.tagline}</p>

        {game.focusStats.length > 0 && (
          <div className="cp-stat-card">
            <span className="cp-kicker">Focus Stats</span>
            <div className="mt-3 space-y-2.5">
              {game.focusStats.map((stat) => (
                <div key={stat.key} className="flex items-center justify-between text-sm">
                  <span className="font-semibold" style={{ color: 'var(--cp-text-primary)' }}>{stat.label}</span>
                  {typeof stat.bestValue === 'number' && (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-sm" style={{ background: 'var(--cp-gray-200)' }}>
                        <div
                          className="h-full rounded-sm"
                          style={{ width: `${stat.bestValue}%`, background: 'var(--cp-black)' }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--cp-text-muted)' }}>{stat.bestValue}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {game.champions.length > 0 && (
          <div className="space-y-2">
            <span className="cp-kicker">Crew</span>
            {game.champions.map((champ) => (
              <div key={champ.slug} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm" style={{ background: champ.color }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--cp-text-secondary)' }}>{champ.name}</span>
                <span className="text-xs" style={{ color: 'var(--cp-text-muted)' }}>{champ.realm}</span>
              </div>
            ))}
          </div>
        )}

        <Link href={game.slug} className="cp-cta-primary mt-auto">{game.cta}</Link>
      </div>
    </div>
  );
}

/* ── Page ── */

export default function GameHub() {
  return (
    <div className="min-h-screen px-4 py-16" style={{ background: 'var(--cp-bg)', color: 'var(--cp-text-primary)' }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <header className="text-center">
          <span className="cp-kicker">Playgrounds</span>
          <h1 className="mt-3 font-display text-5xl font-black md:text-6xl">
            Pick Tonight&apos;s <span className="cp-gradient-text">Stage</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg" style={{ color: 'var(--cp-text-secondary)' }}>
            {worldTagline} Choose a mode curated by the crew and lean into the strengths your collectible already carries.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {presentedGames.map((game) => {
            switch (game.layout) {
              case 'hero':
                return <HeroCard key={game.id} game={game} />;
              case 'horizontal':
                return <HorizontalCard key={game.id} game={game} />;
              case 'standard':
                return <StandardCard key={game.id} game={game} />;
            }
          })}
        </div>
      </div>
    </div>
  );
}
