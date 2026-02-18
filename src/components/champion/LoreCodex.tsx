'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  description: string;
  tagline?: string | null;
  personality?: string | null;
  vibe?: string | null;
  coreCharm?: string | null;
  danceStyle?: string | null;
  realm?: string | null;
  accentColor: string;
};

type CodexEntry = {
  id: string;
  icon: string;
  title: string;
  content: string;
};

type LoreFields = Pick<Props, 'description' | 'personality' | 'vibe' | 'coreCharm' | 'danceStyle'>;

function parseLoreEntries(props: LoreFields): CodexEntry[] {
  const entries: CodexEntry[] = [];
  const desc = props.description || '';

  // Split description into meaningful chunks
  const sentences = desc.split(/(?<=[.!?])\s+/).filter(Boolean);
  const mid = Math.ceil(sentences.length / 2);

  if (sentences.length > 0) {
    entries.push({
      id: 'origins',
      icon: '\u25C8',
      title: 'Origins',
      content: sentences.slice(0, mid).join(' '),
    });
  }

  if (sentences.length > mid) {
    entries.push({
      id: 'conflict',
      icon: '\u2726',
      title: 'Conflict & Drive',
      content: sentences.slice(mid).join(' '),
    });
  }

  if (props.personality) {
    entries.push({
      id: 'personality',
      icon: '\u2662',
      title: 'Personality',
      content: props.personality,
    });
  }

  if (props.coreCharm) {
    entries.push({
      id: 'charm',
      icon: '\u2756',
      title: 'Core Charm',
      content: props.coreCharm,
    });
  }

  if (props.vibe) {
    entries.push({
      id: 'atmosphere',
      icon: '\u2734',
      title: 'Atmosphere',
      content: props.vibe,
    });
  }

  if (props.danceStyle) {
    entries.push({
      id: 'style',
      icon: '\u2740',
      title: 'Dance Style',
      content: props.danceStyle,
    });
  }

  return entries;
}

export default function LoreCodex(props: Props) {
  const { description, tagline, personality, vibe, coreCharm, danceStyle, accentColor } = props;

  const entries = useMemo(
    () => parseLoreEntries({ description, personality, vibe, coreCharm, danceStyle }),
    [description, personality, vibe, coreCharm, danceStyle],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setExpandedId(entries[0]?.id ?? null);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      {tagline && (
        <blockquote
          className="border-l-2 py-1 pl-4 text-lg italic leading-relaxed text-white/70"
          style={{ borderColor: `${accentColor}88` }}
        >
          &ldquo;{tagline}&rdquo;
        </blockquote>
      )}

      <div className="mt-4 space-y-2">
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id;
          return (
            <div
              key={entry.id}
              className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] transition-colors duration-200 hover:bg-white/[0.05]"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                aria-expanded={isExpanded}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm"
                  style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                >
                  {entry.icon}
                </span>
                <span className="flex-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                  {entry.title}
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div
                className="grid transition-all duration-300 ease-out"
                style={{
                  gridTemplateRows: isExpanded ? '1fr' : '0fr',
                  opacity: isExpanded ? 1 : 0,
                }}
              >
                <div className="overflow-hidden">
                  <p className="px-4 pb-4 text-sm leading-relaxed text-white/55">
                    {entry.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
