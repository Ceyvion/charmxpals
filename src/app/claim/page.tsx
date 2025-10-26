'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function ClaimPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [character, setCharacter] = useState<CharacterPreview | null>(null);
  const [unitStatus, setUnitStatus] = useState<VerifyStatus | null>(null);
  const [claimedCharacterId, setClaimedCharacterId] = useState<string | null>(null);
  const [claimedAt, setClaimedAt] = useState<string | null>(null);
  const [user, setUser] = useState<DevUser | null>(null);

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
      setMessage({ kind: 'error', text: 'Enter a code to claim.' });
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
        text: 'We couldn’t detect a CharmXPal code in that entry. Try scanning again or type the code printed on your collectible.',
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
        throw new Error('Failed to verify this code.');
      }
      const verifyJson: VerifyResponse = await verifyRes.json();
      const preview = toCharacterPreview(verifyJson.character);
      setCharacter(preview);
      setUnitStatus(verifyJson.status);

      if (verifyJson.status === 'not_found') {
        throw new Error('We couldn’t find that code. Double-check the characters and try again.');
      }
      if (verifyJson.status === 'claimed') {
        setMessage({ kind: 'error', text: 'This code has already been claimed.' });
        return;
      }
      if (verifyJson.status === 'blocked') {
        setMessage({ kind: 'error', text: 'This code is blocked. Contact support@charmxpals.com for help.' });
        return;
      }
      if (!preview) {
        throw new Error('This code is missing its champion mapping. Ping the team to seed it.');
      }

      const startRes = await fetch('/api/claim/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: sanitized }),
        cache: 'no-store',
      });
      const startJson: StartSuccess | StartError = await startRes.json();
      if (!startRes.ok || !startJson.success) {
        throw new Error((startJson as StartError).error || 'Failed to start the claim.');
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
        throw new Error((completeJson as CompleteError).error || 'Failed to complete the claim.');
      }

      setClaimedCharacterId(completeJson.characterId);
      setClaimedAt(completeJson.claimedAt ?? null);
      setUnitStatus('claimed');

      const heroName = preview.name || 'CharmXPal';
      const timestamp = completeJson.claimedAt ? new Date(completeJson.claimedAt).toLocaleString() : null;
      setMessage({
        kind: 'success',
        text: timestamp ? `Success! ${heroName} unlocked at ${timestamp}.` : `Success! ${heroName} unlocked.`,
      });
    } catch (error: any) {
      const text = error?.message || 'Unexpected error while claiming this code.';
      setMessage({ kind: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative py-16 px-4">
      <div className="absolute inset-0 -z-10 opacity-60 pointer-events-none bg-hero-radial" />
      <div className="max-w-xl w-full mx-auto">
        <div className="cp-panel supports-[backdrop-filter]:bg-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="border-b border-white/10 p-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">Sync Your CharmXPal</h1>
            <p className="text-gray-300 mt-2">
              Scan or paste the 16-character code on your collectible to drop its champion into your roster. Each code is single-use and locks the instant it hits the arena.
            </p>
          </div>

          <form className="p-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-white mb-2">
                Redemption Code
              </label>
              <div className="flex gap-2">
                <input
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
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30"
                  placeholder="e.g., CXP-1234-ABCDE-…"
                />
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white font-semibold hover:bg-white/20"
                >
                  Scan QR
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
                        } else {
                          setMessage({ kind: 'error', text: 'Clipboard content did not include a CharmXPal code.' });
                        }
                      }
                    } catch {}
                  }}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white font-semibold hover:bg-white/20 disabled:opacity-50"
                >
                  Paste
                </button>
              </div>
            </div>

            {message && (
              <div
                className={`text-sm px-3 py-2 rounded-md border ${
                  message.kind === 'success'
                    ? 'text-green-300 bg-green-900/20 border-green-700/40'
                    : 'text-amber-300 bg-amber-900/20 border-amber-700/40'
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">
                Need help? Email <Link className="underline" href="mailto:support@charmxpals.com">support@charmxpals.com</Link>
              </span>
              <button
                type="submit"
                disabled={loading || !codeNormalized}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 disabled:opacity-60"
              >
                {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-900/30 border-t-gray-900" />}
                {loading ? 'Claiming...' : 'Claim Code'}
              </button>
            </div>
          </form>

          {character && (
            <div className="border-t border-white/10 p-6 space-y-4">
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                  hasUnlocked
                    ? 'text-green-300 bg-green-900/20 border-green-700/40'
                    : unitStatus === 'available'
                      ? 'text-white/80 bg-white/10 border-white/20'
                      : 'text-amber-300 bg-amber-900/20 border-amber-700/40'
                }`}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white font-bold">
                  {hasUnlocked ? '✓' : unitStatus === 'available' ? '...' : '!'}
                </span>
                <div className="text-white font-semibold">
                  {hasUnlocked
                    ? `${character.name} is synced to your roster.`
                    : unitStatus === 'available'
                      ? `${character.name} is ready to unlock.`
                      : 'Code status updated.'}
                </div>
              </div>

              <div className="grid gap-4">
                <CharacterCard c={character} owned={Boolean(hasUnlocked)} />
              </div>

              {claimedAt && (
                <div className="text-sm text-white/70">
                  Unlocked at {new Date(claimedAt).toLocaleString()}
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
                setMessage({ kind: 'error', text: 'Scan detected no CharmXPal code. Try aligning the QR again or enter the code manually.' });
              }
              setScanOpen(false);
            }}
          />
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-gray-200 hover:text-white font-semibold">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
