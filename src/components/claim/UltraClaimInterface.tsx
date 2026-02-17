"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Session } from 'next-auth';
import type { CharacterPreview } from '@/app/claim/ClaimPageClient';
import ClaimCodeInput from './ClaimCodeInput';
import ClaimSuccessAnimation from './ClaimSuccessAnimation';
import Character3DPreview from './Character3DPreview';

type Message = { kind: 'success' | 'error'; text: string };
type VerifyStatus = 'available' | 'claimed' | 'blocked' | 'not_found';

interface Props {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  loading: boolean;
  message: Message | null;
  scanOpen: boolean;
  setScanOpen: React.Dispatch<React.SetStateAction<boolean>>;
  character: CharacterPreview | null;
  unitStatus: VerifyStatus | null;
  hasUnlocked: boolean;
  claimedAt: string | null;
  isAuthenticated: boolean;
  session: Session | null;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  extractClaimCode: (raw: string) => string;
  setMessage: React.Dispatch<React.SetStateAction<Message | null>>;
  setCharacter: React.Dispatch<React.SetStateAction<CharacterPreview | null>>;
  setUnitStatus: React.Dispatch<React.SetStateAction<VerifyStatus | null>>;
  setClaimedCharacterId: React.Dispatch<React.SetStateAction<string | null>>;
  setClaimedAt: React.Dispatch<React.SetStateAction<string | null>>;
  inputRef: React.RefObject<HTMLInputElement>;
  promptSignIn: () => void;
  codeNormalized: string;
  QrScanner: any;
}

export default function UltraClaimInterface(props: Props) {
  const {
    code,
    setCode,
    loading,
    message,
    scanOpen,
    setScanOpen,
    character,
    unitStatus,
    hasUnlocked,
    claimedAt,
    isAuthenticated,
    session,
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

  const [mounted, setMounted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hasUnlocked) {
      setShowCelebration(true);
      setCurrentStep(3);
    } else if (character && unitStatus === 'available') {
      setCurrentStep(2);
    } else if (code) {
      setCurrentStep(1);
    }
  }, [hasUnlocked, character, unitStatus, code]);

  return (
    <div className="min-h-screen bg-[var(--cp-bg)]">
      <div className="cp-container max-w-7xl py-12 md:py-16">
        <div
          className={`mb-10 text-center transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
          }`}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-[var(--cp-radius-sm)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)] px-3 py-1.5">
            <div className={`h-2.5 w-2.5 rounded-[2px] ${isAuthenticated ? 'bg-[var(--cp-green)]' : 'bg-[var(--cp-yellow)]'}`} />
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--cp-text-secondary)]">
              {isAuthenticated ? 'Ready to Claim' : 'Sign In Required'}
            </span>
          </div>

          <h1 className="mb-4 font-display text-5xl font-black leading-[0.92] text-[var(--cp-text-primary)] md:text-7xl">
            <span className="block">Claim Your</span>
            <span className="block cp-gradient-text">CharmXPal</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-[var(--cp-text-secondary)] md:text-xl">
            Enter your unique code to unlock your digital twin
          </p>

          {isAuthenticated && session?.user?.name && (
            <p className="mt-3 text-sm text-[var(--cp-text-muted)]">
              Signed in as <span className="font-bold text-[var(--cp-text-primary)]">{session.user.name}</span>
            </p>
          )}
        </div>

        <div
          className={`mb-12 flex flex-wrap justify-center gap-3 transition-all duration-700 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {[
            { num: 1, label: 'Enter Code' },
            { num: 2, label: 'Verify' },
            { num: 3, label: 'Claim' },
          ].map((step) => (
            <div key={step.num} className="flex items-center gap-2">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-[var(--cp-radius-md)] border-2 text-sm font-black transition-colors ${
                  currentStep > step.num
                    ? 'border-[var(--cp-green)] bg-[var(--cp-green)] text-[var(--cp-black)]'
                    : currentStep === step.num
                    ? 'border-[var(--cp-black)] bg-[var(--cp-black)] text-[var(--cp-white)]'
                    : 'border-[var(--cp-border)] bg-[var(--cp-gray-100)] text-[var(--cp-text-muted)]'
                }`}
              >
                {currentStep > step.num ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span
                className={`hidden text-sm font-bold md:block ${
                  currentStep >= step.num ? 'text-[var(--cp-text-primary)]' : 'text-[var(--cp-text-muted)]'
                }`}
              >
                {step.label}
              </span>
              {step.num < 3 && (
                <div
                  className={`ml-1 hidden h-0.5 w-10 transition-colors md:block ${
                    currentStep > step.num ? 'bg-[var(--cp-black)]' : 'bg-[var(--cp-border)]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div
            className={`transition-all duration-700 ${
              mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <ClaimCodeInput
              code={code}
              setCode={setCode}
              loading={loading}
              message={message}
              scanOpen={scanOpen}
              setScanOpen={setScanOpen}
              isAuthenticated={isAuthenticated}
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
          </div>

          <div
            className={`transition-all duration-700 ${
              mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
            }`}
            style={{ transitionDelay: '600ms' }}
          >
            {showCelebration && character ? (
              <ClaimSuccessAnimation
                character={character}
                claimedAt={claimedAt}
              />
            ) : character ? (
              <Character3DPreview
                character={character}
                unitStatus={unitStatus}
                hasUnlocked={hasUnlocked}
              />
            ) : (
              <div className="relative aspect-square max-w-lg mx-auto">
                <div className="cp-panel p-10 h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[var(--cp-radius-lg)] border-2 border-[var(--cp-border)] bg-[var(--cp-gray-100)]">
                      <svg className="w-12 h-12 text-[var(--cp-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <h3 className="font-display font-black text-2xl text-[var(--cp-text-primary)] mb-2">
                      Enter Your Code
                    </h3>
                    <p className="mx-auto max-w-sm text-[var(--cp-text-secondary)]">
                      Your CharmXPal will appear here once you enter a valid claim code
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href="/" className="cp-cta-ghost">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
