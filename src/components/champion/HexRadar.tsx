'use client';

import { useEffect, useRef, useMemo } from 'react';

type Props = {
  stats: Record<string, number>;
  accentColor?: string;
  size?: number;
};

function clamp(v: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, v));
}

function prettify(key: string) {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

const STAT_COLORS: Record<string, string> = {
  rhythm: '#38bdf8',
  style: '#e879f9',
  power: '#fb7185',
  flow: '#34d399',
  teamwork: '#a78bfa',
};

export default function HexRadar({ stats, accentColor = '#38bdf8', size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);

  const entries = useMemo(() => {
    return Object.entries(stats).map(([key, val]) => ({
      key,
      label: prettify(key),
      value: clamp(Number(val)),
      color: STAT_COLORS[key.toLowerCase()] ?? accentColor,
    }));
  }, [stats, accentColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    progressRef.current = prefersReduced ? 1 : 0;
    const startTime = performance.now();
    const duration = prefersReduced ? 0 : 1200;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.38;
    const n = entries.length;
    if (n < 3) return;

    const angleStep = (Math.PI * 2) / n;
    const startAngle = -Math.PI / 2;

    function getPoint(index: number, r: number): [number, number] {
      const angle = startAngle + index * angleStep;
      return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r];
    }

    function draw(progress: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);

      // Grid rings
      for (let ring = 1; ring <= 4; ring++) {
        const r = (radius * ring) / 4;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const [px, py] = getPoint(i % n, r);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(255,255,255,${ring === 4 ? 0.12 : 0.06})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Axis lines
      for (let i = 0; i < n; i++) {
        const [px, py] = getPoint(i, radius);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Stat polygon with glow
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const idx = i % n;
        const val = entries[idx].value / 100;
        const r = radius * val * progress;
        const [px, py] = getPoint(idx, r);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Glow fill
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, `${accentColor}30`);
      gradient.addColorStop(1, `${accentColor}08`);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = `${accentColor}cc`;
      ctx.lineWidth = 2;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Stat dots
      for (let i = 0; i < n; i++) {
        const val = entries[i].value / 100;
        const r = radius * val * progress;
        const [px, py] = getPoint(i, r);

        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = entries[i].color;
        ctx.shadowColor = entries[i].color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }

      // Labels
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < n; i++) {
        const labelR = radius + 24;
        const [lx, ly] = getPoint(i, labelR);

        ctx.font = '600 10px "Space Grotesk", system-ui';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText(entries[i].label.toUpperCase(), lx, ly - 7);

        ctx.font = '700 14px "Teko", system-ui';
        ctx.fillStyle = entries[i].color;
        ctx.fillText(String(Math.round(entries[i].value * progress)), lx, ly + 8);
      }
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / Math.max(1, duration));
      // ease out expo
      progressRef.current = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
      draw(progressRef.current);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    if (prefersReduced) {
      draw(1);
    } else {
      animRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [entries, accentColor, size]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        aria-label={`Stat radar: ${entries.map((e) => `${e.label} ${e.value}`).join(', ')}`}
        role="img"
      />
    </div>
  );
}
