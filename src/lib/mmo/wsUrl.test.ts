import { describe, expect, it } from 'vitest';

import {
  normalizeWsBase,
  resolveClientWsBase,
  resolveConfiguredWsBase,
  resolveServerWsBase,
} from './wsUrl';

describe('wsUrl helpers', () => {
  it('normalizes URL and strips trailing slashes', () => {
    expect(normalizeWsBase(' wss://mmo.example.com/// ')).toBe('wss://mmo.example.com');
    expect(normalizeWsBase('')).toBeNull();
  });

  it('prefers private MMO_WS_URL when configured', () => {
    const base = resolveConfiguredWsBase({
      MMO_WS_URL: 'wss://private.example.com/',
      NEXT_PUBLIC_MMO_WS_URL: 'wss://public.example.com/',
    });
    expect(base).toBe('wss://private.example.com');
  });

  it('resolves local server fallback when not hosted and URL is not configured', () => {
    const base = resolveServerWsBase({
      requestHost: 'localhost:3000',
      isHosted: false,
      env: {
        MMO_WS_PORT: '8790',
      },
    });
    expect(base).toBe('ws://localhost:8790');
  });

  it('does not resolve local server fallback for hosted environments', () => {
    const base = resolveServerWsBase({
      requestHost: 'localhost:3000',
      isHosted: true,
      env: {},
    });
    expect(base).toBeNull();
  });

  it('prefers token response wsBase on the client', () => {
    const base = resolveClientWsBase({
      serverBase: 'wss://runtime.example.com/',
      locationHostname: 'localhost',
      env: {
        NEXT_PUBLIC_MMO_WS_URL: 'wss://public.example.com',
      },
    });
    expect(base).toBe('wss://runtime.example.com');
  });

  it('uses local client fallback when no configured URL exists', () => {
    const base = resolveClientWsBase({
      serverBase: null,
      locationHostname: '127.0.0.1',
      env: {
        NEXT_PUBLIC_MMO_WS_PORT: '9010',
      },
    });
    expect(base).toBe('ws://127.0.0.1:9010');
  });
});
