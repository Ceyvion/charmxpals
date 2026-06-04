import { describe, expect, it, afterEach } from 'vitest';

import { getClientIp } from './ip';

describe('getClientIp', () => {
  const originalTrust = process.env.TRUST_PROXY_HEADERS;

  afterEach(() => {
    if (originalTrust === undefined) delete process.env.TRUST_PROXY_HEADERS;
    else process.env.TRUST_PROXY_HEADERS = originalTrust;
  });

  it('does not trust forwarded headers unless explicitly enabled', () => {
    delete process.env.TRUST_PROXY_HEADERS;
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.10' });

    expect(getClientIp('https://charmxpals.example/api/claim/verify', headers)).toBe('127.0.0.1');
  });

  it('uses forwarded headers only when the proxy trust flag is enabled', () => {
    process.env.TRUST_PROXY_HEADERS = '1';
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' });

    expect(getClientIp('https://charmxpals.example/api/claim/verify', headers)).toBe('203.0.113.10');
  });
});
