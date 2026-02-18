'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

const items = [
  { href: '/explore', label: 'Explore' },
  { href: '/claim', label: 'Claim' },
  { href: '/play', label: 'Play' },
  { href: '/compare', label: 'Compare' },
  { href: '/me', label: 'My Pals' },
];

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppNav() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const buttonId = useId();
  const panelId = useId();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!mobileMenuRef.current?.contains(target)) {
        setIsMobileOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileOpen]);

  return (
    <>
      <nav className="hidden md:flex items-center gap-0.5 cp-nav cp-nav-orbit">
        {items.map((it) => {
          const active = isActivePath(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              prefetch={false}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative md:hidden" ref={mobileMenuRef}>
        <button
          id={buttonId}
          type="button"
          className="inline-flex min-w-[84px] items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70"
          aria-expanded={isMobileOpen}
          aria-controls={panelId}
          onClick={() => setIsMobileOpen((open) => !open)}
        >
          {isMobileOpen ? 'Close' : 'Menu'}
        </button>
        {isMobileOpen && (
          <nav
            id={panelId}
            aria-labelledby={buttonId}
            className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[196px] rounded-xl border border-white/[0.08] bg-[#0c0c1a]/95 p-1.5 shadow-[0_20px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            {items.map((it) => {
              const active = isActivePath(pathname, it.href);
              return (
                <Link
                  key={`mobile-${it.href}`}
                  href={it.href}
                  prefetch={false}
                  className={`block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
                    active ? 'bg-white/[0.08] text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
                  }`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setIsMobileOpen(false)}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </>
  );
}
