"use client";

import { useEffect, useRef } from 'react';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function Aurora() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const aRef = useRef<HTMLDivElement | null>(null);
  const bRef = useRef<HTMLDivElement | null>(null);
  const cRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof window === 'undefined') return;
    const parent = el.parentElement as HTMLElement | null;
    if (!parent) return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (prefersReduced?.matches) {
      el.style.opacity = '1';
      return;
    }

    const metricsRef = { offsetTop: 0, height: parent.getBoundingClientRect().height || 1 };
    let raf: number | null = null;

    const measure = () => {
      const rect = parent.getBoundingClientRect();
      metricsRef.offsetTop = rect.top + window.scrollY;
      metricsRef.height = rect.height || 1;
    };

    const update = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight || 1;
      const top = metricsRef.offsetTop - scrollY;
      const visible = clamp(1 - Math.abs(top) / (metricsRef.height + vh), 0, 1);
      const base = clamp((vh - top) / (vh + metricsRef.height), 0, 1);
      const dy = (base - 0.5) * 60;
      const dx = (base - 0.5) * 30;
      if (aRef.current) aRef.current.style.transform = `translate3d(${dx * -0.6}px, ${dy * -0.8}px, 0)`;
      if (bRef.current) bRef.current.style.transform = `translate3d(${dx * 0.5}px, ${dy * -0.4}px, 0)`;
      if (cRef.current) cRef.current.style.transform = `translate3d(${dx * 0.8}px, ${dy * 0.9}px, 0)`;
      el.style.opacity = String(0.8 * visible + 0.2);
    };

    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        update();
      });
    };

    const handleResize = () => {
      measure();
      schedule();
    };

    measure();
    update();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="cp-aurora" ref={rootRef} aria-hidden>
      <div className="orb orb-a" ref={aRef} />
      <div className="orb orb-b" ref={bRef} />
      <div className="orb orb-c" ref={cRef} />
      <div className="cp-noise" />
    </div>
  );
}
