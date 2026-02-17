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
        <h2 className="mb-2 font-display text-3xl font-black text-[var(--cp-text-primary)]">
          Enter Claim Code
        </h2>
        <p className="text-[var(--cp-text-secondary)]">
          Scan QR code, paste a link, or type it manually
        </p>
      </div>

      {!isAuthenticated && (
        <div className="rounded-[var(--cp-radius-lg)] border-2 border-[var(--cp-yellow)] bg-[var(--cp-gray-100)] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--cp-radius-sm)] bg-[var(--cp-yellow)] text-[var(--cp-black)]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="mb-1 text-lg font-bold text-[var(--cp-text-primary)]">Sign In Required</h3>
              <p className="mb-4 text-sm text-[var(--cp-text-secondary)]">
                You need to be signed in to claim your CharmXPal
              </p>
              <button
                onClick={promptSignIn}
                className="cp-cta-primary px-5 py-2.5 text-sm"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Sign In Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <label htmlFor="code" className="cp-kicker text-[var(--cp-text-muted)]">
            Claim Code
          </label>

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
            className="w-full rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-white)] px-5 py-4 font-mono text-base tracking-[0.18em] text-[var(--cp-text-primary)] placeholder:text-[var(--cp-text-muted)] focus:border-[var(--cp-border-strong)] focus:outline-none disabled:opacity-50"
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-4 py-3 text-sm font-semibold text-[var(--cp-text-primary)] transition-colors hover:border-[var(--cp-border-strong)] hover:bg-[var(--cp-white)] disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="flex items-center justify-center gap-2 rounded-[var(--cp-radius-md)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-4 py-3 text-sm font-semibold text-[var(--cp-text-primary)] transition-colors hover:border-[var(--cp-border-strong)] hover:bg-[var(--cp-white)] disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Paste</span>
            </button>
          </div>

          <p className="text-center text-xs text-[var(--cp-text-muted)]">
            We support links, QR codes, or raw claim codes
          </p>
        </div>

        {message && (
          <div
            className={`rounded-[var(--cp-radius-lg)] border-2 p-5 ${
              message.kind === 'success'
                ? 'border-[var(--cp-green)] bg-[var(--cp-white)]'
                : 'border-[var(--cp-red)] bg-[var(--cp-white)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--cp-radius-sm)] ${
                message.kind === 'success' ? 'bg-[var(--cp-green)] text-[var(--cp-black)]' : 'bg-[var(--cp-red)] text-[var(--cp-white)]'
              }`}>
                {message.kind === 'success' ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <p className="font-semibold leading-relaxed text-[var(--cp-text-primary)]">{message.text}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !codeNormalized}
          className={`cp-cta-primary w-full py-4 text-base ${
            loading || !codeNormalized ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          <span className="flex items-center justify-center gap-3 font-display tracking-wide">
            {loading ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--cp-gray-300)] border-t-[var(--cp-white)]" />
                <span>Claiming...</span>
              </>
            ) : (
              <>
                <span>Claim Now</span>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </span>
        </button>

        <p className="text-center text-xs text-[var(--cp-text-muted)]">
          Need help?{' '}
          <Link href="mailto:support@charmxpals.com" className="font-semibold text-[var(--cp-blue)] underline underline-offset-2 hover:text-[var(--cp-text-primary)]">
            Contact support
          </Link>
        </p>
      </form>

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
