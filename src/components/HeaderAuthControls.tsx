'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type HeaderSession = {
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
};

type AuthState =
  | { status: 'loading'; displayName: string | null }
  | { status: 'authenticated'; displayName: string }
  | { status: 'unauthenticated'; displayName: null };

const DEFAULT_STATE: AuthState = { status: 'loading', displayName: null };

function resolveDisplayName(session: HeaderSession | null): string | null {
  const user = session?.user;
  if (!user?.id) return null;
  return user.name || user.email || 'You';
}

export default function HeaderAuthControls() {
  const [state, setState] = useState<AuthState>(DEFAULT_STATE);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (!response.ok) throw new Error(`session_http_${response.status}`);
        const payload = (await response.json()) as HeaderSession | null;
        if (!isActive) return;
        const displayName = resolveDisplayName(payload);
        if (displayName) {
          setState({ status: 'authenticated', displayName });
          return;
        }
      } catch {
        if (!isActive) return;
      }
      setState({ status: 'unauthenticated', displayName: null });
    };

    loadSession();
    return () => {
      isActive = false;
    };
  }, []);

  const signInClassName = useMemo(
    () =>
      'inline-flex items-center px-4 py-2 rounded-lg bg-[var(--cp-cyan)] text-black text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all duration-200',
    [],
  );

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const csrfResponse = await fetch('/api/auth/csrf', { cache: 'no-store' });
      if (!csrfResponse.ok) throw new Error('csrf_request_failed');
      const csrfPayload = (await csrfResponse.json()) as { csrfToken?: unknown };
      const csrfToken = typeof csrfPayload.csrfToken === 'string' ? csrfPayload.csrfToken : '';
      if (!csrfToken) throw new Error('csrf_token_missing');

      const body = new URLSearchParams();
      body.set('csrfToken', csrfToken);
      body.set('callbackUrl', '/');

      const signOutResponse = await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      window.location.assign(signOutResponse.url || '/');
      return;
    } catch {
      window.location.assign('/api/auth/signout?callbackUrl=/');
    }
  };

  if (state.status !== 'authenticated') {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" prefetch={false} className={signInClassName}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline-flex items-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
        {state.displayName}
      </span>
      <button
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-transparent text-white/40 text-xs font-semibold uppercase tracking-wider hover:border-white/20 hover:text-white/70 transition-all duration-200"
      >
        {isSigningOut ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
