"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import AppNav from "@/components/AppNav";
import InteractionEffects from "@/components/InteractionEffects";

export default function LayoutChrome({ children }: { children: React.ReactNode }) {
  // Keep a consistent frame across routes to feel connected
  usePathname();
  const { data: session, status } = useSession();
  const authenticated = status === 'authenticated';
  const displayName = session?.user?.name || session?.user?.email || 'You';

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-appearance', 'dark');
    if (typeof window !== 'undefined') window.localStorage.removeItem('cp:appearance');
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' }).catch(() => {});
  };
  return (
    <div className="min-h-screen flex flex-col">
      <InteractionEffects />
      <header className="cp-header bg-gray-900/60 backdrop-blur supports-[backdrop-filter]:bg-gray-900/50 border-b border-white/10 text-white">
        <div className="cp-container">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-extrabold tracking-tight font-display">
                CHARM PALS
              </Link>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-cyan-300 to-amber-300 text-slate-900 font-bold">beta</span>
            </div>
            <AppNav />
            <div className="flex items-center gap-2">
              {authenticated ? (
                <>
                  <span className="hidden sm:inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/80">
                    {displayName}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-white/80 text-sm font-semibold hover:bg-white/10 transition"
                    data-magnetic="chrome"
                    data-magnetic-color="sunrise"
                    data-ripple
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-slate-900 transition-transform duration-200 hover:translate-y-[-1px]"
                  data-magnetic="chrome"
                  data-magnetic-color="aqua"
                  data-ripple
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-300 via-blue-200 to-amber-200 opacity-90 transition-opacity duration-200 group-hover:opacity-100" />
                  <span className="absolute inset-0 rounded-full blur-xl bg-gradient-to-r from-cyan-200/50 via-blue-200/40 to-amber-200/50 opacity-70 group-hover:opacity-90" aria-hidden />
                  <span className="relative inline-flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-7.5A2.25 2.25 0 003.75 5.25v13.5A2.25 2.25 0 006 21h7.5a2.25 2.25 0 002.25-2.25V15" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9l3-3m0 0l3 3m-3-3v12" />
                    </svg>
                    <span>Sign in</span>
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">{children}</main>

      <footer className="cp-footer bg-gray-950 text-white py-12">
        <div className="cp-container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 font-display">CHARM PALS</h3>
              <p className="text-gray-400">
                The ultimate platform for physical-digital collectibles with immersive gameplay and social features.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/#how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
                <li><Link href="/claim" className="hover:text-white transition-colors">Claim</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} CharmPals. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
