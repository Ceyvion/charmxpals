"use client";

import { useEffect, useRef } from "react";

const SHARDS = [
  { top: "12%", left: "8%", size: 320, delay: "0s", duration: "19s", opacity: 0.28 },
  { top: "64%", left: "16%", size: 220, delay: "-6s", duration: "23s", opacity: 0.24 },
  { top: "30%", left: "74%", size: 260, delay: "-12s", duration: "21s", opacity: 0.3 },
  { top: "68%", left: "72%", size: 340, delay: "-3s", duration: "26s", opacity: 0.22 },
  { top: "40%", left: "45%", size: 180, delay: "-9s", duration: "18s", opacity: 0.28 },
  { top: "18%", left: "88%", size: 180, delay: "-15s", duration: "24s", opacity: 0.2 },
];

const PULSES = [
  { delay: "0s", left: "18%", bottom: "12%", scale: 1.1 },
  { delay: "-4s", left: "52%", bottom: "22%", scale: 0.9 },
  { delay: "-8s", left: "78%", bottom: "18%", scale: 1.25 },
];

export default function HeroAtmosphere() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf: number | null = null;

    const handlePointer = (event: PointerEvent) => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        const { innerWidth, innerHeight } = window;
        const normX = (event.clientX / innerWidth - 0.5) * 18;
        const normY = (event.clientY / innerHeight - 0.5) * 14;
        root.style.setProperty("--tilt-x", `${normY.toFixed(2)}deg`);
        root.style.setProperty("--tilt-y", `${normX.toFixed(2)}deg`);
      });
    };

    window.addEventListener("pointermove", handlePointer, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", handlePointer);
    };
  }, []);

  return (
    <div className="cp-hero-atmosphere" ref={rootRef} aria-hidden>
      <div className="cp-hero-aurora layer" />
      <div className="cp-hero-halo layer" />
      <div className="cp-hero-glow layer" />
      <div className="cp-hero-grid layer" />
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
          }}
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
          }}
        />
      ))}
    </div>
  );
}
