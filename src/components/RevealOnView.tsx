"use client";

import { useEffect, useRef } from 'react';
import anime from 'animejs/lib/anime.es.js';

type Props = {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  delay?: number;
  translateY?: number;
};

export default function RevealOnView({ children, as = 'div', className, delay = 0, translateY = 12 }: Props) {
  const Tag: any = as;
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let observed = false;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !observed) {
          observed = true;
          anime({
            targets: el,
            opacity: [0, 1],
            translateY: [translateY, 0],
            duration: 520,
            delay,
            easing: 'easeOutQuad',
          });
          io.disconnect();
          break;
        }
      }
    }, { threshold: 0.18 });
    el.style.opacity = '0';
    el.style.transform = `translateY(${translateY}px)`;
    io.observe(el);
    return () => io.disconnect();
  }, [delay, translateY]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

