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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <RosterPanel
          characters={roster}
          primaryId={primary?.id ?? null}
          secondaryId={secondary?.id ?? null}
          onSelectPrimary={handleSelectPrimary}
          onSelectSecondary={handleSelectSecondary}
        />
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

function RosterPanel({
  characters,
  primaryId,
  secondaryId,
  onSelectPrimary,
  onSelectSecondary,
}: {
  characters: CompareCharacter[];
  primaryId: string | null;
  secondaryId: string | null;
  onSelectPrimary: (id: string) => void;
  onSelectSecondary: (id: string) => void;
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

  const DEFAULT_VISIBLE = 8;
  const visible = useMemo(() => (showAll ? filtered : filtered.slice(0, DEFAULT_VISIBLE)), [filtered, showAll]);

  return (
    <section className="cp-panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex flex-col gap-4">
          <div>
            <div className="cp-kicker text-xs uppercase tracking-[0.3em] text-white/60">Roster Control</div>
            <h2 className="font-display text-2xl font-bold text-white">Pick Your Matchup</h2>
            <p className="cp-muted mt-2 text-sm">
              Assign a champion to each slot. Use the quick toggles to flip sides without losing your place.
            </p>
          </div>
          <label className="block">
            <span className="sr-only">Search roster</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search roster..."
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>
        </div>
      </div>
      <div className="flex-1 overflow-hidden px-5 pb-5 pt-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
          <span>Top candidates</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-white/60">Primary</span>
            <span className="text-white/30">Swap</span>
            <span className="text-white/60">Rival</span>
          </div>
        </div>
        <div className="mt-3 space-y-3 overflow-y-auto pr-1">
          {visible.map((character) => {
            const isPrimary = character.id === primaryId;
            const isSecondary = character.id === secondaryId;
            const rarity = rarityLabel(character.rarity);
            const charmTitle = extractCharmTitle(character.coreCharm);
            return (
              <div
                key={character.id}
                className="group relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-3 transition duration-200 hover:border-white/35 hover:bg-white/[0.08]"
              >
                <div className="flex items-center gap-3">
                  <CharacterAvatar name={character.name} color={character.color} art={character.art} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">{character.name}</span>
                      {isPrimary && <RoleBadge tone="primary" label="Primary" />}
                      {isSecondary && <RoleBadge tone="secondary" label="Rival" />}
                      <span className="rounded-full border border-white/15 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
                        {rarity}
                      </span>
                    </div>
                    <div className="text-xs text-white/60">{character.realm ?? character.title ?? "Unknown Realm"}</div>
                    {charmTitle && <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">{charmTitle}</div>}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <RosterSelectButton
                      label="Primary"
                      active={isPrimary}
                      onClick={() => {
                        onSelectPrimary(character.id);
                        playClick();
                      }}
                      onHover={playHover}
                    />
                    <RosterSelectButton
                      label="Rival"
                      active={isSecondary}
                      variant="secondary"
                      onClick={() => {
                        onSelectSecondary(character.id);
                        playClick();
                      }}
                      onHover={playHover}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-white/60">
              No matches yet - adjust your search.
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

function RoleBadge({ tone, label }: { tone: "primary" | "secondary"; label: string }) {
  const palette =
    tone === "primary"
      ? { background: "linear-gradient(135deg,#facc15,#f97316,#ec4899)", color: "#111826" }
      : { background: "linear-gradient(135deg,#a855f7,#6366f1,#22d3ee)", color: "#0f172a" };
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3em]"
      style={{ backgroundImage: palette.background, color: palette.color }}
    >
      {label}
    </span>
  );
}

function RosterSelectButton({
  label,
  active,
  onClick,
  onHover,
  variant = "primary",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onHover: () => void;
  variant?: "primary" | "secondary";
}) {
  const gradient =
    variant === "primary"
      ? "linear-gradient(135deg,rgba(250,204,21,0.65),rgba(236,72,153,0.65))"
      : "linear-gradient(135deg,rgba(99,102,241,0.65),rgba(56,189,248,0.65))";
  return (
    <button
      type="button"
      className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] transition focus:outline-none focus:ring-2 focus:ring-white/30 ${
        active ? "border-white/70 text-white shadow-[0_10px_30px_rgba(15,23,42,0.45)]" : "border-white/20 text-white/70 hover:border-white/35 hover:text-white"
      }`}
      style={active ? { backgroundImage: gradient } : undefined}
      onClick={onClick}
      onMouseEnter={onHover}
      onFocus={onHover}
    >
      {label}
    </button>
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
    <section className="cp-panel flex h-full flex-col overflow-hidden">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="cp-kicker text-xs uppercase tracking-[0.28em] text-white/60">Matchup Overview</div>
            <h2 className="font-display text-2xl font-bold text-white">Realm Pulse</h2>
          </div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-white/60">
            <span>{primary?.name ?? "Primary slot"}</span>
            <span className="text-white/30">vs</span>
            <span>{secondary?.name ?? "Rival slot"}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-6 px-5 py-5">
        <div className="grid gap-4 md:grid-cols-2">
          <SpotlightCard character={primary} tone="primary" />
          <SpotlightCard character={secondary} tone="secondary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(bothSelected ? insights : [fallbackInsight]).map((insight, index) => (
            <div
              key={`${insight.label}-${index}`}
              className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white backdrop-blur-sm transition duration-200 hover:border-white/30 hover:bg-white/[0.08]"
            >
              <div className="font-semibold text-white/85">{insight.label}</div>
              {insight.difference && <div className="mt-1 text-[10px] uppercase tracking-[0.32em] text-white/45">{insight.difference}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SpotlightCard({ character, tone }: { character: CompareCharacter | null; tone: "primary" | "secondary" }) {
  const accent = character?.color ?? (tone === "primary" ? "#f97316" : "#6366f1");
  const gradient = `linear-gradient(135deg, ${withAlpha(accent, 0.55)} 0%, rgba(15,23,42,0.78) 55%, rgba(15,23,42,0.92) 100%)`;
  const charmTitle = extractCharmTitle(character?.coreCharm ?? null);
  return (
    <article className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/[0.04] p-5 text-white">
      <div className="absolute inset-0 opacity-90" style={{ backgroundImage: gradient }} aria-hidden />
      <div className="relative flex min-h-[160px] flex-col justify-between gap-3">
        {character ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-white/70">{character.realm ?? character.title ?? "Across Realms"}</div>
                <h3 className="mt-1 text-2xl font-display font-semibold leading-tight">{character.name}</h3>
              </div>
              <span className="rounded-full border border-white/30 bg-white/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
                {rarityLabel(character.rarity)}
              </span>
            </div>
            {character.tagline && <p className="text-sm text-white/80">{character.tagline}</p>}
            <div className="flex flex-wrap gap-2 text-[11px] text-white/85">
              {charmTitle && (
                <span className="rounded-full border border-white/20 bg-white/15 px-2 py-1 font-semibold uppercase tracking-[0.28em] text-white">
                  {charmTitle}
                </span>
              )}
              {character.danceStyle && (
                <span className="rounded-full border border-white/20 bg-black/25 px-2 py-1 font-medium text-white/80">{character.danceStyle}</span>
              )}
            </div>
          </>
        ) : (
          <div className="py-6 text-sm text-white/70">
            {tone === "primary" ? "Choose a primary pal to compare." : "Pick a rival to complete the matchup."}
          </div>
        )}
      </div>
    </article>
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
