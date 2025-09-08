"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = params.get('next') || '/me';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Login failed');
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-16 px-4 bg-grid-overlay">
      <div className="cp-container max-w-md">
        <div className="cp-panel p-8">
          <h1 className="text-3xl font-extrabold text-white font-display mb-2">Sign in</h1>
          <p className="cp-muted mb-6">Developer login (dev-only). Defaults are admin / admin.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1" htmlFor="u">Username</label>
              <input id="u" className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/10 text-white" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1" htmlFor="p">Password</label>
              <input id="p" type="password" className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/10 text-white" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">{error}</div>}
            <button disabled={loading} className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg font-bold disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

