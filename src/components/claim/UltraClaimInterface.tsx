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
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-pink-600/20 via-purple-900/30 to-cyan-600/20 animate-gradient-shift" />
        <div className="absolute inset-0 bg-grid-overlay opacity-10" />
      </div>

      {/* Floating Orbs */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-transparent rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/30 to-transparent rounded-full blur-3xl animate-float-delayed" />

      {/* Content */}
      <div className="relative z-10 cp-container max-w-7xl py-12 md:py-20">
        {/* Header */}
        <div
          className={`text-center mb-12 transition-all duration-1000 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isAuthenticated ? 'bg-green-400' : 'bg-amber-400'}`} />
            <span className="text-sm font-black uppercase tracking-widest text-white/90">
              {isAuthenticated ? 'Ready to Claim' : 'Sign In Required'}
            </span>
          </div>

          <h1 className="font-display font-black text-6xl md:text-7xl lg:text-8xl leading-[0.9] mb-6">
            <span className="block text-white">Claim Your</span>
            <span className="block cp-gradient-text">CharmXPal</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto">
            Enter your unique code to unlock your digital twin
          </p>

          {isAuthenticated && session?.user?.name && (
            <p className="mt-4 text-sm text-white/60">
              Signed in as <span className="font-bold text-white">{session.user.name}</span>
            </p>
          )}
        </div>

        {/* Progress Steps */}
        <div
          className={`flex justify-center gap-4 mb-16 transition-all duration-1000 ${
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
                className={`relative w-12 h-12 rounded-full flex items-center justify-center font-black text-lg transition-all duration-500 ${
                  currentStep >= step.num
                    ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white scale-110'
                    : 'bg-white/10 text-white/50 scale-100'
                }`}
              >
                {currentStep > step.num ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.num
                )}
                {currentStep === step.num && (
                  <div className="absolute -inset-2 border-2 border-pink-500/50 rounded-full animate-pulse-ring" />
                )}
              </div>
              <span className={`hidden md:block text-sm font-bold ${currentStep >= step.num ? 'text-white' : 'text-white/50'}`}>
                {step.label}
              </span>
              {step.num < 3 && (
                <div className={`hidden md:block w-12 h-0.5 ml-2 transition-all duration-500 ${currentStep > step.num ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-white/20'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Main Content - Split Layout */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left: Claim Form */}
          <div
            className={`transition-all duration-1000 ${
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

          {/* Right: 3D Preview or Success Animation */}
          <div
            className={`transition-all duration-1000 ${
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
                <div className="cp-card p-12 h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                      <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <h3 className="font-display font-black text-2xl text-white mb-3">
                      Enter Your Code
                    </h3>
                    <p className="text-white/60 max-w-sm mx-auto">
                      Your CharmXPal will appear here once you enter a valid claim code
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all duration-300 text-white font-bold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
