import { beforeEach, describe, expect, it } from 'vitest';

import {
  resetHttpPlazaMemoryForTests,
  syncHttpPlazaSession,
} from './httpPlazaStore';
import type { MmoSessionClaims } from './token';

function claims(id: string, name: string): MmoSessionClaims {
  return {
    sub: `guest:${id}`,
    sid: id,
    exp: Math.floor(Date.now() / 1000) + 600,
    nonce: `${id}-nonce`,
    scope: ['plaza:join'],
    owned: ['neon-city'],
    mode: 'plaza',
    displayName: name,
  };
}

describe('HTTP plaza transport store', () => {
  beforeEach(() => {
    resetHttpPlazaMemoryForTests();
  });

  it('shares player state and chat across sessions', async () => {
    const first = await syncHttpPlazaSession(claims('session-a', 'Guest A'), {
      axes: { x: 1, y: 0 },
      chat: 'hello plaza',
    });
    const second = await syncHttpPlazaSession(claims('session-b', 'Guest B'), {
      axes: { x: 0, y: 1 },
    });

    expect(first.sessionId).toBe('session-a');
    expect(second.players.map((player) => player.id).sort()).toEqual(['session-a', 'session-b']);
    expect(second.chat).toHaveLength(1);
    expect(second.chat[0]).toMatchObject({
      text: 'hello plaza',
      from: 'Guest A',
      authorId: 'session-a',
    });
  });
});
