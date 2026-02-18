// Rift Arena — Client-only particle and visual effect engine.
// Pure data-driven: arrays of structs updated per frame, drawn to Canvas 2D.
// No React, no DOM — just numbers and draw calls.

import type { MapTheme } from './mapData';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  life: number;       // 0..1, decreases each frame
  decay: number;       // life lost per second
  size: number;
  color: string;
  alpha: number;
};

export type Shockwave = {
  x: number; y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  life: number;
  color: string;
  lineWidth: number;
};

export type DamageNumber = {
  x: number; y: number;
  vy: number;
  text: string;
  life: number;
  color: string;
};

export type ScreenShake = {
  intensity: number;
  decay: number;
};

export type HitFlash = {
  targetId: string;
  life: number;
  color: string;
};

export type Announcement = {
  text: string;
  life: number;
  color: string;
};

export type ArenaFxState = {
  particles: Particle[];
  shockwaves: Shockwave[];
  damageNumbers: DamageNumber[];
  screenShake: ScreenShake;
  hitFlashes: HitFlash[];
  ambientParticles: Particle[];
  trailParticles: Particle[];
  announcements: Announcement[];
};

const MAX_PARTICLES = 200;
const MAX_TRAILS = 120;
const MAX_AMBIENT = 50;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createFxState(): ArenaFxState {
  return {
    particles: [],
    shockwaves: [],
    damageNumbers: [],
    screenShake: { intensity: 0, decay: 20 },
    hitFlashes: [],
    ambientParticles: [],
    trailParticles: [],
    announcements: [],
  };
}

// ---------------------------------------------------------------------------
// Spawners (positions in game-world units, not pixels)
// ---------------------------------------------------------------------------

export function spawnPulseEffect(
  state: ArenaFxState,
  x: number,
  y: number,
  color: string,
  range: number,
  isLocal: boolean,
): void {
  // Shockwave ring
  state.shockwaves.push({
    x, y,
    radius: 0.2,
    maxRadius: range,
    speed: range / 0.35, // expand fully in ~0.35s
    life: 1,
    color,
    lineWidth: 3,
  });

  // Burst particles
  const count = 24;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    const speed = 3 + Math.random() * 5;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 2.5 + Math.random(),
      size: 1.5 + Math.random() * 1.5,
      color,
      alpha: 0.9,
    });
  }

  // Screen shake for local player
  if (isLocal) {
    state.screenShake.intensity = Math.max(state.screenShake.intensity, 5);
  }

  // Cap particles
  while (state.particles.length > MAX_PARTICLES) state.particles.shift();
}

export function spawnHitEffect(
  state: ArenaFxState,
  x: number,
  y: number,
  damage: number,
  color: string,
): void {
  // Damage number
  state.damageNumbers.push({
    x, y,
    vy: -2.5,
    text: `-${damage}`,
    life: 1,
    color,
  });

  // Small hit burst
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 3.5 + Math.random(),
      size: 1 + Math.random(),
      color: '#ffffff',
      alpha: 0.8,
    });
  }

  while (state.particles.length > MAX_PARTICLES) state.particles.shift();
}

export function spawnHitFlash(state: ArenaFxState, targetId: string): void {
  // Remove existing flash for this target
  state.hitFlashes = state.hitFlashes.filter((f) => f.targetId !== targetId);
  state.hitFlashes.push({ targetId, life: 0.15, color: '#ffffff' });
}

export function spawnDeathEffect(state: ArenaFxState, x: number, y: number, color: string): void {
  for (let i = 0; i < 36; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 1.8 + Math.random() * 0.8,
      size: 1.5 + Math.random() * 2,
      color,
      alpha: 1,
    });
  }
  while (state.particles.length > MAX_PARTICLES) state.particles.shift();
}

export function spawnRespawnEffect(state: ArenaFxState, x: number, y: number, color: string): void {
  // Upward sparkle
  for (let i = 0; i < 18; i++) {
    const spread = (Math.random() - 0.5) * 2;
    state.particles.push({
      x: x + spread,
      y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -2 - Math.random() * 4,
      life: 1,
      decay: 1.5 + Math.random(),
      size: 1 + Math.random() * 1.5,
      color,
      alpha: 0.7,
    });
  }
  // Shockwave ring (small, fast)
  state.shockwaves.push({
    x, y,
    radius: 0.1,
    maxRadius: 1.5,
    speed: 6,
    life: 1,
    color,
    lineWidth: 2,
  });
  while (state.particles.length > MAX_PARTICLES) state.particles.shift();
}

export function spawnPickupEffect(state: ArenaFxState, x: number, y: number): void {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 1,
      decay: 2.5 + Math.random(),
      size: 1 + Math.random(),
      color: '#49f3a7',
      alpha: 0.8,
    });
  }
  while (state.particles.length > MAX_PARTICLES) state.particles.shift();
}

export function addTrailParticle(state: ArenaFxState, x: number, y: number, color: string): void {
  state.trailParticles.push({
    x, y,
    vx: 0, vy: 0,
    life: 1,
    decay: 2.8,
    size: 2,
    color,
    alpha: 0.45,
  });
  while (state.trailParticles.length > MAX_TRAILS) state.trailParticles.shift();
}

export function addAnnouncement(state: ArenaFxState, text: string, color: string): void {
  state.announcements.push({ text, life: 1, color });
}

export function ensureAmbient(state: ArenaFxState, theme: MapTheme): void {
  while (state.ambientParticles.length < MAX_AMBIENT) {
    state.ambientParticles.push({
      x: (Math.random() - 0.5) * 28,
      y: (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      life: 1,
      decay: 0.2 + Math.random() * 0.15,
      size: 1 + Math.random(),
      color: theme.ambient,
      alpha: 0.12 + Math.random() * 0.18,
    });
  }
}

// ---------------------------------------------------------------------------
// Update (call once per frame)
// ---------------------------------------------------------------------------

export function updateFx(state: ArenaFxState, dt: number, theme: MapTheme): void {
  // Particles
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= p.decay * dt;
    p.alpha = Math.max(0, p.life * 0.9);
  }
  state.particles = state.particles.filter((p) => p.life > 0);

  // Trail particles
  for (const p of state.trailParticles) {
    p.life -= p.decay * dt;
    p.alpha = Math.max(0, p.life * 0.45);
    p.size = Math.max(0, p.life * 2);
  }
  state.trailParticles = state.trailParticles.filter((p) => p.life > 0);

  // Ambient
  for (const p of state.ambientParticles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= p.decay * dt;
  }
  state.ambientParticles = state.ambientParticles.filter((p) => p.life > 0);
  ensureAmbient(state, theme);

  // Shockwaves
  for (const s of state.shockwaves) {
    s.radius += s.speed * dt;
    s.life = Math.max(0, 1 - s.radius / s.maxRadius);
  }
  state.shockwaves = state.shockwaves.filter((s) => s.life > 0);

  // Damage numbers
  for (const d of state.damageNumbers) {
    d.y += d.vy * dt;
    d.life -= 1.2 * dt;
  }
  state.damageNumbers = state.damageNumbers.filter((d) => d.life > 0);

  // Hit flashes
  for (const f of state.hitFlashes) {
    f.life -= dt;
  }
  state.hitFlashes = state.hitFlashes.filter((f) => f.life > 0);

  // Announcements
  for (const a of state.announcements) {
    a.life -= 0.5 * dt;
  }
  state.announcements = state.announcements.filter((a) => a.life > 0);

  // Screen shake decay
  state.screenShake.intensity = Math.max(0, state.screenShake.intensity - state.screenShake.decay * dt);
}

// ---------------------------------------------------------------------------
// Draw helpers (convert game-world coords to screen pixels inline)
// ---------------------------------------------------------------------------

function toScreenX(wx: number, ox: number, scale: number) { return ox + wx * scale; }
function toScreenY(wy: number, oy: number, scale: number) { return oy + wy * scale; }

export function drawAmbientParticles(
  state: ArenaFxState,
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  scale: number,
): void {
  for (const p of state.ambientParticles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    const sx = toScreenX(p.x, ox, scale);
    const sy = toScreenY(p.y, oy, scale);
    ctx.beginPath();
    ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawTrailParticles(
  state: ArenaFxState,
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  scale: number,
): void {
  for (const p of state.trailParticles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    const sx = toScreenX(p.x, ox, scale);
    const sy = toScreenY(p.y, oy, scale);
    ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

export function drawShockwaves(
  state: ArenaFxState,
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  scale: number,
): void {
  for (const s of state.shockwaves) {
    ctx.globalAlpha = s.life * 0.8;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth * s.life;
    const sx = toScreenX(s.x, ox, scale);
    const sy = toScreenY(s.y, oy, scale);
    ctx.beginPath();
    ctx.arc(sx, sy, s.radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

export function drawBurstParticles(
  state: ArenaFxState,
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  scale: number,
): void {
  for (const p of state.particles) {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    const sx = toScreenX(p.x, ox, scale);
    const sy = toScreenY(p.y, oy, scale);
    ctx.beginPath();
    ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawDamageNumbers(
  state: ArenaFxState,
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  scale: number,
): void {
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px system-ui';
  for (const d of state.damageNumbers) {
    ctx.globalAlpha = Math.min(1, d.life * 1.5);
    ctx.fillStyle = d.color;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    const sx = toScreenX(d.x, ox, scale);
    const sy = toScreenY(d.y, oy, scale);
    ctx.fillText(d.text, sx, sy);
  }
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1;
}

export function drawAnnouncements(
  state: ArenaFxState,
  ctx: CanvasRenderingContext2D,
  w: number,
): void {
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px system-ui';
  let offsetY = 60;
  for (const a of state.announcements) {
    ctx.globalAlpha = Math.min(1, a.life * 2);
    ctx.shadowColor = a.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = a.color;
    ctx.fillText(a.text, w / 2, offsetY);
    offsetY += 30;
  }
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.globalAlpha = 1;
}

export function getHitFlashAlpha(state: ArenaFxState, targetId: string): number {
  const flash = state.hitFlashes.find((f) => f.targetId === targetId);
  return flash ? flash.life / 0.15 : 0;
}

export function getShakeOffset(state: ArenaFxState): { x: number; y: number } {
  const i = state.screenShake.intensity;
  if (i < 0.1) return { x: 0, y: 0 };
  return {
    x: (Math.random() - 0.5) * 2 * i,
    y: (Math.random() - 0.5) * 2 * i,
  };
}
