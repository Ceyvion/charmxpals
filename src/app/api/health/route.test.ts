import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('/api/health', () => {
  it('returns coarse public health without backend diagnostics', async () => {
    const response = await GET();
    const json = await response.json();

    expect(json.status).toMatch(/^(ok|degraded)$/);
    expect(json.timestamp).toBeTruthy();
    expect(json.checks).toBeUndefined();
    expect(json.repo).toBeUndefined();
    expect(json.redis).toBeUndefined();
  });
});
