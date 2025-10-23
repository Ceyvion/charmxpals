'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

type RedeemResponse = {
  success: true;
  series: string | null;
  claimedAt: string;
};

type RedeemError = {
  success: false;
  error: string;
};

type Message = { kind: 'success' | 'error'; text: string };

const QrScannerDynamic = () => import('@/components/QrScanner');

export default function ClaimPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [redeemSeries, setRedeemSeries] = useState<string | null>(null);
  const [claimedAt, setClaimedAt] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const QrScanner = useMemo(() => dynamic(QrScannerDynamic, { ssr: false }), []);

  const codeNormalized = code.trim();

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
      setMessage({ kind: 'error', text: 'Enter a code to redeem.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setRedeemSeries(null);
    setClaimedAt(null);

    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeNormalized,
          metadata: { source: 'claim-page' },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as RedeemResponse | RedeemError | { error?: string };

      if (!res.ok || !('success' in json) || !json.success) {
        const errorMessage = ('error' in json && json.error) || 'Failed to redeem code';
        throw new Error(errorMessage);
      }

      setRedeemSeries(json.series ?? null);
      setClaimedAt(json.claimedAt);
      const formatted = new Date(json.claimedAt).toLocaleString();
      const successMessage = json.series
        ? `Success! Series "${json.series}" unlocked at ${formatted}.`
        : `Success! Redeemed at ${formatted}.`;
      setMessage({ kind: 'success', text: successMessage });
    } catch (error: any) {
      const text = error?.message || 'Unexpected error while redeeming this code';
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
            <h1 className="text-3xl font-extrabold tracking-tight font-display text-white">Redeem Your Code</h1>
            <p className="text-gray-300 mt-2">
              Enter the code that shipped with your collectible. Each code is single-use and locks instantly once redeemed.
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
                      if (text) setCode(String(text).trim().toUpperCase());
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
                {loading ? 'Redeeming…' : 'Redeem Code'}
              </button>
            </div>
          </form>

          {(redeemSeries || claimedAt) && (
            <div className="border-t border-white/10 p-6 space-y-2">
              <div className="flex items-center gap-3 text-green-300 bg-green-900/20 border border-green-700/40 px-4 py-3 rounded-xl">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white font-bold">✓</span>
                <div className="text-white font-semibold">Code redeemed successfully</div>
              </div>
              {redeemSeries && <div className="text-sm text-white/70">Series: {redeemSeries}</div>}
              {claimedAt && (
                <div className="text-sm text-white/70">
                  Timestamp: {new Date(claimedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <QrScanner
            open={scanOpen}
            onClose={() => setScanOpen(false)}
            onResult={(value: string) => {
              const parsed = String(value || '').trim().toUpperCase();
              if (parsed) setCode(parsed);
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
