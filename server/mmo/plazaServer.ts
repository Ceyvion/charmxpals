import { createServer, Server as HttpServer } from 'http';
import { parse } from 'url';
import { createHmac, randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import WebSocket, { WebSocketServer } from 'ws';

import type { MmoSessionClaims } from '../../src/lib/mmo/token';

type Vec2 = { x: number; y: number };

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

export async function startPlazaServer(options: PlazaServerOptions = {}): Promise<PlazaServer> {
  const opts = { ...defaultOptions, ...options };
  const httpServer: HttpServer = createServer();
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map<string, ClientState>();
  const events = new EventEmitter();
  const tickMs = opts.tickMs ?? defaultOptions.tickMs;
  const snapshotMs = opts.snapshotMs ?? defaultOptions.snapshotMs;
  const log = opts.logger || console.log;

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const broadcast = (obj: unknown, excludeId?: string) => {
    const msg = JSON.stringify(obj);
    for (const [id, client] of clients) {
      if (excludeId && id === excludeId) continue;
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(msg);
        } catch (err) {
          // ignore send errors (socket will close eventually)
        }
      }
    }
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

  wss.on('connection', (ws, req) => {
    if (clients.size >= (opts.maxClients ?? defaultOptions.maxClients)) {
      ws.close(1013, 'server_full');
      return;
    }

    const { query } = parse(req.url || '', true);
    const token = typeof query.token === 'string' ? query.token : null;
    const verified = token ? verifyToken(token, opts.secret as string) : null;
    if (!verified) {
      try {
        ws.send(JSON.stringify({ type: 'auth_error', reason: 'invalid_token' }));
      } catch {
        // ignore
      }
      ws.close(1008, 'invalid_token');
      return;
    }

    const sessionId = verified.sid || randomUUID();
    const userId = verified.sub || 'user';
    const id = sessionId;
    const displayName = (userId || '').slice(0, 12) || 'pal';

    const client: ClientState = {
      ws,
      userId,
      sessionId,
      displayName,
      characterId: Array.isArray(verified.owned) && verified.owned.length ? verified.owned[0] : 'demo',
      pos: { x: Math.random() * 8 - 4, y: Math.random() * 4 - 2 },
      rot: 0,
      axes: { x: 0, y: 0 },
      lastInputSeq: 0,
      cosmetics: { badgeIds: [] },
    };

    clients.set(id, client);
    emitPlayerCount();
    events.emit('join', toPlayerState(id, client));

    const you = toPlayerState(id, client);
    const others = Array.from(clients)
      .filter(([pid]) => pid !== id)
      .map(([pid, other]) => toPlayerState(pid, other));

    ws.send(JSON.stringify({ type: 'welcome', instanceId: 'plaza-1', snapshotInterval: snapshotMs }));
    ws.send(JSON.stringify({ type: 'auth_ok', sessionId }));
    ws.send(JSON.stringify({ type: 'joined', you, others }));

    broadcast({ type: 'event', event: 'join', data: { player: you } }, id);

    ws.on('message', (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(String(raw));
      } catch (err) {
        return;
      }

      switch (msg.type) {
        case 'select_avatar':
          client.characterId = String(msg.characterId || 'demo');
          client.cosmetics = typeof msg.cosmetics === 'object' && msg.cosmetics ? msg.cosmetics : client.cosmetics;
          break;
        case 'input': {
          const axes = msg.axes || { x: 0, y: 0 };
          client.axes.x = clamp(Number(axes.x) || 0, -1, 1);
          client.axes.y = clamp(Number(axes.y) || 0, -1, 1);
          client.lastInputSeq = Number(msg.seq) || client.lastInputSeq;
          if (msg.emote && typeof msg.emote === 'string') {
            broadcast({ type: 'event', event: 'emote', data: { id, emote: msg.emote } });
          }
          break;
        }
        case 'chat': {
          const text = String(msg.text || '').slice(0, 200);
          if (text) broadcast({ type: 'event', event: 'chat', data: { id, text } });
          break;
        }
        case 'ping':
          try {
            ws.send(JSON.stringify({ type: 'pong', ts: msg.ts }));
          } catch {/* noop */}
          break;
        default:
          break;
      }
    });

    ws.on('close', () => {
      const existed = clients.delete(id);
      if (existed) {
        emitPlayerCount();
        events.emit('leave', id);
        broadcast({ type: 'event', event: 'leave', data: { id } });
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
    for (const [, client] of clients) {
      const dx = client.axes.x * speed * (dt / 1000);
      const dy = client.axes.y * speed * (dt / 1000);
      client.pos.x = clamp(client.pos.x + dx, -10, 10);
      client.pos.y = clamp(client.pos.y + dy, -6, 6);
      if (dx || dy) client.rot = Math.atan2(dy, dx) || client.rot;
    }

    if (now - lastSnapshot >= snapshotMs) {
      lastSnapshot = now;
      const players = Array.from(clients).map(([id, c]) => ({ id, pos: { ...c.pos }, rot: c.rot }));
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
      for (const [, client] of clients) {
        try {
          client.ws.close(1001, 'server_shutdown');
        } catch {/* noop */}
      }
      setTimeout(resolve, 20);
    });

    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    clients.clear();
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

