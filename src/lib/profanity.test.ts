import { describe, expect, it } from 'vitest';

import { filterProfanity } from './profanity';

describe('filterProfanity', () => {
  it('returns the original string when clean', () => {
    const result = filterProfanity('hello world');
    expect(result.clean).toBe('hello world');
    expect(result.flagged).toBe(false);
  });

  it('masks profane words and flags the result', () => {
    const result = filterProfanity('This is shit but kind of fun.');
    expect(result.clean).toBe('This is s**t but kind of fun.');
    expect(result.flagged).toBe(true);
  });

  it('handles multiple profane words', () => {
    const result = filterProfanity('fuck that shit');
    expect(result.flagged).toBe(true);
    expect(result.clean).toMatch(/f\*\*k that s\*\*t/);
  });
});

