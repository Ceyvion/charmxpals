'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

      <details className="relative md:hidden">
        <summary className="list-none cursor-pointer rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
          Menu
        </summary>
        <nav className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[180px] rounded-xl border border-white/[0.08] bg-[#0c0c1a]/95 backdrop-blur-xl p-1.5">
          {items.map((it) => {
            const active = isActivePath(pathname, it.href);
            return (
              <Link
                key={`mobile-${it.href}`}
                href={it.href}
                prefetch={false}
                className={`block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${active ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'}`}
                aria-current={active ? 'page' : undefined}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </details>
    </>
  );
}
