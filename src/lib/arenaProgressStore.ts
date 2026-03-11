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

function keyFor(userId: string, dateKey: string) {
  return `arena:progress:${userId}:${dateKey}`;
}

function sanitizeCount(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return 0;
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

function parseStoredRecord(
  raw: string | Record<string, string | number | null> | null | undefined,
  dateKey = toArenaDateKey(),
) {
  if (!raw) return createArenaProgressRecord(dateKey);
  if (typeof raw === 'object') {
    return sanitizeArenaProgressRecord(raw, dateKey);
  }
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
    return sanitizeArenaProgressRecord(memoryStore.get(keyFor(userId, dateKey)), dateKey);
  }

  const redis = getRedis();
  const raw = await redis.hgetall<Record<string, string | number | null>>(keyFor(userId, dateKey));
  if (!raw || Object.keys(raw).length === 0) return createArenaProgressRecord(dateKey);
  return parseStoredRecord(raw, dateKey);
}

export async function applyArenaProgressDelta(
  userId: string,
  delta: ArenaProgressDelta,
  dateKey = toArenaDateKey(),
): Promise<ArenaProgressRecord> {
  if (!userId) throw new Error('userId required');
  const sanitizedDelta = sanitizeArenaProgressDelta(delta);
  const updatedAt = new Date().toISOString();

  if (!hasRedisEnv()) {
    if (!shouldAllowEphemeralFallback()) {
      throw new Error('Redis-backed arena progress is required in production.');
    }
    const storeKey = keyFor(userId, dateKey);
    const current = sanitizeArenaProgressRecord(memoryStore.get(storeKey), dateKey);
    const next: ArenaProgressRecord = {
      dateKey,
      pulses: current.pulses + (sanitizedDelta.pulses ?? 0),
      eliminations: current.eliminations + (sanitizedDelta.eliminations ?? 0),
      matches: current.matches + (sanitizedDelta.matches ?? 0),
      updatedAt,
    };
    memoryStore.set(storeKey, next);
    return next;
  }

  const redis = getRedis();
  const result = (await redis.eval(
    `
      local pulsesDelta = tonumber(ARGV[1]) or 0
      local eliminationsDelta = tonumber(ARGV[2]) or 0
      local matchesDelta = tonumber(ARGV[3]) or 0

      local pulses = (tonumber(redis.call("HGET", KEYS[1], "pulses") or "0") or 0) + pulsesDelta
      local eliminations = (tonumber(redis.call("HGET", KEYS[1], "eliminations") or "0") or 0) + eliminationsDelta
      local matches = (tonumber(redis.call("HGET", KEYS[1], "matches") or "0") or 0) + matchesDelta

      redis.call(
        "HSET",
        KEYS[1],
        "dateKey", ARGV[4],
        "pulses", tostring(pulses),
        "eliminations", tostring(eliminations),
        "matches", tostring(matches),
        "updatedAt", ARGV[5]
      )
      redis.call("EXPIRE", KEYS[1], tonumber(ARGV[6]) or 0)

      return {ARGV[4], tostring(pulses), tostring(eliminations), tostring(matches), ARGV[5]}
    `,
    [keyFor(userId, dateKey)],
    [
      String(sanitizedDelta.pulses ?? 0),
      String(sanitizedDelta.eliminations ?? 0),
      String(sanitizedDelta.matches ?? 0),
      dateKey,
      updatedAt,
      String(ARENA_PROGRESS_TTL_SECONDS),
    ],
  )) as Array<string | number>;

  return {
    dateKey: String(result?.[0] ?? dateKey),
    pulses: sanitizeCount(result?.[1]),
    eliminations: sanitizeCount(result?.[2]),
    matches: sanitizeCount(result?.[3]),
    updatedAt: String(result?.[4] ?? updatedAt),
  };
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
