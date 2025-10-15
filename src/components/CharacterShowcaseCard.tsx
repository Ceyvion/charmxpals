"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  name: string;
  rarity: number;
  image?: string | null;
  rating?: number | null;
};

function rarityMeta(r: number) {
  if (r >= 5) return { label: "Legendary" };
  if (r >= 4) return { label: "Epic" };
  return { label: "Rare" };
}

export default function CharacterShowcaseCard({ name, rarity, image, rating }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tCard, setTCard] = useState("none");
  const [tImg, setTImg] = useState("scale(1)");
  const meta = rarityMeta(rarity);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const rx = py * -10; const ry = px * 12; const tz = 8;
      setTCard(`rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px)`);
      setTImg(`translate(${px * 14}px, ${py * 10}px) scale(1.08)`);
    };
    const onLeave = () => { setTCard("none"); setTImg("scale(1)"); };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);

  const hasImage = !!image;
  const score = rating ?? Number((rarity + 2.7).toFixed(1));

  return (
    <div className="cp-parallax">
      <div
        ref={ref}
        className="relative rounded-2xl border border-white/10 bg-white/5 overflow-hidden cp-parallax-card"
        style={{ transform: tCard, boxShadow: '0 28px 70px rgba(198,165,255,0.26), 0 14px 34px rgba(255,159,213,0.22)' }}
      >
        <div className="relative h-[380px] md:h-[460px] overflow-hidden">
          {hasImage ? (
            <>
              <img src={image!} alt={name} className="absolute inset-0 w-full h-full object-cover cp-media-mask cp-parallax-img" style={{ transform: tImg }} />
              <div className="absolute inset-0 cp-inner-shadow pointer-events-none" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(48,18,67,0.24), rgba(48,18,67,0.05))' }} />
            </>
          ) : (
            <>
              <div className="absolute inset-0" style={{ backgroundImage: 'var(--cp-gradient)', opacity: 0.85 }} />
              <div className="absolute inset-0 bg-grid-overlay opacity-25" />
            </>
          )}

          {/* Glow shine on hover */}
          <div className="pointer-events-none absolute -inset-[20%] opacity-0 hover:opacity-45 transition-opacity" style={{ background: 'radial-gradient(600px 300px at 50% 0%, rgba(255,159,213,0.38), rgba(127,234,255,0))' }} />

          {/* Badges */}
          <div className="absolute top-4 left-4 cp-chip text-xs font-bold">{meta.label}</div>
          <div className="absolute top-4 right-4 cp-chip text-xs font-bold">{score}</div>
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="text-white font-display text-3xl md:text-4xl font-extrabold drop-shadow-[0_6px_18px_rgba(255,159,213,0.55)]">{name}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
