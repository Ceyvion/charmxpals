import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

import { startPlazaServer, type PlazaServer } from '../plazaServer';
import { signToken } from '../../../src/lib/mmo/token';

const TEST_SECRET = 'test-secret';

type TestClient = {
  ws: WebSocket;
  events: Array<{ type: string; payload: any }>;
};

async function waitForExpect(fn: () => void, timeout = 1_000, interval = 20) {
  const start = Date.now();
  while (true) {
    try {
      fn();
      return;
    } catch (err) {
      if (Date.now() - start >= timeout) {
        throw err;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

async function openClient(server: PlazaServer, userId: string, sessionId: string): Promise<TestClient> {
  const exp = Math.floor(Date.now() / 1000) + 60;
  const token = signToken(
    {
      sub: userId,
      sid: sessionId,
      exp,
      nonce: `${sessionId}-nonce`,
      scope: ['plaza:join'],
      owned: ['demo'],
    },
    { secret: TEST_SECRET }
  );
  const ws = new WebSocket(`${server.url}?token=${encodeURIComponent(token)}`);
  const events: Array<{ type: string; payload: any }> = [];

  ws.on('open', () => {
    ws.send(JSON.stringify({ type: 'hello', build: 'test' }));
    ws.send(JSON.stringify({ type: 'auth', token }));
    ws.send(JSON.stringify({ type: 'select_avatar', characterId: 'demo' }));
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout waiting for join')), 2_000);

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      reject(new Error('ws closed before join'));
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        events.push({ type: msg.type, payload: msg });
        if (msg.type === 'joined') {
          clearTimeout(timeout);
          resolve();
        }
      } catch (err) {
        /* ignore */
      }
    });
  });

  return { ws, events };
}

describe('plaza server', () => {
  let server: PlazaServer;

  beforeEach(async () => {
    process.env.MMO_WS_SECRET = TEST_SECRET;
    server = await startPlazaServer({ port: 0, secret: TEST_SECRET, logger: () => {} });
  });

  afterEach(async () => {
    await server.dispose();
  });

  it('emits player-count changes and reports active users', async () => {
    const counts: number[] = [];
    server.events.on('player-count', (count: number) => counts.push(count));

    const c1 = await openClient(server, 'user-1', 'session-1');
    await waitForExpect(() => expect(server.getPlayerCount()).toBe(1));

    const c2 = await openClient(server, 'user-2', 'session-2');
    await waitForExpect(() => expect(server.getPlayerCount()).toBe(2));

    expect(counts).toContain(1);
    expect(counts).toContain(2);

    c1.ws.close();
    c2.ws.close();

    await waitForExpect(() => expect(server.getPlayerCount()).toBe(0));
    expect(counts).toContain(0);
  });

  it('rejects invalid tokens', async () => {
    const ws = new WebSocket(`${server.url}?token=invalid`);
    await new Promise<void>((resolve) => {
      ws.on('close', () => resolve());
    });
    expect(server.getPlayerCount()).toBe(0);
  });

  it('enforces max client limit', async () => {
    const localServer = await startPlazaServer({ port: 0, secret: TEST_SECRET, maxClients: 1, logger: () => {} });
    const client = await openClient(localServer, 'user-a', 'session-a');
    await waitForExpect(() => expect(localServer.getPlayerCount()).toBe(1));

    const token = signToken(
      {
        sub: 'user-b',
        sid: 'session-b',
        exp: Math.floor(Date.now() / 1000) + 60,
        nonce: 'session-b-nonce',
        scope: ['plaza:join'],
        owned: ['demo'],
      },
      { secret: TEST_SECRET }
    );
    const ws = new WebSocket(`${localServer.url}?token=${encodeURIComponent(token)}`);

    await new Promise<void>((resolve) => {
      ws.on('close', () => resolve());
    });

    expect(localServer.getPlayerCount()).toBe(1);

    client.ws.close();
    await waitForExpect(() => expect(localServer.getPlayerCount()).toBe(0));
    await localServer.dispose();
  });
});
