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
      <nav className="hidden md:flex items-center gap-6 cp-nav cp-nav-orbit">
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
        <summary className="list-none cursor-pointer rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--cp-text-primary)]">
          Menu
        </summary>
        <nav className="absolute right-0 top-[calc(100%+8px)] z-30 min-w-[180px] rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] p-2">
          {items.map((it) => {
            const active = isActivePath(pathname, it.href);
            return (
              <Link
                key={`mobile-${it.href}`}
                href={it.href}
                prefetch={false}
                className={`block rounded-[var(--cp-radius-sm)] px-3 py-2 text-sm font-semibold ${active ? 'bg-[var(--cp-gray-100)] text-[var(--cp-text-primary)]' : 'text-[var(--cp-text-secondary)] hover:bg-[var(--cp-gray-100)]'}`}
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
