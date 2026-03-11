import { randomUUID } from 'crypto';
import type { Redis } from '@upstash/redis';

import { getRedis } from '@/lib/redis';
import { hasRedisEnv, shouldAllowEphemeralFallback } from '@/lib/runtime';

export type LeaderboardEntry = {
  id: string;
  userId?: string;
  mode: string;
  trackId?: string;
  score: number;
  coins?: number;
  name?: string;
  displayName?: string;
  at: string;
};

export type LeaderboardResult = {
  success: true;
  improved: boolean;
  entry: LeaderboardEntry;
};

export type SubmitScoreParams = {
  mode: string;
  score: number;
  coins?: number;
  trackId?: string | null;
  userId?: string;
  name?: string;
  displayName?: string;
};

const TTL_SECONDS = 60 * 60 * 48;
const MAX_ENTRIES = 100;

const memoryStore = new Map<string, LeaderboardEntry[]>();

function normalizeTrackId(trackId?: string | null): string | undefined {
  const normalized = trackId?.trim();
  return normalized ? normalized : undefined;
}

function leaderboardKey(mode: string, dateKey: string, trackId?: string): string {
  const scope = trackId ? `track:${trackId}` : 'all';
  return `lb:${mode}:${scope}:${dateKey}`;
}

function dataKeyFor(key: string): string {
  return `${key}:data`;
}

function todayKey(mode: string, trackId?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return leaderboardKey(mode, date, trackId);
}

function memberKeyFromEntry(entry: Pick<LeaderboardEntry, 'id' | 'userId'>): string {
  return entry.userId ? `user:${entry.userId}` : `entry:${entry.id}`;
}

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  const scoreDiff = b.score - a.score;
  if (scoreDiff !== 0) return scoreDiff;

  const coinsDiff = (b.coins ?? -1) - (a.coins ?? -1);
  if (coinsDiff !== 0) return coinsDiff;

  return a.at.localeCompare(b.at);
}

function isImprovement(next: LeaderboardEntry, existing: LeaderboardEntry): boolean {
  if (next.score !== existing.score) return next.score > existing.score;
  return (next.coins ?? -1) > (existing.coins ?? -1);
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

function writeMemoryScore(key: string, entry: LeaderboardEntry): { entry: LeaderboardEntry; improved: boolean } {
  const existing = memoryStore.get(key) ?? [];
  const memberKey = memberKeyFromEntry(entry);
  const existingIndex = existing.findIndex((candidate) => memberKeyFromEntry(candidate) === memberKey);

  if (existingIndex >= 0) {
    const previous = existing[existingIndex];
    if (!isImprovement(entry, previous)) {
      return { entry: previous, improved: false };
    }
    existing[existingIndex] = entry;
  } else {
    existing.push(entry);
  }

  existing.sort(compareEntries);
  memoryStore.set(key, existing.slice(0, MAX_ENTRIES));
  return { entry, improved: true };
}

function readMemoryTop(key: string, limit: number): LeaderboardEntry[] {
  const entries = memoryStore.get(key);
  if (!entries) return [];
  return entries.slice(0, limit);
}

async function writeRedisScore(
  client: Redis,
  key: string,
  entry: LeaderboardEntry,
): Promise<{ entry: LeaderboardEntry; improved: boolean }> {
  const dataKey = dataKeyFor(key);
  const memberKey = memberKeyFromEntry(entry);
  const rawResult = (await client.eval(
    `
      local existingRaw = redis.call("HGET", KEYS[2], ARGV[1])
      if existingRaw then
        local ok, existing = pcall(cjson.decode, existingRaw)
        if ok and existing and existing.score ~= nil then
          local existingScore = tonumber(existing.score) or 0
          local existingCoins = tonumber(existing.coins) or -1
          local nextScore = tonumber(ARGV[3]) or 0
          local nextCoins = tonumber(ARGV[4]) or -1
          local improved = false

          if nextScore ~= existingScore then
            improved = nextScore > existingScore
          else
            improved = nextCoins > existingCoins
          end

          if not improved then
            return {0, existingRaw}
          end
        end
      end

      redis.call("ZADD", KEYS[1], tonumber(ARGV[3]) or 0, ARGV[1])
      redis.call("HSET", KEYS[2], ARGV[1], ARGV[2])
      redis.call("EXPIRE", KEYS[1], tonumber(ARGV[5]) or 0)
      redis.call("EXPIRE", KEYS[2], tonumber(ARGV[5]) or 0)

      local total = redis.call("ZCARD", KEYS[1])
      local maxEntries = tonumber(ARGV[6]) or 100
      if total > maxEntries then
        local overflow = total - maxEntries
        local members = redis.call("ZRANGE", KEYS[1], 0, overflow - 1)
        if #members > 0 then
          redis.call("ZREM", KEYS[1], unpack(members))
          redis.call("HDEL", KEYS[2], unpack(members))
        end
      end

      return {1, ARGV[2]}
    `,
    [key, dataKey],
    [
      memberKey,
      JSON.stringify(entry),
      entry.score.toString(),
      String(entry.coins ?? -1),
      TTL_SECONDS.toString(),
      MAX_ENTRIES.toString(),
    ],
  )) as Array<string | number>;

  const improved = Number(rawResult?.[0] ?? 0) === 1;
  const stored = safeParseEntry(typeof rawResult?.[1] === 'string' ? rawResult[1] : null) ?? entry;
  return { entry: stored, improved };
}

async function readRedisTop(client: Redis, key: string, limit: number): Promise<LeaderboardEntry[]> {
  if (limit <= 0) return [];
  const dataKey = dataKeyFor(key);
  const range = (await client.zrange(key, 0, limit - 1, { rev: true, withScores: true })) as Array<{ member: string; score: number }>;
  if (!range?.length) return [];
  const members = range.map((item) => item.member);
  const rawEntries = members.length ? ((await client.hmget(dataKey, ...members)) as unknown as Array<string | null>) : [];
  const results: LeaderboardEntry[] = [];

  for (let i = 0; i < members.length; i += 1) {
    const parsed = safeParseEntry(rawEntries?.[i]);
    if (parsed) {
      results.push(parsed);
      continue;
    }

    results.push({
      id: members[i],
      mode: 'unknown',
      score: range[i]?.score ?? 0,
      at: new Date().toISOString(),
    });
  }

  return results;
}

function safeParseEntry(value: string | null | undefined): LeaderboardEntry | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<LeaderboardEntry>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.id !== 'string' || typeof parsed.mode !== 'string' || typeof parsed.score !== 'number') {
      return null;
    }
    return {
      id: parsed.id,
      userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
      mode: parsed.mode,
      trackId: typeof parsed.trackId === 'string' ? parsed.trackId : undefined,
      score: parsed.score,
      coins: typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) ? parsed.coins : undefined,
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      displayName:
        typeof parsed.displayName === 'string'
          ? parsed.displayName
          : typeof parsed.name === 'string'
            ? parsed.name
            : undefined,
      at: typeof parsed.at === 'string' ? parsed.at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function submitScore(params: SubmitScoreParams): Promise<LeaderboardResult> {
  const mode = params.mode || 'runner';
  const trackId = normalizeTrackId(params.trackId);
  const key = todayKey(mode, trackId);
  const nowIso = new Date().toISOString();
  const userId = params.userId?.trim() || undefined;
  const entry: LeaderboardEntry = {
    id: userId || randomUUID(),
    userId,
    mode,
    trackId,
    score: Math.round(params.score),
    coins: typeof params.coins === 'number' && Number.isFinite(params.coins) ? Math.round(params.coins) : undefined,
    name: params.displayName?.trim() || params.name?.trim() || undefined,
    displayName: params.displayName?.trim() || params.name?.trim() || undefined,
    at: nowIso,
  };

  const client = getLeaderboardRedis();
  if (client) {
    try {
      const result = await writeRedisScore(client, key, entry);
      return { success: true, ...result };
    } catch (error) {
      console.warn('[leaderboard] Redis failed, falling back to memory store', error);
    }
  }

  if (!shouldAllowEphemeralFallback()) {
    throw new Error('Redis-backed leaderboards are required in production.');
  }

  return { success: true, ...writeMemoryScore(key, entry) };
}

export async function getTopScores(
  mode: string,
  limit = 20,
  options?: { trackId?: string | null } | string | null,
): Promise<LeaderboardEntry[]> {
  const trackId = typeof options === 'string' || options === null
    ? normalizeTrackId(options)
    : normalizeTrackId(options?.trackId);
  const key = todayKey(mode, trackId);
  const client = getLeaderboardRedis();
  if (client) {
    try {
      return await readRedisTop(client, key, limit);
    } catch (error) {
      console.warn('[leaderboard] Redis read failed, falling back to memory store', error);
    }
  }

  if (!shouldAllowEphemeralFallback()) {
    throw new Error('Redis-backed leaderboards are required in production.');
  }

  return readMemoryTop(key, limit);
}

export function resetLeaderboardForTests() {
  memoryStore.clear();
  cachedRedis = undefined;
}
