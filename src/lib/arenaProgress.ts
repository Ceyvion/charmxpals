export const ARENA_PROGRESS_RESET_HOUR_UTC = 6;

export type ArenaProgressEvent = 'pulse' | 'elimination' | 'match';

export type ArenaDailyProgress = {
  dateKey: string;
  pulses: number;
  eliminations: number;
  matches: number;
  updatedAt: string;
};

const EVENT_LIMITS: Record<ArenaProgressEvent, number> = {
  pulse: 500,
  elimination: 250,
  match: 50,
};

export function toArenaProgressDateKey(now = Date.now()) {
  const shifted = now - ARENA_PROGRESS_RESET_HOUR_UTC * 60 * 60 * 1000;
  return new Date(shifted).toISOString().slice(0, 10);
}

export function emptyArenaDailyProgress(dateKey = toArenaProgressDateKey(), updatedAt = new Date().toISOString()): ArenaDailyProgress {
  return {
    dateKey,
    pulses: 0,
    eliminations: 0,
    matches: 0,
    updatedAt,
  };
}

export function isArenaProgressEvent(value: unknown): value is ArenaProgressEvent {
  return value === 'pulse' || value === 'elimination' || value === 'match';
}

export function coerceArenaDailyProgress(value: unknown, now = Date.now()): ArenaDailyProgress {
  const dateKey = toArenaProgressDateKey(now);
  if (!value || typeof value !== 'object') {
    return emptyArenaDailyProgress(dateKey);
  }

  const parsed = value as Partial<ArenaDailyProgress>;
  if (parsed.dateKey !== dateKey) {
    return emptyArenaDailyProgress(dateKey);
  }

  return {
    dateKey,
    pulses: clampCounter(parsed.pulses),
    eliminations: clampCounter(parsed.eliminations),
    matches: clampCounter(parsed.matches),
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(now).toISOString(),
  };
}

export function incrementArenaDailyProgress(
  current: ArenaDailyProgress,
  event: ArenaProgressEvent,
  now = Date.now(),
): ArenaDailyProgress {
  const base = coerceArenaDailyProgress(current, now);
  const next: ArenaDailyProgress = {
    ...base,
    updatedAt: new Date(now).toISOString(),
  };

  switch (event) {
    case 'pulse':
      next.pulses = clampCounter(base.pulses + 1, EVENT_LIMITS.pulse);
      break;
    case 'elimination':
      next.eliminations = clampCounter(base.eliminations + 1, EVENT_LIMITS.elimination);
      break;
    case 'match':
      next.matches = clampCounter(base.matches + 1, EVENT_LIMITS.match);
      break;
  }

  return next;
}

function clampCounter(value: unknown, max = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.max(0, Math.min(max, Math.round(numeric)));
}
