import { type ArenaProgressEvent, toArenaProgressDateKey } from '@/lib/arenaProgress';
import { getRedis } from '@/lib/redis';
import { hasRedisEnv, shouldAllowEphemeralFallback } from '@/lib/runtime';

export type ArenaProgressRecord = {
  dateKey: string;
  pulses: number;
  eliminations: number;
  matches: number;
  updatedAt: string;
};

export type ArenaProgressDelta = {
  pulses?: number;
  eliminations?: number;
  matches?: number;
};

const ARENA_PROGRESS_TTL_SECONDS = 60 * 60 * 24 * 60;
const memoryStore = new Map<string, ArenaProgressRecord>();

export function toArenaDateKey(now = Date.now()) {
  return toArenaProgressDateKey(now);
}

export function createArenaProgressRecord(dateKey = toArenaDateKey()): ArenaProgressRecord {
  return {
    dateKey,
    pulses: 0,
    eliminations: 0,
    matches: 0,
    updatedAt: new Date().toISOString(),
  };
}

function keyFor(userId: string) {
  return `arena:progress:${userId}`;
}

function sanitizeCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function sanitizeArenaProgressDelta(delta: unknown): ArenaProgressDelta {
  if (!delta || typeof delta !== 'object') return {};
  const source = delta as Record<string, unknown>;
  return {
    pulses: sanitizeCount(source.pulses),
    eliminations: sanitizeCount(source.eliminations),
    matches: sanitizeCount(source.matches),
  };
}

function sanitizeArenaProgressRecord(record: unknown, dateKey = toArenaDateKey()): ArenaProgressRecord {
  if (!record || typeof record !== 'object') {
    return createArenaProgressRecord(dateKey);
  }
  const source = record as Partial<ArenaProgressRecord>;
  const recordDateKey = typeof source.dateKey === 'string' ? source.dateKey : dateKey;
  if (recordDateKey !== dateKey) {
    return createArenaProgressRecord(dateKey);
  }
  return {
    dateKey,
    pulses: sanitizeCount(source.pulses),
    eliminations: sanitizeCount(source.eliminations),
    matches: sanitizeCount(source.matches),
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
  };
}

function parseStoredRecord(raw: string | null | undefined, dateKey = toArenaDateKey()) {
  if (!raw) return createArenaProgressRecord(dateKey);
  try {
    return sanitizeArenaProgressRecord(JSON.parse(raw), dateKey);
  } catch {
    return createArenaProgressRecord(dateKey);
  }
}

export async function getArenaProgress(userId: string, dateKey = toArenaDateKey()): Promise<ArenaProgressRecord> {
  if (!userId) throw new Error('userId required');

  if (!hasRedisEnv()) {
    if (!shouldAllowEphemeralFallback()) {
      throw new Error('Redis-backed arena progress is required in production.');
    }
    return sanitizeArenaProgressRecord(memoryStore.get(userId), dateKey);
  }

  const redis = getRedis();
  const raw = await redis.get<string | ArenaProgressRecord>(keyFor(userId));
  if (!raw) return createArenaProgressRecord(dateKey);

  if (typeof raw === 'string') {
    return parseStoredRecord(raw, dateKey);
  }

  return sanitizeArenaProgressRecord(raw, dateKey);
}

export async function applyArenaProgressDelta(
  userId: string,
  delta: ArenaProgressDelta,
  dateKey = toArenaDateKey(),
): Promise<ArenaProgressRecord> {
  if (!userId) throw new Error('userId required');
  const sanitizedDelta = sanitizeArenaProgressDelta(delta);
  const current = await getArenaProgress(userId, dateKey);
  const next: ArenaProgressRecord = {
    dateKey,
    pulses: current.pulses + (sanitizedDelta.pulses ?? 0),
    eliminations: current.eliminations + (sanitizedDelta.eliminations ?? 0),
    matches: current.matches + (sanitizedDelta.matches ?? 0),
    updatedAt: new Date().toISOString(),
  };

  if (!hasRedisEnv()) {
    if (!shouldAllowEphemeralFallback()) {
      throw new Error('Redis-backed arena progress is required in production.');
    }
    memoryStore.set(userId, next);
    return next;
  }

  const redis = getRedis();
  await redis.set(keyFor(userId), JSON.stringify(next), { ex: ARENA_PROGRESS_TTL_SECONDS });
  return next;
}

export async function getArenaDailyProgress(userId: string, now = Date.now()) {
  return getArenaProgress(userId, toArenaProgressDateKey(now));
}

export async function incrementArenaDailyProgressEvent(
  userId: string,
  event: ArenaProgressEvent,
  now = Date.now(),
) {
  const delta =
    event === 'pulse'
      ? { pulses: 1 }
      : event === 'elimination'
        ? { eliminations: 1 }
        : { matches: 1 };
  return applyArenaProgressDelta(userId, delta, toArenaProgressDateKey(now));
}

export function resetArenaDailyProgressStoreForTests() {
  memoryStore.clear();
}

export function resetArenaProgressStoreForTests() {
  memoryStore.clear();
}
