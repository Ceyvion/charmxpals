import fs from 'fs';
import path from 'path';

import { characterLore } from '../src/data/characterLore';

type Job = {
  prompt: string;
  out: string;
  size?: '1024x1536' | '1536x1024' | '1024x1024';
  quality?: 'low' | 'medium' | 'high' | 'auto';
};

const TMP_DIR = path.resolve('tmp/imagegen');

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function toJsonl(jobs: Job[]) {
  return `${jobs.map((job) => JSON.stringify(job)).join('\n')}\n`;
}

function buildCharacterJobs(): Job[] {
  return characterLore.map((character) => ({
    prompt: [
      'Use case: stylized-concept',
      'Asset type: game character portrait',
      `Primary request: full-body dance battle character art of ${character.name}, ${character.title}`,
      `Scene/background: ${character.realm} with layered arena depth and subtle energy effects`,
      'Style/medium: stylized 2D game concept art, clean silhouette, premium mobile game quality',
      'Composition/framing: centered character, vertical frame, readable pose and costume details',
      `Lighting/mood: dramatic key light with accent color ${character.color}`,
      `Color palette: anchored by ${character.color} with complementary cyan and warm highlights`,
      `Materials/textures: fabrics and accessories inspired by ${character.vibe}`,
      `Constraints: preserve this personality - ${character.personality}; no text; no logos; no watermark; single character only`,
      'Avoid: muddy contrast; cluttered background; photorealism; oversaturated neon',
    ].join('\n'),
    out: `char-${character.slug}-portrait.png`,
    size: '1024x1536',
    quality: 'low',
  }));
}

function buildArenaMapJobs(): Job[] {
  return [
    {
      prompt: [
        'Use case: stylized-concept',
        'Asset type: top-down multiplayer arena map',
        'Primary request: futuristic neon grid battle arena with symmetrical lanes and clear center objective',
        'Style/medium: stylized 2D map art, low-detail proof-of-concept',
        'Composition/framing: top-down, wide horizontal frame',
        'Lighting/mood: cool cyan + magenta ambient glow',
        'Constraints: no text; no logos; no watermark; no characters',
      ].join('\n'),
      out: 'map-neon-grid.png',
      size: '1536x1024',
      quality: 'low',
    },
    {
      prompt: [
        'Use case: stylized-concept',
        'Asset type: top-down multiplayer arena map',
        'Primary request: volcanic industrial arena with glowing vents and steel platforms',
        'Style/medium: stylized 2D map art, low-detail proof-of-concept',
        'Composition/framing: top-down, wide horizontal frame',
        'Lighting/mood: warm ember highlights with dark steel contrast',
        'Constraints: no text; no logos; no watermark; no characters',
      ].join('\n'),
      out: 'map-voltage-foundry.png',
      size: '1536x1024',
      quality: 'low',
    },
    {
      prompt: [
        'Use case: stylized-concept',
        'Asset type: top-down multiplayer arena map',
        'Primary request: crystalline moonlit arena with reflective pathways and choke points',
        'Style/medium: stylized 2D map art, low-detail proof-of-concept',
        'Composition/framing: top-down, wide horizontal frame',
        'Lighting/mood: cool indigo and silver highlights',
        'Constraints: no text; no logos; no watermark; no characters',
      ].join('\n'),
      out: 'map-crystal-rift.png',
      size: '1536x1024',
      quality: 'low',
    },
  ];
}

function buildArenaSpriteJobs(): Job[] {
  return [
    {
      prompt: [
        'Use case: stylized-concept',
        'Asset type: game VFX sprite',
        'Primary request: circular pulse blast icon for multiplayer ability cast',
        'Style/medium: stylized 2D game sprite',
        'Composition/framing: centered icon, transparent background feel',
        'Constraints: no text; no logos; no watermark',
      ].join('\n'),
      out: 'sprite-pulse.png',
      size: '1024x1024',
      quality: 'low',
    },
    {
      prompt: [
        'Use case: stylized-concept',
        'Asset type: game VFX sprite',
        'Primary request: hit spark effect icon for combat feedback',
        'Style/medium: stylized 2D game sprite',
        'Composition/framing: centered icon, transparent background feel',
        'Constraints: no text; no logos; no watermark',
      ].join('\n'),
      out: 'sprite-hit.png',
      size: '1024x1024',
      quality: 'low',
    },
    {
      prompt: [
        'Use case: stylized-concept',
        'Asset type: game UI icon',
        'Primary request: crown badge icon for top leaderboard player',
        'Style/medium: stylized 2D game sprite',
        'Composition/framing: centered icon, transparent background feel',
        'Constraints: no text; no logos; no watermark',
      ].join('\n'),
      out: 'sprite-crown.png',
      size: '1024x1024',
      quality: 'low',
    },
  ];
}

function main() {
  ensureDir(TMP_DIR);

  fs.writeFileSync(path.join(TMP_DIR, 'characters.jsonl'), toJsonl(buildCharacterJobs()), 'utf8');
  fs.writeFileSync(path.join(TMP_DIR, 'arena_maps.jsonl'), toJsonl(buildArenaMapJobs()), 'utf8');
  fs.writeFileSync(path.join(TMP_DIR, 'arena_sprites.jsonl'), toJsonl(buildArenaSpriteJobs()), 'utf8');

  console.log('Wrote imagegen manifests to tmp/imagegen');
}

main();
