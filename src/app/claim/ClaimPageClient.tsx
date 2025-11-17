'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { signIn, useSession } from 'next-auth/react';

import { hmacSHA256Hex } from '@/lib/webcrypto';
import UltraClaimInterface from '@/components/claim/UltraClaimInterface';
import type { CharacterBasic } from '@/components/CharacterCard';

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

export type CharacterPreview = CharacterBasic & {
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
    <UltraClaimInterface
      code={code}
      setCode={setCode}
      loading={loading}
      message={message}
      scanOpen={scanOpen}
      setScanOpen={setScanOpen}
      character={character}
      unitStatus={unitStatus}
      hasUnlocked={hasUnlocked}
      claimedAt={claimedAt}
      isAuthenticated={isAuthenticated}
      session={session}
      handleSubmit={handleSubmit}
      extractClaimCode={extractClaimCode}
      setMessage={setMessage}
      setCharacter={setCharacter}
      setUnitStatus={setUnitStatus}
      setClaimedCharacterId={setClaimedCharacterId}
      setClaimedAt={setClaimedAt}
      inputRef={inputRef}
      promptSignIn={promptSignIn}
      codeNormalized={codeNormalized}
      QrScanner={QrScanner}
    />
  );
}
