"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type CharacterBasic = {
  id: string;
  name: string;
  description: string | null;
  rarity: number;
  artRefs?: Record<string, string>;
  realm?: string | null;
  title?: string | null;
  tagline?: string | null;
  codeSeries?: string | null;
};

function rarityInfo(r: number) {
  if (r >= 5) return { label: "Legendary" };
  if (r >= 4) return { label: "Epic" };
  if (r >= 3) return { label: "Rare" };
  return { label: "Common" };
}

function rarityToken(r: number): "legendary" | "epic" | "rare" | "common" {
  if (r >= 5) return "legendary";
  if (r >= 4) return "epic";
  if (r >= 3) return "rare";
  return "common";
}

export default function CharacterCard({ c, owned = false }: { c: CharacterBasic; owned?: boolean }) {
  const r = rarityInfo(c.rarity);
  const rarity = rarityToken(c.rarity);
  const shellRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [tiltTransform, setTiltTransform] = useState<string>("rotateX(0deg) rotateY(0deg)");
  const [hoverable, setHoverable] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const media = useMemo(() => c.artRefs?.thumbnail || null, [c.artRefs]);
  const rating = useMemo(() => (c.rarity + 2.7).toFixed(1), [c.rarity]);
  const frontDescription = c.tagline || c.description;
  const backCopy = c.description || c.tagline;

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    shell.style.setProperty("--cursor-x", "0.5");
    shell.style.setProperty("--cursor-y", "0.5");
    shell.style.setProperty("--cursor-strength", "0");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const pointerQuery = window.matchMedia("(pointer: fine)");

    const update = () => {
      const isHoverable = !reduced && hoverQuery.matches && pointerQuery.matches;
      setHoverable(isHoverable);
    };

    update();

    const handleHoverChange = (event: MediaQueryListEvent) => {
      const pointerMatches = pointerQuery.matches;
      setHoverable(!reduced && event.matches && pointerMatches);
    };

    const handlePointerChange = (event: MediaQueryListEvent) => {
      const hoverMatches = hoverQuery.matches;
      setHoverable(!reduced && hoverMatches && event.matches);
    };

    if (typeof hoverQuery.addEventListener === "function") {
      hoverQuery.addEventListener("change", handleHoverChange);
    } else {
      hoverQuery.addListener(handleHoverChange);
    }

    if (typeof pointerQuery.addEventListener === "function") {
      pointerQuery.addEventListener("change", handlePointerChange);
    } else {
      pointerQuery.addListener(handlePointerChange);
    }

    return () => {
      if (typeof hoverQuery.removeEventListener === "function") {
        hoverQuery.removeEventListener("change", handleHoverChange);
      } else {
        hoverQuery.removeListener(handleHoverChange);
      }
      if (typeof pointerQuery.removeEventListener === "function") {
        pointerQuery.removeEventListener("change", handlePointerChange);
      } else {
        pointerQuery.removeListener(handlePointerChange);
      }
    };
  }, [reduced]);

  useEffect(() => {
    if (hoverable) setFlipped(false);
  }, [hoverable]);

  useEffect(() => {
    const tiltEl = tiltRef.current;
    const shell = shellRef.current;
    if (!tiltEl || !shell || reduced) return;

    const pointerFine = typeof window !== "undefined" && window.matchMedia?.("(pointer: fine)").matches;
    if (!pointerFine) return;

    let raf: number | null = null;

    const handleMove = (event: MouseEvent) => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        const rect = tiltEl.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        const rx = Math.max(-1, Math.min(1, py)) * -10;
        const ry = Math.max(-1, Math.min(1, px)) * 12;
        setTiltTransform(`rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`);
        shell.style.setProperty("--cursor-x", `${Math.min(Math.max(px + 0.5, 0), 1)}`);
        shell.style.setProperty("--cursor-y", `${Math.min(Math.max(py + 0.5, 0), 1)}`);
        const strength = Math.min(1, Math.hypot(px, py) * 1.4);
        shell.style.setProperty("--cursor-strength", strength.toFixed(3));
      });
    };

    const handleLeave = () => {
      setTiltTransform("rotateX(0deg) rotateY(0deg)");
      shell.style.setProperty("--cursor-x", "0.5");
      shell.style.setProperty("--cursor-y", "0.5");
      shell.style.setProperty("--cursor-strength", "0");
    };

    tiltEl.addEventListener("mousemove", handleMove);
    tiltEl.addEventListener("mouseleave", handleLeave);

    return () => {
      tiltEl.removeEventListener("mousemove", handleMove);
      tiltEl.removeEventListener("mouseleave", handleLeave);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [reduced, hoverable]);

  const handleToggle = () => {
    setFlipped((value) => !value);
  };

  return (
    <div
      ref={shellRef}
      className="cp-card-shell"
      data-rarity={rarity}
      data-owned={owned ? "true" : "false"}
      data-hoverable={hoverable ? "true" : "false"}
      data-flipped={flipped ? "true" : "false"}
    >
      <div ref={tiltRef} className="cp-card-tilt" style={{ transform: tiltTransform }}>
        <span className="cp-card-ambient" aria-hidden />
        <div className="cp-card-holo">
          <div className="cp-card-face cp-card-front">
            <div className="cp-card-media">
              {media ? (
                <>
                  <img
                    src={media}
                    alt={c.name}
                    loading="lazy"
                    decoding="async"
                    className="cp-card-art"
                  />
                  <div className="cp-card-media-shine" />
                </>
              ) : (
                <div className="cp-card-media-fallback">
                  <span>{c.name.slice(0, 2)}</span>
                </div>
              )}
              <div className="cp-card-score flex gap-1">
                <span className="cp-chip">{rating}</span>
                {owned && <span className="cp-chip" title="You own this">Owned</span>}
              </div>
            </div>
            <div className="cp-card-body">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {c.realm && (
                    <div className="cp-kicker text-[10px] tracking-[0.24em] uppercase text-white/60">
                      {c.realm}
                    </div>
                  )}
                  <h3 className="text-white text-xl font-display font-extrabold truncate">
                    {c.name}
                  </h3>
                  {c.title && <div className="text-white/80 text-xs font-medium mt-0.5">{c.title}</div>}
                </div>
                <span className="cp-chip">{r.label}</span>
              </div>
              {frontDescription && (
                <p className="cp-muted text-sm line-clamp-2 mt-3">{frontDescription}</p>
              )}
              {c.codeSeries && (
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 mt-3">
                  Series {c.codeSeries}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/character/${c.id}`}
                  className="cp-card-button cp-card-button-primary"
                  data-magnetic="card"
                  data-magnetic-color="aqua"
                  data-ripple
                >
                  View Profile
                </Link>
                <Link
                  href="/play"
                  className="cp-card-button cp-card-button-ghost"
                  data-magnetic="card"
                  data-magnetic-color="volt"
                  data-ripple
                >
                  Battle Demo
                </Link>
              </div>
            </div>
          </div>
          <div className="cp-card-face cp-card-back">
            <div className="cp-card-back-inner">
              <div className="cp-card-back-grid">
                <div>
                  <span className="cp-card-back-label">Rarity Pulse</span>
                  <span className="cp-card-back-value">{r.label}</span>
                </div>
                <div>
                  <span className="cp-card-back-label">Power Index</span>
                  <span className="cp-card-back-value">{rating}</span>
                </div>
                <div>
                  <span className="cp-card-back-label">Realm</span>
                  <span className="cp-card-back-value">{c.realm || "Unaligned"}</span>
                </div>
                <div>
                  <span className="cp-card-back-label">Status</span>
                  <span className="cp-card-back-value">{owned ? "In Squad" : "Available"}</span>
                </div>
              </div>
              {backCopy && (
                <p className="cp-card-back-copy">{backCopy}</p>
              )}
              <div className="cp-card-back-actions">
                <Link
                  href={`/character/${c.id}`}
                  className="cp-card-button cp-card-button-primary"
                  data-magnetic="card"
                  data-magnetic-color="violet"
                  data-ripple
                >
                  Full Lore
                </Link>
                <Link
                  href="/claim"
                  className="cp-card-button cp-card-button-ghost"
                  data-magnetic="card"
                  data-magnetic-color="sunrise"
                  data-ripple
                >
                  Claim Codes
                </Link>
              </div>
            </div>
          </div>
        </div>
        <span className="cp-card-energy" aria-hidden />
        {rarity === "legendary" && <span className="cp-card-glitch" aria-hidden />}
      </div>
      {!hoverable && (
        <button
          type="button"
          className="cp-card-toggle"
          onClick={handleToggle}
          aria-pressed={flipped}
          data-magnetic="card-toggle"
          data-magnetic-color="mint"
          data-ripple
        >
          {flipped ? "Show Front" : "Show Stats"}
        </button>
      )}
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(!!m.matches);
    update();
    if (typeof m.addEventListener === "function") {
      m.addEventListener("change", update);
    } else if (typeof m.addListener === "function") {
      m.addListener(update);
    }
    return () => {
      if (typeof m.removeEventListener === "function") {
        m.removeEventListener("change", update);
      } else if (typeof m.removeListener === "function") {
        m.removeListener(update);
      }
    };
  }, []);
  return reduced;
}
