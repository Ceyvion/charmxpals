import Link from "next/link";
import AppNav from "@/components/AppNav";
import HeaderAuthControls from "@/components/HeaderAuthControls";
import AnalyticsTracker from "@/components/AnalyticsTracker";

export default function LayoutChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--cp-bg)]">
      <AnalyticsTracker />
      <header className="cp-header sticky top-0 z-40">
        <div className="cp-container">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/" prefetch={false} className="group flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight font-display text-white transition-colors group-hover:text-[var(--cp-cyan)]">
                  CHARM PALS
                </span>
              </Link>
            </div>

            <AppNav />

            <HeaderAuthControls />
          </div>
        </div>
      </header>

      <main className="flex-grow bg-[var(--cp-bg)]">{children}</main>

      <footer className="cp-footer py-12">
        <div className="cp-container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 font-display text-white">CHARM PALS</h3>
              <p className="text-white/35 text-sm leading-relaxed">
                Claim a physical collectible, unlock your pal, and move from roster to playable beta surfaces fast.
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
              <h4 className="font-bold mb-4 text-white/70 text-xs uppercase tracking-[0.2em]">Experiences</h4>
              <ul className="space-y-2.5">
                <li><Link href="/play" prefetch={false} className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Play</Link></li>
                <li><Link href="/arena" prefetch={false} className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Arena</Link></li>
                <li><Link href="/compare" prefetch={false} className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Compare</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-white/70 text-xs uppercase tracking-[0.2em]">Support</h4>
              <ul className="space-y-2.5">
                <li><Link href="/support" prefetch={false} className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Support</Link></li>
                <li><a href="mailto:charmxpals.contact@gmail.com" className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Contact</a></li>
                <li><Link href="/privacy" prefetch={false} className="text-sm text-white/35 hover:text-[var(--cp-cyan)] transition-colors">Privacy Policy</Link></li>
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
