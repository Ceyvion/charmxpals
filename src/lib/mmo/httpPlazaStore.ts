import type { Redis } from '@upstash/redis';

import { loreBySlug } from '@/data/characterLore';
import { filterProfanity } from '@/lib/profanity';
import { getRedis } from '@/lib/redis';
import { canUseMemoryMode, hasRedisEnv, isProductionRuntime } from '@/lib/runtime';
import { normalizeAvatarId } from '@/lib/mmo/avatarId';
import type { MmoSessionClaims } from '@/lib/mmo/token';
import type { PlayerState, Vec2 } from '@/lib/mmo/messages';

const PLAYERS_KEY = 'mmo:http:plaza:players';
const CHAT_KEY = 'mmo:http:plaza:chat';
const PLAYER_STALE_MS = 15_000;
const ROOM_TTL_SECONDS = 60;
const CHAT_LIMIT = 50;
const SNAPSHOT_INTERVAL_MS = 220;
const MOVE_SPEED = 3.2;
const PLAZA_MOTD = 'Signal Plaza is live - drop in and vibe.';

type HttpPlayerRecord = PlayerState & {
  axes: Vec2;
  lastSeen: number;
  lastUpdate: number;
  emoteCode?: string | null;
  emoteUntil?: number;
};

export type HttpPlazaChatMessage = {
  id: string;
  text: string;
  ts: number;
  from: string;
  authorId: string;
  flagged?: boolean;
};

export type HttpPlazaSyncInput = {
  axes?: Vec2;
  characterId?: string;
  emote?: string;
  chat?: string;
};

export type HttpPlazaSyncResult = {
  sessionId: string;
  motd: string;
  snapshotInterval: number;
  players: PlayerState[];
  chat: HttpPlazaChatMessage[];
  playerCount: number;
};

const memoryPlayers = new Map<string, HttpPlayerRecord>();
const memoryChat: HttpPlazaChatMessage[] = [];
let redisFallbackUntil = 0;

export function resetHttpPlazaMemoryForTests() {
  memoryPlayers.clear();
  memoryChat.splice(0, memoryChat.length);
  redisFallbackUntil = 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeAxes(value: unknown): Vec2 {
  if (!value || typeof value !== 'object') return { x: 0, y: 0 };
  const raw = value as { x?: unknown; y?: unknown };
  const x = clamp(Number(raw.x) || 0, -1, 1);
  const y = clamp(Number(raw.y) || 0, -1, 1);
  const magnitude = Math.hypot(x, y);
  if (magnitude <= 1) return { x, y };
  return { x: x / magnitude, y: y / magnitude };
}

function sanitizeDisplayName(claims: MmoSessionClaims) {
  const explicit = typeof claims.displayName === 'string' ? claims.displayName.trim() : '';
  const source = explicit || claims.sub || 'Guest';
  const base = source.startsWith('guest:') ? 'Guest' : source.split('@')[0];
  const compact = base.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  return (compact || 'Guest').slice(0, 18);
}

function sanitizeEmote(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 32);
}

function spawn(sessionId: string): Vec2 {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return {
    x: ((hash % 1200) / 100) - 6,
    y: (((hash >>> 8) % 700) / 100) - 3.5,
  };
}

function allowedOwned(claims: MmoSessionClaims) {
  const owned = Array.isArray(claims.owned)
    ? claims.owned
        .map((avatarId) => normalizeAvatarId(avatarId))
        .filter((avatarId): avatarId is string => Boolean(avatarId))
    : [];
  return owned.length > 0 ? owned : ['neon-city'];
}

function resolveCharacter(claims: MmoSessionClaims, requested: string | undefined, current: string | undefined) {
  const owned = allowedOwned(claims);
  const normalized = normalizeAvatarId(requested);
  if (normalized && owned.includes(normalized) && loreBySlug[normalized]) {
    return normalized;
  }
  if (current && owned.includes(current) && loreBySlug[current]) {
    return current;
  }
  return owned.find((avatarId) => loreBySlug[avatarId]) || 'neon-city';
}

function toPlayerState(record: HttpPlayerRecord, now: number): PlayerState {
  return {
    id: record.id,
    userId: record.userId,
    characterId: record.characterId,
    displayName: record.displayName,
    pos: { ...record.pos },
    rot: record.rot,
    cosmetics: record.cosmetics,
    emote: record.emoteUntil && record.emoteUntil > now ? record.emoteCode || null : null,
  };
}

function parsePlayer(value: unknown): HttpPlayerRecord | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as HttpPlayerRecord;
    if (!record.id || !record.pos || typeof record.lastSeen !== 'number') return null;
    return record;
  } catch {
    return null;
  }
}

function parseChat(value: unknown): HttpPlazaChatMessage | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') return null;
    const entry = parsed as HttpPlazaChatMessage;
    if (!entry.id || !entry.text || typeof entry.ts !== 'number') return null;
    return entry;
  } catch {
    return null;
  }
}

export function canUseHttpPlazaTransport() {
  if (hasRedisEnv()) return true;
  return canUseMemoryMode();
}

function getRedisOrNull(): Redis | null {
  if (Date.now() < redisFallbackUntil) return null;
  if (canUseMemoryMode()) return null;
  if (!hasRedisEnv()) {
    if (isProductionRuntime()) {
      throw new Error('Redis is required for hosted HTTP plaza transport.');
    }
    return null;
  }
  return getRedis();
}

async function readPlayers(redis: Redis | null) {
  if (!redis) return new Map(memoryPlayers);
  const raw = (await redis.hgetall(PLAYERS_KEY)) as Record<string, unknown> | null;
  const players = new Map<string, HttpPlayerRecord>();
  for (const value of Object.values(raw || {})) {
    const player = parsePlayer(value);
    if (player) players.set(player.id, player);
  }
  return players;
}

async function writePlayer(redis: Redis | null, player: HttpPlayerRecord) {
  if (!redis) {
    memoryPlayers.set(player.id, player);
    return;
  }
  await redis.hset(PLAYERS_KEY, { [player.id]: JSON.stringify(player) });
  await redis.expire(PLAYERS_KEY, ROOM_TTL_SECONDS);
}

async function deletePlayers(redis: Redis | null, ids: string[]) {
  if (ids.length === 0) return;
  if (!redis) {
    ids.forEach((id) => memoryPlayers.delete(id));
    return;
  }
  await Promise.all(ids.map((id) => redis.hdel(PLAYERS_KEY, id)));
}

async function appendChat(redis: Redis | null, entry: HttpPlazaChatMessage | null) {
  if (!entry) return;
  if (!redis) {
    memoryChat.push(entry);
    memoryChat.splice(0, Math.max(0, memoryChat.length - CHAT_LIMIT));
    return;
  }
  await redis.lpush(CHAT_KEY, JSON.stringify(entry));
  await redis.ltrim(CHAT_KEY, 0, CHAT_LIMIT - 1);
  await redis.expire(CHAT_KEY, ROOM_TTL_SECONDS);
}

async function readChat(redis: Redis | null) {
  if (!redis) return [...memoryChat];
  const raw = (await redis.lrange(CHAT_KEY, 0, CHAT_LIMIT - 1)) as unknown[];
  return raw.map(parseChat).filter((entry): entry is HttpPlazaChatMessage => Boolean(entry)).reverse();
}

function integratePlayer(record: HttpPlayerRecord, axes: Vec2, now: number) {
  const dt = clamp((now - record.lastUpdate) / 1000, 0, 1);
  const moved = Math.hypot(axes.x, axes.y) > 0.01;
  const next = {
    x: clamp(record.pos.x + axes.x * MOVE_SPEED * dt, -10, 10),
    y: clamp(record.pos.y + axes.y * MOVE_SPEED * dt, -6, 6),
  };
  return {
    pos: next,
    rot: moved ? Math.atan2(axes.y, axes.x) : record.rot,
  };
}

export async function syncHttpPlazaSession(
  claims: MmoSessionClaims,
  input: HttpPlazaSyncInput,
): Promise<HttpPlazaSyncResult> {
  const redis = getRedisOrNull();
  try {
    return await syncHttpPlazaSessionWithStore(redis, claims, input);
  } catch (error) {
    if (!redis) throw error;
    console.warn('[mmo] HTTP plaza Redis unavailable; falling back to local memory', error);
    redisFallbackUntil = Date.now() + 60_000;
    return syncHttpPlazaSessionWithStore(null, claims, input);
  }
}

async function syncHttpPlazaSessionWithStore(
  redis: Redis | null,
  claims: MmoSessionClaims,
  input: HttpPlazaSyncInput,
): Promise<HttpPlazaSyncResult> {
  const now = Date.now();
  const sessionId = claims.sid;
  const players = await readPlayers(redis);
  const staleIds: string[] = [];

  players.forEach((player, id) => {
    if (now - player.lastSeen > PLAYER_STALE_MS) {
      staleIds.push(id);
      players.delete(id);
    }
  });

  const existing = players.get(sessionId);
  const axes = normalizeAxes(input.axes);
  const characterId = resolveCharacter(claims, input.characterId, existing?.characterId);
  const baseRecord: HttpPlayerRecord = existing || {
    id: sessionId,
    userId: claims.sub,
    characterId,
    displayName: sanitizeDisplayName(claims),
    pos: spawn(sessionId),
    rot: 0,
    cosmetics: { badgeIds: [] },
    axes: { x: 0, y: 0 },
    lastSeen: now,
    lastUpdate: now,
  };

  const movement = integratePlayer(baseRecord, axes, now);
  const emote = sanitizeEmote(input.emote);
  const updated: HttpPlayerRecord = {
    ...baseRecord,
    characterId,
    displayName: sanitizeDisplayName(claims),
    pos: movement.pos,
    rot: movement.rot,
    axes,
    lastSeen: now,
    lastUpdate: now,
    emoteCode: emote || baseRecord.emoteCode || null,
    emoteUntil: emote ? now + 2_000 : baseRecord.emoteUntil,
  };
  if (updated.emoteUntil && updated.emoteUntil <= now) {
    updated.emoteCode = null;
    updated.emoteUntil = undefined;
  }

  let chatEntry: HttpPlazaChatMessage | null = null;
  if (typeof input.chat === 'string') {
    const text = input.chat.trim().slice(0, 240);
    if (text) {
      const { clean, flagged } = filterProfanity(text);
      chatEntry = {
        id: `${sessionId}-${now}`,
        text: clean,
        ts: now,
        from: updated.displayName,
        authorId: sessionId,
        flagged,
      };
    }
  }

  players.set(sessionId, updated);
  await deletePlayers(redis, staleIds);
  await writePlayer(redis, updated);
  await appendChat(redis, chatEntry);

  const freshPlayers = Array.from(players.values()).map((player) => (
    player.id === sessionId ? updated : player
  ));
  const chat = await readChat(redis);

  return {
    sessionId,
    motd: PLAZA_MOTD,
    snapshotInterval: SNAPSHOT_INTERVAL_MS,
    players: freshPlayers.map((player) => toPlayerState(player, now)),
    chat,
    playerCount: freshPlayers.length,
  };
}
