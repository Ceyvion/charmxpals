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

function sanitizeProgress(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function sanitizeNoteIndex(value: unknown, noteCount: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(noteCount, Math.floor(value)));
}

function sanitizeCheckpointCount(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function sanitizeAttemptRecord(record: unknown): ScoreAttemptRecord | null {
  if (!record || typeof record !== 'object') return null;
  const source = record as Partial<ScoreAttemptRecord>;
  if (!source.sub || !source.mode || !source.nonce) return null;
  const noteCount = typeof source.noteCount === 'number' && Number.isFinite(source.noteCount)
    ? Math.max(0, Math.floor(source.noteCount))
    : 0;
  return {
    sub: source.sub,
    mode: source.mode,
    nonce: source.nonce,
    trackId: typeof source.trackId === 'string' ? source.trackId : null,
    iat: typeof source.iat === 'number' ? source.iat : 0,
    nbf: typeof source.nbf === 'number' ? source.nbf : 0,
    exp: typeof source.exp === 'number' ? source.exp : 0,
    noteCount,
    maxProgress: sanitizeProgress(source.maxProgress),
    maxNoteIndex: sanitizeNoteIndex(source.maxNoteIndex, noteCount),
    checkpointCount: sanitizeCheckpointCount(source.checkpointCount),
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : Date.now(),
  };
}

function parseStoredAttemptRecord(raw: string | ScoreAttemptRecord | null | undefined) {
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
      const raw = await redis.get<string | ScoreAttemptRecord>(scoreAttemptKey(nonce));
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
  const current = await getScoreAttemptRecord(params.nonce);
  if (!current) return null;
  if (current.sub !== params.userId || current.trackId !== params.trackId) return null;

  const nextProgress = Math.max(current.maxProgress, sanitizeProgress(params.progress));
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
    updatedAt: Date.now(),
  };
  await persistScoreAttemptRecord(next);
  return next;
}

async function persistScoreAttemptRecord(record: ScoreAttemptRecord) {
  const ttlSeconds = Math.max(1, record.exp - Math.floor(Date.now() / 1000));
  if (hasRedisEnv()) {
    try {
      const redis = getRedis();
      await redis.set(scoreAttemptKey(record.nonce), JSON.stringify(record), { ex: ttlSeconds });
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
