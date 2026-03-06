import { describe, expect, it } from 'vitest';

import {
  completeArenaMatch,
  createArenaMatchTracker,
  markArenaMatchParticipant,
} from '../arenaMatchTracker';

describe('arenaMatchTracker', () => {
  it('deduplicates reconnecting users within the same match and seeds the next one', () => {
    const tracker = createArenaMatchTracker();
    const initialMatchId = tracker.matchId;

    markArenaMatchParticipant(tracker, 'user-1');
    markArenaMatchParticipant(tracker, 'user-1');
    markArenaMatchParticipant(tracker, 'user-2');

    const completed = completeArenaMatch(tracker, ['user-2', 'user-3', 'user-3']).sort();

    expect(completed).toEqual(['user-1', 'user-2']);
    expect(tracker.matchId).not.toBe(initialMatchId);
    expect(Array.from(tracker.participants).sort()).toEqual(['user-2', 'user-3']);
  });
});
