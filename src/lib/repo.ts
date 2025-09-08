import { memoryRepo } from './repoMemory';

export type User = { id: string; email: string; handle: string | null };
export type Character = {
  id: string;
  setId: string;
  name: string;
  description: string | null;
  rarity: number;
  stats: Record<string, number>;
  artRefs: Record<string, string>;
};
export type PhysicalUnit = {
  id: string;
  characterId: string;
  codeHash: string;
  secureSalt: string;
  claimedBy: string | null;
  claimedAt: Date | null;
  status: 'available' | 'claimed' | 'blocked';
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
  kind?: 'memory' | 'prisma';
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
  claimUnitAndCreateOwnership(params: { unitId: string; userId: string }): Promise<{ characterId: string }>;
  listOwnershipsByUser(userId: string): Promise<Array<{ id: string; userId: string; characterId: string; source: string; cosmetics: string[]; createdAt: Date }>>;

  // Characters
  getCharacterById(id: string): Promise<Character | null>;
  listCharacters(params?: { limit?: number; offset?: number }): Promise<Character[]>;

  // Abuse
  logAbuse(event: { type: string; actorRef: string; metadata: any }): Promise<void>;
};

const useMemory = !process.env.DATABASE_URL || process.env.USE_MEMORY_DB === '1';

let repoPromise: Promise<Repo> | null = null;

export async function getRepo(): Promise<Repo> {
  if (useMemory) return memoryRepo;
  if (!repoPromise) {
    repoPromise = import('./repoPrisma')
      .then((m) => m.repoPrisma as Repo)
      .catch((err) => {
        console.warn('Prisma repo unavailable; falling back to memory. Set USE_MEMORY_DB=1 to silence.', err);
        return memoryRepo as Repo;
      });
  }
  return repoPromise;
}
