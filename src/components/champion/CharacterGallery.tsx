'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';

type GalleryItem = {
  key: string;
  src: string;
};

type Props = {
  items: GalleryItem[];
  characterName: string;
  accentColor: string;
};

const TYPE_LABELS: Record<string, string> = {
  signature: 'Signature',
  banner: 'Banner',
  portrait: 'Portrait',
  card: 'Card',
  thumbnail: 'Thumb',
  full: 'Full Body',
  sprite: 'Sprite',
};

export default function CharacterGallery({ items, characterName, accentColor }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const selected = items[selectedIndex] ?? items[0];

  const handleThumbnailClick = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);

  const navigateLightbox = useCallback(
    (dir: 1 | -1) => {
      setSelectedIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return items.length - 1;
        if (next >= items.length) return 0;
        return next;
      });
    },
    [items.length],
  );

  useEffect(() => {
    if (!items.length) {
      setSelectedIndex(0);
      return;
    }
    setSelectedIndex((prev) => Math.min(prev, items.length - 1));
  }, [items]);

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setLightboxOpen(false);
        return;
      }
      if (items.length <= 1) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateLightbox(-1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateLightbox(1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen, items.length, navigateLightbox]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="space-y-4">
        {/* Main display */}
        <div
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40"
          onClick={openLightbox}
          role="button"
          tabIndex={0}
          aria-label={`View ${characterName} ${selected?.key} art fullscreen`}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            openLightbox();
          }}
        >
          {/* Cinematic bg glow */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30 blur-3xl"
            style={{
              backgroundImage: `radial-gradient(ellipse at center, ${accentColor}40, transparent 70%)`,
            }}
          />
          {selected && (
            <div className="relative h-[340px] w-full sm:h-[400px]">
              <Image
                src={selected.src}
                alt={`${characterName} ${selected.key}`}
                fill
                sizes="(min-width: 640px) 100vw, 100vw"
                className="relative object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                onError={(e) => {
                  e.currentTarget.src = '/card-placeholder.svg';
                }}
              />
            </div>
          )}
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30">
            <span className="scale-90 rounded-full border border-white/20 bg-black/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
              View Full
            </span>
          </div>
          {/* Type label */}
          <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 backdrop-blur-sm">
            {TYPE_LABELS[selected?.key ?? ''] ?? selected?.key}
          </div>
        </div>

        {/* Thumbnails */}
        {items.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {items.map((item, i) => (
              <button
                key={`${item.key}-${i}`}
                onClick={() => handleThumbnailClick(i)}
                className={`group/thumb relative shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                  i === selectedIndex
                    ? 'border-current ring-1 ring-current/30'
                    : 'border-white/[0.08] hover:border-white/20'
                }`}
                style={i === selectedIndex ? { color: accentColor } : undefined}
                aria-label={`View ${item.key} art`}
              >
                <span className="relative block h-16 w-20">
                  <Image
                    src={item.src}
                    alt={`${characterName} ${item.key}`}
                    fill
                    sizes="80px"
                    className="object-cover transition-transform duration-200 group-hover/thumb:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = '/card-placeholder.svg';
                    }}
                  />
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/70">
                  {TYPE_LABELS[item.key] ?? item.key}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selected.src}
              alt={`${characterName} ${selected.key}`}
              width={1400}
              height={1400}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onError={(e) => {
                e.currentTarget.src = '/card-placeholder.svg';
              }}
            />

            {/* Navigation */}
            {items.length > 1 && (
              <>
                <button
                  onClick={() => navigateLightbox(-1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10"
                  aria-label="Previous image"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={() => navigateLightbox(1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10"
                  aria-label="Next image"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </>
            )}

            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute -top-2 right-0 rounded-full border border-white/20 bg-black/60 p-2 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/10"
              aria-label="Close lightbox"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 text-xs font-semibold text-white/60 backdrop-blur-sm">
              {selectedIndex + 1} / {items.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
