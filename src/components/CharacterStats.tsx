"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import anime from 'animejs';

type IconProps = { className?: string };

type StatTheme = {
  accent: string;
  accentSoft: string;
  accentStrong: string;
  glow: string;
  icon: (props: IconProps) => JSX.Element;
};

const STAT_THEMES: Record<string, StatTheme> = {
  rhythm: {
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.35)',
    accentStrong: '#0ea5e9',
    glow: 'rgba(8, 126, 164, 0.45)',
    icon: RhythmIcon,
  },
  style: {
    accent: '#e879f9',
    accentSoft: 'rgba(232, 121, 249, 0.32)',
    accentStrong: '#c026d3',
    glow: 'rgba(179, 24, 209, 0.42)',
    icon: StyleIcon,
  },
  power: {
    accent: '#fb7185',
    accentSoft: 'rgba(251, 113, 133, 0.3)',
    accentStrong: '#f43f5e',
    glow: 'rgba(244, 63, 94, 0.36)',
    icon: PowerIcon,
  },
  flow: {
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.32)',
    accentStrong: '#10b981',
    glow: 'rgba(17, 153, 111, 0.4)',
    icon: FlowIcon,
  },
  teamwork: {
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.34)',
    accentStrong: '#7c3aed',
    glow: 'rgba(94, 60, 201, 0.42)',
    icon: TeamIcon,
  },
  defense: {
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.28)',
    accentStrong: '#0284c7',
    glow: 'rgba(8, 110, 166, 0.38)',
    icon: ShieldIcon,
  },
  focus: {
    accent: '#facc15',
    accentSoft: 'rgba(250, 204, 21, 0.32)',
    accentStrong: '#ca8a04',
    glow: 'rgba(212, 151, 15, 0.36)',
    icon: FocusIcon,
  },
  charisma: {
    accent: '#f472b6',
    accentSoft: 'rgba(244, 114, 182, 0.3)',
    accentStrong: '#db2777',
    glow: 'rgba(205, 39, 119, 0.35)',
    icon: SparkIcon,
  },
  speed: {
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.32)',
    accentStrong: '#2563eb',
    glow: 'rgba(37, 99, 235, 0.4)',
    icon: SpeedIcon,
  },
  control: {
    accent: '#f97316',
    accentSoft: 'rgba(249, 115, 22, 0.3)',
    accentStrong: '#ea580c',
    glow: 'rgba(216, 90, 0, 0.36)',
    icon: ControlIcon,
  },
};

const DEFAULT_THEME: StatTheme = {
  accent: '#f472b6',
  accentSoft: 'rgba(244, 114, 182, 0.28)',
  accentStrong: '#ec4899',
  glow: 'rgba(219, 39, 119, 0.32)',
  icon: SparkIcon,
};

const STAT_TIERS = [
  { min: 92, label: 'S Tier', gradient: 'linear-gradient(135deg,#fde68a,#f9a8d4)', foreground: '#111827', description: 'Arena-breaking mastery—drop them straight into finals.' },
  { min: 84, label: 'A Tier', gradient: 'linear-gradient(135deg,#c084fc,#7dd3fc)', foreground: '#0f172a', description: 'Headliner ready with only light coaching to sync.' },
  { min: 70, label: 'B Tier', gradient: 'linear-gradient(135deg,#38bdf8,#86efac)', foreground: '#020617', description: 'Reliable in most squads—scales fast with thoughtful combos.' },
  { min: 55, label: 'C Tier', gradient: 'linear-gradient(135deg,#fbbf24,#fb7185)', foreground: '#1f2937', description: 'Developing spark—pair with mentors for dramatic gains.' },
  { min: 0, label: 'D Tier', gradient: 'linear-gradient(135deg,#94a3b8,#475569)', foreground: '#020617', description: 'Dormant potential waiting for a training montage.' },
] as const;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function prettifyLabel(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(\w)/g, (match) => match.toUpperCase());
}

function getStatTheme(key: string): StatTheme {
  const normalized = key.toLowerCase();
  return STAT_THEMES[normalized] ?? DEFAULT_THEME;
}

function getStatTier(value: number) {
  return STAT_TIERS.find((tier) => value >= tier.min) ?? STAT_TIERS[STAT_TIERS.length - 1];
}

export default function CharacterStats({ stats }: { stats: Record<string, number> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const entries = useMemo(
    () =>
      Object.entries(stats ?? {}).sort((a, b) => {
        const aValue = clamp(Number(a[1]));
        const bValue = clamp(Number(b[1]));
        return bValue - aValue;
      }),
    [stats],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const tiles = el.querySelectorAll<HTMLElement>('[data-stat-tile]');
    tiles.forEach((tile) => {
      tile.style.setProperty('--progress', '0');
      tile.style.opacity = '0';
      tile.style.transform = 'translateY(12px)';
    });

    anime({
      targets: tiles,
      '--progress': (_tile: HTMLElement, index: number) => {
        const value = entries[index]?.[1] ?? 0;
        return clamp(Number(value)) * 3.6;
      },
      opacity: 1,
      translateY: 0,
      delay: anime.stagger(90),
      duration: 950,
      easing: 'easeOutExpo',
    });
  }, [entries]);

  return (
    <div ref={containerRef} className="grid gap-4 sm:grid-cols-2">
      {entries.map(([key, rawValue]) => {
        const value = clamp(Number(rawValue));
        const theme = getStatTheme(key);
        const tier = getStatTier(value);
        const displayLabel = prettifyLabel(key);

        const tileStyle: CSSProperties = {
          '--accent': theme.accent,
          '--accent-soft': theme.accentSoft,
          '--accent-strong': theme.accentStrong,
          '--accent-glow': theme.glow,
          '--progress': '0',
        } as CSSProperties;

        const gaugeStyle: CSSProperties = {
          backgroundImage: 'conic-gradient(var(--accent-strong) calc(var(--progress) * 1deg), rgba(17, 16, 34, 0.55) 0deg)',
        };

        const badgeStyle: CSSProperties = {
          backgroundImage: tier.gradient,
          color: tier.foreground,
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)',
        };

        const Icon = theme.icon;

        return (
          <div
            key={key}
            data-stat-tile
            style={tileStyle}
            className="group relative overflow-hidden rounded-3xl border border-white/12 bg-white/[0.04] px-5 py-4 text-white backdrop-blur-xl transition duration-300 hover:border-white/40 hover:shadow-[0_22px_50px_var(--accent-glow)]"
          >
            <div className="pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-300 group-hover:opacity-100">
              <div className="absolute -top-16 left-[-15%] h-40 w-40 rounded-full bg-[radial-gradient(circle,var(--accent-soft)_0%,transparent_65%)] blur-2xl" />
              <div className="absolute -bottom-20 right-[-20%] h-44 w-44 rounded-full bg-[radial-gradient(circle,var(--accent-soft)_0%,transparent_70%)] blur-3xl" />
            </div>

            <div className="relative flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <div className="absolute inset-0 rounded-[20px] border border-white/15 bg-white/5 backdrop-blur-sm" />
                <div className="absolute inset-0 rounded-[20px] [mask-image:radial-gradient(circle_at_center,transparent_54%,#000_60%)]" style={gaugeStyle} />
                <div className="absolute inset-[9px] flex items-center justify-center rounded-[16px] bg-[radial-gradient(circle_at_center,rgba(10,11,24,0.95)_0%,rgba(10,14,32,0.6)_100%)] shadow-[inset_0_6px_18px_rgba(0,0,0,0.35)]">
                  <Icon className="h-6 w-6 text-white/80 drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]" />
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.28em] text-white/50">{displayLabel}</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-display text-2xl font-semibold text-white">{value}</span>
                      <span className="text-xs text-white/60">/ 100</span>
                    </div>
                  </div>
                  <span className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]" style={badgeStyle}>
                    {tier.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-white/70">{tier.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RhythmIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M7 4.5v11.2a2.8 2.8 0 1 0 1.8 2.6V8.9l8.4-2.2v6.7a2.8 2.8 0 1 0 1.8 2.6V4.5L7 7.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StyleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M6 12c1.8-4.5 5.8-7.5 8.7-9.2.5-.3 1.2.1 1 0C12 6 11 8 11 9.5 12.5 8.4 14 7.8 16 7.5c.7-.1 1.3.7 1 1.4C15 14 11.5 17.5 9 20c-.5.5-1.4.2-1.4-.5 0-1.5.3-3.2 1-4.6-.7.4-1.6.8-2.4.9-.8.1-1.4-.7-1-1.4.2-.5.5-1.2.8-2Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PowerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M13.2 3.5 6.5 13h5l-.7 7.5 6.7-9.5h-5l.7-7.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FlowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M5 12c8-6 14 6 6 6" strokeLinecap="round" />
      <path d="M19 12c-8-6-14 6-6 6" strokeLinecap="round" />
    </svg>
  );
}

function TeamIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="7.5" cy="9" r="2.8" />
      <circle cx="16.5" cy="9" r="2.8" />
      <path d="M4 19.5c.5-2.7 2.7-4.7 5.4-4.7 2.6 0 4.8 1.9 5.3 4.5" strokeLinecap="round" />
      <path d="M9.5 19.3c.6-2.6 2.7-4.5 5.3-4.5 2.7 0 4.9 2 5.4 4.7" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M12 21c-4.2-1.8-7-5.2-7-9.8V6.7L12 3l7 3.7v4.5C19 15.8 16.2 19.2 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7.6v8.3" strokeLinecap="round" />
    </svg>
  );
}

function FocusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 4v2.5M12 19.5V22M4 12h2.5M19.5 12H22" strokeLinecap="round" />
      <path d="M6.8 6.8 5 5m13.2 1.8L19 5m-1.8 13.2L19 19m-13.2-1.8L5 19" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M12 2.5 9.5 9H3l5.5 3.9L6 21.5l6-4.3 6 4.3-2.5-8.6L21 9h-6.5L12 2.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpeedIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M4.5 18c1.2 1 3 1 4.2 0l6.6-5.6a2.6 2.6 0 0 0 .1-3.9 2.8 2.8 0 0 0-3.8-.1L5 14.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.8 16.6 15 19m-8.4-9.2L4.6 7.8m16.8 1.7-2.2-2.2M17 18l-2.2 2.2" strokeLinecap="round" />
    </svg>
  );
}

function ControlIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M6.5 6.5h11v11h-11z" />
      <path d="M12 6.5v11M6.5 12h11" strokeLinecap="round" />
      <path d="M4.5 12h-2M21.5 12h-2M12 4.5v-2M12 21.5v-2" strokeLinecap="round" />
    </svg>
  );
}
