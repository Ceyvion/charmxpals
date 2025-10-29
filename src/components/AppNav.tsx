'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSfx } from '@/lib/sfx';

const items = [
  { href: '/explore', label: 'Explore', tint: 'aqua' },
  { href: '/claim', label: 'Claim', tint: 'sunrise' },
  { href: '/play', label: 'Play', tint: 'volt' },
  { href: '/compare', label: 'Compare', tint: 'violet' },
  { href: '/friends', label: 'Friends', tint: 'berry' },
  { href: '/me', label: 'My Pals', tint: 'mint' },
];

export default function AppNav() {
  const pathname = usePathname();
  const { playHover, playClick } = useSfx();
  const navRef = useRef<HTMLDivElement | null>(null);
  const orbRef = useRef<HTMLSpanElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  const hoverRef = useRef<HTMLAnchorElement | null>(null);
  const reduced = usePrefersReducedMotion();

  const setOrb = useCallback((target: HTMLAnchorElement | null, immediate = false) => {
    const nav = navRef.current;
    const orb = orbRef.current;
    if (!nav || !orb) return;
    if (!target) {
      orb.style.opacity = '0';
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const centerX = targetRect.left - navRect.left + targetRect.width / 2;
    const widthScale = Math.max(0.68, Math.min(1.38, targetRect.width / 80));
    orb.style.setProperty('--nav-orb-x', `${centerX}px`);
    orb.style.setProperty('--nav-orb-scale', widthScale.toFixed(3));
    orb.style.opacity = '1';
    if (immediate || reduced) {
      orb.style.transitionDuration = '0s';
      requestAnimationFrame(() => {
        if (orb) orb.style.transitionDuration = '';
      });
    }
  }, [reduced]);

  useEffect(() => {
    const activeItem = items.find((item) => pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href)));
    const node = activeItem ? linkRefs.current[activeItem.href] ?? null : null;
    activeRef.current = node;
    setOrb(node, true);
  }, [pathname, setOrb]);

  useEffect(() => {
    const handleResize = () => {
      const target = hoverRef.current ?? activeRef.current;
      setOrb(target, true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setOrb]);

  useEffect(() => {
    if (reduced) return;
    let raf: number | null = null;
    const handleScroll = () => {
      if (!orbRef.current) return;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        const offset = Math.sin(window.scrollY / 320);
        orbRef.current!.style.setProperty('--nav-orb-y', `${offset * 8}px`);
      });
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [reduced]);

  return (
    <nav ref={navRef} className="hidden md:flex items-center gap-6 cp-nav cp-nav-orbit">
      <span ref={orbRef} className="cp-nav-orb" aria-hidden />
      {items.map((it) => {
        const active = pathname === it.href || (it.href !== '/' && pathname?.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            ref={(node) => {
              if (node) linkRefs.current[it.href] = node;
            }}
            className={active ? 'active' : ''}
            aria-current={active ? 'page' : undefined}
            data-nav-active={active ? 'true' : 'false'}
            data-magnetic="nav"
            data-magnetic-color={it.tint}
            data-ripple
            onMouseEnter={() => {
              const node = linkRefs.current[it.href];
              if (!node) return;
              hoverRef.current = node;
              setOrb(node);
              playHover();
            }}
            onFocus={() => {
              const node = linkRefs.current[it.href];
              if (!node) return;
              hoverRef.current = node;
              setOrb(node);
              playHover();
            }}
            onMouseLeave={() => {
              hoverRef.current = null;
              setOrb(activeRef.current);
            }}
            onBlur={() => {
              if (hoverRef.current && hoverRef.current.href === linkRefs.current[it.href]?.href) {
                hoverRef.current = null;
              }
              setOrb(activeRef.current);
            }}
            onClick={() => {
              playClick();
            }}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefers(mq.matches);
    update();
    const handler = () => update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(handler);
    }
    return () => {
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', handler);
      } else if (typeof mq.removeListener === 'function') {
        mq.removeListener(handler);
      }
    };
  }, []);
  return prefers;
}
