"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSfx } from "@/lib/sfx";

export type CompareCharacter = {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  realm: string | null;
  title: string | null;
  vibe: string | null;
  coreCharm: string | null;
  danceStyle: string | null;
  personality: string | null;
  stats: Record<string, number>;
  rarity: number;
  color: string | null;
  art: {
    thumbnail: string | null;
    portrait: string | null;
  };
};

type CompareClientProps = {
  characters: CompareCharacter[];
};

const FALLBACK_COLOR = "#6366f1";

export default function CompareClient({ characters }: CompareClientProps) {
  const roster = useMemo(
    () => characters.filter((character) => character && character.id),
    [characters],
  );
  const first = roster[0] ?? null;
  const second = roster.find((character) => character.id !== (first?.id ?? null)) ?? null;

  const [primaryId, setPrimaryId] = useState<string | null>(first?.id ?? null);
  const [secondaryId, setSecondaryId] = useState<string | null>(second?.id ?? null);

  const primary = useMemo(() => roster.find((c) => c.id === primaryId) ?? first ?? null, [first, primaryId, roster]);
  const secondary = useMemo(() => roster.find((c) => c.id === secondaryId) ?? second ?? null, [roster, second, secondaryId]);

  const handleSelectPrimary = (id: string) => {
    setPrimaryId((currentPrimary) => {
      if (currentPrimary === id) return currentPrimary;
      setSecondaryId((currentSecondary) => (currentSecondary === id ? currentPrimary : currentSecondary));
      return id;
    });
  };

  const handleSelectSecondary = (id: string) => {
    setSecondaryId((currentSecondary) => {
      if (currentSecondary === id) return currentSecondary;
      setPrimaryId((currentPrimary) => (currentPrimary === id ? currentSecondary : currentPrimary));
      return id;
    });
  };

  const statsComparison = useMemo(() => buildStatComparison(primary, secondary), [primary, secondary]);
  const insights = useMemo(() => buildInsights(statsComparison, primary, secondary), [primary, secondary, statsComparison]);

  return (
    <div className="space-y-10">
      <HeroSection primary={primary} secondary={secondary} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <SelectorPanel
            label="Primary"
            characters={roster}
            selectedId={primary?.id ?? null}
            otherSelectedId={secondary?.id ?? null}
            onSelect={handleSelectPrimary}
          />
          <SelectorPanel
            label="Rival"
            characters={roster}
            selectedId={secondary?.id ?? null}
            otherSelectedId={primary?.id ?? null}
            onSelect={handleSelectSecondary}
          />
        </div>
        <FocusPanel primary={primary} secondary={secondary} insights={insights} />
      </div>

      <StatsPanel comparison={statsComparison} primary={primary} secondary={secondary} />

      <LorePanel primary={primary} secondary={secondary} />
    </div>
  );
}

function HeroSection({ primary, secondary }: { primary: CompareCharacter | null; secondary: CompareCharacter | null }) {
  const primaryName = primary?.name ?? "Your crew";
  const secondaryName = secondary?.name ?? "Choose a rival";
  return (
    <header className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white shadow-[0_25px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl md:p-10">
      <div className="cp-kicker mb-3">Realm Versus</div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">Compare &amp; Amplify</h1>
      <p className="cp-muted mt-3 max-w-2xl text-base leading-relaxed md:text-lg">
        Dial in matchups, plan team synergies, and stack your squad with intent. Pick any two champions to reveal their stat spreads, realm specialties,
        and where each shines behind the spotlight.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm uppercase tracking-[0.35em] text-white/60">
        <span>{primaryName}</span>
        <span className="text-white/40">vs</span>
        <span>{secondaryName}</span>
      </div>
    </header>
  );
}

function SelectorPanel({
  label,
  characters,
  selectedId,
  otherSelectedId,
  onSelect,
}: {
  label: string;
  characters: CompareCharacter[];
  selectedId: string | null;
  otherSelectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const { playClick, playHover } = useSfx();

  const filtered = useMemo(() => {
    if (!query.trim()) return characters;
    const q = query.trim().toLowerCase();
    return characters.filter((character) => {
      const haystack = [character.name, character.realm ?? "", character.title ?? "", character.slug ?? ""].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [characters, query]);

  const DEFAULT_VISIBLE = 6;
  const visibleCharacters = useMemo(() => {
    if (showAll) return filtered;
    return filtered.slice(0, DEFAULT_VISIBLE);
  }, [filtered, showAll]);

  return (
    <section className="cp-panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/10 p-4 sm:p-6">
        <div className="cp-kicker mb-2 text-xs uppercase tracking-[0.28em] text-white/60">{label}</div>
        <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Pick a pal</h2>
        <p className="cp-muted mt-2 text-sm">
          Search by name, realm, or flair. The opposing slot highlights who&apos;s already locked.
        </p>
        <label className="mt-4 block">
          <span className="sr-only">Search characters</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search roster..."
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </label>
      </div>
      <div className="max-h-[420px] flex-1 overflow-hidden px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-1">
          {visibleCharacters.map((character) => {
            const isSelected = character.id === selectedId;
            const isLocked = character.id === otherSelectedId && !isSelected;
            return (
              <button
                key={character.id}
                type="button"
                className={buildCharacterPillClass(isSelected, isLocked)}
                onMouseEnter={playHover}
                onFocus={playHover}
                onClick={() => {
                  onSelect(character.id);
                  playClick();
                }}
                aria-pressed={isSelected}
              >
                <CharacterAvatar name={character.name} color={character.color} art={character.art} />
                <div className="min-w-0 text-left">
                  <div className="truncate text-sm font-semibold text-white">{character.name}</div>
                  <div className="text-xs text-white/60">{character.realm ?? character.title ?? "Unknown Realm"}</div>
                </div>
                <div className="ml-auto flex shrink-0 flex-col items-end gap-1 text-right">
                  <span className="inline-flex rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                    {rarityLabel(character.rarity)}
                  </span>
                  {isLocked && <span className="text-[10px] uppercase tracking-[0.28em] text-white/40">Other slot</span>}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-white/60 sm:col-span-1">
              No matches yet - tweak your search.
            </div>
          )}
        </div>
        {filtered.length > DEFAULT_VISIBLE && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/10"
              onClick={() => {
                setShowAll((value) => !value);
                playClick();
              }}
              onMouseEnter={playHover}
              onFocus={playHover}
            >
              {showAll ? "Show fewer pals" : `Show all (${filtered.length})`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function FocusPanel({
  primary,
  secondary,
  insights,
}: {
  primary: CompareCharacter | null;
  secondary: CompareCharacter | null;
  insights: Insight[];
}) {
  const bothSelected = primary && secondary;
  const fallbackInsight = {
    label: "Pick two champions to unlock stat insights.",
    difference: "",
    tone: "neutral" as const,
  };
  return (
    <section className="cp-panel overflow-hidden border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent">
      <Spotlight character={primary} align="left" />
      <div className="border-y border-white/10 bg-black/20 px-4 py-5 text-center text-xs uppercase tracking-[0.3em] text-white/60 sm:px-6">
        {primary?.name ?? "Select primary"} <span className="text-white/40">vs</span> {secondary?.name ?? "Select rival"}
      </div>
      <Spotlight character={secondary} align="right" />
      <div className="border-t border-white/10 bg-white/5 px-4 py-5 sm:px-6">
        <div className="cp-kicker mb-2 text-xs uppercase tracking-[0.25em] text-white/60">Insight Pulse</div>
        <div className="space-y-3">
          {(bothSelected ? insights : [fallbackInsight]).map((insight, index) => (
            <div
              key={`${insight.label}-${index}`}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white shadow-[0_12px_30px_rgba(15,23,42,0.45)]"
            >
              <div className="font-semibold tracking-wide text-white/80">{insight.label}</div>
              {insight.difference && <div className="mt-1 text-xs uppercase tracking-[0.32em] text-white/50">{insight.difference}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Spotlight({ character, align }: { character: CompareCharacter | null; align: "left" | "right" }) {
  const accent = character?.color ?? FALLBACK_COLOR;
  const gradient =
    character != null
      ? `linear-gradient(135deg, ${withAlpha(accent, 0.52)} 0%, rgba(15,23,42,0.65) 55%, rgba(15,23,42,0.88) 100%)`
      : "linear-gradient(135deg, rgba(79,70,229,0.45), rgba(15,23,42,0.9))";
  const charmTitle = extractCharmTitle(character?.coreCharm ?? null);
  return (
    <div
      className="relative flex min-h-[170px] flex-col justify-end border-t border-white/10 px-4 py-5 text-white sm:px-6"
      style={{ backgroundImage: gradient }}
    >
      {character ? (
        <>
          <div className="text-xs uppercase tracking-[0.35em] text-white/70">{character.realm ?? character.title ?? "Across Realms"}</div>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <div>
              <div className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{character.name}</div>
              {character.tagline && <div className="mt-1 text-sm text-white/70">{character.tagline}</div>}
            </div>
            <span className="rounded-full border border-white/25 bg-white/[0.16] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
              {rarityLabel(character.rarity)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/80">
            {charmTitle && (
              <span className="rounded-full border border-white/20 bg-white/15 px-2 py-1 font-semibold uppercase tracking-[0.28em] text-white">
                {charmTitle}
              </span>
            )}
            {character.danceStyle && (
              <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 font-medium text-white/80">{character.danceStyle}</span>
            )}
          </div>
        </>
      ) : (
        <div className="text-sm text-white/70">{align === "left" ? "Choose your anchor champion." : "Pick a rival to compare."}</div>
      )}
    </div>
  );
}

type StatComparison = {
  key: string;
  label: string;
  primaryValue: number;
  secondaryValue: number;
  maxValue: number;
  leader: "primary" | "secondary" | "tie";
  delta: number;
};

function StatsPanel({
  comparison,
  primary,
  secondary,
}: {
  comparison: StatComparison[];
  primary: CompareCharacter | null;
  secondary: CompareCharacter | null;
}) {
  if (!primary || !secondary) {
    return (
      <section className="cp-panel border border-dashed border-white/15 bg-transparent p-10 text-center text-sm text-white/60">
        Pick two champions to unlock a stat-by-stat breakdown.
      </section>
    );
  }

  return (
    <section className="cp-panel overflow-hidden">
      <div className="border-b border-white/10 px-4 py-5 sm:px-6">
        <div className="cp-kicker mb-3 text-xs uppercase tracking-[0.3em] text-white/60">Stat Showdown</div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Attribute Spread</h2>
            <p className="cp-muted mt-2 max-w-xl text-sm">
              Bars pulse based on realm performance. Hover or tap each row for exact values; advantage badges show who dominates the category.
            </p>
          </div>
          <div className="flex flex-col items-end text-right text-xs uppercase tracking-[0.32em] text-white/60">
            <span>{primary.name}</span>
            <span className="text-white/35">vs</span>
            <span>{secondary.name}</span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-white/12">
        {comparison.map((entry) => (
          <StatRow key={entry.key} entry={entry} primary={primary} secondary={secondary} />
        ))}
      </div>
    </section>
  );
}

function StatRow({ entry, primary, secondary }: { entry: StatComparison; primary: CompareCharacter; secondary: CompareCharacter }) {
  const { key, label, delta, leader, maxValue, primaryValue, secondaryValue } = entry;
  const primaryAccent = withAlpha(primary.color ?? FALLBACK_COLOR, 0.85);
  const secondaryAccent = withAlpha(secondary.color ?? "#f472b6", 0.85);

  const leftWidth = maxValue === 0 ? 0 : Math.max(0, Math.min(1, primaryValue / maxValue));
  const rightWidth = maxValue === 0 ? 0 : Math.max(0, Math.min(1, secondaryValue / maxValue));

  const leftPercent = (() => {
    if (leftWidth <= 0) {
      if (leader === "primary") return 42;
      if (leader === "tie") return 28;
      return 0;
    }
    const minPercent = leader === "primary" ? 42 : leader === "tie" ? 28 : 12;
    return Math.min(100, Math.max(leftWidth * 100, minPercent));
  })();

  const rightPercent = (() => {
    if (rightWidth <= 0) {
      if (leader === "secondary") return 42;
      if (leader === "tie") return 28;
      return 0;
    }
    const minPercent = leader === "secondary" ? 42 : leader === "tie" ? 28 : 12;
    return Math.min(100, Math.max(rightWidth * 100, minPercent));
  })();

  const deltaBadge =
    leader === "tie"
      ? "Locked in sync"
      : `${leader === "primary" ? primary.name : secondary.name} +${Math.abs(delta)} ${label}`.replace(/\s{2,}/g, " ");

  return (
    <div
      key={key}
      className="group relative grid gap-4 px-4 py-4 transition-colors duration-200 hover:bg-white/[0.06] sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:px-6"
    >
      <div className="flex flex-col justify-center gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.32em] text-white/50">{label}</div>
          <div className="flex gap-2 text-sm text-white/70">
            <span>{primaryValue}</span>
            <span className="text-white/40">/</span>
            <span>{secondaryValue}</span>
          </div>
        </div>
        <span className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
          {deltaBadge}
        </span>
      </div>
      <div className="grid gap-2">
        <div className="relative h-10 overflow-hidden rounded-full border border-white/10 bg-white/[0.03]">
          <span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${leftPercent}%`,
              background: `linear-gradient(90deg, ${withAlpha(primaryAccent, 0.85)}, ${withAlpha(primaryAccent, 0.45)})`,
              boxShadow: "0 12px 35px rgba(99, 102, 241, 0.35)",
            }}
          />
          <span
            className="absolute inset-y-0 right-0 rounded-full"
            style={{
              width: `${rightPercent}%`,
              background: `linear-gradient(90deg, ${withAlpha(secondaryAccent, 0.45)}, ${withAlpha(secondaryAccent, 0.85)})`,
              boxShadow: "0 12px 35px rgba(244, 114, 182, 0.32)",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/80">
            <span>{primary.name}</span>
            <span>{secondary.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LorePanel({ primary, secondary }: { primary: CompareCharacter | null; secondary: CompareCharacter | null }) {
  if (!primary && !secondary) return null;

  const cards = [primary, secondary].filter((character): character is CompareCharacter => Boolean(character));

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {cards.map((character) => (
        <article key={character.id} className="cp-panel flex flex-col gap-4 border border-white/10 bg-white/[0.04] p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="cp-kicker text-xs uppercase tracking-[0.28em] text-white/60">{character.realm ?? "Unknown Realm"}</div>
              <h3 className="font-display text-2xl font-bold">{character.name}</h3>
            </div>
            <Link
              href={`/character/${character.slug ?? character.id}`}
              className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white hover:bg-white/[0.14]"
            >
              Full Profile
            </Link>
          </div>
          {character.tagline && <p className="text-sm text-white/70">{character.tagline}</p>}
          <dl className="grid gap-3 text-sm text-white/80">
            {character.vibe && (
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-white/40">Realm vibe</dt>
                <dd>{character.vibe}</dd>
              </div>
            )}
            {character.coreCharm && (
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-white/40">Core charm</dt>
                <dd>{character.coreCharm}</dd>
              </div>
            )}
            {character.danceStyle && (
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-white/40">Signature style</dt>
                <dd>{character.danceStyle}</dd>
              </div>
            )}
            {character.personality && (
              <div>
                <dt className="text-xs uppercase tracking-[0.3em] text-white/40">Personality</dt>
                <dd>{character.personality}</dd>
              </div>
            )}
          </dl>
        </article>
      ))}
    </section>
  );
}

type Insight = {
  label: string;
  difference: string;
  tone: "primary" | "secondary" | "neutral";
};

function buildStatComparison(primary: CompareCharacter | null, secondary: CompareCharacter | null): StatComparison[] {
  if (!primary || !secondary) return [];
  const keys = Array.from(new Set([...Object.keys(primary.stats ?? {}), ...Object.keys(secondary.stats ?? {})]));
  return keys
    .map((key) => {
      const primaryValue = clampStat(primary.stats?.[key]);
      const secondaryValue = clampStat(secondary.stats?.[key]);
      const maxValue = Math.max(primaryValue, secondaryValue, 1);
      const delta = primaryValue - secondaryValue;
      const leader: StatComparison["leader"] = delta === 0 ? "tie" : delta > 0 ? "primary" : "secondary";
      return {
        key,
        label: prettifyLabel(key),
        primaryValue,
        secondaryValue,
        maxValue,
        leader,
        delta: Math.round(delta),
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function buildInsights(entries: StatComparison[], primary: CompareCharacter | null, secondary: CompareCharacter | null): Insight[] {
  if (!primary || !secondary) return [];
  if (entries.length === 0) return [];
  const major = entries.slice(0, 3);
  return major.map((entry) => ({
    label:
      entry.leader === "tie"
        ? `${entry.label} is even across both dancers.`
        : `${entry.leader === "primary" ? primary.name : secondary.name} controls ${entry.label.toLowerCase()}.`,
    difference:
      entry.leader === "tie"
        ? "stat parity"
        : `${Math.abs(entry.delta)} point advantage - ${entry.leader === "primary" ? primary.name : secondary.name}`.toUpperCase(),
    tone: entry.leader === "tie" ? "neutral" : entry.leader,
  }));
}

function extractCharmTitle(input: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const emDashIndex = trimmed.indexOf("\u2014");
  if (emDashIndex > 0) return trimmed.slice(0, emDashIndex).trim();
  const enDashIndex = trimmed.indexOf("\u2013");
  if (enDashIndex > 0) return trimmed.slice(0, enDashIndex).trim();
  const dashIndex = trimmed.indexOf("-");
  if (dashIndex > 0 && dashIndex < 48) return trimmed.slice(0, dashIndex).trim();
  return trimmed;
}

function rarityLabel(rarity: number) {
  if (rarity >= 5) return "Legendary";
  if (rarity >= 4) return "Epic";
  if (rarity >= 3) return "Rare";
  if (rarity >= 2) return "Uncommon";
  return "Common";
}

function prettifyLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function clampStat(value: number | undefined | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function withAlpha(color: string, alpha: number) {
  if (!color) return `rgba(99,102,241,${alpha})`;
  if (color.startsWith("#") && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (color.startsWith("rgb")) {
    return color.replace(/rgba?\(([^)]+)\)/, (_match, inner) => {
      const parts = inner.split(",").map((part: string) => part.trim());
      const [r = "99", g = "102", b = "241"] = parts;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    });
  }
  return `rgba(99,102,241,${alpha})`;
}

function buildCharacterPillClass(selected: boolean, locked: boolean) {
  const base =
    "group flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30";
  if (selected) {
    return `${base} border-white/45 bg-white/[0.15] text-white shadow-[0_16px_45px_rgba(99,102,241,0.35)]`;
  }
  if (locked) {
    return `${base} border-white/15 bg-white/[0.04] text-white/65`;
  }
  return `${base} border-white/10 bg-white/[0.05] text-white hover:border-white/40 hover:bg-white/[0.12]`;
}

function CharacterAvatar({
  name,
  color,
  art,
}: {
  name: string;
  color: string | null;
  art: { thumbnail: string | null; portrait: string | null };
}) {
  const accent = color ?? FALLBACK_COLOR;
  const media = art.thumbnail || art.portrait;
  if (media) {
    return (
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/10">
        <Image src={media} alt={name} fill sizes="40px" className="object-cover" priority={false} unoptimized />
        <span className="absolute inset-0 border border-white/20 mix-blend-screen" aria-hidden />
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-white"
      style={{ background: `linear-gradient(135deg, ${withAlpha(accent, 0.6)}, rgba(15,23,42,0.8))` }}
    >
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}
