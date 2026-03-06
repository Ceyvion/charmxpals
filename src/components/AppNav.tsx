import Link from 'next/link';

const items = [
  { href: '/explore', label: 'Explore' },
  { href: '/claim', label: 'Claim' },
  { href: '/play', label: 'Play' },
  { href: '/compare', label: 'Compare' },
  { href: '/me', label: 'My Pals' },
];

export default function AppNav() {
  return (
    <>
      <nav className="hidden md:flex items-center gap-0.5 cp-nav cp-nav-orbit" aria-label="Primary">
        {items.map((it) => (
          <Link key={it.href} href={it.href} prefetch={false}>
            {it.label}
          </Link>
        ))}
      </nav>

      <details className="relative md:hidden group">
        <summary
          className="list-none inline-flex min-w-[84px] items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 cursor-pointer select-none [&::-webkit-details-marker]:hidden"
          aria-label="Toggle navigation menu"
        >
          <span className="group-open:hidden">Menu</span>
          <span className="hidden group-open:inline">Close</span>
        </summary>
        <nav className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[196px] rounded-xl border border-white/[0.08] bg-[#0c0c1a]/95 p-1.5 shadow-[0_20px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl" aria-label="Mobile">
          {items.map((it) => (
            <Link
              key={`mobile-${it.href}`}
              href={it.href}
              prefetch={false}
              className="block rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors text-white/55 hover:bg-white/[0.04] hover:text-white"
            >
              {it.label}
            </Link>
          ))}
        </nav>
      </details>
    </>
  );
}
