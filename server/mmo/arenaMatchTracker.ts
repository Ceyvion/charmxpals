import { randomUUID } from 'crypto';

export type ArenaMatchTracker = {
  matchId: string;
  participants: Set<string>;
};

export function createArenaMatchTracker(initialParticipants: Iterable<string> = []): ArenaMatchTracker {
  return {
    matchId: randomUUID(),
    participants: new Set(normalizeParticipantIds(initialParticipants)),
  };
}

export function markArenaMatchParticipant(tracker: ArenaMatchTracker, userId: string) {
  if (!userId) return;
  tracker.participants.add(userId);
}

export function completeArenaMatch(
  tracker: ArenaMatchTracker,
  nextParticipants: Iterable<string> = [],
) {
  const completedParticipantIds = Array.from(tracker.participants);
  tracker.matchId = randomUUID();
  tracker.participants = new Set(normalizeParticipantIds(nextParticipants));
  return completedParticipantIds;
}

function normalizeParticipantIds(userIds: Iterable<string>) {
  return Array.from(userIds).filter((userId) => typeof userId === 'string' && userId.trim().length > 0);
}
