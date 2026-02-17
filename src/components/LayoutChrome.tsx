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
    <div className="min-h-screen flex flex-col">
      <header className="cp-header border-b">
        <div className="cp-container">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" prefetch={false} className="text-2xl font-extrabold tracking-tight font-display">
                CHARM PALS
              </Link>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-[var(--cp-radius-sm)] bg-[var(--cp-yellow)] text-[var(--cp-black)] font-bold uppercase tracking-wider">beta</span>
            </div>
            <AppNav />
            <div className="flex items-center gap-2">
              {authenticated ? (
                <>
                  <span className="hidden sm:inline-flex items-center rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--cp-text-primary)]">
                    {displayName}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-transparent text-[var(--cp-text-secondary)] text-sm font-semibold hover:border-[var(--cp-border-strong)] transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  prefetch={false}
                  className="cp-cta-primary text-sm"
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
              <h3 className="text-lg font-bold mb-4 font-display text-[var(--cp-text-primary)]">CHARM PALS</h3>
              <p className="text-[var(--cp-text-muted)]">
                The ultimate platform for physical-digital collectibles with immersive gameplay and social features.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[var(--cp-text-primary)]">Product</h4>
              <ul className="space-y-2 text-[var(--cp-text-muted)]">
                <li><Link href="/#features" prefetch={false} className="hover:text-[var(--cp-red)] transition-colors">Features</Link></li>
                <li><Link href="/#how-it-works" prefetch={false} className="hover:text-[var(--cp-red)] transition-colors">How It Works</Link></li>
                <li><Link href="/claim" prefetch={false} className="hover:text-[var(--cp-red)] transition-colors">Claim</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[var(--cp-text-primary)]">Company</h4>
              <ul className="space-y-2 text-[var(--cp-text-muted)]">
                <li><a href="#" className="hover:text-[var(--cp-red)] transition-colors">About</a></li>
                <li><a href="#" className="hover:text-[var(--cp-red)] transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-[var(--cp-red)] transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-[var(--cp-text-primary)]">Support</h4>
              <ul className="space-y-2 text-[var(--cp-text-muted)]">
                <li><a href="#" className="hover:text-[var(--cp-red)] transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-[var(--cp-red)] transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-[var(--cp-red)] transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t-2 border-[var(--cp-border)] mt-12 pt-8 text-center text-[var(--cp-text-muted)]">
            <p>&copy; {new Date().getFullYear()} CharmPals. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
