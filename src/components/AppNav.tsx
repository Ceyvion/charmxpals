'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const items = [
  { href: '/explore', label: 'Explore' },
  { href: '/claim', label: 'Claim' },
  { href: '/play', label: 'Play' },
  { href: '/compare', label: 'Compare' },
  { href: '/me', label: 'My Pals' },
];

export default function AppNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (mobileNavRef.current?.contains(target)) return;
      setMobileOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      <nav className="hidden md:flex items-center gap-0.5 cp-nav cp-nav-orbit" aria-label="Primary">
        {items.map((it) => (
          <Link key={it.href} href={it.href} prefetch={false}>
            {it.label}
          </Link>
        ))}
      </nav>

      <div ref={mobileNavRef} className="relative md:hidden">
        <button
          type="button"
          className="inline-flex min-w-[84px] items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 transition-colors hover:border-white/20 hover:text-white"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span>{mobileOpen ? 'Close' : 'Menu'}</span>
        </button>

        {mobileOpen ? (
          <>
            <button
              type="button"
              aria-label="Close navigation menu"
              className="fixed inset-0 z-40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <nav
              className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[196px] rounded-xl border border-white/[0.08] bg-[#0c0c1a]/95 p-1.5 shadow-[0_20px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              aria-label="Mobile"
            >
              {items.map((it) => (
                <Link
                  key={`mobile-${it.href}`}
                  href={it.href}
                  prefetch={false}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors text-white/55 hover:bg-white/[0.04] hover:text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  {it.label}
                </Link>
              ))}
            </nav>
          </>
        ) : null}
      </div>
    </>
  );
}
