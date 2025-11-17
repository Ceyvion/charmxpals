"use client";

import Link from 'next/link';

type Message = { kind: 'success' | 'error'; text: string };
type VerifyStatus = 'available' | 'claimed' | 'blocked' | 'not_found';

interface Props {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  message: Message | null;
  scanOpen: boolean;
  setScanOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isAuthenticated: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  extractClaimCode: (raw: string) => string;
  setMessage: React.Dispatch<React.SetStateAction<Message | null>>;
  setCharacter: React.Dispatch<React.SetStateAction<any>>;
  setUnitStatus: React.Dispatch<React.SetStateAction<VerifyStatus | null>>;
  setClaimedCharacterId: React.Dispatch<React.SetStateAction<string | null>>;
  setClaimedAt: React.Dispatch<React.SetStateAction<string | null>>;
  inputRef: React.RefObject<HTMLInputElement>;
  promptSignIn: () => void;
  codeNormalized: string;
  QrScanner: any;
}

export default function ClaimCodeInput(props: Props) {
  const {
    code,
    setCode,
    loading,
    message,
    scanOpen,
    setScanOpen,
    isAuthenticated,
    handleSubmit,
    extractClaimCode,
    setMessage,
    setCharacter,
    setUnitStatus,
    setClaimedCharacterId,
    setClaimedAt,
    inputRef,
    promptSignIn,
    codeNormalized,
    QrScanner,
  } = props;

  return (
    <div className="cp-card p-8 md:p-10 space-y-8">
      <div>
        <h2 className="font-display font-black text-3xl text-white mb-3">
          Enter Claim Code
        </h2>
        <p className="text-white/70">
          Scan QR code, paste a link, or type it manually
        </p>
      </div>

      {/* Auth Warning */}
      {!isAuthenticated && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/20 to-orange-500/20 p-6">
          <div className="absolute inset-0 bg-grid-overlay opacity-10" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg mb-2">Sign In Required</h3>
              <p className="text-white/90 mb-4 text-sm">
                You need to be signed in to claim your CharmXPal
              </p>
              <button
                onClick={promptSignIn}
                className="px-6 py-3 rounded-xl bg-white text-gray-900 font-black hover:bg-white/90 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Sign In Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <label htmlFor="code" className="text-sm font-black uppercase tracking-widest text-white/70">
            Claim Code
          </label>

          <div className="relative">
            <input
              ref={inputRef}
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={loading}
              placeholder="CXP-XXXX-XXXX-XXXX..."
              autoFocus
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="w-full px-6 py-5 rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-sm font-mono text-lg tracking-widest text-white placeholder:text-white/30 focus:border-pink-500/50 focus:outline-none focus:ring-4 focus:ring-pink-500/20 transition-all duration-300 disabled:opacity-50"
            />

            {/* Animated Border on Focus */}
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-2xl opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-500 -z-10" />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              disabled={loading}
              className="px-6 py-4 rounded-xl border-2 border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/40 transition-all duration-300 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Scan QR</span>
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
              className="px-6 py-4 rounded-xl border-2 border-white/20 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/40 transition-all duration-300 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Paste</span>
            </button>
          </div>

          <p className="text-xs text-white/50 text-center">
            We support links, QR codes, or raw claim codes
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`relative overflow-hidden rounded-2xl border-2 p-6 ${
              message.kind === 'success'
                ? 'border-green-400/50 bg-gradient-to-br from-green-500/20 to-emerald-500/20'
                : 'border-red-400/50 bg-gradient-to-br from-red-500/20 to-rose-500/20'
            }`}
          >
            <div className="absolute inset-0 bg-grid-overlay opacity-10" />
            <div className="relative flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.kind === 'success' ? 'bg-green-400' : 'bg-red-400'
              }`}>
                {message.kind === 'success' ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-white font-semibold leading-relaxed">
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !codeNormalized}
          className="group relative w-full px-8 py-5 overflow-hidden rounded-2xl font-black text-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
          <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-sheen" />

          <span className="relative text-white font-display tracking-wide flex items-center justify-center gap-3">
            {loading ? (
              <>
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Claiming...</span>
              </>
            ) : (
              <>
                <span>Claim Now</span>
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </span>

          {!loading && (
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-30 blur-2xl group-hover:opacity-50 transition-opacity -z-10" />
          )}
        </button>

        <p className="text-center text-xs text-white/50">
          Need help?{' '}
          <Link href="mailto:support@charmxpals.com" className="text-cyan-400 hover:text-cyan-300 underline font-semibold">
            Contact support
          </Link>
        </p>
      </form>

      {/* QR Scanner */}
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
  );
}
