'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { hmacSHA256Hex } from '@/lib/webcrypto';
import CharacterReveal from '@/components/CharacterReveal';
import dynamic from 'next/dynamic';

type ApiResult<T> = ({ success: true } & T) | { success: false; error: string };

const SAMPLE_CODES = ['CHARM-XPAL-001', 'CHARM-XPAL-002', 'CHARM-XPAL-003'];

export default function ClaimPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const [verifyOnly, setVerifyOnly] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<null | { ok: boolean; message: string }>(null);
  const [stage, setStage] = useState<'idle' | 'verifying' | 'starting' | 'signing' | 'completing' | 'success' | 'error'>('idle');
  const [revealOpen, setRevealOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [preview, setPreview] = useState<null | { id: string; name: string; rarity: number; artRefs: Record<string, string>; stats: Record<string, number> }>(null);

  const QrScanner = useMemo(() => dynamic(() => import('@/components/QrScanner'), { ssr: false }), []);

  const codeNormalized = useMemo(() => code.trim(), [code]);

  // Restore last code for convenience (dev quality-of-life)
  useEffect(() => {
    try { const last = localStorage.getItem('cp:last_claim_code'); if (last) setCode(last); } catch {}
  }, []);
  useEffect(() => {
    try { if (code) localStorage.setItem('cp:last_claim_code', code); } catch {}
  }, [code]);

  async function verifyCode() {
    setError(null);
    setVerifyStatus(null);
    try {
      const res = await fetch('/api/claim/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeNormalized }),
      });
      const json = (await res.json()) as ApiResult<{ status: 'available' | 'claimed' | 'blocked'; characterId?: string }>;
      if (!json.success) throw new Error(json.error || 'Verification failed');
      const ok = json.status === 'available';
      setVerifyStatus({ ok, message: ok ? 'Valid and available to claim' : `Code status: ${json.status}` });
      // Fetch a lightweight preview if available
      if (ok && json.characterId) {
        try {
          const cRes = await fetch(`/api/character/${json.characterId}`);
          const cJson = (await cRes.json()) as ApiResult<{ character: { id: string; name: string; rarity: number; artRefs: Record<string,string>; stats: Record<string, number> } }>;
          if (cJson.success) setPreview(cJson.character);
          else setPreview(null);
        } catch { setPreview(null); }
      } else {
        setPreview(null);
      }
    } catch (e: any) {
      setVerifyStatus({ ok: false, message: e?.message || 'Verification error' });
      setPreview(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeNormalized) return;
    setLoading(true);
    setError(null);
    setClaimedId(null);
    setVerifyStatus(null);

    try {
      if (verifyOnly) {
        setStage('verifying');
        await verifyCode();
        setStage('idle');
        return;
      }

      // 1) Get or create a dev user (until real auth exists)
      setStage('verifying');
      const userRes = await fetch('/api/dev/user');
      const userJson = (await userRes.json()) as ApiResult<{ user: { id: string } }>;
      if (!userJson.success) throw new Error(userJson.error || 'Failed to load user');
      const userId = userJson.user.id;

      // 2) Start claim challenge
      setStage('starting');
      const startRes = await fetch('/api/claim/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeNormalized }),
      });
      const startJson = (await startRes.json()) as ApiResult<{
        challengeId: string;
        challengeDigest: string;
      }>;
      if (!startJson.success) throw new Error(startJson.error || 'Failed to start claim');

      // 3) Sign challenge locally with the plaintext code
      setStage('signing');
      const signature = await hmacSHA256Hex(codeNormalized, startJson.challengeDigest);

      // 4) Complete claim
      setStage('completing');
      const completeRes = await fetch('/api/claim/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeNormalized,
          challengeId: startJson.challengeId,
          signature,
          userId,
        }),
      });
      const completeJson = (await completeRes.json()) as ApiResult<{ characterId: string }>;
      if (!completeJson.success) throw new Error(completeJson.error || 'Failed to complete claim');

      setClaimedId(completeJson.characterId);
      setRevealOpen(true);
      setStage('success');
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
      setStage('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative py-16 px-4">
      <div className="absolute inset-0 -z-10 opacity-60 pointer-events-none bg-hero-radial" />
      <div className="max-w-xl w-full mx-auto">
        <div className="cp-panel supports-[backdrop-filter]:bg-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="relative border-b border-white/10 p-6 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">Claim Your Character</h1>
            <p className="text-gray-300 mt-2">Enter the code from your physical charm to unlock the digital twin.</p>
            {/* Progress bar */}
            {stage !== 'idle' && (
              <div className="absolute left-0 right-0 bottom-0 h-1 bg-white/10">
                {(() => {
                  const order = ['verifying','starting','signing','completing','success'] as const;
                  const idx = Math.max(0, order.indexOf(stage as any));
                  const pct = Math.min(100, ((idx + (stage==='success'?1:0)) / order.length) * 100);
                  return <div className="h-full bg-white/80 transition-all" style={{ width: `${pct}%` }} />;
                })()}
              </div>
            )}
          </div>

          <form className="p-6 space-y-5" onSubmit={handleSubmit}>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-white/70">
              {[
                { key: 'verifying', label: 'Verify' },
                { key: 'starting', label: 'Challenge' },
                { key: 'signing', label: 'Sign' },
                { key: 'completing', label: 'Complete' },
              ].map((s, idx, arr) => (
                <div key={s.key} className="flex items-center">
                  <span className={`px-2 py-0.5 rounded border ${stage === s.key ? 'border-white/60 text-white' : 'border-white/20'}`}>{s.label}</span>
                  {idx < arr.length - 1 && <span className="mx-2 text-white/20">→</span>}
                </div>
              ))}
            </div>
            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-white mb-2">Character Code</label>
              <div className="flex gap-2">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={loading}
                  autoFocus
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint={verifyOnly ? 'done' : 'go'}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30"
                  placeholder="e.g., CHARM-XPAL-001"
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
                  onClick={verifyCode}
                  disabled={loading || !codeNormalized}
                  className="px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white font-semibold hover:bg-white/20 disabled:opacity-50"
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={async () => { try { const t = await navigator.clipboard.readText(); if (t) setCode(String(t).trim().toUpperCase()); } catch {} }}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white font-semibold hover:bg-white/20 disabled:opacity-50"
                >
                  Paste
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {SAMPLE_CODES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCode(c)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/10"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {verifyStatus && (
              <div className={`text-sm px-3 py-2 rounded-md border ${verifyStatus.ok ? 'text-green-300 bg-green-900/20 border-green-700/40' : 'text-amber-300 bg-amber-900/20 border-amber-700/40'}`}>
                {verifyStatus.message}
              </div>
            )}

            {preview && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/70 mb-2">You’re about to claim</div>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg bg-white/10 border border-white/10 overflow-hidden bg-center bg-cover" style={{ backgroundImage: preview.artRefs?.thumbnail ? `url(${preview.artRefs.thumbnail})` : undefined }} />
                  <div className="flex-1">
                    <div className="text-white font-semibold">{preview.name}</div>
                    <div className="text-white/70 text-sm">Rarity {preview.rarity} • {Object.keys(preview.stats||{}).length} stats</div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-200 select-none">
                <input type="checkbox" className="rounded border-white/20 bg-white/10" checked={verifyOnly} onChange={(e) => setVerifyOnly(e.target.checked)} />
                Verify only (don’t claim)
              </label>
              <button
                type="submit"
                disabled={loading || !codeNormalized}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-bold hover:bg-gray-100 disabled:opacity-60"
              >
                {loading && <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-900/30 border-t-gray-900" />}
                {loading ? 'Working…' : verifyOnly ? 'Verify Code' : 'Claim Character'}
              </button>
            </div>
          </form>

          {claimedId && (
            <div className="border-t border-white/10 p-6">
              <div className="flex items-center gap-3 text-green-300 bg-green-900/20 border border-green-700/40 px-4 py-3 rounded-xl">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white font-bold">✓</span>
                <div className="font-semibold text-white">Success! Character claimed.</div>
              </div>
              <div className="mt-4">
                <Link href={`/character/${claimedId}`} className="inline-flex px-6 py-3 rounded-xl bg-white border border-white/10 text-gray-900 font-semibold hover:bg-gray-50">
                  Go to Character
                </Link>
              </div>
              <CharacterReveal characterId={claimedId} open={revealOpen} onClose={() => setRevealOpen(false)} />
            </div>
          )}
          <QrScanner
            open={scanOpen}
            onClose={() => setScanOpen(false)}
            onResult={(val: string) => {
              const t = String(val || '').trim().toUpperCase();
              if (t) setCode(t);
              setScanOpen(false);
            }}
          />
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-gray-200 hover:text-white font-semibold">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
