import type { Redis } from '@upstash/redis';

import { getRedis } from '@/lib/redis';
import { hasRedisEnv, shouldAllowEphemeralFallback } from '@/lib/runtime';

type Key = string;

type Bucket = {
  remaining: number;
  resetAt: number; // epoch ms when window resets
};

const store = new Map<Key, Bucket>();
const MEMORY_SWEEP_INTERVAL = 256;
let memoryChecksSinceSweep = 0;

let sharedRedis: Redis | null | undefined;
let loggedRedisFallback = false;

export type RateLimitConfig = {
  windowMs: number;
  max: number;
  prefix?: string;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

function getSharedRedis(): Redis | null {
  if (!hasRedisEnv()) {
    return null;
  }
  if (sharedRedis === undefined) {
    try {
      sharedRedis = getRedis();
    } catch {
      sharedRedis = null;
    }
  }
  return sharedRedis ?? null;
}

function sweepExpiredMemoryBuckets(now: number): void {
  memoryChecksSinceSweep += 1;
  if (memoryChecksSinceSweep % MEMORY_SWEEP_INTERVAL !== 0) return;
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) {
      store.delete(key);
    }
  }
}

function memoryRateLimit(key: string, cfg: RateLimitConfig, now: number): RateLimitResult {
  sweepExpiredMemoryBuckets(now);
  const current = store.get(key);

  if (!current || now >= current.resetAt) {
    const bucket: Bucket = { remaining: cfg.max - 1, resetAt: now + cfg.windowMs };
    store.set(key, bucket);
    return { allowed: true, remaining: bucket.remaining, resetAt: bucket.resetAt };
  }

  if (current.remaining <= 0) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.remaining -= 1;
  return { allowed: true, remaining: current.remaining, resetAt: current.resetAt };
}

async function redisRateLimit(key: string, cfg: RateLimitConfig, now: number, client: Redis): Promise<RateLimitResult> {
  const script = `
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then
      redis.call("PEXPIRE", KEYS[1], ARGV[1])
    end
    local ttl = redis.call("PTTL", KEYS[1])
    return { current, ttl }
  `;
  const raw = (await client.eval(script, [key], [cfg.windowMs.toString()])) as unknown;
  const isTuple = Array.isArray(raw);
  const [countRaw, ttlRaw] = isTuple ? raw : [raw, cfg.windowMs];
  const count = Number((isTuple ? countRaw : raw) ?? 0);
  const ttl = Number((isTuple ? ttlRaw : cfg.windowMs) ?? cfg.windowMs);
  const allowed = count <= cfg.max;
  const remaining = Math.max(0, cfg.max - count);
  const resetAt = now + (ttl > 0 ? ttl : cfg.windowMs);
  return { allowed, remaining, resetAt };
}

export async function rateLimitCheck(keyPart: string, cfg: RateLimitConfig): Promise<RateLimitResult> {
  const now = Date.now();
  const key = `${cfg.prefix || 'rl'}:${keyPart}`;
  const client = getSharedRedis();
  if (client) {
    try {
      return await redisRateLimit(key, cfg, now, client);
    } catch (error) {
      if (!loggedRedisFallback && process.env.NODE_ENV !== 'test') {
        console.warn('[rateLimit] Redis fallback', error);
        loggedRedisFallback = true;
      }
    }
  }
  if (!shouldAllowEphemeralFallback()) {
    throw new Error('Redis-backed rate limiting is required in production.');
  }
  return memoryRateLimit(key, cfg, now);
}
