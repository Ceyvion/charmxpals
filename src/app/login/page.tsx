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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#140626] via-[#12002a] to-[#04010f]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-rose-500/30 to-purple-500/30 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-96 w-96 -translate-y-1/2 rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/40 blur-3xl" />
        <div className="absolute inset-0 bg-grid-overlay opacity-30" />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col justify-center px-4 py-16">
        <div className="cp-container max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-10 py-12 shadow-[0_40px_140px_rgba(64,0,128,0.25)] backdrop-blur-xl">
              <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-gradient-to-tr from-pink-500/40 to-fuchsia-500/10 blur-3xl" />
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                <span className="h-2 w-2 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.9)]" />
                CharmXPals Beta
              </span>
              <h1 className="mt-6 text-5xl font-extrabold text-white font-display leading-tight">
                Your portal to the <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-fuchsia-300 to-sky-300">CharmXPals</span> universe
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80">
                Sign in with the invite-only access code to unlock your pals, test drive the plaza, and help shape the launch.
              </p>
              <dl className="mt-10 grid gap-6 md:grid-cols-3">
                {[
                  { label: 'Claim Rewards', detail: 'Redeem your collectible and preview cosmetics.' },
                  { label: 'Explore Lore', detail: 'Dive into the dimensional roster inside /me.' },
                  { label: 'Drop Feedback', detail: 'Tell us what sings—or what needs remixing.' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-white/60">{item.label}</dt>
                    <dd className="mt-2 text-sm text-white/85">{item.detail}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-10 flex flex-wrap items-center gap-3 text-xs text-white/60">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.85)]" />
                  Sessions secure via NextAuth
                </span>
                <span>Need help? <a href="mailto:beta@charmxpals.com" className="font-semibold text-white/80 hover:text-white">beta@charmxpals.com</a></span>
              </div>
            </section>

            <section className="relative flex flex-col justify-center rounded-3xl border border-white/15 bg-[#0c0519]/70 px-8 py-10 shadow-[0_30px_120px_rgba(32,0,96,0.35)] backdrop-blur-2xl">
              <div className="absolute -top-12 right-12 h-32 w-32 rounded-full bg-gradient-to-br from-pink-400/40 to-purple-500/20 blur-2xl" />
              <div className="relative z-10 space-y-6">
                <header className="space-y-3">
                  <h2 className="text-3xl font-display font-extrabold text-white">Beta Access</h2>
                  <p className="text-sm text-white/70">
                    Use the email you registered with and the secure beta code from your welcome note.
                  </p>
                </header>
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-white/60" htmlFor="email">Email</label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white shadow-inner focus:border-pink-400 focus:ring-2 focus:ring-pink-400/40 placeholder:text-white/40"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-white/60" htmlFor="code">Access code</label>
                    <input
                      id="code"
                      type="password"
                      required
                      autoComplete="one-time-code"
                      value={accessCode}
                      onChange={(event) => setAccessCode(event.target.value)}
                      placeholder="••••••••••"
                      className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white shadow-inner focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40 placeholder:text-white/40"
                    />
                  </div>
                  {error && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                      {error}
                    </div>
                  )}
                  <button
                    disabled={loading || status === 'loading'}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-white to-white text-gray-900 px-4 py-3 text-sm font-bold transition hover:shadow-[0_18px_50px_rgba(255,255,255,0.2)] disabled:opacity-60"
                  >
                    {loading ? 'Signing in…' : 'Enter Beta'}
                  </button>
                </form>
                <footer className="pt-4 text-xs text-white/50">
                  By continuing you agree to help us test pre-release features. Capture bugs or delight and send it to the beta squad.
                </footer>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
