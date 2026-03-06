import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with beta access, claim issues, and gameplay feedback for CharmPals.',
  alternates: {
    canonical: '/support',
  },
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[var(--cp-bg)] px-4 py-14">
      <div className="cp-container max-w-4xl space-y-8">
        <header className="space-y-3">
          <p className="cp-kicker">Support</p>
          <h1 className="font-display text-4xl font-black text-[var(--cp-text-primary)] md:text-5xl">
            Help for the current beta
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--cp-text-secondary)]">
            If something fails, we want the repro. The current beta is centered on claiming a pal, syncing it to your account, and getting into the playable surfaces quickly.
          </p>
        </header>

        <section className="cp-panel space-y-4 rounded-3xl p-6">
          <h2 className="font-display text-2xl font-bold text-[var(--cp-text-primary)]">Fast paths</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-white)] p-5">
              <h3 className="text-lg font-semibold text-[var(--cp-text-primary)]">Claim problems</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--cp-text-secondary)]">
                If a code shows as invalid, claimed, or blocked unexpectedly, include the exact error state and whether it happened during verify or completion.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-white)] p-5">
              <h3 className="text-lg font-semibold text-[var(--cp-text-primary)]">Gameplay issues</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--cp-text-secondary)]">
                For arena, plaza, or runner issues, include device, browser, route, and what you expected versus what actually happened.
              </p>
            </div>
          </div>
        </section>

        <section className="cp-panel rounded-3xl p-6">
          <h2 className="font-display text-2xl font-bold text-[var(--cp-text-primary)]">Contact</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--cp-text-secondary)]">
            Email <a className="font-semibold text-[var(--cp-text-primary)] hover:text-[var(--cp-red)]" href="mailto:charmxpals.contact@gmail.com">charmxpals.contact@gmail.com</a> with screenshots, clips, or repro steps.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/claim" className="rounded-lg border-2 border-[var(--cp-black)] bg-[var(--cp-black)] px-4 py-2 text-[var(--cp-white)] transition-colors hover:bg-[var(--cp-gray-900)]">
              Go to Claim
            </Link>
            <Link href="/play" className="rounded-lg border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-2 text-[var(--cp-text-secondary)] transition-colors hover:border-[var(--cp-border-strong)] hover:text-[var(--cp-text-primary)]">
              Open Play Hub
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
