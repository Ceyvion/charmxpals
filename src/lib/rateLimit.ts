type Key = string;

type Bucket = {
  remaining: number;
  resetAt: number; // epoch ms when window resets
};

const store = new Map<Key, Bucket>();

export type RateLimitConfig = {
  windowMs: number;
  max: number;
  prefix?: string;
};

export function rateLimitCheck(keyPart: string, cfg: RateLimitConfig) {
  const now = Date.now();
  const key = `${cfg.prefix || 'rl'}:${keyPart}`;
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

