"use client";

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  translateY?: number;
};

export default function RevealOnView({ children, className, delay = 0, translateY = 12 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const style = {
    '--reveal-delay': `${delay}ms`,
    '--reveal-offset': `${translateY}px`,
  } as CSSProperties;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (prefersReduced?.matches) {
      el.dataset.revealState = 'shown';
      return;
    }

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    if (rect.top <= vh && rect.bottom >= 0) {
      el.dataset.revealState = 'shown';
      return;
    }

    el.dataset.revealState = 'pending';
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          el.dataset.revealState = 'shown';
          io.disconnect();
          break;
        }
      }
    }, { threshold: 0.18 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
