"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
};

export default function QrScanner({ open, onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [usingBarcodeDetector, setUsingBarcodeDetector] = useState(false);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }, []);

  const cleanupAndClose = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setActive(true);

        // Try BarcodeDetector first (more efficient on supported browsers)
        const Supported: any = (globalThis as any).BarcodeDetector;
        if (Supported) {
          try {
            const formats = await Supported.getSupportedFormats?.();
            if (!formats || formats.includes('qr_code')) {
              setUsingBarcodeDetector(true);
              const detector = new Supported({ formats: ['qr_code'] });
              const tick = async () => {
                if (!videoRef.current) return;
                try {
                  const results = await detector.detect(videoRef.current);
                  if (results && results.length) {
                    const raw = results[0].rawValue || results[0].cornerPoints?.toString?.() || '';
                    if (raw) {
                      onResult(raw);
                      cleanupAndClose();
                      return;
                    }
                  }
                } catch {}
                rafRef.current = requestAnimationFrame(tick);
              };
              rafRef.current = requestAnimationFrame(tick);
              return;
            }
          } catch {
            // fall through to jsQR
          }
        }

        // Fallback: jsQR via dynamic import
        setUsingBarcodeDetector(false);
        const { default: jsQR } = await import('jsqr');
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        const tick = () => {
          const v = videoRef.current!;
          const w = v.videoWidth;
          const h = v.videoHeight;
          if (w && h) {
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(v, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            const code = jsQR(img.data, w, h, { inversionAttempts: 'attemptBoth' } as any);
            if (code && code.data) {
              onResult(code.data);
              cleanupAndClose();
              return;
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        setError(e?.message || 'Camera access was blocked.');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, stop, onResult, cleanupAndClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={cleanupAndClose} />
      <div className="absolute inset-x-4 top-16 bottom-16 rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur">
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="text-white font-semibold">Scan QR Code</div>
          <button onClick={cleanupAndClose} className="px-3 py-1.5 rounded-lg bg-white text-gray-900 text-sm font-bold">Close</button>
        </div>
        <div className="relative h-[calc(100%-52px)]">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
          {/* scanning frame */}
          <div className="absolute inset-0 pointer-events-none grid place-items-center">
            <div className="w-64 h-64 border-2 border-white/80 rounded-xl" />
          </div>
          {!active && (
            <div className="absolute inset-0 grid place-items-center text-white/80">Starting camera…</div>
          )}
          {error && (
            <div className="absolute inset-x-0 bottom-0 m-4 p-3 rounded-lg bg-red-600/90 text-white text-sm">{error}</div>
          )}
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute left-3 bottom-3 text-xs text-white/70">
            {usingBarcodeDetector ? 'Using native scanner' : 'Using JS scanner'}
          </div>
        </div>
      </div>
    </div>
  );
}

