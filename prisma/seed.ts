import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';

const prisma = new PrismaClient();

function hashCode(code: string) {
  return createHmac('sha256', process.env.CODE_HASH_SECRET || 'fallback-secret')
    .update(code)
    .digest('hex');
}

async function main() {
  // Create character sets
  const fantasySet = await prisma.characterSet.create({
    data: {
      name: 'Fantasy Collection',
      description: 'Mystical creatures from a magical realm'
    }
  });

  const elementalSet = await prisma.characterSet.create({
    data: {
      name: 'Elemental Forces',
      description: 'Masters of the fundamental elements'
    }
  });

  // Create characters
  const blazeDragon = await prisma.character.create({
    data: {
      setId: fantasySet.id,
      name: 'Blaze the Dragon',
      description: 'A fierce fire-breathing dragon with incredible speed and agility.',
      rarity: 5,
      stats: {
        strength: 85,
        speed: 92,
        intelligence: 78,
        defense: 80
      },
      artRefs: {
        thumbnail: '/character-thumbnail.png',
        full: '/character-full.png'
      }
    }
  });

  const frostWolf = await prisma.character.create({
    data: {
      setId: fantasySet.id,
      name: 'Frost Wolf',
      description: 'A cunning wolf with ice-blue fur and razor-sharp claws.',
      rarity: 4,
      stats: {
        strength: 78,
        speed: 88,
        intelligence: 85,
        defense: 82
      },
      artRefs: {
        thumbnail: '/character-thumbnail.png',
        full: '/character-full.png'
      }
    }
  });

  const tidalSerpent = await prisma.character.create({
    data: {
      setId: elementalSet.id,
      name: 'Tidal Serpent',
      description: 'A massive sea serpent that commands the power of the ocean.',
      rarity: 5,
      stats: {
        strength: 90,
        speed: 75,
        intelligence: 88,
        defense: 85
      },
      artRefs: {
        thumbnail: '/character-thumbnail.png',
        full: '/character-full.png'
      }
    }
  });

  // Create physical units
  const secureSalt = 'super-secret-salt';
  
  await prisma.physicalUnit.create({
    data: {
      characterId: blazeDragon.id,
      codeHash: hashCode('CHARM-XPAL-001'),
      secureSalt,
      status: 'available'
    }
  });

  await prisma.physicalUnit.create({
    data: {
      characterId: frostWolf.id,
      codeHash: hashCode('CHARM-XPAL-002'),
      secureSalt,
      status: 'available'
    }
  });

  await prisma.physicalUnit.create({
    data: {
      characterId: tidalSerpent.id,
      codeHash: hashCode('CHARM-XPAL-003'),
      secureSalt,
      status: 'available'
    }
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });