import { createServer, Server as HttpServer } from 'http';
import { parse } from 'url';
import { createHmac, randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import type WebSocket from 'ws';

import type { MmoSessionClaims } from '../../src/lib/mmo/token';
import { filterProfanity } from '../../src/lib/profanity';
import { MAP_DATA, clampToWalkable, isInSpeedZone, isInPowerZone } from '../../src/lib/mmo/mapData';
import type { ArenaMapId as MapDataMapId } from '../../src/lib/mmo/mapData';

type Vec2 = { x: number; y: number };
type GameMode = 'plaza' | 'arena';
type ArenaMapId = 'neon-grid' | 'crystal-rift' | 'voltage-foundry';
type ArenaConfig = {
  mapId: ArenaMapId;
  modifiers: string[];
  targetKills: number;
  rotationEndsAt: number;
  rotationLabel: string;
};

type HandshakeInfo = {
  build?: string;
  device?: string;
  locale?: string;
};

type ClientState = {
  ws: WebSocket;
  userId: string;
  sessionId: string;
  displayName: string;
  characterId: string;
  mode: GameMode;
  pos: Vec2;
  rot: number;
  axes: Vec2;
  lastInputSeq: number;
  cosmetics: Record<string, unknown>;
  joined: boolean;
  claims: MmoSessionClaims;
  handshake: HandshakeInfo;
  chatHistory: number[];
  emoteHistory: number[];
  handshakeTimer: NodeJS.Timeout | null;
  createdAt: number;
  hp: number;
  kills: number;
  deaths: number;
  lastAbilityAt: number;
  inPowerZone: boolean;
};

export type PlazaServerOptions = {
  port?: number;
  host?: string;
  secret?: string;
  maxClients?: number;
  tickMs?: number;
  snapshotMs?: number;
  logger?: (message: string) => void;
};

export type PlazaServer = {
  port: number;
  host: string;
  url: string;
  dispose: () => Promise<void>;
  getPlayerCount: () => number;
  events: EventEmitter;
};

const defaultOptions = {
  port: Number(process.env.MMO_WS_PORT || 8787),
  host: '0.0.0.0',
  secret: process.env.MMO_WS_SECRET || process.env.CODE_HASH_SECRET || 'dev-secret',
  maxClients: 30,
  tickMs: 50,
  snapshotMs: 100,
};

const HANDSHAKE_TIMEOUT_MS = 5000;
const CHAT_WINDOW_MS = 10000;
const CHAT_MAX = 5;
const EMOTE_WINDOW_MS = 4000;
const EMOTE_MAX = 6;
const ABILITY_COOLDOWN_MS = 850;
const ABILITY_RANGE = 2.2;
const ABILITY_RANGE_EMPOWERED = 3.5;
const ABILITY_DAMAGE = 35;
const ARENA_KILL_TARGET = 8;
const HEALTH_PICKUP_AMOUNT = 30;
const PICKUP_RESPAWN_MS = 12_000;
const POWER_ZONE_DPS = 5;
const SPEED_ZONE_MULTIPLIER = 1.6;
const ARENA_ROTATION_WINDOW_MS = 20 * 60 * 1000;
const ARENA_MAP_ROTATION: ArenaMapId[] = ['neon-grid', 'crystal-rift', 'voltage-foundry'];
const ARENA_MODIFIER_POOL = [
  'Low-grav sidesteps',
  'Pulse cooldown -15%',
  'Center lane shield disabled',
  'Dash drift +10%',
  'Edge knockback amplified',
  'Recovery nodes active',
];

const PLAZA_INSTANCE_ID = 'plaza-1';
const ARENA_INSTANCE_ID = 'arena-1';
const PLAZA_MOTD = 'Signal Plaza is live — drop in and vibe.';
const ARENA_MOTD = 'Rift Arena online — cast pulse and hold center.';
const WS_READY_STATE_OPEN = 1;

let wsModulePromise: Promise<typeof import('ws')> | null = null;

async function loadWsModule() {
  if (!wsModulePromise) {
    if (!process.env.WS_NO_BUFFER_UTIL) {
      process.env.WS_NO_BUFFER_UTIL = '1';
    }
    wsModulePromise = import('ws');
  }
  return wsModulePromise;
}

function decodeBase64Url(input: string) {
  let normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  if (pad) normalized += '='.repeat(4 - pad);
  return Buffer.from(normalized, 'base64');
}

function verifyToken(token: string, secret: string): MmoSessionClaims | null {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const data = `${header}.${payload}`;
    const expected = createHmac('sha256', secret).update(data).digest('base64url');
    if (expected !== signature) return null;
    const parsed = JSON.parse(decodeBase64Url(payload).toString('utf8')) as MmoSessionClaims & { iat?: number };
    const now = Math.floor(Date.now() / 1000);
    if (typeof parsed.exp === 'number' && parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}

function consumeRateLimit(history: number[], windowMs: number, max: number) {
  const now = Date.now();
  while (history.length && now - history[0] > windowMs) history.shift();
  if (history.length >= max) return false;
  history.push(now);
  return true;
}

function decodeWsPayload(raw: unknown): string | null {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return decodeWsPayload((raw as { data: unknown }).data);
  }
  if (typeof raw === 'string') return raw;
  if (Buffer.isBuffer(raw)) return raw.toString('utf8');
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8');
  if (ArrayBuffer.isView(raw)) {
    return Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString('utf8');
  }
  if (Array.isArray(raw)) {
    const chunks: Buffer[] = [];
    for (const chunk of raw) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
        continue;
      }
      if (chunk instanceof ArrayBuffer) {
        chunks.push(Buffer.from(chunk));
        continue;
      }
      if (ArrayBuffer.isView(chunk)) {
        chunks.push(Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength));
        continue;
      }
      return null;
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  return null;
}

function sanitizeDisplayName(userId: string) {
  const base = (userId || '').split('@')[0];
  const compact = base.replace(/[^a-zA-Z0-9]/g, '');
  if (!compact) return 'pal';
  return compact.slice(0, 12);
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function modeFromClaims(claims: MmoSessionClaims): GameMode {
  const scope = Array.isArray(claims.scope) ? claims.scope : [];
  if (scope.includes('arena:join') || claims.mode === 'arena') return 'arena';
  return 'plaza';
}

function spawnForMode(mode: GameMode, mapId?: ArenaMapId): Vec2 {
  if (mode === 'arena' && mapId) {
    const mapDef = MAP_DATA[mapId as MapDataMapId];
    if (mapDef) {
      const points = mapDef.spawnPoints;
      return { ...points[Math.floor(Math.random() * points.length)] };
    }
  }
  if (mode === 'arena') {
    return { x: Math.random() * 20 - 10, y: Math.random() * 12 - 6 };
  }
  return { x: Math.random() * 8 - 4, y: Math.random() * 4 - 2 };
}

function buildArenaConfig(now = Date.now()): ArenaConfig {
  const windowIndex = Math.floor(now / ARENA_ROTATION_WINDOW_MS);
  const mapId = ARENA_MAP_ROTATION[windowIndex % ARENA_MAP_ROTATION.length];
  const rotationEndsAt = (windowIndex + 1) * ARENA_ROTATION_WINDOW_MS;
  const modifiers: string[] = [];
  for (let i = 0; i < 3; i += 1) {
    const idx = (windowIndex * 2 + i) % ARENA_MODIFIER_POOL.length;
    const next = ARENA_MODIFIER_POOL[idx];
    if (!modifiers.includes(next)) {
      modifiers.push(next);
    }
  }
  return {
    mapId,
    modifiers,
    targetKills: ARENA_KILL_TARGET,
    rotationEndsAt,
    rotationLabel: `Cycle ${windowIndex % 1000}`,
  };
}

export async function startPlazaServer(options: PlazaServerOptions = {}): Promise<PlazaServer> {
  const { WebSocketServer } = await loadWsModule();
  const opts = { ...defaultOptions, ...options };
  const httpServer: HttpServer = createServer();
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map<string, ClientState>();
  const sockets = new Map<WebSocket, ClientState>();
  const events = new EventEmitter();
  const tickMs = opts.tickMs ?? defaultOptions.tickMs;
  const snapshotMs = opts.snapshotMs ?? defaultOptions.snapshotMs;
  const log = opts.logger || console.log;
  let cachedArenaConfig: ArenaConfig | null = buildArenaConfig();

  const safeSend = (ws: WebSocket, payload: unknown) => {
    if (ws.readyState !== WS_READY_STATE_OPEN) return;
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      /* noop */
    }
  };

  const broadcast = (
    payload: unknown,
    options: {
      excludeId?: string;
      mode?: GameMode;
    } = {},
  ) => {
    const serialized = JSON.stringify(payload);
    clients.forEach((client, id) => {
      if (options.excludeId && id === options.excludeId) return;
      if (options.mode && client.mode !== options.mode) return;
      if (client.ws.readyState === WS_READY_STATE_OPEN) {
        try {
          client.ws.send(serialized);
        } catch {
          /* noop */
        }
      }
    });
  };

  const emitPlayerCount = () => {
    events.emit('player-count', clients.size);
  };

  const toPlayerState = (id: string, client: ClientState) => ({
    id,
    userId: client.userId,
    characterId: client.characterId,
    displayName: client.displayName,
    pos: { ...client.pos },
    rot: client.rot,
    cosmetics: client.cosmetics,
    hp: client.hp,
    kills: client.kills,
    deaths: client.deaths,
    inPowerZone: client.mode === 'arena' ? client.inPowerZone : undefined,
  });

  const finalizeJoin = (client: ClientState) => {
    if (client.joined) return;
    client.joined = true;
    if (client.handshakeTimer) {
      clearTimeout(client.handshakeTimer);
      client.handshakeTimer = null;
    }

    clients.set(client.sessionId, client);
    emitPlayerCount();

    const you = toPlayerState(client.sessionId, client);
    const others = Array.from(clients.entries())
      .filter(([id, other]) => id !== client.sessionId && other.mode === client.mode)
      .map(([id, context]) => toPlayerState(id, context));

    safeSend(client.ws, { type: 'auth_ok', sessionId: client.sessionId });
    safeSend(client.ws, { type: 'joined', you, others });

    if (client.mode === 'arena') {
      const arenaConfig = cachedArenaConfig ?? buildArenaConfig();
      safeSend(client.ws, {
        type: 'event',
        event: 'system',
        data: {
          message: `Map ${arenaConfig.mapId} | ${arenaConfig.modifiers.join(' | ')}`,
        },
      });
    }

    events.emit('join', { ...you, mode: client.mode });
    broadcast({ type: 'event', event: 'join', data: { player: you } }, { excludeId: client.sessionId, mode: client.mode });
  };

  const handleEmote = (client: ClientState, emote: string) => {
    if (!emote) return;
    if (!consumeRateLimit(client.emoteHistory, EMOTE_WINDOW_MS, EMOTE_MAX)) {
      safeSend(client.ws, { type: 'event', event: 'system', data: { message: 'emote_rate_limited' } });
      return;
    }
    broadcast({ type: 'event', event: 'emote', data: { id: client.sessionId, emote } }, { mode: client.mode });
  };

  const handleAbilityCast = (client: ClientState, ability: string) => {
    if (!client.joined || client.mode !== 'arena') return;
    const now = Date.now();
    if (now - client.lastAbilityAt < ABILITY_COOLDOWN_MS) {
      safeSend(client.ws, { type: 'event', event: 'system', data: { message: 'ability_cooldown' } });
      return;
    }
    client.lastAbilityAt = now;

    // Dynamic range: empowered in the power zone
    const effectiveRange = client.inPowerZone ? ABILITY_RANGE_EMPOWERED : ABILITY_RANGE;
    const currentMapId = cachedArenaConfig?.mapId;

    const victims: Array<{ id: string; displayName: string; hp: number; pos: Vec2 }> = [];
    clients.forEach((target, targetId) => {
      if (targetId === client.sessionId) return;
      if (!target.joined || target.mode !== 'arena') return;
      const dx = target.pos.x - client.pos.x;
      const dy = target.pos.y - client.pos.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq > effectiveRange * effectiveRange) return;

      target.hp = clamp(target.hp - ABILITY_DAMAGE, 0, 100);
      victims.push({
        id: targetId,
        displayName: target.displayName,
        hp: target.hp,
        pos: { ...target.pos },
      });

      if (target.hp <= 0) {
        const deathPos = { ...target.pos };
        target.deaths += 1;
        client.kills += 1;
        target.hp = 100;
        target.pos = spawnForMode('arena', currentMapId);
        target.axes = { x: 0, y: 0 };

        broadcast(
          {
            type: 'event',
            event: 'score',
            data: {
              killerId: client.sessionId,
              killer: client.displayName,
              victimId: targetId,
              victim: target.displayName,
              victimPos: deathPos,
              respawnPos: { ...target.pos },
              kills: client.kills,
              deaths: target.deaths,
            },
          },
          { mode: 'arena' },
        );
      }
    });

    if (client.kills >= ARENA_KILL_TARGET) {
      const winnerName = client.displayName;
      broadcast(
        {
          type: 'event',
          event: 'match_end',
          data: {
            winnerId: client.sessionId,
            winner: winnerName,
            targetKills: ARENA_KILL_TARGET,
            message: `${winnerName} hit ${ARENA_KILL_TARGET} eliminations. Arena reset.`,
          },
        },
        { mode: 'arena' },
      );
      clients.forEach((arenaClient) => {
        if (arenaClient.mode !== 'arena') return;
        arenaClient.kills = 0;
        arenaClient.deaths = 0;
        arenaClient.hp = 100;
        arenaClient.pos = spawnForMode('arena', currentMapId);
        arenaClient.axes = { x: 0, y: 0 };
      });
    }

    broadcast(
      {
        type: 'event',
        event: 'combat',
        data: {
          actorId: client.sessionId,
          actor: client.displayName,
          ability: ability || 'pulse',
          pos: { ...client.pos },
          range: effectiveRange,
          victims,
        },
      },
      { mode: 'arena' },
    );
  };

  wss.on('connection', (ws, req) => {
    const { query } = parse(req.url || '', true);
    const token = typeof query.token === 'string' ? query.token : null;
    const verified = token ? verifyToken(token, opts.secret as string) : null;

    if (!verified) {
      safeSend(ws, { type: 'auth_error', reason: 'invalid_token' });
      ws.close(1008, 'invalid_token');
      return;
    }

    if (clients.size >= (opts.maxClients ?? defaultOptions.maxClients)) {
      safeSend(ws, { type: 'kick', reason: 'server_full' });
      ws.close(1013, 'server_full');
      return;
    }

    const mode = modeFromClaims(verified);
    const sessionId = verified.sid || randomUUID();
    const userId = verified.sub || 'user';
    const displayName = sanitizeDisplayName(userId);
    const ownedChars = Array.isArray(verified.owned) ? verified.owned : [];

    const client: ClientState = {
      ws,
      userId,
      sessionId,
      displayName,
      characterId: ownedChars[0] || 'neon-city',
      mode,
      pos: spawnForMode(mode, mode === 'arena' ? (cachedArenaConfig?.mapId ?? buildArenaConfig().mapId) : undefined),
      rot: 0,
      axes: { x: 0, y: 0 },
      lastInputSeq: 0,
      cosmetics: { badgeIds: [] },
      joined: false,
      claims: verified,
      handshake: {},
      chatHistory: [],
      emoteHistory: [],
      handshakeTimer: null,
      createdAt: Date.now(),
      hp: 100,
      kills: 0,
      deaths: 0,
      lastAbilityAt: 0,
      inPowerZone: false,
    };

    client.handshakeTimer = setTimeout(() => {
      if (!client.joined) {
        safeSend(ws, { type: 'auth_error', reason: 'handshake_timeout' });
        ws.close(1008, 'handshake_timeout');
      }
    }, HANDSHAKE_TIMEOUT_MS);

    sockets.set(ws, client);

    const arenaConfig = mode === 'arena' ? (cachedArenaConfig ?? buildArenaConfig()) : null;
    safeSend(ws, {
      type: 'welcome',
      motd: mode === 'arena' ? ARENA_MOTD : PLAZA_MOTD,
      instanceId: mode === 'arena' ? ARENA_INSTANCE_ID : PLAZA_INSTANCE_ID,
      snapshotInterval: snapshotMs,
      ...(arenaConfig ? { arena: arenaConfig } : {}),
    });

    ws.on('message', (raw: unknown) => {
      const context = sockets.get(ws);
      if (!context) return;

      let msg: any;
      const payload = decodeWsPayload(raw);
      if (!payload) return;
      try {
        msg = JSON.parse(payload);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'hello':
          context.handshake = {
            build: typeof msg.build === 'string' ? msg.build : undefined,
            device: typeof msg.device === 'string' ? msg.device : undefined,
            locale: typeof msg.locale === 'string' ? msg.locale : undefined,
          };
          break;
        case 'auth': {
          if (context.joined) break;
          const tokenMessage = typeof msg.token === 'string' ? msg.token : null;
          if (tokenMessage) {
            const reverified = verifyToken(tokenMessage, opts.secret as string);
            if (!reverified || reverified.sid !== context.sessionId) {
              safeSend(ws, { type: 'auth_error', reason: 'invalid_token' });
              ws.close(1008, 'invalid_token_reauth');
              return;
            }
            context.claims = reverified;
            context.mode = modeFromClaims(reverified);
          }
          const scope = Array.isArray(context.claims.scope) ? context.claims.scope : [];
          const hasValidScope = scope.length === 0 || scope.includes('plaza:join') || scope.includes('arena:join');
          if (!hasValidScope) {
            safeSend(ws, { type: 'auth_error', reason: 'insufficient_scope' });
            ws.close(1008, 'insufficient_scope');
            return;
          }
          finalizeJoin(context);
          break;
        }
        case 'join_instance':
          break;
        case 'arena_ready':
          break;
        case 'select_avatar': {
          const selected = typeof msg.characterId === 'string' ? msg.characterId : '';
          const owned = Array.isArray(context.claims.owned) ? context.claims.owned : [];
          if (selected && (owned.length === 0 || owned.includes(selected))) {
            context.characterId = selected;
          }
          if (typeof msg.cosmetics === 'object' && msg.cosmetics) {
            context.cosmetics = msg.cosmetics;
          }
          break;
        }
        case 'input': {
          if (!context.joined) break;
          const axes = msg.axes || { x: 0, y: 0 };
          context.axes.x = clamp(Number(axes.x) || 0, -1, 1);
          context.axes.y = clamp(Number(axes.y) || 0, -1, 1);
          context.lastInputSeq = Number(msg.seq) || context.lastInputSeq;
          if (typeof msg.emote === 'string' && msg.emote) {
            handleEmote(context, msg.emote);
          }
          break;
        }
        case 'ability_cast':
          handleAbilityCast(context, typeof msg.ability === 'string' ? msg.ability : 'pulse');
          break;
        case 'chat': {
          if (!context.joined) break;
          const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 240) : '';
          if (!text) break;
          if (!consumeRateLimit(context.chatHistory, CHAT_WINDOW_MS, CHAT_MAX)) {
            safeSend(ws, { type: 'event', event: 'system', data: { message: 'chat_rate_limited' } });
            break;
          }
          const { clean, flagged } = filterProfanity(text);
          broadcast(
            {
              type: 'event',
              event: 'chat',
              data: { id: context.sessionId, displayName: context.displayName, text: clean, flagged },
            },
            { mode: context.mode },
          );
          break;
        }
        case 'ping':
          safeSend(ws, { type: 'pong', ts: msg.ts });
          break;
        default:
          break;
      }
    });

    ws.on('close', () => {
      const context = sockets.get(ws);
      if (!context) return;
      sockets.delete(ws);
      if (context.handshakeTimer) {
        clearTimeout(context.handshakeTimer);
        context.handshakeTimer = null;
      }
      if (context.joined && clients.delete(context.sessionId)) {
        emitPlayerCount();
        events.emit('leave', { id: context.sessionId, mode: context.mode });
        broadcast({ type: 'event', event: 'leave', data: { id: context.sessionId } }, { mode: context.mode });
      }
    });

    ws.on('error', () => {
      ws.close();
    });
  });

  // --- Arena state: pickups ---
  type PickupState = { id: string; type: 'health'; pos: Vec2; r: number; active: boolean; respawnAt: number };
  let arenaPickups: PickupState[] = [];

  function initPickupsForMap(mapId: ArenaMapId) {
    const mapDef = MAP_DATA[mapId as MapDataMapId];
    if (!mapDef) { arenaPickups = []; return; }
    arenaPickups = mapDef.healthPickups.map((hp) => ({
      id: hp.id,
      type: 'health' as const,
      pos: { ...hp.pos },
      r: hp.r,
      active: true,
      respawnAt: 0,
    }));
  }
  if (cachedArenaConfig) initPickupsForMap(cachedArenaConfig.mapId);

  let last = Date.now();
  let lastSnapshot = 0;
  const tickHandle = setInterval(() => {
    const now = Date.now();
    const dt = Math.min(100, now - last);
    const dtSec = dt / 1000;
    last = now;

    // Check for map rotation
    const freshConfig = buildArenaConfig(now);
    if (cachedArenaConfig && freshConfig.mapId !== cachedArenaConfig.mapId) {
      cachedArenaConfig = freshConfig;
      initPickupsForMap(freshConfig.mapId);

      // Reposition arena players onto valid spawn points for the new map.
      clients.forEach((arenaClient) => {
        if (arenaClient.mode !== 'arena') return;
        arenaClient.pos = spawnForMode('arena', freshConfig.mapId);
        arenaClient.axes = { x: 0, y: 0 };
        arenaClient.inPowerZone = false;
      });

      broadcast(
        { type: 'event', event: 'arena_rotation', data: { arena: freshConfig, message: `Map rotated to ${freshConfig.mapId}` } },
        { mode: 'arena' },
      );
    }
    cachedArenaConfig = freshConfig;

    const arenaMapId = cachedArenaConfig.mapId as MapDataMapId;
    const mapDef = MAP_DATA[arenaMapId];
    const speed = 2.8;

    // --- Movement ---
    clients.forEach((client) => {
      if (client.mode === 'arena' && mapDef) {
        // Speed zone check
        const inSpeed = isInSpeedZone(mapDef, client.pos.x, client.pos.y);
        const effectiveSpeed = inSpeed ? speed * SPEED_ZONE_MULTIPLIER : speed;
        const dx = client.axes.x * effectiveSpeed * dtSec;
        const dy = client.axes.y * effectiveSpeed * dtSec;
        const xBound = 14;
        const yBound = 8;
        const rawX = clamp(client.pos.x + dx, -xBound, xBound);
        const rawY = clamp(client.pos.y + dy, -yBound, yBound);
        const resolved = clampToWalkable(mapDef, client.pos.x, client.pos.y, rawX, rawY);
        client.pos.x = resolved.x;
        client.pos.y = resolved.y;
        if (dx || dy) client.rot = Math.atan2(dy, dx) || client.rot;

        // Power zone
        client.inPowerZone = isInPowerZone(mapDef, client.pos.x, client.pos.y);
        if (client.inPowerZone) {
          client.hp = Math.max(1, client.hp - POWER_ZONE_DPS * dtSec);
        }
      } else {
        // Plaza mode — no collision
        const dx = client.axes.x * speed * dtSec;
        const dy = client.axes.y * speed * dtSec;
        const xBound = client.mode === 'arena' ? 14 : 10;
        const yBound = client.mode === 'arena' ? 8 : 6;
        client.pos.x = clamp(client.pos.x + dx, -xBound, xBound);
        client.pos.y = clamp(client.pos.y + dy, -yBound, yBound);
        if (dx || dy) client.rot = Math.atan2(dy, dx) || client.rot;
      }
    });

    // --- Health pickups ---
    for (const pickup of arenaPickups) {
      if (!pickup.active) {
        if (now >= pickup.respawnAt) {
          pickup.active = true;
          broadcast(
            { type: 'event', event: 'pickup_respawn', data: { id: pickup.id } },
            { mode: 'arena' },
          );
        }
        continue;
      }
      clients.forEach((client) => {
        if (client.mode !== 'arena' || !client.joined || !pickup.active) return;
        const dx = client.pos.x - pickup.pos.x;
        const dy = client.pos.y - pickup.pos.y;
        if (dx * dx + dy * dy <= pickup.r * pickup.r) {
          if (client.hp < 100) {
            client.hp = Math.min(100, client.hp + HEALTH_PICKUP_AMOUNT);
            pickup.active = false;
            pickup.respawnAt = now + PICKUP_RESPAWN_MS;
            broadcast(
              { type: 'event', event: 'pickup_consumed', data: { id: pickup.id, playerId: client.sessionId, pos: { ...pickup.pos } } },
              { mode: 'arena' },
            );
          }
        }
      });
    }

    // --- Snapshots ---
    if (now - lastSnapshot >= snapshotMs) {
      lastSnapshot = now;
      const plazaPlayers: Array<{ id: string; characterId: string; pos: Vec2; rot: number; hp: number; kills: number; deaths: number }> = [];
      const arenaPlayers: Array<{ id: string; characterId: string; pos: Vec2; rot: number; hp: number; kills: number; deaths: number; inPowerZone: boolean }> = [];

      clients.forEach((client, id) => {
        if (client.mode === 'arena') {
          arenaPlayers.push({
            id,
            characterId: client.characterId,
            pos: { ...client.pos },
            rot: client.rot,
            hp: client.hp,
            kills: client.kills,
            deaths: client.deaths,
            inPowerZone: client.inPowerZone,
          });
        } else {
          plazaPlayers.push({
            id,
            characterId: client.characterId,
            pos: { ...client.pos },
            rot: client.rot,
            hp: client.hp,
            kills: client.kills,
            deaths: client.deaths,
          });
        }
      });

      if (plazaPlayers.length > 0) {
        broadcast({ type: 'state', t: now, seqAck: 0, players: plazaPlayers }, { mode: 'plaza' });
      }
      if (arenaPlayers.length > 0) {
        const stateMsg = {
          type: 'state',
          t: now,
          seqAck: 0,
          players: arenaPlayers,
          pickups: arenaPickups.map((p) => ({
            id: p.id, type: p.type, pos: p.pos, active: p.active, respawnAt: p.respawnAt,
          })),
        };
        broadcast(stateMsg, { mode: 'arena' });
      }
    }
  }, tickMs);

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen({ port: opts.port, host: opts.host }, () => {
      httpServer.off('error', reject as any);
      resolve();
    });
  });

  const address = httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : (opts.port as number);
  const actualHost = typeof address === 'object' && address && typeof address.address === 'string' ? address.address : opts.host;
  const publicHost = actualHost === '0.0.0.0' ? 'localhost' : actualHost;
  const url = `ws://${publicHost}:${actualPort}`;

  log(`[mmo] plaza server listening on ${url}`);

  const dispose = async () => {
    clearInterval(tickHandle);

    await new Promise<void>((resolve) => {
      sockets.forEach((client) => {
        if (client.handshakeTimer) {
          clearTimeout(client.handshakeTimer);
          client.handshakeTimer = null;
        }
        try {
          client.ws.close(1001, 'server_shutdown');
        } catch {
          /* noop */
        }
      });
      setTimeout(resolve, 20);
    });

    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });

    clients.clear();
    sockets.clear();
  };

  return {
    port: actualPort,
    host: actualHost,
    url,
    dispose,
    getPlayerCount: () => clients.size,
    events,
  };
}
