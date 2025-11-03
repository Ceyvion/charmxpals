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
    <div className="min-h-screen py-16 px-4 bg-grid-overlay">
      <div className="cp-container max-w-md">
        <div className="cp-panel p-8 space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white font-display mb-2">Sign in</h1>
            <p className="cp-muted">
              Use the beta access code shared with your onboarding email. Need an invite? Contact support.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1" htmlFor="code">Access code</label>
              <input
                id="code"
                type="password"
                required
                autoComplete="one-time-code"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50"
              />
            </div>
            {error && (
              <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/40 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <button
              disabled={loading || status === 'loading'}
              className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg font-bold disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
