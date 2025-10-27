"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CSSProperties } from "react";
import RevealOnView from "@/components/RevealOnView";
import type { CharacterWithLore } from "@/lib/characterLore";

type Props = {
  items: CharacterWithLore[];
};

type CardStyle = CSSProperties & {
  "--realm-accent"?: string;
  "--realm-accent-strong"?: string;
  "--realm-accent-soft"?: string;
  "--realm-accent-border"?: string;
  "--realm-accent-glow"?: string;
};

function hexToRgba(hex: string | null | undefined, alpha: number): string {
  if (!hex) return `rgba(188,154,255,${alpha})`;
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function topStats(stats: Record<string, number> | null | undefined) {
  if (!stats) return [];
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

export default function RealmSpotlights({ items }: Props) {
  if (!items.length) return null;
  const cards = useMemo(() => items.map((character) => {
    const accent = character.color || '#BC9AFF';
    const accentStrong = hexToRgba(accent, 0.58);
    const accentSoft = hexToRgba(accent, 0.22);
    const accentBorder = hexToRgba(accent, 0.4);
    const accentGlow = hexToRgba(accent, 0.26);
    return {
      character,
      stats: topStats(character.stats || null),
      style: {
        "--realm-accent": accent,
        "--realm-accent-strong": accentStrong,
        "--realm-accent-soft": accentSoft,
        "--realm-accent-border": accentBorder,
        "--realm-accent-glow": accentGlow,
      } as CardStyle,
    };
  }), [items]);
  return (
    <section className="cp-realms">
      <div className="cp-container cp-realms-shell">
        <RevealOnView className="cp-realms-headline">
          <span className="cp-pill inline-flex">Worlds in Motion</span>
          <h2 className="font-display font-extrabold">
            Step into the realms your pals defend.
          </h2>
          <p className="cp-muted mx-auto">
            Each claim unlocks more than a model—it syncs you to a living realm with signature rhythms, hazards, and squad boosts. Scout the arenas before you queue.
          </p>
        </RevealOnView>

        <div className="cp-realms-grid">
          {cards.map(({ character, stats, style }, idx) => (
            <RevealOnView key={character.id} className="h-full" delay={idx * 90}>
              <article className="cp-realms-card" style={style}>
                <header>
                  <div className="cp-realms-card__meta">
                    <span className="cp-pill">{character.realm || "Unknown Realm"}</span>
                    <span className="cp-chip text-xs uppercase tracking-[0.25em]">
                      Series • {character.codeSeries || "TBA"}
                    </span>
                  </div>
                  <h3 className="cp-realms-card__title">{character.name}</h3>
                  {character.title && (
                    <p className="cp-realms-card__subtitle">{character.title}</p>
                  )}
                  {character.tagline && (
                    <p className="cp-realms-card__body">{character.tagline}</p>
                  )}
                  {character.vibe && (
                    <p className="cp-realms-card__body">{character.vibe}</p>
                  )}
                </header>

                {stats.length > 0 && (
                  <div className="cp-realms-card__stats">
                    {stats.map(([label, value]) => (
                      <div key={label} className="cp-realms-card__stat">
                        <span className="cp-realms-card__stat-label">{label}</span>
                        <span className="cp-realms-card__stat-value">{value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <footer className="cp-realms-card__footer">
                  <Link
                    href={`/character/${character.id}`}
                    className="cp-realms-action cp-realms-action--primary"
                  >
                    View dossier
                  </Link>
                  <Link href="/claim" className="cp-realms-action cp-realms-action--ghost">
                    Claim this vibe
                  </Link>
                </footer>
              </article>
            </RevealOnView>
          ))}
        </div>
      </div>
    </section>
  );
}
