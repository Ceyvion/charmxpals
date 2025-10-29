'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

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

type DevUser = { id: string; email: string; handle: string | null };

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
  const [user, setUser] = useState<DevUser | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const ensureUser = useCallback(async (): Promise<DevUser> => {
    if (user) return user;
    const res = await fetch('/api/dev/user', { method: 'GET', credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to load your dev profile. Refresh and try again.');
    }
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; user?: DevUser; error?: string };
    if (!json.success || !json.user) {
      throw new Error(json.error || 'Failed to load your dev profile. Refresh and try again.');
    }
    setUser(json.user);
    return json.user;
  }, [user]);

  useEffect(() => {
    ensureUser().catch(() => {});
  }, [ensureUser]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!codeNormalized) {
      setMessage({ kind: 'error', text: 'Drop a code to proceed.' });
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
      const currentUser = await ensureUser();

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
        setMessage({ kind: 'error', text: 'Already tagged! This champion belongs to someone else.' });
        return;
      }
      if (verifyJson.status === 'blocked') {
        setMessage({ kind: 'error', text: 'Code locked. Hit up support@charmxpals.com' });
        return;
      }
      if (!preview) {
        throw new Error('Champion data missing. Alert the crew.');
      }

      const startRes = await fetch('/api/claim/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sanitized }),
        cache: 'no-store',
      });
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
          userId: currentUser.id,
        }),
        cache: 'no-store',
      });
      const completeJson: CompleteSuccess | CompleteError = await completeRes.json();
      if (!completeRes.ok || !completeJson.success) {
        throw new Error((completeJson as CompleteError).error || 'Final sync failed.');
      }

      setClaimedCharacterId(completeJson.characterId);
      setClaimedAt(completeJson.claimedAt ?? null);
      setUnitStatus('claimed');
      setShowSuccessAnimation(true);

      const heroName = preview.name || 'CharmXPal';
      setMessage({
        kind: 'success',
        text: `🔥 ${heroName} just hit the floor! Welcome to the crew.`,
      });

      // Reset animation after 3 seconds
      setTimeout(() => setShowSuccessAnimation(false), 3000);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'System glitch. Reload and retry.';
      setMessage({ kind: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative py-12 px-4 overflow-hidden">
      {/* NYC-style animated background */}
      <div className="fixed inset-0 -z-20">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-900 to-black" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cdefs%3E%3Cpattern%20id%3D%22grid%22%20width%3D%2260%22%20height%3D%2260%22%20patternUnits%3D%22userSpaceOnUse%22%3E%3Cpath%20d%3D%22M%2060%200%20L%200%200%200%2060%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.03)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fpattern%3E%3C%2Fdefs%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23grid)%22%2F%3E%3C%2Fsvg%3E')]" />
      </div>

      {/* Animated orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="max-w-2xl w-full mx-auto relative">
        {/* Success animation overlay */}
        {showSuccessAnimation && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            <div className="absolute inset-0 bg-white/10 animate-ping" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="text-8xl animate-bounce">⚡</div>
            </div>
          </div>
        )}

        {/* Main card with glass morphism */}
        <div className="relative group">
          {/* Glow effect on hover */}
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl blur opacity-0 group-hover:opacity-30 transition duration-1000"></div>
          
          <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Animated header */}
            <div className="relative border-b border-white/10 p-8 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-cyan-600/20 animate-gradient" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold uppercase tracking-wider animate-pulse">
                    Live Drop Zone
                  </span>
                </div>
                <h1 className="text-5xl md:text-6xl font-display font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white animate-gradient-text">
                  Tag Your Territory
                </h1>
                <p className="text-lg md:text-xl text-gray-300 mt-4 max-w-md mx-auto font-medium">
                  One scan. One champion. Forever yours. <br className="hidden sm:block" />
                  <span className="text-purple-400">No wallets. No BS. Just vibes.</span>
                </p>
              </div>
            </div>

            <form className="p-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <label htmlFor="code" className="block text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 uppercase tracking-wider">
                  Drop Code
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
                  <div className="relative flex gap-2">
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
                      className="flex-1 px-6 py-4 rounded-xl bg-black/60 backdrop-blur-sm text-white text-lg font-mono placeholder-white/40 border border-white/20 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/50 transition-all duration-300"
                      placeholder="CXP-XXXX-XXXX..."
                    />
                    <button
                      type="button"
                      onClick={() => setScanOpen(true)}
                      disabled={loading}
                      className="px-6 py-4 rounded-xl bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-sm text-white font-bold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all duration-300 hover:scale-105"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
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
                              // Add paste animation
                              inputRef.current?.classList.add('animate-pulse');
                              setTimeout(() => inputRef.current?.classList.remove('animate-pulse'), 1000);
                            } else {
                              setMessage({ kind: 'error', text: 'No valid code in clipboard.' });
                            }
                          }
                        } catch {}
                      }}
                      disabled={loading}
                      className="px-6 py-4 rounded-xl bg-white/10 backdrop-blur-sm text-white font-bold hover:bg-white/20 disabled:opacity-50 transition-all duration-300 hover:scale-105 border border-white/20"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {message && (
                <div className={`relative overflow-hidden rounded-xl p-4 ${
                  message.kind === 'success'
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 text-green-300'
                    : 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 text-red-300'
                } backdrop-blur-sm`}>
                  <div className="relative z-10 font-medium flex items-center gap-2">
                    {message.kind === 'success' ? (
                      <span className="text-2xl">⚡</span>
                    ) : (
                      <span className="text-2xl">⚠️</span>
                    )}
                    {message.text}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-400">
                  Need backup? <Link className="text-purple-400 hover:text-purple-300 font-semibold transition-colors" href="mailto:support@charmxpals.com">Hit the crew</Link>
                </span>
                <button
                  type="submit"
                  disabled={loading || !codeNormalized}
                  className="relative group inline-flex items-center gap-3 px-8 py-4 rounded-xl font-black text-lg disabled:opacity-50 transition-all duration-300 hover:scale-105"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-70 group-hover:opacity-100 transition duration-300"></div>
                  <div className="relative flex items-center gap-3 px-8 py-4 rounded-xl bg-black text-white">
                    {loading && <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                    {loading ? 'CLAIMING...' : 'DROP IN'}
                  </div>
                </button>
              </div>
            </form>

            {character && (
              <div className="border-t border-white/10 p-8 space-y-6">
                <div className={`relative overflow-hidden rounded-2xl p-6 ${
                  hasUnlocked
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50'
                    : unitStatus === 'available'
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/50'
                      : 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50'
                } backdrop-blur-sm`}>
                  <div className="flex items-center gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-2xl font-black">
                      {hasUnlocked ? '✓' : unitStatus === 'available' ? '⚡' : '!'}
                    </span>
                    <div className="text-white">
                      <div className="font-black text-xl">
                        {hasUnlocked
                          ? `${character.name} is locked in!`
                          : unitStatus === 'available'
                            ? `${character.name} ready to roll.`
                            : 'Status updated.'}
                      </div>
                      {hasUnlocked && (
                        <div className="text-sm opacity-80 mt-1">
                          Welcome to the underground.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
                  <div className="relative">
                    <CharacterCard c={character} owned={Boolean(hasUnlocked)} />
                  </div>
                </div>

                {claimedAt && (
                  <div className="text-center text-sm text-gray-400">
                    <span className="text-purple-400 font-semibold">Tagged:</span> {new Date(claimedAt).toLocaleString()}
                  </div>
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

        <div className="text-center mt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold transition-colors group">
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            Back to Base
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% { transform: translateX(0%); }
          50% { transform: translateX(-100%); }
        }
        
        @keyframes gradient-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-gradient {
          animation: gradient 6s ease infinite;
          background-size: 200% 200%;
        }
        
        .animate-gradient-text {
          animation: gradient-text 3s ease infinite;
          background-size: 200% auto;
        }
      `}</style>
    </div>
  );
}
