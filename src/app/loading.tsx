"use client";

import { useEffect, useMemo, useState } from "react";

const LINES = [
  "Attuning candy clouds to your squad aura…",
  "Decrypting holographic rarity signatures…",
  "Spooling arena orbitals for the next drop…",
  "Charging neon dance floors with quantum glitter…",
  "Summoning CharmXPals from the spectral plaza…",
];

type Phase = "typing" | "pause" | "deleting";

export default function Loading() {
  const [lineIndex, setLineIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState("");

  const line = useMemo(() => LINES[lineIndex % LINES.length], [lineIndex]);
  const progress = line.length > 0 ? typed.length / line.length : 0;

  useEffect(() => {
    let timeout: number | undefined;

    if (phase === "typing") {
      if (typed.length < line.length) {
        timeout = window.setTimeout(() => {
          setTyped(line.slice(0, typed.length + 1));
        }, 80 + Math.random() * 40);
      } else {
        timeout = window.setTimeout(() => setPhase("pause"), 900);
      }
    } else if (phase === "pause") {
      timeout = window.setTimeout(() => setPhase("deleting"), 500);
    } else if (phase === "deleting") {
      if (typed.length > 0) {
        timeout = window.setTimeout(
          () => setTyped(line.slice(0, Math.max(0, typed.length - 1))),
          40
        );
      } else {
        setPhase("typing");
        setLineIndex((index) => (index + 1) % LINES.length);
      }
    }

    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [typed, phase, line]);

  return (
    <div className="cp-loading-screen">
      <div className="cp-loading-shell">
        <span className="cp-loading-badge">CharmXPals Live</span>
        <h2 className="cp-loading-typing" aria-live="polite">
          {typed}
          <span className="cp-loading-caret" aria-hidden />
        </h2>
        <div className="cp-loading-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="cp-loading-bar-fill" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
        <p className="cp-loading-sub">Syncing your interactive cockpit. Hold tight.</p>
      </div>
    </div>
  );
}
