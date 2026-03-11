import { createHmac, randomUUID } from 'crypto';

import { pulsegridTracks } from '@/data/pulsegridTracks';
import { getRedis } from '@/lib/redis';
import { hasRedisEnv, isProductionRuntime, shouldAllowEphemeralFallback } from '@/lib/runtime';

export type ScoreMode = 'runner';

export type ScoreSessionClaims = {
  sub: string;
  mode: ScoreMode;
  nonce: string;
  iat: number;
  nbf: number;
  exp: number;
  trackId: string | null;
  displayName: string | null;
};

export type ScoreAttemptRecord = {
  sub: string;
  mode: ScoreMode;
  nonce: string;
  trackId: string | null;
  iat: number;
  nbf: number;
  exp: number;
  noteCount: number;
  maxProgress: number;
  maxNoteIndex: number;
  checkpointCount: number;
  updatedAt: number;
};

const SCORE_NOTE_VALUE = 1250;
const SCORE_COMBO_MULTIPLIER = 3;
const DEFAULT_TTL_SECONDS = 20 * 60;
const DEFAULT_MIN_AGE_SECONDS = 30;
const RUNNER_MIN_SUBMIT_BUFFER_MS = 6500;
const RUNNER_REQUIRED_PROGRESS_FLOOR = 0.55;
const scoreNonceMemoryStore = new Map<string, number>();
const scoreAttemptMemoryStore = new Map<string, ScoreAttemptRecord>();

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function decodeBase64Url(input: string) {
  let normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  if (pad) normalized += '='.repeat(4 - pad);
  return Buffer.from(normalized, 'base64');
}

function resolveScoreSigningSecret(explicit?: string) {
  const configured =
    explicit?.trim() ||
    process.env.SCORE_SIGNING_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (configured) return configured;

  if (!isProductionRuntime()) {
    const fallback = process.env.CODE_HASH_SECRET?.trim();
    if (fallback) return fallback;
    if (process.env.NODE_ENV === 'test') return 'test-score-secret';
  }

  throw new Error('Score signing secret is not configured.');
}

function getRunnerTrack(trackId: string | null | undefined) {
  if (!trackId) return null;
  return pulsegridTracks.find((track) => track.id === trackId) ?? null;
}

function sweepNonceMemoryStore(nowMs: number) {
  for (const [key, expiresAt] of scoreNonceMemoryStore) {
    if (expiresAt <= nowMs) {
      scoreNonceMemoryStore.delete(key);
    }
  }
}

function sweepScoreAttemptMemoryStore(nowSec: number) {
  for (const [key, record] of scoreAttemptMemoryStore) {
    if (record.exp <= nowSec) {
      scoreAttemptMemoryStore.delete(key);
    }
  }
}

function scoreAttemptKey(nonce: string) {
  return `score:attempt:${nonce}`;
}

function normalizeTrackId(trackId: string | null | undefined) {
  return typeof trackId === 'string' ? trackId : '';
}

function coerceNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function sanitizeProgress(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function sanitizeNoteIndex(value: unknown, noteCount: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(noteCount, Math.floor(value)));
}

function sanitizeCheckpointCount(value: unknown) {
  return Math.max(0, Math.floor(coerceNumber(value, 0)));
}

function sanitizeAttemptRecord(record: unknown): ScoreAttemptRecord | null {
  if (!record || typeof record !== 'object') return null;
  const source = record as Partial<ScoreAttemptRecord>;
  if (!source.sub || !source.mode || !source.nonce) return null;
  const noteCount = Math.max(0, Math.floor(coerceNumber(source.noteCount, 0)));
  return {
    sub: source.sub,
    mode: source.mode,
    nonce: source.nonce,
    trackId: typeof source.trackId === 'string' ? source.trackId : null,
    iat: Math.max(0, Math.floor(coerceNumber(source.iat, 0))),
    nbf: Math.max(0, Math.floor(coerceNumber(source.nbf, 0))),
    exp: Math.max(0, Math.floor(coerceNumber(source.exp, 0))),
    noteCount,
    maxProgress: sanitizeProgress(source.maxProgress),
    maxNoteIndex: sanitizeNoteIndex(source.maxNoteIndex, noteCount),
    checkpointCount: sanitizeCheckpointCount(source.checkpointCount),
    updatedAt: Math.max(0, Math.floor(coerceNumber(source.updatedAt, Date.now()))),
  };
}

function parseStoredAttemptRecord(
  raw: string | ScoreAttemptRecord | Record<string, string | number | null> | null | undefined,
) {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return sanitizeAttemptRecord(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  return sanitizeAttemptRecord(raw);
}

export function createScoreSession(params: {
  userId: string;
  mode: ScoreMode;
  trackId?: string | null;
  ttlSeconds?: number;
  minAgeSeconds?: number;
  displayName?: string | null;
}) {
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds = params.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const minAgeSeconds = params.minAgeSeconds ?? DEFAULT_MIN_AGE_SECONDS;
  const claims: ScoreSessionClaims = {
    sub: params.userId,
    mode: params.mode,
    nonce: randomUUID(),
    iat: now,
    nbf: now + minAgeSeconds,
    exp: now + ttlSeconds,
    trackId: params.trackId ?? null,
    displayName: params.displayName?.trim() || null,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const secret = resolveScoreSigningSecret();
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(claims));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');

  return {
    token: `${data}.${signature}`,
    claims,
  };
}

export async function createScoreAttemptRecord(params: {
  claims: ScoreSessionClaims;
  noteCount: number;
}) {
  const record: ScoreAttemptRecord = {
    sub: params.claims.sub,
    mode: params.claims.mode,
    nonce: params.claims.nonce,
    trackId: params.claims.trackId,
    iat: params.claims.iat,
    nbf: params.claims.nbf,
    exp: params.claims.exp,
    noteCount: Math.max(0, Math.floor(params.noteCount)),
    maxProgress: 0,
    maxNoteIndex: 0,
    checkpointCount: 0,
    updatedAt: Date.now(),
  };
  await persistScoreAttemptRecord(record);
  return record;
}

export function verifyScoreSession(token: string): ScoreSessionClaims | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const secret = resolveScoreSigningSecret();
    const data = `${header}.${payload}`;
    const expected = createHmac('sha256', secret).update(data).digest('base64url');
    if (expected !== signature) return null;

    const claims = JSON.parse(decodeBase64Url(payload).toString('utf8')) as ScoreSessionClaims;
    const now = Math.floor(Date.now() / 1000);
    if (!claims.sub || !claims.mode || !claims.nonce) return null;
    if (claims.exp < now) return null;
    return claims;
  } catch {
    return null;
  }
}

export async function consumeScoreSessionNonce(nonce: string, ttlSeconds: number) {
  const expiresAtMs = Date.now() + ttlSeconds * 1000;
  if (hasRedisEnv()) {
    try {
      const redis = getRedis();
      const result = (await redis.set(`score:nonce:${nonce}`, '1', { nx: true, ex: ttlSeconds })) as unknown;
      return result === 'OK';
    } catch (error) {
      if (!shouldAllowEphemeralFallback()) {
        throw error;
      }
    }
  }

  if (!shouldAllowEphemeralFallback()) {
    throw new Error('Score nonce persistence is required in production.');
  }

  sweepNonceMemoryStore(Date.now());
  const existing = scoreNonceMemoryStore.get(nonce);
  if (existing && existing > Date.now()) {
    return false;
  }
  scoreNonceMemoryStore.set(nonce, expiresAtMs);
  return true;
}

export async function getScoreAttemptRecord(nonce: string) {
  if (!nonce) return null;

  if (hasRedisEnv()) {
    try {
      const redis = getRedis();
      const key = scoreAttemptKey(nonce);
      const hashRaw = await redis.hgetall<Record<string, string | number | null>>(key);
      const parsedHash = parseStoredAttemptRecord(hashRaw);
      if (parsedHash) return parsedHash;

      const raw = await redis.get<string | ScoreAttemptRecord>(key);
      return parseStoredAttemptRecord(raw);
    } catch (error) {
      if (!shouldAllowEphemeralFallback()) {
        throw error;
      }
    }
  }

  if (!shouldAllowEphemeralFallback()) {
    throw new Error('Score attempt persistence is required in production.');
  }

  sweepScoreAttemptMemoryStore(Math.floor(Date.now() / 1000));
  return scoreAttemptMemoryStore.get(nonce) ?? null;
}

export async function updateScoreAttemptProgress(params: {
  nonce: string;
  userId: string;
  trackId: string | null;
  progress: number;
  furthestNoteIndex: number;
}) {
  const sanitizedProgress = sanitizeProgress(params.progress);
  const updatedAt = Date.now();

  if (hasRedisEnv()) {
    try {
      const redis = getRedis();
      const key = scoreAttemptKey(params.nonce);
      const lua = `
        local raw = redis.call("HGETALL", KEYS[1])
        if #raw == 0 then
          return {0, "missing"}
        end

        local data = {}
        for i = 1, #raw, 2 do
          data[raw[i]] = raw[i + 1]
        end

        local reqUserId = ARGV[1]
        local reqTrackId = ARGV[2]
        if data.sub ~= reqUserId then
          return {0, "mismatch"}
        end

        local storedTrackId = data.trackId or ""
        if storedTrackId ~= reqTrackId then
          return {0, "mismatch"}
        end

        local noteCount = tonumber(data.noteCount or "0") or 0
        local nextProgress = tonumber(ARGV[3]) or 0
        if nextProgress < 0 then nextProgress = 0 end
        if nextProgress > 1 then nextProgress = 1 end

        local nextNoteIndex = tonumber(ARGV[4]) or 0
        if nextNoteIndex < 0 then nextNoteIndex = 0 end
        nextNoteIndex = math.floor(nextNoteIndex)
        if nextNoteIndex > noteCount then nextNoteIndex = noteCount end

        local maxProgress = tonumber(data.maxProgress or "0") or 0
        local maxNoteIndex = tonumber(data.maxNoteIndex or "0") or 0
        local checkpointCount = tonumber(data.checkpointCount or "0") or 0
        local didAdvance = 0

        if nextProgress > maxProgress then
          maxProgress = nextProgress
          didAdvance = 1
        end

        if nextNoteIndex > maxNoteIndex then
          maxNoteIndex = nextNoteIndex
          didAdvance = 1
        end

        if didAdvance == 1 then
          checkpointCount = checkpointCount + 1
        end

        redis.call(
          "HSET",
          KEYS[1],
          "maxProgress", tostring(maxProgress),
          "maxNoteIndex", tostring(maxNoteIndex),
          "checkpointCount", tostring(checkpointCount),
          "updatedAt", ARGV[5]
        )

        local ttl = tonumber(ARGV[6]) or 0
        if ttl > 0 then
          redis.call("EXPIRE", KEYS[1], ttl)
        end

        return {
          1,
          data.sub or "",
          data.mode or "",
          data.nonce or "",
          storedTrackId,
          data.iat or "0",
          data.nbf or "0",
          data.exp or "0",
          data.noteCount or "0",
          tostring(maxProgress),
          tostring(maxNoteIndex),
          tostring(checkpointCount),
          ARGV[5]
        }
      `;
      const ttlSeconds = DEFAULT_TTL_SECONDS;
      const result = (await redis.eval(
        lua,
        [key],
        [
          params.userId,
          normalizeTrackId(params.trackId),
          sanitizedProgress.toString(),
          Math.max(0, Math.floor(params.furthestNoteIndex)).toString(),
          updatedAt.toString(),
          ttlSeconds.toString(),
        ],
      )) as Array<string | number>;

      if (Array.isArray(result) && Number(result[0]) === 1) {
        return sanitizeAttemptRecord({
          sub: String(result[1] ?? ''),
          mode: String(result[2] ?? 'runner') as ScoreMode,
          nonce: String(result[3] ?? params.nonce),
          trackId: String(result[4] ?? '') || null,
          iat: Number(result[5] ?? 0),
          nbf: Number(result[6] ?? 0),
          exp: Number(result[7] ?? 0),
          noteCount: Number(result[8] ?? 0),
          maxProgress: Number(result[9] ?? 0),
          maxNoteIndex: Number(result[10] ?? 0),
          checkpointCount: Number(result[11] ?? 0),
          updatedAt: Number(result[12] ?? updatedAt),
        });
      }
      return null;
    } catch (error) {
      if (!shouldAllowEphemeralFallback()) {
        throw error;
      }
    }
  }

  const current = await getScoreAttemptRecord(params.nonce);
  if (!current) return null;
  if (current.sub !== params.userId || current.trackId !== params.trackId) return null;

  const nextProgress = Math.max(current.maxProgress, sanitizedProgress);
  const nextNoteIndex = Math.max(
    current.maxNoteIndex,
    sanitizeNoteIndex(params.furthestNoteIndex, current.noteCount),
  );
  const didAdvance = nextProgress > current.maxProgress || nextNoteIndex > current.maxNoteIndex;
  const next: ScoreAttemptRecord = {
    ...current,
    maxProgress: nextProgress,
    maxNoteIndex: nextNoteIndex,
    checkpointCount: current.checkpointCount + (didAdvance ? 1 : 0),
    updatedAt,
  };
  await persistScoreAttemptRecord(next);
  return next;
}

async function persistScoreAttemptRecord(record: ScoreAttemptRecord) {
  const ttlSeconds = Math.max(1, record.exp - Math.floor(Date.now() / 1000));
  if (hasRedisEnv()) {
    try {
      const redis = getRedis();
      const key = scoreAttemptKey(record.nonce);
      const pipeline = redis.pipeline();
      pipeline.hset(key, {
        sub: record.sub,
        mode: record.mode,
        nonce: record.nonce,
        trackId: normalizeTrackId(record.trackId),
        iat: record.iat.toString(),
        nbf: record.nbf.toString(),
        exp: record.exp.toString(),
        noteCount: record.noteCount.toString(),
        maxProgress: record.maxProgress.toString(),
        maxNoteIndex: record.maxNoteIndex.toString(),
        checkpointCount: record.checkpointCount.toString(),
        updatedAt: record.updatedAt.toString(),
      });
      pipeline.expire(key, ttlSeconds);
      await pipeline.exec();
      return;
    } catch (error) {
      if (!shouldAllowEphemeralFallback()) {
        throw error;
      }
    }
  }

  if (!shouldAllowEphemeralFallback()) {
    throw new Error('Score attempt persistence is required in production.');
  }

  sweepScoreAttemptMemoryStore(Math.floor(Date.now() / 1000));
  scoreAttemptMemoryStore.set(record.nonce, record);
}

export function getRunnerAttemptRequirements(trackId: string) {
  const track = getRunnerTrack(trackId);
  if (!track) return null;
  const noteCount = track.notes.length;
  const lastNoteTimeMs = track.notes[noteCount - 1]?.timeMs ?? 0;
  const minAgeSeconds = Math.max(
    DEFAULT_MIN_AGE_SECONDS,
    Math.ceil((lastNoteTimeMs + RUNNER_MIN_SUBMIT_BUFFER_MS) / 1000),
  );
  return {
    trackId: track.id,
    noteCount,
    lastNoteTimeMs,
    minAgeSeconds,
  };
}

export function getRunnerScoreLimits(trackId: string) {
  const requirements = getRunnerAttemptRequirements(trackId);
  if (!requirements) return null;
  const noteCount = requirements.noteCount;
  return {
    trackId: requirements.trackId,
    noteCount,
    maxCombo: noteCount,
    maxScore: SCORE_NOTE_VALUE * noteCount + SCORE_COMBO_MULTIPLIER * noteCount * (noteCount - 1),
  };
}

export function getRequiredRunnerProgress(score: number, maxScore: number) {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  return Math.max(RUNNER_REQUIRED_PROGRESS_FLOOR, Math.min(0.98, ratio - 0.05));
}

export function validateRunnerScoreAttempt(
  attempt: ScoreAttemptRecord | null | undefined,
  limits: ReturnType<typeof getRunnerScoreLimits>,
  score: number,
) {
  if (!attempt || !limits) return false;
  if (attempt.checkpointCount < 2) return false;
  const requiredProgress = getRequiredRunnerProgress(score, limits.maxScore);
  const requiredNoteIndex = Math.max(1, Math.floor(limits.noteCount * requiredProgress));
  return attempt.maxProgress >= requiredProgress || attempt.maxNoteIndex >= requiredNoteIndex;
}

export function resetScoreAttemptStoreForTests() {
  scoreAttemptMemoryStore.clear();
}
