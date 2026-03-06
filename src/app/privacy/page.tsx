import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'How the CharmPals beta currently handles account, claim, and gameplay data.',
  alternates: {
    canonical: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--cp-bg)] px-4 py-14">
      <div className="cp-container max-w-4xl space-y-8">
        <header className="space-y-3">
          <p className="cp-kicker">Privacy</p>
          <h1 className="font-display text-4xl font-black text-[var(--cp-text-primary)] md:text-5xl">
            Current beta privacy notes
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--cp-text-secondary)]">
            This is a short-form beta privacy page for the current build. It is meant to set expectations clearly while the platform is still evolving.
          </p>
        </header>

        <section className="cp-panel space-y-5 rounded-3xl p-6 text-sm leading-relaxed text-[var(--cp-text-secondary)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--cp-text-primary)]">What we store</h2>
            <p className="mt-2">
              The beta currently stores account information needed for sign-in, claim ownership records, and gameplay-related state required to run the app.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--cp-text-primary)]">How we use it</h2>
            <p className="mt-2">
              We use beta data to verify ownership, render your collection, operate gameplay surfaces, and improve the product based on bugs and usage patterns.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--cp-text-primary)]">Public profile behavior</h2>
            <p className="mt-2">
              Public profile pages are intended to show handles and public pal collections, not private account details.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--cp-text-primary)]">Questions</h2>
            <p className="mt-2">
              For beta privacy questions, contact <a className="font-semibold text-[var(--cp-text-primary)] hover:text-[var(--cp-red)]" href="mailto:charmxpals.contact@gmail.com">charmxpals.contact@gmail.com</a>.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
