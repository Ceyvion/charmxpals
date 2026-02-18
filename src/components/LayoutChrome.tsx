"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import AppNav from "@/components/AppNav";

export default function LayoutChrome({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const authenticated = status === 'authenticated';
  const displayName = session?.user?.name || session?.user?.email || 'You';

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' }).catch(() => {});
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060610]">
      <header className="cp-header sticky top-0 z-40">
        <div className="cp-container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/" prefetch={false} className="group flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight font-display text-white transition-colors group-hover:text-[var(--cp-cyan)]">
                  CHARM PALS
                </span>
              </Link>
              <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-[var(--cp-cyan)]/15 text-[var(--cp-cyan)] font-bold uppercase tracking-[0.2em] border border-[var(--cp-cyan)]/25">
                beta
              </span>
            </div>

            <AppNav />

            <div className="flex items-center gap-2">
              {authenticated ? (
                <>
                  <span className="hidden sm:inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
                    {displayName}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-transparent text-white/40 text-xs font-semibold uppercase tracking-wider hover:border-white/20 hover:text-white/70 transition-all duration-200"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  prefetch={false}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--cp-cyan)] text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all duration-200"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">{children}</main>

      <footer className="cp-footer py-12">
        <div className="cp-container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 font-display text-white">CHARM PALS</h3>
              <p className="text-white/35 text-sm leading-relaxed">
                The ultimate platform for physical-digital collectibles with immersive gameplay and social features.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white/70 text-xs uppercase tracking-[0.2em]">Product</h4>
              <ul className="space-y-2.5">
                <li><Link href="/#features" prefetch={false} className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Features</Link></li>
                <li><Link href="/#how-it-works" prefetch={false} className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">How It Works</Link></li>
                <li><Link href="/claim" prefetch={false} className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Claim</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white/70 text-xs uppercase tracking-[0.2em]">Company</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">About</a></li>
                <li><a href="#" className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white/70 text-xs uppercase tracking-[0.2em]">Support</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">FAQ</a></li>
                <li><a href="#" className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Contact</a></li>
                <li><a href="#" className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/[0.06] mt-12 pt-8 text-center text-white/25 text-sm">
            <p>&copy; {new Date().getFullYear()} CharmPals. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
