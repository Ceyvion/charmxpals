import fs from 'fs';
import path from 'path';

import { characterLore } from '../src/data/characterLore';

const CHAR_SOURCE_DIR = path.resolve('output/imagegen/characters');
const ARENA_MAP_SOURCE_DIR = path.resolve('output/imagegen/arena/maps');
const ARENA_SPRITE_SOURCE_DIR = path.resolve('output/imagegen/arena/sprites');

const CHAR_TARGET_BASE = path.resolve('public/assets/characters');
const ARENA_MAP_TARGET = path.resolve('public/assets/arena/maps');
const ARENA_SPRITE_TARGET = path.resolve('public/assets/arena/sprites');

const CHARACTER_VARIANTS = ['portrait.png', 'card.png', 'banner.png', 'thumb.png', 'sprite.png'];

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(from: string, to: string) {
  if (!fs.existsSync(from)) return false;
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  return true;
}

function stageCharacters() {
  let copied = 0;
  for (const character of characterLore) {
    const source = path.join(CHAR_SOURCE_DIR, `char-${character.slug}-portrait.png`);
    if (!fs.existsSync(source)) continue;
    const targetDir = path.join(CHAR_TARGET_BASE, character.slug);
    ensureDir(targetDir);
    for (const variant of CHARACTER_VARIANTS) {
      fs.copyFileSync(source, path.join(targetDir, variant));
      copied += 1;
    }
  }
  return copied;
}

function stageArena() {
  let copied = 0;
  copied += copyIfExists(path.join(ARENA_MAP_SOURCE_DIR, 'map-neon-grid.png'), path.join(ARENA_MAP_TARGET, 'neon-grid.png')) ? 1 : 0;
  copied += copyIfExists(path.join(ARENA_MAP_SOURCE_DIR, 'map-voltage-foundry.png'), path.join(ARENA_MAP_TARGET, 'voltage-foundry.png')) ? 1 : 0;
  copied += copyIfExists(path.join(ARENA_MAP_SOURCE_DIR, 'map-crystal-rift.png'), path.join(ARENA_MAP_TARGET, 'crystal-rift.png')) ? 1 : 0;

  copied += copyIfExists(path.join(ARENA_SPRITE_SOURCE_DIR, 'sprite-pulse.png'), path.join(ARENA_SPRITE_TARGET, 'pulse.png')) ? 1 : 0;
  copied += copyIfExists(path.join(ARENA_SPRITE_SOURCE_DIR, 'sprite-hit.png'), path.join(ARENA_SPRITE_TARGET, 'hit.png')) ? 1 : 0;
  copied += copyIfExists(path.join(ARENA_SPRITE_SOURCE_DIR, 'sprite-crown.png'), path.join(ARENA_SPRITE_TARGET, 'crown.png')) ? 1 : 0;

  return copied;
}

function main() {
  ensureDir(CHAR_TARGET_BASE);
  ensureDir(ARENA_MAP_TARGET);
  ensureDir(ARENA_SPRITE_TARGET);

  const characterCopies = stageCharacters();
  const arenaCopies = stageArena();

  console.log(`Staged ${characterCopies} character asset files and ${arenaCopies} arena asset files.`);
}

main();
