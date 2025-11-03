import { getRedis } from './redis';

type ChecklistRecord = {
  progress: Record<string, boolean>;
  updatedAt: string;
};

const memoryStore = new Map<string, ChecklistRecord>();

function hasRedisEnv() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.CODE_HASH_SECRET,
  );
}

function keyFor(userId: string) {
  return `beta:checklist:${userId}`;
}

export async function getBetaChecklistProgress(userId: string): Promise<ChecklistRecord | null> {
  if (!userId) return null;
  if (!hasRedisEnv()) {
    return memoryStore.get(userId) ?? null;
  }

  const redis = getRedis();
  const raw = await redis.get<string | ChecklistRecord>(keyFor(userId));
  if (!raw) return null;

  if (typeof raw === 'string') {
    return safeParse(raw);
  }

  return {
    progress: coerceProgress(raw.progress),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
}

export async function setBetaChecklistProgress(userId: string, progress: Record<string, boolean>): Promise<ChecklistRecord> {
  if (!userId) throw new Error('userId required');
  const sanitized = coerceProgress(progress);
  const payload: ChecklistRecord = {
    progress: sanitized,
    updatedAt: new Date().toISOString(),
  };

  if (!hasRedisEnv()) {
    memoryStore.set(userId, payload);
    return payload;
  }

  const redis = getRedis();
  await redis.set(keyFor(userId), JSON.stringify(payload), { ex: 60 * 60 * 24 * 60 }); // keep for ~60 days
  return payload;
}

function coerceProgress(progress: unknown): Record<string, boolean> {
  if (!progress || typeof progress !== 'object') {
    return {};
  }
  const result: Record<string, boolean> = {};
  const entries = Object.entries(progress as Record<string, unknown>);
  for (const [key, value] of entries) {
    result[key] = Boolean(value);
  }
  return result;
}

function safeParse(input: string): ChecklistRecord | null {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as { progress?: unknown; updatedAt?: unknown };
    const progress = 'progress' in obj ? coerceProgress(obj.progress) : {};
    const updatedAtRaw = typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString();
    return { progress, updatedAt: updatedAtRaw };
  } catch {
    return null;
  }
}

export type { ChecklistRecord as BetaChecklistRecord };
