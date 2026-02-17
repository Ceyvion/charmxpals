import { Redis } from '@upstash/redis';

let redisInstance: Redis | null = null;

function hasRedisEnv() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

export function getRedis(): Redis {
  if (!hasRedisEnv()) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for Redis access.');
  }
  if (!redisInstance) {
    redisInstance = Redis.fromEnv();
  }
  return redisInstance;
}

export type RedisType = Redis;
