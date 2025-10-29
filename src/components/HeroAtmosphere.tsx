"use client";

import { useEffect, useRef, type CSSProperties } from "react";

const SHARDS = [
  { top: "12%", left: "8%", size: 320, delay: "0s", duration: "19s", opacity: 0.28, depth: 0.45 },
  { top: "64%", left: "16%", size: 220, delay: "-6s", duration: "23s", opacity: 0.24, depth: 0.6 },
  { top: "30%", left: "74%", size: 260, delay: "-12s", duration: "21s", opacity: 0.3, depth: 0.35 },
  { top: "68%", left: "72%", size: 340, delay: "-3s", duration: "26s", opacity: 0.22, depth: 0.7 },
  { top: "40%", left: "45%", size: 180, delay: "-9s", duration: "18s", opacity: 0.28, depth: 0.25 },
  { top: "18%", left: "88%", size: 180, delay: "-15s", duration: "24s", opacity: 0.2, depth: 0.8 },
];

const PULSES = [
  { delay: "0s", left: "18%", bottom: "12%", scale: 1.1, depth: 0.2 },
  { delay: "-4s", left: "52%", bottom: "22%", scale: 0.9, depth: 0.35 },
  { delay: "-8s", left: "78%", bottom: "18%", scale: 1.25, depth: 0.15 },
];

export default function HeroAtmosphere() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const pointerFine = window.matchMedia?.("(pointer: fine)");

    let raf: number | null = null;
    let attached = false;

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const applyPointer = () => {
      const { innerWidth, innerHeight } = window;
      const normX = (pointer.x / innerWidth - 0.5) * 24;
      const normY = (pointer.y / innerHeight - 0.5) * 20;
      root.style.setProperty("--tilt-x", `${(normY * 0.6).toFixed(2)}deg`);
      root.style.setProperty("--tilt-y", `${(normX * 0.6).toFixed(2)}deg`);
      root.style.setProperty("--parallax-x", `${(normX * 12).toFixed(2)}px`);
      root.style.setProperty("--parallax-y", `${(normY * -16).toFixed(2)}px`);
      root.style.setProperty("--parallax-x", "0px");
      root.style.setProperty("--parallax-y", "0px");
    };

    const handlePointer = (event: PointerEvent) => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        applyPointer();
      });
    };

    const detach = () => {
      if (!attached) return;
      window.removeEventListener("pointermove", handlePointer);
      attached = false;
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = null;
      }
      root.style.setProperty("--tilt-x", "0deg");
      root.style.setProperty("--tilt-y", "0deg");
    };

    const attach = () => {
      if (attached) return;
      window.addEventListener("pointermove", handlePointer, { passive: true });
      attached = true;
      applyPointer();
    };

    const evaluate = () => {
      const allowMotion = !prefersReduced?.matches;
      const allowPointer = pointerFine?.matches ?? true;
      if (allowMotion && allowPointer) {
        attach();
      } else {
        detach();
      }
    };

    evaluate();
    applyPointer();

    const subscribe = (query: MediaQueryList | undefined, listener: (event: MediaQueryListEvent) => void) => {
      if (!query) return;
      if (typeof query.addEventListener === "function") {
        query.addEventListener("change", listener);
      } else if (typeof query.addListener === "function") {
        query.addListener(listener);
      }
    };

    const unsubscribe = (query: MediaQueryList | undefined, listener: (event: MediaQueryListEvent) => void) => {
      if (!query) return;
      if (typeof query.removeEventListener === "function") {
        query.removeEventListener("change", listener);
      } else if (typeof query.removeListener === "function") {
        query.removeListener(listener);
      }
    };

    const handleChange = () => evaluate();
    subscribe(prefersReduced, handleChange);
    subscribe(pointerFine, handleChange);

    return () => {
      unsubscribe(prefersReduced, handleChange);
      unsubscribe(pointerFine, handleChange);
      detach();
    };
  }, []);

  return (
    <div className="cp-hero-atmosphere" ref={rootRef} aria-hidden>
      <div className="cp-hero-aurora layer" style={{ "--depth": 0.08 } as CSSProperties} />
      <div className="cp-hero-halo layer" style={{ "--depth": 0.18 } as CSSProperties} />
      <div className="cp-hero-glow layer" style={{ "--depth": 0.28 } as CSSProperties} />
      <div className="cp-hero-grid layer" style={{ "--depth": 0.12 } as CSSProperties} />
      {SHARDS.map((shard, idx) => (
        <span
          key={idx}
          className="cp-hero-shard layer"
          style={{
            top: shard.top,
            left: shard.left,
            width: shard.size,
            height: shard.size,
            animationDelay: shard.delay,
            animationDuration: shard.duration,
            opacity: shard.opacity,
            "--depth": shard.depth,
          } as CSSProperties}
        />
      ))}

      {PULSES.map((pulse, idx) => (
        <span
          key={`pulse-${idx}`}
          className="cp-hero-pulse layer"
          style={{
            animationDelay: pulse.delay,
            left: pulse.left,
            bottom: pulse.bottom,
            transform: `scale(${pulse.scale})`,
            "--depth": pulse.depth,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
