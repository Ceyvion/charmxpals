"use client";

import { useEffect, useRef } from 'react';

export default function Aurora() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const aRef = useRef<HTMLDivElement | null>(null);
  const bRef = useRef<HTMLDivElement | null>(null);
  const cRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let raf: number | null = null;
    const onScroll = () => {
      if (raf) return; // throttle with rAF
      raf = requestAnimationFrame(() => {
        raf = null;
        const parent = el.parentElement as HTMLElement | null;
        const rect = parent?.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        const visible = rect ? Math.max(0, Math.min(1, 1 - Math.abs(rect.top) / (rect.height + vh))) : 1;
        const base = rect ? Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height))) : 0.5;
        const dy = (base - 0.5) * 60; // parallax range
        const dx = (base - 0.5) * 30;
        if (aRef.current) aRef.current.style.transform = `translate3d(${dx * -0.6}px, ${dy * -0.8}px, 0)`;
        if (bRef.current) bRef.current.style.transform = `translate3d(${dx * 0.5}px, ${dy * -0.4}px, 0)`;
        if (cRef.current) cRef.current.style.transform = `translate3d(${dx * 0.8}px, ${dy * 0.9}px, 0)`;
        el.style.opacity = String(0.8 * visible + 0.2);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
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
