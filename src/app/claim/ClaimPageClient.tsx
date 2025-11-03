'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { signIn, useSession } from 'next-auth/react';

import CharacterCard, { type CharacterBasic } from '@/components/CharacterCard';
import { hmacSHA256Hex } from '@/lib/webcrypto';

type Message = { kind: 'success' | 'error'; text: string };

const QrScannerDynamic = () => import('@/components/QrScanner');

const CODE_REGEX = /CXP-(?:[A-Z0-9]+-){4,}[A-Z0-9]+/i;

function findCodeInText(text: string): string | null {
  const match = text.toUpperCase().match(CODE_REGEX);
  return match ? match[0].toUpperCase() : null;
}

function extractClaimCode(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const keys = ['code', 'claim', 'token'];
      for (const key of keys) {
        const value = url.searchParams.get(key);
        if (value) {
          const match = findCodeInText(value);
          if (match) return match;
          return value.trim().toUpperCase();
        }
      }
      const pathSegments = url.pathname.split('/').filter(Boolean);
      if (pathSegments.length) {
        const segmentMatch = findCodeInText(pathSegments[pathSegments.length - 1]);
        if (segmentMatch) return segmentMatch;
      }
      if (url.hash) {
        const hashMatch = findCodeInText(url.hash.replace(/^#/, ''));
        if (hashMatch) return hashMatch;
      }
    } catch {
      // fall through to generic matching
    }
  }

  const directMatch = findCodeInText(trimmed);
  if (directMatch) return directMatch;

  if (/^https?:\/\//i.test(trimmed)) return '';

  return trimmed.toUpperCase();
}

type VerifyStatus = 'available' | 'claimed' | 'blocked' | 'not_found';
type ApiCharacterPayload = {
  id: string;
  name: string;
  description?: string | null;
  rarity: number;
  artRefs?: Record<string, string>;
  stats?: Record<string, number>;
  realm?: string | null;
  title?: string | null;
  tagline?: string | null;
  codeSeries?: string | null;
  slug?: string | null;
  color?: string | null;
};

type CharacterPreview = CharacterBasic & {
  stats?: Record<string, number> | null;
  slug?: string | null;
  color?: string | null;
};

type VerifyResponse = {
  status: VerifyStatus;
  character: ApiCharacterPayload | null;
};

type StartSuccess = {
  success: true;
  challengeId: string;
  nonce: string;
  timestamp: string;
  challengeDigest: string;
};

type StartError = { success: false; error: string };

type CompleteSuccess = { success: true; characterId: string; claimedAt: string; message: string };
type CompleteError = { success: false; error: string };

function toCharacterPreview(api: ApiCharacterPayload | null): CharacterPreview | null {
  if (!api) return null;
  return {
    id: api.id,
    name: api.name,
    description: api.description ?? null,
    rarity: api.rarity,
    artRefs: api.artRefs ?? undefined,
    realm: api.realm ?? null,
    title: api.title ?? null,
    tagline: api.tagline ?? null,
    codeSeries: api.codeSeries ?? null,
    stats: api.stats ?? null,
    slug: api.slug ?? null,
    color: api.color ?? null,
  };
}

export default function ClaimPageClient() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [character, setCharacter] = useState<CharacterPreview | null>(null);
  const [unitStatus, setUnitStatus] = useState<VerifyStatus | null>(null);
  const [claimedCharacterId, setClaimedCharacterId] = useState<string | null>(null);
  const [claimedAt, setClaimedAt] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.id);
  const promptSignIn = useCallback(() => {
    signIn(undefined, { callbackUrl: '/claim' }).catch(() => {});
  }, []);

  const QrScanner = useMemo(() => dynamic(QrScannerDynamic, { ssr: false }), []);

  const codeNormalized = code.trim();
  const hasUnlocked = Boolean(character && claimedCharacterId === character.id);

  useEffect(() => {
    try {
      const last = localStorage.getItem('cp:last_redeem_code');
      if (last) setCode(last);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (code) localStorage.setItem('cp:last_redeem_code', code);
    } catch {}
  }, [code]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!codeNormalized) {
      setMessage({ kind: 'error', text: 'Enter a code to continue.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setCharacter(null);
    setUnitStatus(null);
    setClaimedAt(null);
    setClaimedCharacterId(null);

    const sanitized = extractClaimCode(code);
    if (!sanitized) {
      setMessage({
        kind: 'error',
        text: 'Invalid format. Check your collectible for the authentic CharmXPal code.',
      });
      setLoading(false);
      return;
    }
    if (sanitized !== code) setCode(sanitized);

    try {
      if (!isAuthenticated) {
        setMessage({ kind: 'error', text: 'Sign in to claim your CharmXPal.' });
        promptSignIn();
        setLoading(false);
        return;
      }

      const verifyRes = await fetch('/api/claim/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sanitized }),
        cache: 'no-store',
      });
      if (!verifyRes.ok) {
        throw new Error('Verification failed. Try again.');
      }
      const verifyJson: VerifyResponse = await verifyRes.json();
      const preview = toCharacterPreview(verifyJson.character);
      setCharacter(preview);
      setUnitStatus(verifyJson.status);

      if (verifyJson.status === 'not_found') {
        throw new Error('Code not recognized. Double-check and retry.');
      }
      if (verifyJson.status === 'claimed') {
        setMessage({ kind: 'error', text: 'Already tagged. This pal belongs to another collector.' });
        return;
      }
      if (verifyJson.status === 'blocked') {
        setMessage({ kind: 'error', text: 'Code locked. Email support@charmxpals.com for help.' });
        return;
      }
      if (!preview) {
        throw new Error('Character data missing. Please contact support.');
      }

      const startRes = await fetch('/api/claim/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sanitized }),
        cache: 'no-store',
      });
      if (startRes.status === 401) {
        promptSignIn();
        throw new Error('Please sign in to start a claim.');
      }
      if (startRes.status === 403) {
        throw new Error('This challenge is locked to another session. Refresh and try again.');
      }
      const startJson: StartSuccess | StartError = await startRes.json();
      if (!startRes.ok || !startJson.success) {
        throw new Error((startJson as StartError).error || 'Claim sequence failed.');
      }

      const signature = await hmacSHA256Hex(sanitized, startJson.challengeDigest);

      const completeRes = await fetch('/api/claim/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: sanitized,
          challengeId: startJson.challengeId,
          signature,
        }),
        cache: 'no-store',
      });
      if (completeRes.status === 401) {
        promptSignIn();
        throw new Error('Session expired. Sign in again.');
      }
      const completeJson: CompleteSuccess | CompleteError = await completeRes.json();
      if (!completeRes.ok || !completeJson.success) {
        throw new Error((completeJson as CompleteError).error || 'Final sync failed.');
      }

      setClaimedCharacterId(completeJson.characterId);
      setClaimedAt(completeJson.claimedAt ?? null);
      setUnitStatus('claimed');

      const heroName = preview.name || 'CharmXPal';
      setMessage({
        kind: 'success',
        text: `${heroName} is now bound to your roster.`,
      });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'System glitch. Reload and retry.';
      setMessage({ kind: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-claim-page relative min-h-screen overflow-hidden px-4 py-16">
      <div className="cp-claim-backdrop" aria-hidden />
      <div className="cp-claim-grid" aria-hidden />

      <div className="cp-container relative">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
          <section className="space-y-10">
            <div className="space-y-4">
              <span className="inline-flex w-max items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}
                />
                {isAuthenticated ? 'Ready to claim' : 'Sign in required'}
              </span>
              <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
                Claim your CharmXPal
              </h1>
              <p className="max-w-xl text-lg text-white/70">
                Drop the code from your collectible to secure it to your account. We’ll verify authenticity before locking it in.
              </p>
              {isAuthenticated && session?.user?.name && (
                <p className="text-sm text-white/55">
                  Signed in as <span className="font-semibold text-white">{session.user.name}</span>
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex gap-3">
                  <span className="text-lg" aria-hidden>
                    ①
                  </span>
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">Enter or scan</h2>
                    <p className="text-sm text-white/60">CXP codes work from text, QR, or even pasted links.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <div className="flex gap-3">
                  <span className="text-lg" aria-hidden>
                    ②
                  </span>
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">We check the drop</h2>
                    <p className="text-sm text-white/60">Instant validation against the CharmXPal vault.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 sm:col-span-2">
                <div className="flex gap-3">
                  <span className="text-lg" aria-hidden>
                    ③
                  </span>
                  <div className="space-y-1">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-white/70">Claim and flex</h2>
                    <p className="text-sm text-white/60">Successful claims unlock the pal across every supported experience.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/65">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Need a hand?</h2>
              <p>
                Stuck on a code or seeing an error? Email{' '}
                <Link className="font-semibold text-white transition-colors hover:text-purple-200" href="mailto:support@charmxpals.com">
                  support@charmxpals.com
                </Link>{' '}
                with a photo of the collectible and we’ll get you unstuck fast.
              </p>
              <p className="text-xs text-white/40">Tip: good lighting helps the scanner lock on instantly.</p>
            </div>
          </section>

          <div className="cp-panel cp-claim-panel space-y-8 p-8 lg:p-10">
            <header className="space-y-2">
              <h2 className="font-display text-2xl font-semibold text-white">Redeem code</h2>
              <p className="text-sm text-white/60">Secure handshake on submit; duplicate claims are rejected automatically.</p>
            </header>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {!isAuthenticated && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-amber-100">
                  <span className="mt-1 text-lg" aria-hidden>
                    ⚠️
                  </span>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-wide">Sign in to finish your claim</p>
                    <button
                      type="button"
                      onClick={promptSignIn}
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-900 shadow-sm transition hover:bg-white/90"
                    >
                      Launch sign in
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label htmlFor="code" className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                  Claim code
                </label>
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      ref={inputRef}
                      id="code"
                      name="code"
                      type="text"
                      required
                      value={code}
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                      disabled={loading}
                      autoFocus
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="go"
                      placeholder="CXP-XXXX-XXXX..."
                      className="flex-1 rounded-xl border border-white/15 bg-white/[0.07] px-5 py-4 font-mono text-base tracking-[0.2em] text-white placeholder:text-white/30 focus:border-purple-400/70 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                    />
                    <div className="flex gap-2 sm:w-36 sm:flex-col">
                      <button
                        type="button"
                        onClick={() => setScanOpen(true)}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm font-semibold text-white transition hover:border-purple-400/50 hover:text-purple-100 disabled:opacity-50"
                      >
                        Scan
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) {
                              const parsed = extractClaimCode(String(text));
                              if (parsed) {
                                setCode(parsed);
                                setMessage(null);
                                setCharacter(null);
                                setUnitStatus(null);
                                setClaimedCharacterId(null);
                                setClaimedAt(null);
                                inputRef.current?.classList.add('animate-pulse');
                                setTimeout(() => inputRef.current?.classList.remove('animate-pulse'), 600);
                              } else {
                                setMessage({ kind: 'error', text: 'No valid code in clipboard.' });
                              }
                            }
                          } catch {
                            setMessage({ kind: 'error', text: 'Clipboard access blocked. Paste manually.' });
                          }
                        }}
                        disabled={loading}
                        className="flex-1 rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm font-semibold text-white transition hover:border-purple-400/50 hover:text-purple-100 disabled:opacity-50"
                      >
                        Paste
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-white/50">Paste a link, QR payload, or the raw code — we’ll tidy it for you.</p>
                </div>
              </div>

              {message && (
                <div
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    message.kind === 'success'
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                      : 'border-red-400/50 bg-red-500/10 text-red-100'
                  }`}
                >
                  <span className="text-lg" aria-hidden>
                    {message.kind === 'success' ? '✨' : '⚠️'}
                  </span>
                  <span className="leading-snug">{message.text}</span>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-white/50">
                  Having trouble?{' '}
                  <Link className="font-semibold text-white transition-colors hover:text-purple-200" href="mailto:support@charmxpals.com">
                    Contact support
                  </Link>
                </span>
                <button
                  type="submit"
                  disabled={loading || !codeNormalized}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:from-purple-400 hover:to-pink-400 disabled:opacity-60"
                >
                  {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                  {loading ? 'Claiming...' : 'Claim now'}
                </button>
              </div>
            </form>

            {character && (
              <div className="space-y-4 border-t border-white/10 pt-6">
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    hasUnlocked
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                      : unitStatus === 'available'
                        ? 'border-purple-400/40 bg-purple-500/10 text-purple-100'
                        : 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                  }`}
                >
                  {hasUnlocked
                    ? `${character.name} is now bound to your roster.`
                    : unitStatus === 'available'
                      ? `${character.name} is clear to claim — finish the handshake.`
                      : 'Status updated. Try a different code or reach out to support.'}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <CharacterCard c={character} owned={Boolean(hasUnlocked)} />
                </div>

                {claimedAt && (
                  <p className="text-center text-xs text-white/50">Claimed {new Date(claimedAt).toLocaleString()}</p>
                )}
              </div>
            )}

            <QrScanner
              open={scanOpen}
              onClose={() => setScanOpen(false)}
              onResult={(value: string) => {
                const parsed = extractClaimCode(String(value || ''));
                if (parsed) {
                  setCode(parsed);
                  setMessage(null);
                  setCharacter(null);
                  setUnitStatus(null);
                  setClaimedCharacterId(null);
                  setClaimedAt(null);
                } else {
                  setMessage({ kind: 'error', text: 'Invalid scan. Align and retry.' });
                }
                setScanOpen(false);
              }}
            />
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70 transition hover:text-white"
          >
            <span aria-hidden>←</span>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
