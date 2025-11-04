import { createServer, Server as HttpServer } from 'http';
import { parse } from 'url';
import { createHmac, randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import WebSocket, { WebSocketServer } from 'ws';

import type { MmoSessionClaims } from '../../src/lib/mmo/token';
import { filterProfanity } from '../../src/lib/profanity';

type Vec2 = { x: number; y: number };

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

const HANDSHAKE_TIMEOUT_MS = 5_000;
const CHAT_WINDOW_MS = 10_000;
const CHAT_MAX = 5;
const EMOTE_WINDOW_MS = 4_000;
const EMOTE_MAX = 6;
const INSTANCE_ID = 'plaza-1';
const MOTD = 'Signal Plaza is live — drop in and vibe.';
const WS_READY_STATE_OPEN = 1;

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
  } catch (err) {
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

function sanitizeDisplayName(userId: string) {
  const base = (userId || '').split('@')[0];
  const compact = base.replace(/[^a-zA-Z0-9]/g, '');
  if (!compact) return 'pal';
  return compact.slice(0, 12);
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export async function startPlazaServer(options: PlazaServerOptions = {}): Promise<PlazaServer> {
  const opts = { ...defaultOptions, ...options };
  const httpServer: HttpServer = createServer();
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map<string, ClientState>();
  const sockets = new Map<WebSocket, ClientState>();
  const events = new EventEmitter();
  const tickMs = opts.tickMs ?? defaultOptions.tickMs;
  const snapshotMs = opts.snapshotMs ?? defaultOptions.snapshotMs;
  const log = opts.logger || console.log;

  const safeSend = (ws: WebSocket, payload: unknown) => {
    if (ws.readyState !== WS_READY_STATE_OPEN) return;
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      /* noop */
    }
  };

  const broadcast = (payload: unknown, excludeId?: string) => {
    const serialized = JSON.stringify(payload);
    clients.forEach((client, id) => {
      if (excludeId && id === excludeId) return;
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
      .filter(([id]) => id !== client.sessionId)
      .map(([id, ctx]) => toPlayerState(id, ctx));

    safeSend(client.ws, { type: 'auth_ok', sessionId: client.sessionId });
    safeSend(client.ws, { type: 'joined', you, others });

    events.emit('join', you);
    broadcast({ type: 'event', event: 'join', data: { player: you } }, client.sessionId);
  };

  const handleEmote = (client: ClientState, emote: string) => {
    if (!emote) return;
    if (!consumeRateLimit(client.emoteHistory, EMOTE_WINDOW_MS, EMOTE_MAX)) {
      safeSend(client.ws, { type: 'event', event: 'system', data: { message: 'emote_rate_limited' } });
      return;
    }
    broadcast({ type: 'event', event: 'emote', data: { id: client.sessionId, emote } });
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

    const sessionId = verified.sid || randomUUID();
    const userId = verified.sub || 'user';
    const displayName = sanitizeDisplayName(userId);
    const ownedChars = Array.isArray(verified.owned) ? verified.owned : [];

    const client: ClientState = {
      ws,
      userId,
      sessionId,
      displayName,
      characterId: ownedChars[0] || 'demo',
      pos: { x: Math.random() * 8 - 4, y: Math.random() * 4 - 2 },
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
    };

    client.handshakeTimer = setTimeout(() => {
      if (!client.joined) {
        safeSend(ws, { type: 'auth_error', reason: 'handshake_timeout' });
        ws.close(1008, 'handshake_timeout');
      }
    }, HANDSHAKE_TIMEOUT_MS);

    sockets.set(ws, client);

    safeSend(ws, { type: 'welcome', motd: MOTD, instanceId: INSTANCE_ID, snapshotInterval: snapshotMs });

    ws.on('message', (raw: unknown) => {
      const context = sockets.get(ws);
      if (!context) return;

      let msg: any;
      try {
        msg = JSON.parse(String(raw));
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
          }
          const scope = Array.isArray(context.claims.scope) ? context.claims.scope : [];
          if (scope.length > 0 && !scope.includes('plaza:join')) {
            safeSend(ws, { type: 'auth_error', reason: 'insufficient_scope' });
            ws.close(1008, 'insufficient_scope');
            return;
          }
          finalizeJoin(context);
          break;
        }
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
        case 'chat': {
          if (!context.joined) break;
          const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 240) : '';
          if (!text) break;
          if (!consumeRateLimit(context.chatHistory, CHAT_WINDOW_MS, CHAT_MAX)) {
            safeSend(ws, { type: 'event', event: 'system', data: { message: 'chat_rate_limited' } });
            break;
          }
          const { clean, flagged } = filterProfanity(text);
          broadcast({
            type: 'event',
            event: 'chat',
            data: { id: context.sessionId, displayName: context.displayName, text: clean, flagged },
          });
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
        events.emit('leave', context.sessionId);
        broadcast({ type: 'event', event: 'leave', data: { id: context.sessionId } });
      }
    });

    ws.on('error', () => {
      ws.close();
    });
  });

  let last = Date.now();
  let lastSnapshot = 0;
  const tickHandle = setInterval(() => {
    const now = Date.now();
    const dt = Math.min(100, now - last);
    last = now;

    const speed = 2.8;
    clients.forEach((client) => {
      const dx = client.axes.x * speed * (dt / 1000);
      const dy = client.axes.y * speed * (dt / 1000);
      client.pos.x = clamp(client.pos.x + dx, -10, 10);
      client.pos.y = clamp(client.pos.y + dy, -6, 6);
      if (dx || dy) client.rot = Math.atan2(dy, dx) || client.rot;
    });

    if (now - lastSnapshot >= snapshotMs) {
      lastSnapshot = now;
      const players = Array.from(clients.entries()).map(([id, ctx]) => ({
        id,
        pos: { ...ctx.pos },
        rot: ctx.rot,
      }));
      broadcast({ type: 'state', t: now, seqAck: 0, players });
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
