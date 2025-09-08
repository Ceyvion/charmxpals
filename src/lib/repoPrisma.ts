import prisma from '@/lib/db';
import type { Repo } from './repo';
import type { Prisma } from '@prisma/client';

export const repoPrisma: Repo = {
  kind: 'prisma',
  async upsertDevUser({ handle, email }) {
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, handle },
      update: { handle },
    });
    return { id: user.id, email: user.email, handle: user.handle };
  },
  async getUserById(id) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) return null;
    return { id: u.id, email: u.email, handle: u.handle } as any;
  },
  async getUserByHandle(handle) {
    const u = await prisma.user.findFirst({ where: { handle } });
    if (!u) return null;
    return { id: u.id, email: u.email, handle: u.handle } as any;
  },
  async createChallenge(data) {
    const created = await prisma.claimChallenge.create({ data: { ...data } });
    return created as any;
  },
  async getChallengeById(id) {
    const c = await prisma.claimChallenge.findUnique({ where: { id } });
    return c as any;
  },
  async consumeChallenge(id) {
    await prisma.claimChallenge.update({ where: { id }, data: { consumed: true } });
  },
  async findUnitByCodeHash(codeHash) {
    const u = await prisma.physicalUnit.findUnique({ where: { codeHash } });
    return u as any;
  },
  async claimUnitAndCreateOwnership({ unitId, userId }) {
    const res = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const unit = await tx.physicalUnit.update({
        where: { id: unitId },
        data: { status: 'claimed', claimedBy: userId, claimedAt: new Date() },
      });
      await tx.ownership.create({
        data: { userId, characterId: unit.characterId, source: 'claim', cosmetics: [] },
      });
      return { characterId: unit.characterId };
    });
    return res;
  },
  async listOwnershipsByUser(userId) {
    const results = await prisma.ownership.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return results.map((o: any) => ({
      id: o.id,
      userId: o.userId,
      characterId: o.characterId,
      source: o.source,
      cosmetics: (o.cosmetics || []) as string[],
      createdAt: o.createdAt as Date,
    }));
  },
  async getCharacterById(id) {
    const c = await prisma.character.findUnique({ where: { id } });
    if (!c) return null;
    return {
      id: c.id,
      setId: c.setId,
      name: c.name,
      description: c.description,
      rarity: c.rarity,
      stats: c.stats as any,
      artRefs: c.artRefs as any,
    };
  },
  async listCharacters(params) {
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;
    const results = await prisma.character.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
    return results.map((c: any) => ({
      id: c.id,
      setId: c.setId,
      name: c.name,
      description: c.description,
      rarity: c.rarity,
      stats: c.stats as any,
      artRefs: c.artRefs as any,
    }));
  },
  async logAbuse({ type, actorRef, metadata }) {
    try {
      await prisma.abuseEvent.create({ data: { type, actorRef, metadata } as any });
    } catch {}
  },
};
