"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = useMemo(() => searchParams?.get('next') || '/me', [searchParams]);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(next);
    }
  }, [status, router, next]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        accessCode,
        redirect: false,
        callbackUrl: next,
      });
      if (result?.error) {
        throw new Error(result.error === 'CredentialsSignin' ? 'Invalid email or access code.' : result.error);
      }
      if (result?.url) {
        router.push(result.url);
        router.refresh();
        return;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#fff3e4] via-[#f7fbff] to-[#fffdf6]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-orange-300/35 to-amber-200/30 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-sky-300/30 to-teal-200/40 blur-3xl" />
        <div className="absolute inset-0 bg-grid-overlay opacity-30" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-4 py-16">
        <div className="cp-container max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="relative overflow-hidden rounded-3xl border-2 border-[var(--cp-border)] bg-white/85 px-10 py-12 shadow-[0_40px_140px_rgba(110,206,242,0.22)] backdrop-blur-xl">
              <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-gradient-to-tr from-amber-300/40 to-sky-200/10 blur-3xl" />
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--cp-text-secondary)]">
                <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                CharmXPals Beta
              </span>
              <h1 className="mt-6 text-5xl font-extrabold text-[var(--cp-text-primary)] font-display leading-tight">
                Early Build. Real Testing. <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-sky-300">Your Input Matters.</span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--cp-text-secondary)]">
                Limited beta access. Test core mechanics, preview the plaza, and help us ship something worth playing.
              </p>
              <div className="mt-10 space-y-8">
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--cp-text-muted)]">What&apos;s Live</h3>
                  <dl className="grid gap-6 md:grid-cols-3">
                    {[
                      { label: 'Claim Beta Rewards', detail: 'Grab your early-access collectible and test cosmetic systems.' },
                      { label: 'Explore the Roster', detail: 'Limited character pool available. More dropping each phase.' },
                      { label: 'Test the Plaza', detail: 'Core mechanics only. Expect bugs. Report everything.' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-5">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--cp-text-secondary)]">{item.label}</dt>
                        <dd className="mt-2 text-sm text-[var(--cp-text-muted)]">{item.detail}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="rounded-2xl border border-dashed border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-4 py-5 text-sm text-[var(--cp-text-secondary)]">
                  Full roster, ranked modes, and trading coming at launch.
                </div>
              </div>
              <div className="mt-10 text-sm text-[var(--cp-text-secondary)]">
                Found something broken? Good. Report it: <a href="mailto:charmxpals.contact@gmail.com" className="font-semibold text-[var(--cp-text-primary)] hover:text-[var(--cp-red)]">charmxpals.contact@gmail.com</a>
              </div>
            </section>

            <section className="relative flex flex-col justify-center rounded-3xl border-2 border-[var(--cp-border)] bg-white/90 px-8 py-10 shadow-[0_30px_120px_rgba(110,206,242,0.2)] backdrop-blur-2xl">
              <div className="absolute -top-12 right-12 h-32 w-32 rounded-full bg-gradient-to-br from-amber-300/35 to-sky-300/25 blur-2xl" />
              <div className="relative z-10 space-y-6">
                <header className="space-y-3">
                  <h2 className="text-3xl font-display font-extrabold text-[var(--cp-text-primary)]">Beta Build v0.X</h2>
                  <p className="text-sm text-[var(--cp-text-secondary)]">Access Code Required.</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                    Warning: Active development build. Progress may reset. Features may break.
                  </p>
                </header>
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--cp-text-muted)]" htmlFor="email">Email</label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-3 text-sm text-[var(--cp-text-primary)] shadow-inner placeholder:text-[var(--cp-text-muted)] focus:border-amber-400 focus:ring-2 focus:ring-amber-300/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--cp-text-muted)]" htmlFor="code">Access code</label>
                    <input
                      id="code"
                      type="password"
                      required
                      autoComplete="one-time-code"
                      value={accessCode}
                      onChange={(event) => setAccessCode(event.target.value)}
                      placeholder="••••••••••"
                      className="w-full rounded-xl border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-4 py-3 text-sm text-[var(--cp-text-primary)] shadow-inner placeholder:text-[var(--cp-text-muted)] focus:border-sky-300 focus:ring-2 focus:ring-sky-200/40"
                    />
                  </div>
                  {error && (
                    <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <button
                    disabled={loading || status === 'loading'}
                    className="cp-cta-primary w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Signing in…' : 'Enter Beta'}
                  </button>
                </form>
                <footer className="pt-4 text-xs text-[var(--cp-text-muted)]">
                  Issues? <a href="mailto:charmxpals.contact@gmail.com" className="font-semibold text-[var(--cp-text-primary)] hover:text-[var(--cp-red)]">charmxpals.contact@gmail.com</a>
                </footer>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
