import { memoryRepo } from './repoMemory';

export type UnitStatus = 'available' | 'claimed' | 'blocked';

export type User = { id: string; email: string; handle: string | null };
export type Character = {
  id: string;
  setId: string;
  name: string;
  description: string | null;
  rarity: number;
  stats: Record<string, number>;
  artRefs: Record<string, string>;
  codeSeries?: string | null;
  slug?: string | null;
  realm?: string | null;
  color?: string | null;
  title?: string | null;
  vibe?: string | null;
  danceStyle?: string | null;
  coreCharm?: string | null;
  personality?: string | null;
  tagline?: string | null;
};
export type PhysicalUnit = {
  id: string;
  characterId: string;
  codeHash: string;
  secureSalt: string;
  claimedBy: string | null;
  claimedAt: Date | null;
  status: UnitStatus;
};
export type ClaimChallenge = {
  id: string;
  codeHash: string;
  nonce: string;
  timestamp: string;
  challengeDigest: string;
  expiresAt: Date;
  consumed: boolean;
};

export type Repo = {
  kind?: 'memory' | 'redis';
  // Users
  upsertDevUser(params: { handle: string; email: string }): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByHandle(handle: string): Promise<User | null>;

  // Claim challenges
  createChallenge(data: Omit<ClaimChallenge, 'id' | 'consumed'>): Promise<ClaimChallenge>;
  getChallengeById(id: string): Promise<ClaimChallenge | null>;
  consumeChallenge(id: string): Promise<void>;

  // Units/ownership
  findUnitByCodeHash(codeHash: string): Promise<PhysicalUnit | null>;
  claimUnitAndCreateOwnership(params: { unitId: string; userId: string }): Promise<{ characterId: string; claimedAt: Date }>;
  listOwnershipsByUser(userId: string): Promise<Array<{ id: string; userId: string; characterId: string; source: string; cosmetics: string[]; createdAt: Date }>>;

  // Characters
  getCharacterById(id: string): Promise<Character | null>;
  listCharacters(params?: { limit?: number; offset?: number }): Promise<Character[]>;

  // Abuse
  logAbuse(event: { type: string; actorRef: string; metadata: any }): Promise<void>;
};

const memoryFlag = process.env.USE_MEMORY_DB;
const defaultMemory = !process.env.VERCEL && process.env.NODE_ENV !== 'production';
const forceMemory = memoryFlag === '1' || (!memoryFlag && defaultMemory);
const hasRedisEnv = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.CODE_HASH_SECRET,
);

let repoPromise: Promise<Repo> | null = null;

export async function getRepo(): Promise<Repo> {
  if (forceMemory || !hasRedisEnv) return memoryRepo;
  if (!repoPromise) {
    repoPromise = import('./repoRedis')
      .then((m) => m.repoRedis as Repo)
      .catch((err) => {
        console.warn('Redis repo unavailable; falling back to memory. Set USE_MEMORY_DB=1 to silence.', err);
        return memoryRepo as Repo;
      });
  }
  return repoPromise;
}
