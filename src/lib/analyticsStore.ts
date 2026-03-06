import { getRedis } from '@/lib/redis';
import type { StoredAnalyticsEvent } from '@/lib/analytics';
import { hasRedisEnv, shouldAllowEphemeralFallback } from '@/lib/runtime';

const ANALYTICS_EVENTS_PREFIX = 'analytics:events';
const ANALYTICS_COUNTS_PREFIX = 'analytics:counts';
const ANALYTICS_TTL_SECONDS = 60 * 60 * 24 * 45;
const MAX_MEMORY_EVENTS = 500;

const memoryEvents: StoredAnalyticsEvent[] = [];

function eventKey(dateKey: string) {
  return `${ANALYTICS_EVENTS_PREFIX}:${dateKey}`;
}

function countKey(dateKey: string) {
  return `${ANALYTICS_COUNTS_PREFIX}:${dateKey}`;
}

export async function recordAnalyticsEvent(event: StoredAnalyticsEvent): Promise<void> {
  if (!hasRedisEnv()) {
    if (!shouldAllowEphemeralFallback()) {
      throw new Error('Redis-backed analytics persistence is required in production.');
    }
    memoryEvents.unshift(event);
    if (memoryEvents.length > MAX_MEMORY_EVENTS) {
      memoryEvents.length = MAX_MEMORY_EVENTS;
    }
    return;
  }

  const redis = getRedis();
  const dateKey = event.createdAt.slice(0, 10);
  const eventsKey = eventKey(dateKey);
  const countsKey = countKey(dateKey);
  const pipeline = redis.pipeline();
  pipeline.lpush(eventsKey, JSON.stringify(event));
  pipeline.ltrim(eventsKey, 0, MAX_MEMORY_EVENTS - 1);
  pipeline.expire(eventsKey, ANALYTICS_TTL_SECONDS);
  pipeline.hincrby(countsKey, event.name, 1);
  pipeline.expire(countsKey, ANALYTICS_TTL_SECONDS);
  await pipeline.exec();
}
