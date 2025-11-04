import { randomUUID } from 'crypto';
import type { Redis } from '@upstash/redis';

import { getRedis } from '@/lib/redis';

export type LeaderboardEntry = {
  id: string;
  score: number;
  coins?: number;
  name?: string;
  at: string;
};

export type LeaderboardResult = {
  success: true;
  entry: LeaderboardEntry;
};

const TTL_SECONDS = 60 * 60 * 48; // keep leaderboard results for two days
const MAX_ENTRIES = 100;

const memoryStore = new Map<string, LeaderboardEntry[]>();

function hasRedisEnv(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function leaderboardKey(mode: string, dateKey: string): string {
  return `lb:${mode}:${dateKey}`;
}

function dataKeyFor(key: string): string {
  return `${key}:data`;
}

function todayKey(mode: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return leaderboardKey(mode, date);
}

let cachedRedis: Redis | null | undefined;

function getLeaderboardRedis(): Redis | null {
  if (!hasRedisEnv()) return null;
  if (cachedRedis === undefined) {
    try {
      cachedRedis = getRedis();
    } catch {
      cachedRedis = null;
    }
  }
  return cachedRedis ?? null;
}

function writeMemoryScore(key: string, entry: LeaderboardEntry): LeaderboardEntry {
  const existing = memoryStore.get(key) ?? [];
  existing.push(entry);
  existing.sort((a, b) => b.score - a.score);
  memoryStore.set(key, existing.slice(0, MAX_ENTRIES));
  return entry;
}

function readMemoryTop(key: string, limit: number): LeaderboardEntry[] {
  const entries = memoryStore.get(key);
  if (!entries) return [];
  return entries.slice(0, limit);
}

async function trimRedisLeaderboard(client: Redis, key: string): Promise<void> {
  const total = await client.zcard(key);
  if (total <= MAX_ENTRIES) return;
  const overflowCount = total - MAX_ENTRIES;
  if (overflowCount <= 0) return;
  const membersToRemove = await client.zrange<string[]>(key, 0, overflowCount - 1);
  if (!membersToRemove.length) return;
  const pipeline = client.pipeline();
  pipeline.zrem(key, ...membersToRemove);
  pipeline.hdel(dataKeyFor(key), ...membersToRemove);
  await pipeline.exec();
}

async function writeRedisScore(client: Redis, key: string, entry: LeaderboardEntry): Promise<LeaderboardEntry> {
  const dataKey = dataKeyFor(key);
  const pipeline = client.pipeline();
  pipeline.zadd(key, { score: entry.score, member: entry.id });
  pipeline.hset(dataKey, { [entry.id]: JSON.stringify(entry) });
  pipeline.expire(key, TTL_SECONDS);
  pipeline.expire(dataKey, TTL_SECONDS);
  await pipeline.exec();
  await trimRedisLeaderboard(client, key);
  return entry;
}

async function readRedisTop(client: Redis, key: string, limit: number): Promise<LeaderboardEntry[]> {
  if (limit <= 0) return [];
  const dataKey = dataKeyFor(key);
  const range = await client.zrange<{ member: string; score: number }>(key, 0, limit - 1, { rev: true, withScores: true });
  if (!range?.length) return [];
  const members = range.map((item) => item.member);
  const rawEntries = members.length ? await client.hmget<string | null>(dataKey, ...members) : [];
  const results: LeaderboardEntry[] = [];
  for (let i = 0; i < members.length; i += 1) {
    const serialized = rawEntries?.[i];
    if (typeof serialized === 'string') {
      try {
        const parsed = JSON.parse(serialized) as LeaderboardEntry;
        if (parsed && typeof parsed.score === 'number') {
          results.push(parsed);
          continue;
        }
      } catch {
        // fall through and reconstruct minimal entry
      }
    }
    const fallback: LeaderboardEntry = {
      id: members[i],
      score: range[i]?.score ?? 0,
      at: new Date().toISOString(),
    };
    results.push(fallback);
  }
  return results;
}

export async function submitScore(params: { mode: string; score: number; coins?: number; name?: string }): Promise<LeaderboardResult> {
  const mode = params.mode || 'runner';
  const key = todayKey(mode);
  const nowIso = new Date().toISOString();
  const entry: LeaderboardEntry = {
    id: randomUUID(),
    score: Math.round(params.score),
    coins: typeof params.coins === 'number' && Number.isFinite(params.coins) ? Math.round(params.coins) : undefined,
    name: params.name,
    at: nowIso,
  };

  const client = getLeaderboardRedis();
  if (client) {
    try {
      await writeRedisScore(client, key, entry);
      return { success: true, entry };
    } catch (error) {
      console.warn('[leaderboard] Redis failed, falling back to memory store', error);
    }
  }

  writeMemoryScore(key, entry);
  return { success: true, entry };
}

export async function getTopScores(mode: string, limit = 20): Promise<LeaderboardEntry[]> {
  const key = todayKey(mode);
  const client = getLeaderboardRedis();
  if (client) {
    try {
      return await readRedisTop(client, key, limit);
    } catch (error) {
      console.warn('[leaderboard] Redis read failed, falling back to memory store', error);
    }
  }
  return readMemoryTop(key, limit);
}

