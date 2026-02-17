'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type PhaserType from 'phaser';

type GameMode = 'menu' | 'playing' | 'paused' | 'upgrade' | 'gameover' | 'victory';
type EnemyKind = 'runner' | 'striker' | 'sniper' | 'tank' | 'boss';
type PickupKind = 'xp' | 'health' | 'energy';
type UpgradeId = 'fireRate' | 'damage' | 'speed' | 'maxHealth' | 'dash' | 'nova' | 'shield';
type MetaPerkId = 'armorCore' | 'reactorTuning' | 'bountyProtocol';
type MutatorId = 'standard' | 'overclocked' | 'glass' | 'swarm';

type ArcSprite = PhaserType.GameObjects.Arc;
type TextSprite = PhaserType.GameObjects.Text;

type EnemyEntity = {
  id: number;
  kind: EnemyKind;
  sprite: ArcSprite;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  fireCd: number;
  contactCd: number;
  aiClock: number;
  dashClock: number;
};

type Projectile = {
  id: number;
  owner: 'player' | 'enemy';
  kind: 'pulse' | 'shard' | 'beam';
  sprite: ArcSprite;
  vx: number;
  vy: number;
  life: number;
  radius: number;
  damage: number;
};

type PickupEntity = {
  id: number;
  kind: PickupKind;
  sprite: ArcSprite;
  value: number;
  age: number;
  radius: number;
};

type RingFx = {
  id: number;
  sprite: ArcSprite;
  life: number;
  maxLife: number;
  startR: number;
  endR: number;
};

type FloatTextFx = {
  id: number;
  sprite: TextSprite;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
};

type UpgradeOption = {
  id: UpgradeId;
  title: string;
  description: string;
};

type MetaPerkDefinition = {
  id: MetaPerkId;
  title: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  stepCost: number;
};

type MutatorDefinition = {
  id: MutatorId;
  title: string;
  description: string;
  spawnMultiplier: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
  scoreMultiplier: number;
  runnerBias: number;
};

type MetaProgress = {
  credits: number;
  runs: number;
  highestWave: number;
  perks: Record<MetaPerkId, number>;
};

type HudState = {
  mode: GameMode;
  score: number;
  bestScore: number;
  scoreMultiplier: number;
  combo: number;
  maxCombo: number;
  level: number;
  xp: number;
  xpNeed: number;
  health: number;
  maxHealth: number;
  energy: number;
  wave: number;
  enemies: number;
  timeRemaining: number;
  fireCooldown: number;
  dashCooldown: number;
  novaCooldown: number;
  shieldCooldown: number;
  shieldActive: number;
  mutatorLabel: string;
  credits: number;
};

type SceneApi = {
  startRun: () => void;
  restartRun: () => void;
  togglePause: () => void;
  toggleFullscreen: () => void;
  triggerDash: () => void;
  triggerNova: () => void;
  triggerShield: () => void;
  buyMetaPerk: (id: MetaPerkId) => void;
  chooseUpgrade: (id: UpgradeId) => void;
  renderText: () => string;
  advanceTime: (ms: number) => void;
};

type GameWindow = Window & {
  render_game_to_text?: () => string;
  advanceTime?: (ms: number) => void;
};

type UiBridge = {
  onHud: (hud: HudState) => void;
  onUpgrades: (choices: UpgradeOption[]) => void;
  onLog: (message: string) => void;
  onBest: (score: number, combo: number) => void;
  onMeta: (meta: MetaProgress) => void;
  setApi: (api: SceneApi | null) => void;
};

const ARENA_WIDTH = 1240;
const ARENA_HEIGHT = 720;
const TOTAL_SECONDS = 120;
const FIXED_FRAME = 1 / 60;
const HUD_UPDATE_INTERVAL_MS = 120;
const META_STORAGE_KEY = 'battle_phaser_meta_v1';

const defaultHud: HudState = {
  mode: 'menu',
  score: 0,
  bestScore: 0,
  scoreMultiplier: 1,
  combo: 0,
  maxCombo: 0,
  level: 1,
  xp: 0,
  xpNeed: 100,
  health: 100,
  maxHealth: 100,
  energy: 100,
  wave: 1,
  enemies: 0,
  timeRemaining: TOTAL_SECONDS,
  fireCooldown: 0,
  dashCooldown: 0,
  novaCooldown: 0,
  shieldCooldown: 0,
  shieldActive: 0,
  mutatorLabel: 'Standard Pressure',
  credits: 0,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const distSq = (ax: number, ay: number, bx: number, by: number) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

const normalize = (x: number, y: number) => {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
};

const randomEdgeSpawn = () => {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: -40, y: Math.random() * ARENA_HEIGHT };
  if (side === 1) return { x: ARENA_WIDTH + 40, y: Math.random() * ARENA_HEIGHT };
  if (side === 2) return { x: Math.random() * ARENA_WIDTH, y: -40 };
  return { x: Math.random() * ARENA_WIDTH, y: ARENA_HEIGHT + 40 };
};

const MODE_LABEL: Record<GameMode, string> = {
  menu: 'Warmup',
  playing: 'Live Run',
  paused: 'Paused',
  upgrade: 'Upgrade Pick',
  gameover: 'Wiped',
  victory: 'Stage Cleared',
};

const META_PERKS: Record<MetaPerkId, MetaPerkDefinition> = {
  armorCore: {
    id: 'armorCore',
    title: 'Armor Core',
    description: 'Raise base HP for every run.',
    maxLevel: 6,
    baseCost: 36,
    stepCost: 24,
  },
  reactorTuning: {
    id: 'reactorTuning',
    title: 'Reactor Tuning',
    description: 'Cheaper abilities and faster energy regen.',
    maxLevel: 6,
    baseCost: 40,
    stepCost: 26,
  },
  bountyProtocol: {
    id: 'bountyProtocol',
    title: 'Bounty Protocol',
    description: 'Boost score and credit payout multipliers.',
    maxLevel: 6,
    baseCost: 48,
    stepCost: 30,
  },
};

const PERK_ORDER: MetaPerkId[] = ['armorCore', 'reactorTuning', 'bountyProtocol'];

const RUN_MUTATORS: Record<MutatorId, MutatorDefinition> = {
  standard: {
    id: 'standard',
    title: 'Standard Pressure',
    description: 'Balanced threat profile. Stable scouting telemetry.',
    spawnMultiplier: 1,
    enemySpeedMultiplier: 1,
    enemyDamageMultiplier: 1,
    scoreMultiplier: 1,
    runnerBias: 0,
  },
  overclocked: {
    id: 'overclocked',
    title: 'Overclocked Rift',
    description: 'Faster spawns and movement. Big score bonus.',
    spawnMultiplier: 0.82,
    enemySpeedMultiplier: 1.2,
    enemyDamageMultiplier: 1.05,
    scoreMultiplier: 1.26,
    runnerBias: 0.04,
  },
  glass: {
    id: 'glass',
    title: 'Glass Protocol',
    description: 'Enemies hit harder, but your score explodes.',
    spawnMultiplier: 0.94,
    enemySpeedMultiplier: 1.07,
    enemyDamageMultiplier: 1.34,
    scoreMultiplier: 1.32,
    runnerBias: 0.02,
  },
  swarm: {
    id: 'swarm',
    title: 'Swarm Storm',
    description: 'Runner-heavy density with accelerated pacing.',
    spawnMultiplier: 0.74,
    enemySpeedMultiplier: 1.08,
    enemyDamageMultiplier: 1.02,
    scoreMultiplier: 1.24,
    runnerBias: 0.14,
  },
};

const defaultMetaProgress: MetaProgress = {
  credits: 0,
  runs: 0,
  highestWave: 1,
  perks: {
    armorCore: 0,
    reactorTuning: 0,
    bountyProtocol: 0,
  },
};

const sanitizeMetaPerks = (input: unknown): Record<MetaPerkId, number> => {
  const source = typeof input === 'object' && input !== null ? (input as Partial<Record<MetaPerkId, number>>) : {};
  return {
    armorCore: clamp(Math.floor(source.armorCore ?? 0), 0, META_PERKS.armorCore.maxLevel),
    reactorTuning: clamp(Math.floor(source.reactorTuning ?? 0), 0, META_PERKS.reactorTuning.maxLevel),
    bountyProtocol: clamp(Math.floor(source.bountyProtocol ?? 0), 0, META_PERKS.bountyProtocol.maxLevel),
  };
};

const sanitizeMetaProgress = (input: unknown): MetaProgress => {
  const source = typeof input === 'object' && input !== null ? (input as Partial<MetaProgress>) : {};
  return {
    credits: clamp(Math.floor(source.credits ?? 0), 0, 9999999),
    runs: clamp(Math.floor(source.runs ?? 0), 0, 9999999),
    highestWave: clamp(Math.floor(source.highestWave ?? 1), 1, 9999),
    perks: sanitizeMetaPerks(source.perks),
  };
};

const loadMetaProgress = (): MetaProgress => {
  try {
    const raw = window.localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return { ...defaultMetaProgress, perks: { ...defaultMetaProgress.perks } };
    return sanitizeMetaProgress(JSON.parse(raw));
  } catch {
    return { ...defaultMetaProgress, perks: { ...defaultMetaProgress.perks } };
  }
};

const getMetaPerkCost = (id: MetaPerkId, level: number) => {
  const def = META_PERKS[id];
  const safeLevel = clamp(Math.floor(level), 0, def.maxLevel);
  return Math.round(def.baseCost + def.stepCost * safeLevel + safeLevel * safeLevel * 6);
};

const rollRunMutator = (): MutatorDefinition => {
  const pool: MutatorId[] = ['standard', 'overclocked', 'glass', 'swarm'];
  const picked = pool[Math.floor(Math.random() * pool.length)] ?? 'standard';
  return RUN_MUTATORS[picked];
};

const UPGRADE_POOL: Record<UpgradeId, UpgradeOption> = {
  fireRate: {
    id: 'fireRate',
    title: 'Pulse Tempo',
    description: '+18% fire rate and smoother recoil cadence.',
  },
  damage: {
    id: 'damage',
    title: 'Shard Amplifier',
    description: '+6 pulse damage and stronger nova detonation.',
  },
  speed: {
    id: 'speed',
    title: 'Slipstream Boots',
    description: '+22 move speed and tighter dodge arcs.',
  },
  maxHealth: {
    id: 'maxHealth',
    title: 'Crew Fortify',
    description: '+24 max HP and instant +20 heal.',
  },
  dash: {
    id: 'dash',
    title: 'Blink Relay',
    description: 'Dash cooldown down by 0.12s and longer burst.',
  },
  nova: {
    id: 'nova',
    title: 'Nova Coil',
    description: 'Nova radius and damage both scale up.',
  },
  shield: {
    id: 'shield',
    title: 'Aegis Matrix',
    description: 'Shield lasts longer with reduced cooldown.',
  },
};

const pickUpgradeChoices = (owned: Record<UpgradeId, number>) => {
  const keys = Object.keys(UPGRADE_POOL) as UpgradeId[];
  const weighted = keys
    .map((id) => ({ id, score: owned[id] }))
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.id);
  const picked: UpgradeId[] = [];
  while (picked.length < 3 && weighted.length > 0) {
    const index = Math.floor(Math.random() * weighted.length);
    picked.push(weighted.splice(index, 1)[0]);
  }
  return picked.map((id) => UPGRADE_POOL[id]);
};

export default function BattlePhaserGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<PhaserType.Game | null>(null);
  const sceneApiRef = useRef<SceneApi | null>(null);
  const queuedStartRef = useRef(false);
  const mountedRef = useRef(false);
  const logsRef = useRef<string[]>([]);
  const bestScoreRef = useRef(0);
  const bestComboRef = useRef(0);
  const metaRef = useRef<MetaProgress>({ ...defaultMetaProgress, perks: { ...defaultMetaProgress.perks } });

  const [hud, setHud] = useState<HudState>(defaultHud);
  const [upgradeChoices, setUpgradeChoices] = useState<UpgradeOption[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [metaProgress, setMetaProgress] = useState<MetaProgress>({ ...defaultMetaProgress, perks: { ...defaultMetaProgress.perks } });

  useEffect(() => {
    mountedRef.current = true;
    const storedScore = Number(window.localStorage.getItem('battle_phaser_best_score') ?? 0);
    const storedCombo = Number(window.localStorage.getItem('battle_phaser_best_combo') ?? 0);
    if (Number.isFinite(storedScore) && storedScore > 0) {
      const nextScore = Math.floor(storedScore);
      bestScoreRef.current = nextScore;
      setBestScore(nextScore);
    }
    if (Number.isFinite(storedCombo) && storedCombo > 0) {
      const nextCombo = Math.floor(storedCombo);
      bestComboRef.current = nextCombo;
      setBestCombo(nextCombo);
    }
    const storedMeta = loadMetaProgress();
    metaRef.current = storedMeta;
    setMetaProgress(storedMeta);
    setHud((current) => ({ ...current, credits: storedMeta.credits }));
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem('battle_phaser_best_score', String(bestScore));
  }, [bestScore]);

  useEffect(() => {
    window.localStorage.setItem('battle_phaser_best_combo', String(bestCombo));
  }, [bestCombo]);

  useEffect(() => {
    metaRef.current = metaProgress;
    window.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(metaProgress));
  }, [metaProgress]);

  const pushLog = useCallback((message: string) => {
    logsRef.current = [message, ...logsRef.current].slice(0, 8);
    setLogs(logsRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!containerRef.current) return;
      const phaserModule = await import('phaser');
      if (cancelled || !containerRef.current) return;
      const Phaser = phaserModule.default;

      class RiftPulseScene extends Phaser.Scene {
        private bridge: UiBridge;

        private mode: GameMode = 'menu';
        private player!: ArcSprite;
        private reticle!: ArcSprite;
        private shieldBubble!: ArcSprite;
        private bannerTitle!: TextSprite;
        private bannerBody!: TextSprite;

        private nextEnemyId = 0;
        private nextProjectileId = 0;
        private nextPickupId = 0;
        private nextRingId = 0;
        private nextFloatId = 0;

        private enemies: EnemyEntity[] = [];
        private playerShots: Projectile[] = [];
        private enemyShots: Projectile[] = [];
        private pickups: PickupEntity[] = [];
        private rings: RingFx[] = [];
        private floatTexts: FloatTextFx[] = [];

        private level = 1;
        private xp = 0;
        private xpNeed = 100;
        private score = 0;
        private scoreMultiplier = 1;
        private combo = 0;
        private maxCombo = 0;
        private comboMilestone = 0;
        private kills = 0;
        private wave = 1;
        private elapsed = 0;
        private timeRemaining = TOTAL_SECONDS;

        private health = 100;
        private maxHealth = 100;
        private energy = 100;
        private shieldActive = 0;
        private invuln = 0;
        private flashDamage = 0;

        private fireCooldown = 0;
        private dashCooldown = 0;
        private novaCooldown = 0;
        private shieldCooldown = 0;
        private spawnClock = 0;
        private waveClock = 0;
        private runMutator: MutatorDefinition = RUN_MUTATORS.standard;

        private bossActive = false;
        private manualStepLockUntil = 0;
        private lastHudUpdate = 0;
        private facingX = 1;
        private facingY = 0;

        private upgrades: Record<UpgradeId, number> = {
          fireRate: 0,
          damage: 0,
          speed: 0,
          maxHealth: 0,
          dash: 0,
          nova: 0,
          shield: 0,
        };

        private activeChoices: UpgradeOption[] = [];

        private keys!: {
          up: PhaserType.Input.Keyboard.Key;
          down: PhaserType.Input.Keyboard.Key;
          left: PhaserType.Input.Keyboard.Key;
          right: PhaserType.Input.Keyboard.Key;
          w: PhaserType.Input.Keyboard.Key;
          a: PhaserType.Input.Keyboard.Key;
          s: PhaserType.Input.Keyboard.Key;
          d: PhaserType.Input.Keyboard.Key;
          fire: PhaserType.Input.Keyboard.Key;
          dash: PhaserType.Input.Keyboard.Key;
          shield: PhaserType.Input.Keyboard.Key;
          nova: PhaserType.Input.Keyboard.Key;
          pause: PhaserType.Input.Keyboard.Key;
          fullscreen: PhaserType.Input.Keyboard.Key;
          one: PhaserType.Input.Keyboard.Key;
          two: PhaserType.Input.Keyboard.Key;
          three: PhaserType.Input.Keyboard.Key;
          b: PhaserType.Input.Keyboard.Key;
          enter: PhaserType.Input.Keyboard.Key;
        };

        constructor(bridge: UiBridge) {
          super('rift-pulse-scene');
          this.bridge = bridge;
        }

        create() {
          this.cameras.main.setBackgroundColor('#030712');
          this.buildBackdrop();

          this.player = this.add.circle(ARENA_WIDTH * 0.5, ARENA_HEIGHT * 0.56, 16, 0x7dd3fc, 1);
          this.player.setDepth(7);
          this.reticle = this.add.circle(this.player.x + 30, this.player.y, 8, 0x67e8f9, 0.8);
          this.reticle.setDepth(9);
          this.shieldBubble = this.add.circle(this.player.x, this.player.y, 42, 0x22d3ee, 0.12);
          this.shieldBubble.setStrokeStyle(2, 0x67e8f9, 0.9);
          this.shieldBubble.setVisible(false);
          this.shieldBubble.setDepth(6);

          this.bannerTitle = this.add
            .text(ARENA_WIDTH * 0.5, ARENA_HEIGHT * 0.36, 'RIFT PULSE ASCENDANT', {
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
              fontSize: '54px',
              fontStyle: '700',
              color: '#f8fafc',
            })
            .setOrigin(0.5)
            .setDepth(20);
          this.bannerBody = this.add
            .text(
              ARENA_WIDTH * 0.5,
              ARENA_HEIGHT * 0.47,
              'Survive for 120 seconds. Build upgrades mid-run and clear boss waves.\nEnter to start • Move with WASD • Hold click or Space to fire.',
              {
                fontFamily: 'Space Grotesk, system-ui, sans-serif',
                fontSize: '20px',
                align: 'center',
                color: '#cbd5e1',
              },
            )
            .setOrigin(0.5)
            .setDepth(20);

          this.input.mouse?.disableContextMenu();
          const keyboard = this.input.keyboard;
          if (!keyboard) return;

          this.keys = {
            up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            fire: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            dash: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            shield: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
            nova: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            pause: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P),
            fullscreen: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
            one: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
            two: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
            three: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
            b: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B),
            enter: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
          };

          this.bridge.setApi({
            startRun: () => this.startRun(),
            restartRun: () => this.startRun(),
            togglePause: () => this.togglePause(),
            toggleFullscreen: () => this.toggleFullscreen(),
            triggerDash: () => this.triggerDash(),
            triggerNova: () => this.triggerNova(),
            triggerShield: () => this.triggerShield(),
            buyMetaPerk: (id) => this.buyMetaPerk(id),
            chooseUpgrade: (id) => this.chooseUpgrade(id),
            renderText: () => this.renderGameToText(),
            advanceTime: (ms) => this.advanceTime(ms),
          });

          this.renderHud(true);
          this.bridge.onLog('Signal ready: choose Start Run to begin.');
        }

        private buildBackdrop() {
          const bg = this.add.graphics();
          bg.fillGradientStyle(0x020617, 0x071127, 0x020617, 0x111827, 1);
          bg.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
          bg.lineStyle(1, 0x0ea5e9, 0.17);
          for (let x = 0; x < ARENA_WIDTH; x += 44) {
            bg.lineBetween(x, 0, x, ARENA_HEIGHT);
          }
          for (let y = 0; y < ARENA_HEIGHT; y += 44) {
            bg.lineBetween(0, y, ARENA_WIDTH, y);
          }
          bg.setDepth(0);

          const glow = this.add.graphics();
          glow.fillStyle(0x22d3ee, 0.12);
          glow.fillCircle(ARENA_WIDTH * 0.18, ARENA_HEIGHT * 0.2, 180);
          glow.fillStyle(0xfb923c, 0.1);
          glow.fillCircle(ARENA_WIDTH * 0.83, ARENA_HEIGHT * 0.19, 220);
          glow.setDepth(1);
        }

        private getMetaPerkLevel(id: MetaPerkId) {
          return metaRef.current.perks[id] ?? 0;
        }

        private getAbilityCost(baseCost: number) {
          const discount = this.getMetaPerkLevel('reactorTuning') * 0.06;
          return Math.max(8, Math.round(baseCost * (1 - discount)));
        }

        private getEnergyRegenRate() {
          return 8 + this.upgrades.shield * 1.1 + this.getMetaPerkLevel('reactorTuning') * 1.2;
        }

        private recalculateScoreMultiplier() {
          const perkBonus = this.getMetaPerkLevel('bountyProtocol') * 0.08;
          this.scoreMultiplier = Number((this.runMutator.scoreMultiplier * (1 + perkBonus)).toFixed(2));
        }

        private applyMetaProgress(next: MetaProgress) {
          const normalized = sanitizeMetaProgress(next);
          this.bridge.onMeta(normalized);
        }

        private getPerkCost(id: MetaPerkId) {
          return getMetaPerkCost(id, this.getMetaPerkLevel(id));
        }

        private buyMetaPerk(id: MetaPerkId) {
          if (this.mode === 'playing' || this.mode === 'upgrade') {
            this.bridge.onLog('Perks can only be upgraded between runs.');
            return;
          }
          const perk = META_PERKS[id];
          const currentLevel = this.getMetaPerkLevel(id);
          if (currentLevel >= perk.maxLevel) {
            this.bridge.onLog(`${perk.title} is already maxed.`);
            return;
          }

          const cost = this.getPerkCost(id);
          if (metaRef.current.credits < cost) {
            this.bridge.onLog(`Need ${cost - metaRef.current.credits} more credits for ${perk.title}.`);
            return;
          }

          this.applyMetaProgress({
            ...metaRef.current,
            credits: metaRef.current.credits - cost,
            perks: {
              ...metaRef.current.perks,
              [id]: currentLevel + 1,
            },
          });
          this.bridge.onLog(`${perk.title} upgraded to Lv.${currentLevel + 1}.`);
          this.renderHud(true);
        }

        private startRun() {
          this.runMutator = rollRunMutator();
          this.recalculateScoreMultiplier();

          const armorBonus = this.getMetaPerkLevel('armorCore') * 14;
          const reactorLevel = this.getMetaPerkLevel('reactorTuning');
          this.mode = 'playing';
          this.level = 1;
          this.xp = 0;
          this.xpNeed = 100;
          this.score = 0;
          this.combo = 0;
          this.maxCombo = 0;
          this.comboMilestone = 0;
          this.kills = 0;
          this.wave = 1;
          this.elapsed = 0;
          this.timeRemaining = TOTAL_SECONDS;
          this.maxHealth = 100 + armorBonus;
          this.health = this.maxHealth;
          this.energy = clamp(84 + reactorLevel * 4, 0, 100);
          this.shieldActive = 0;
          this.invuln = 0;
          this.flashDamage = 0;
          this.fireCooldown = 0;
          this.dashCooldown = 0;
          this.novaCooldown = 0;
          this.shieldCooldown = 0;
          this.spawnClock = 0.8;
          this.waveClock = 0;
          this.bossActive = false;
          this.activeChoices = [];
          this.bridge.onUpgrades([]);

          this.upgrades = {
            fireRate: 0,
            damage: 0,
            speed: 0,
            maxHealth: 0,
            dash: 0,
            nova: 0,
            shield: 0,
          };

          this.player.setPosition(ARENA_WIDTH * 0.5, ARENA_HEIGHT * 0.56);
          this.facingX = 1;
          this.facingY = 0;
          this.reticle.setPosition(this.player.x + 30, this.player.y);

          this.clearEntities();
          this.updateBanner();
          this.bridge.onLog(`Run started. Mutator: ${this.runMutator.title}.`);
          this.bridge.onLog(this.runMutator.description);
          this.renderHud(true);
        }

        private clearEntities() {
          this.enemies.forEach((enemy) => enemy.sprite.destroy());
          this.playerShots.forEach((shot) => shot.sprite.destroy());
          this.enemyShots.forEach((shot) => shot.sprite.destroy());
          this.pickups.forEach((pickup) => pickup.sprite.destroy());
          this.rings.forEach((ring) => ring.sprite.destroy());
          this.floatTexts.forEach((entry) => entry.sprite.destroy());
          this.enemies = [];
          this.playerShots = [];
          this.enemyShots = [];
          this.pickups = [];
          this.rings = [];
          this.floatTexts = [];
          this.nextEnemyId = 0;
          this.nextProjectileId = 0;
          this.nextPickupId = 0;
          this.nextRingId = 0;
          this.nextFloatId = 0;
        }

        private togglePause() {
          if (this.mode === 'playing') {
            this.mode = 'paused';
            this.bridge.onLog('Run paused.');
          } else if (this.mode === 'paused') {
            this.mode = 'playing';
            this.bridge.onLog('Run resumed.');
          }
          this.updateBanner();
          this.renderHud(true);
        }

        private toggleFullscreen() {
          if (!this.scale.isFullscreen) {
            void this.scale.startFullscreen();
          } else {
            this.scale.stopFullscreen();
          }
        }

        private chooseUpgrade(id: UpgradeId) {
          if (this.mode !== 'upgrade') return;
          const next = this.upgrades[id] + 1;
          this.upgrades[id] = next;

          if (id === 'maxHealth') {
            const baseHealth = 100 + this.getMetaPerkLevel('armorCore') * 14;
            this.maxHealth = baseHealth + this.upgrades.maxHealth * 24;
            this.health = clamp(this.health + 20, 0, this.maxHealth);
          }

          this.activeChoices = [];
          this.bridge.onUpgrades([]);
          this.mode = 'playing';
          this.updateBanner();
          this.spawnFloatText(this.player.x, this.player.y - 44, UPGRADE_POOL[id].title.toUpperCase(), '#7dd3fc', 16, 0.7);
          this.bridge.onLog(`Upgrade locked: ${UPGRADE_POOL[id].title}.`);
          this.renderHud(true);
        }

        private gameOver(victory: boolean) {
          this.mode = victory ? 'victory' : 'gameover';
          const baseCredits = Math.max(
            24,
            Math.floor(this.score / 52) + this.wave * 5 + this.level * 3 + (victory ? 40 : 0) + this.maxCombo,
          );
          const payout = Math.round(baseCredits * this.scoreMultiplier);
          this.applyMetaProgress({
            ...metaRef.current,
            credits: metaRef.current.credits + payout,
            runs: metaRef.current.runs + 1,
            highestWave: Math.max(metaRef.current.highestWave, this.wave),
          });
          this.updateBanner();
          this.bridge.onLog(victory ? 'Stage cleared. You held the line for 120s.' : 'Run ended. Reboot and refine your upgrade path.');
          this.bridge.onLog(`Credit payout +${payout}. Spend it in Ops Hangar perks.`);
          this.bridge.onBest(Math.floor(this.score), this.maxCombo);
          this.renderHud(true);
        }

        update(_time: number, deltaMs: number) {
          const delta = clamp(deltaMs / 1000, 0, 0.05);
          if (performance.now() < this.manualStepLockUntil) {
            this.updateVisualLayers(delta);
            return;
          }

          if (!this.keys) return;

          if (Phaser.Input.Keyboard.JustDown(this.keys.fullscreen)) this.toggleFullscreen();
          if (Phaser.Input.Keyboard.JustDown(this.keys.pause) && (this.mode === 'playing' || this.mode === 'paused')) this.togglePause();

          if (
            (this.mode === 'menu' || this.mode === 'gameover' || this.mode === 'victory') &&
            (Phaser.Input.Keyboard.JustDown(this.keys.fire) || Phaser.Input.Keyboard.JustDown(this.keys.enter))
          ) {
            this.startRun();
          }

          if (this.mode === 'upgrade') {
            if (Phaser.Input.Keyboard.JustDown(this.keys.one) && this.activeChoices[0]) this.chooseUpgrade(this.activeChoices[0].id);
            if (Phaser.Input.Keyboard.JustDown(this.keys.two) && this.activeChoices[1]) this.chooseUpgrade(this.activeChoices[1].id);
            if (Phaser.Input.Keyboard.JustDown(this.keys.three) && this.activeChoices[2]) this.chooseUpgrade(this.activeChoices[2].id);
            this.updateVisualLayers(delta);
            this.renderHud();
            return;
          }

          if (this.mode !== 'playing') {
            this.updateVisualLayers(delta);
            this.renderHud();
            return;
          }

          this.simulateStep(delta);
          this.updateVisualLayers(delta);
          this.renderHud();
        }

        private simulateStep(delta: number) {
          this.elapsed += delta;
          this.waveClock += delta;
          this.timeRemaining = Math.max(0, TOTAL_SECONDS - this.elapsed);

          if (this.timeRemaining <= 0) {
            this.gameOver(true);
            return;
          }

          if (this.waveClock >= 12) {
            this.waveClock = 0;
            this.wave += 1;
            this.bridge.onLog(`Wave ${this.wave} begins.`);
            this.spawnFloatText(this.player.x, this.player.y - 88, `WAVE ${this.wave}`, '#e2e8f0', 22, 0.86);
            this.cameras.main.flash(90, 56, 189, 248, true);
            if (this.wave % 4 === 0) {
              this.spawnBoss();
            }
          }

          this.fireCooldown = Math.max(0, this.fireCooldown - delta);
          this.dashCooldown = Math.max(0, this.dashCooldown - delta);
          this.novaCooldown = Math.max(0, this.novaCooldown - delta);
          this.shieldCooldown = Math.max(0, this.shieldCooldown - delta);
          this.shieldActive = Math.max(0, this.shieldActive - delta);
          this.invuln = Math.max(0, this.invuln - delta);
          this.flashDamage = Math.max(0, this.flashDamage - delta * 3.4);
          this.energy = clamp(this.energy + delta * this.getEnergyRegenRate(), 0, 100);

          this.updatePlayerMovement(delta);
          this.handleCombatInput();
          this.handleSpawning(delta);
          this.updateEnemies(delta);
          this.updateProjectiles(delta);
          this.updatePickups(delta);
          this.updateRings(delta);
          this.checkLevelUp();

          this.score += delta * (4.5 + this.wave * 0.6 + this.level * 0.2) * this.scoreMultiplier;
        }

        private updatePlayerMovement(delta: number) {
          const moveX =
            (this.keys.right.isDown || this.keys.d.isDown ? 1 : 0) - (this.keys.left.isDown || this.keys.a.isDown ? 1 : 0);
          const moveY = (this.keys.down.isDown || this.keys.s.isDown ? 1 : 0) - (this.keys.up.isDown || this.keys.w.isDown ? 1 : 0);
          const norm = moveX !== 0 || moveY !== 0 ? normalize(moveX, moveY) : { x: 0, y: 0 };
          const baseSpeed = 250 + this.upgrades.speed * 22;
          const shieldPenalty = this.shieldActive > 0 ? 0.84 : 1;

          this.player.x += norm.x * baseSpeed * shieldPenalty * delta;
          this.player.y += norm.y * baseSpeed * shieldPenalty * delta;
          this.player.x = clamp(this.player.x, 24, ARENA_WIDTH - 24);
          this.player.y = clamp(this.player.y, 24, ARENA_HEIGHT - 24);

          const pointer = this.input.activePointer;
          const aimX = pointer.worldX - this.player.x;
          const aimY = pointer.worldY - this.player.y;
          if (Math.abs(aimX) + Math.abs(aimY) > 0.01) {
            const aim = normalize(aimX, aimY);
            this.facingX = aim.x;
            this.facingY = aim.y;
          }
          this.reticle.x = this.player.x + this.facingX * 30;
          this.reticle.y = this.player.y + this.facingY * 30;
        }

        private handleCombatInput() {
          const pointer = this.input.activePointer;
          const wantsFire = pointer.isDown || this.keys.fire.isDown;
          if (wantsFire && this.fireCooldown <= 0) {
            this.firePulse();
          }
          if (Phaser.Input.Keyboard.JustDown(this.keys.dash) || Phaser.Input.Keyboard.JustDown(this.keys.b)) this.triggerDash();
          if (Phaser.Input.Keyboard.JustDown(this.keys.nova)) this.triggerNova();
          if (Phaser.Input.Keyboard.JustDown(this.keys.shield) || Phaser.Input.Keyboard.JustDown(this.keys.enter)) this.triggerShield();
        }

        private firePulse() {
          const fireRate = clamp(0.26 - this.upgrades.fireRate * 0.025, 0.09, 0.26);
          const damage = 18 + this.upgrades.damage * 6;
          const speed = 560 + this.upgrades.fireRate * 28;
          this.fireCooldown = fireRate;

          this.nextProjectileId += 1;
          const shot = this.add.circle(this.player.x + this.facingX * 18, this.player.y + this.facingY * 18, 5, 0x67e8f9, 1);
          shot.setDepth(10);
          this.playerShots.push({
            id: this.nextProjectileId,
            owner: 'player',
            kind: 'pulse',
            sprite: shot,
            vx: this.facingX * speed,
            vy: this.facingY * speed,
            life: 1.24,
            radius: 5,
            damage,
          });
          this.spawnRing(shot.x, shot.y, 2, 14, 0x67e8f9, 0.09);
        }

        private triggerDash() {
          const cost = this.getAbilityCost(20);
          if (this.dashCooldown > 0 || this.energy < cost) return;
          const distance = 130 + this.upgrades.dash * 16;
          this.player.x = clamp(this.player.x + this.facingX * distance, 24, ARENA_WIDTH - 24);
          this.player.y = clamp(this.player.y + this.facingY * distance, 24, ARENA_HEIGHT - 24);
          this.energy = Math.max(0, this.energy - cost);
          this.invuln = Math.max(this.invuln, 0.24);
          this.dashCooldown = clamp(1.32 - this.upgrades.dash * 0.12, 0.35, 1.32);
          this.spawnRing(this.player.x, this.player.y, 30, 90, 0x7dd3fc, 0.32);
          this.spawnFloatText(this.player.x, this.player.y - 36, 'DASH', '#67e8f9', 14, 0.42, 0, -52);
          this.cameras.main.shake(65, 0.0019);
        }

        private triggerNova() {
          const cost = this.getAbilityCost(28);
          if (this.novaCooldown > 0 || this.energy < cost) return;
          const radius = 150 + this.upgrades.nova * 22;
          const damage = 78 + this.upgrades.nova * 28 + this.upgrades.damage * 4;
          this.energy = Math.max(0, this.energy - cost);
          this.novaCooldown = clamp(8.8 - this.upgrades.nova * 0.5, 4.2, 8.8);
          this.spawnRing(this.player.x, this.player.y, 38, radius, 0x22d3ee, 0.42);
          this.spawnFloatText(this.player.x, this.player.y - 44, 'NOVA', '#22d3ee', 16, 0.56);

          for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
            const enemy = this.enemies[i];
            if (distSq(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y) > (radius + enemy.radius) * (radius + enemy.radius)) continue;
            enemy.hp -= damage;
            if (enemy.hp <= 0) {
              this.killEnemy(enemy, true);
            }
          }
          this.cameras.main.shake(120, 0.0028);
          this.bridge.onLog('Nova burst detonated.');
        }

        private triggerShield() {
          const cost = this.getAbilityCost(25);
          if (this.shieldCooldown > 0 || this.energy < cost) return;
          this.energy = Math.max(0, this.energy - cost);
          this.shieldCooldown = clamp(11.6 - this.upgrades.shield * 0.72, 5.6, 11.6);
          this.shieldActive = 2.15 + this.upgrades.shield * 0.42;
          this.spawnRing(this.player.x, this.player.y, 42, 74, 0x67e8f9, 0.34);
          this.spawnFloatText(this.player.x, this.player.y - 42, 'AEGIS', '#a5f3fc', 14, 0.56);
        }

        private handleSpawning(delta: number) {
          this.spawnClock -= delta;
          const interval = clamp((1.08 - this.wave * 0.07) * this.runMutator.spawnMultiplier, 0.28, 1.08);
          while (this.spawnClock <= 0) {
            this.spawnEnemy();
            this.spawnClock += interval * (0.86 + Math.random() * 0.33);
          }
        }

        private spawnEnemy(kind?: EnemyKind) {
          const chosen = kind ?? this.rollEnemyKind();
          const spawn = randomEdgeSpawn();

          const profile =
            chosen === 'runner'
              ? { radius: 13, hp: 32 + this.wave * 3, speed: 114 + this.wave * 3, damage: 10, color: 0xfb7185 }
              : chosen === 'striker'
                ? { radius: 16, hp: 58 + this.wave * 5, speed: 82 + this.wave * 2, damage: 16, color: 0xf97316 }
                : chosen === 'sniper'
                  ? { radius: 14, hp: 44 + this.wave * 4, speed: 62 + this.wave * 2, damage: 13, color: 0xfde047 }
                  : chosen === 'tank'
                    ? { radius: 20, hp: 126 + this.wave * 10, speed: 54 + this.wave, damage: 22, color: 0xa78bfa }
                    : { radius: 30, hp: 440 + this.wave * 66, speed: 56, damage: 28, color: 0x22d3ee };

          this.nextEnemyId += 1;
          const sprite = this.add.circle(spawn.x, spawn.y, profile.radius, profile.color, 0.95);
          sprite.setDepth(8);

          this.enemies.push({
            id: this.nextEnemyId,
            kind: chosen,
            sprite,
            hp: profile.hp,
            maxHp: profile.hp,
            speed: profile.speed,
            damage: profile.damage,
            radius: profile.radius,
            fireCd: chosen === 'sniper' ? 1.2 : chosen === 'boss' ? 2.3 : 0,
            contactCd: 0,
            aiClock: 0,
            dashClock: 0,
          });

          if (chosen === 'boss') {
            this.bossActive = true;
            this.bridge.onLog(`Boss on stage at wave ${this.wave}.`);
          }
        }

        private spawnBoss() {
          if (this.bossActive) return;
          this.spawnEnemy('boss');
          for (let i = 0; i < 4; i += 1) this.spawnEnemy(i % 2 === 0 ? 'striker' : 'sniper');
          this.spawnFloatText(this.player.x, this.player.y - 100, 'BOSS PRESSURE', '#fb923c', 24, 1.05);
        }

        private rollEnemyKind(): EnemyKind {
          const roll = Math.random();
          if (roll < this.runMutator.runnerBias) return 'runner';
          const tankBias = Math.min(0.25, Math.max(0, (this.wave - 3) * 0.03));
          const sniperBias = Math.min(0.28, Math.max(0, (this.wave - 2) * 0.03));
          const strikerBias = Math.min(0.3, Math.max(0, (this.wave - 1) * 0.03));
          if (roll < 0.4 - tankBias * 0.4) return 'runner';
          if (roll < 0.4 + strikerBias) return 'striker';
          if (roll < 0.72 + sniperBias) return 'sniper';
          return 'tank';
        }

        private updateEnemies(delta: number) {
          for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
            const enemy = this.enemies[i];
            const dx = this.player.x - enemy.sprite.x;
            const dy = this.player.y - enemy.sprite.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = dx / len;
            const ny = dy / len;
            enemy.aiClock += delta;
            enemy.contactCd = Math.max(0, enemy.contactCd - delta);
            enemy.fireCd = Math.max(0, enemy.fireCd - delta);
            enemy.dashClock = Math.max(0, enemy.dashClock - delta);

            let speed = enemy.speed * this.runMutator.enemySpeedMultiplier;
            if (enemy.kind === 'striker' && enemy.dashClock <= 0 && len < 220) {
              speed *= 2.7;
              enemy.dashClock = 2.2;
            }
            if (enemy.kind === 'tank') speed *= 0.8;
            if (enemy.kind === 'boss') speed *= 0.7;

            if (enemy.kind === 'sniper') {
              const desired = len < 210 ? -1 : len > 320 ? 1 : 0;
              enemy.sprite.x += nx * speed * desired * delta;
              enemy.sprite.y += ny * speed * desired * delta;
              if (enemy.fireCd <= 0) {
                this.enemyShoot(enemy, nx, ny);
                enemy.fireCd = clamp(1.55 - this.wave * 0.05, 0.72, 1.55);
              }
            } else if (enemy.kind === 'boss') {
              enemy.sprite.x += nx * speed * delta;
              enemy.sprite.y += ny * speed * delta;
              if (enemy.fireCd <= 0) {
                this.bossRadial(enemy);
                enemy.fireCd = clamp(2.6 - this.wave * 0.08, 1.3, 2.6);
              }
            } else {
              enemy.sprite.x += nx * speed * delta;
              enemy.sprite.y += ny * speed * delta;
            }

            if (this.shieldActive > 0 && len < enemy.radius + 78) {
              enemy.hp -= delta * (enemy.kind === 'boss' ? 14 : 30);
            }

            const contactRadius = enemy.radius + 16;
            if (distSq(enemy.sprite.x, enemy.sprite.y, this.player.x, this.player.y) <= contactRadius * contactRadius && enemy.contactCd <= 0) {
              enemy.contactCd = enemy.kind === 'boss' ? 0.25 : 0.42;
              this.takeDamage(enemy.damage);
            }

            if (enemy.hp <= 0) {
              this.killEnemy(enemy, false);
            }
          }
        }

        private enemyShoot(enemy: EnemyEntity, nx: number, ny: number) {
          const speed = 280 + this.wave * 14;
          this.nextProjectileId += 1;
          const shot = this.add.circle(enemy.sprite.x, enemy.sprite.y, 5, 0xf87171, 1);
          shot.setDepth(10);
          this.enemyShots.push({
            id: this.nextProjectileId,
            owner: 'enemy',
            kind: 'shard',
            sprite: shot,
            vx: nx * speed,
            vy: ny * speed,
            life: 3.2,
            radius: 6,
            damage: enemy.kind === 'boss' ? 14 : 10 + Math.floor(this.wave * 0.7),
          });
        }

        private bossRadial(enemy: EnemyEntity) {
          const count = 10 + Math.min(8, Math.floor(this.wave / 2));
          const speed = 250 + this.wave * 11;
          for (let i = 0; i < count; i += 1) {
            const angle = (Math.PI * 2 * i) / count + this.elapsed * 0.6;
            this.nextProjectileId += 1;
            const shot = this.add.circle(enemy.sprite.x, enemy.sprite.y, 6, 0xf97316, 1);
            shot.setDepth(10);
            this.enemyShots.push({
              id: this.nextProjectileId,
              owner: 'enemy',
              kind: 'beam',
              sprite: shot,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              life: 3.6,
              radius: 7,
              damage: 13 + Math.floor(this.wave * 0.5),
            });
          }
          this.spawnRing(enemy.sprite.x, enemy.sprite.y, 30, 120, 0xfb923c, 0.24);
        }

        private updateProjectiles(delta: number) {
          for (let i = this.playerShots.length - 1; i >= 0; i -= 1) {
            const shot = this.playerShots[i];
            shot.life -= delta;
            shot.sprite.x += shot.vx * delta;
            shot.sprite.y += shot.vy * delta;
            if (shot.life <= 0 || shot.sprite.x < -30 || shot.sprite.x > ARENA_WIDTH + 30 || shot.sprite.y < -30 || shot.sprite.y > ARENA_HEIGHT + 30) {
              shot.sprite.destroy();
              this.playerShots.splice(i, 1);
              continue;
            }
            for (let j = this.enemies.length - 1; j >= 0; j -= 1) {
              const enemy = this.enemies[j];
              const rr = shot.radius + enemy.radius;
              if (distSq(shot.sprite.x, shot.sprite.y, enemy.sprite.x, enemy.sprite.y) > rr * rr) continue;
              enemy.hp -= shot.damage;
              this.spawnRing(shot.sprite.x, shot.sprite.y, 3, 18, 0x67e8f9, 0.12);
              if (enemy.hp <= 0) {
                this.killEnemy(enemy, false);
              }
              shot.sprite.destroy();
              this.playerShots.splice(i, 1);
              break;
            }
          }

          for (let i = this.enemyShots.length - 1; i >= 0; i -= 1) {
            const shot = this.enemyShots[i];
            shot.life -= delta;
            shot.sprite.x += shot.vx * delta;
            shot.sprite.y += shot.vy * delta;
            if (shot.life <= 0 || shot.sprite.x < -40 || shot.sprite.x > ARENA_WIDTH + 40 || shot.sprite.y < -40 || shot.sprite.y > ARENA_HEIGHT + 40) {
              shot.sprite.destroy();
              this.enemyShots.splice(i, 1);
              continue;
            }

            if (distSq(shot.sprite.x, shot.sprite.y, this.player.x, this.player.y) <= (shot.radius + 16) * (shot.radius + 16)) {
              this.spawnRing(shot.sprite.x, shot.sprite.y, 4, 22, 0xf87171, 0.16);
              shot.sprite.destroy();
              this.enemyShots.splice(i, 1);
              this.takeDamage(shot.damage);
            }
          }
        }

        private updatePickups(delta: number) {
          for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
            const pickup = this.pickups[i];
            pickup.age += delta;
            if (pickup.age > 18) {
              pickup.sprite.destroy();
              this.pickups.splice(i, 1);
              continue;
            }

            const dx = this.player.x - pickup.sprite.x;
            const dy = this.player.y - pickup.sprite.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 180 * 180) {
              const n = normalize(dx, dy);
              const speed = 120 + (180 - Math.min(180, Math.sqrt(d2))) * 2.4;
              pickup.sprite.x += n.x * speed * delta;
              pickup.sprite.y += n.y * speed * delta;
            }

            if (distSq(pickup.sprite.x, pickup.sprite.y, this.player.x, this.player.y) <= (pickup.radius + 16) * (pickup.radius + 16)) {
              if (pickup.kind === 'xp') {
                this.addXp(pickup.value);
                this.score += 4;
              } else if (pickup.kind === 'health') {
                this.health = clamp(this.health + pickup.value, 0, this.maxHealth);
              } else {
                this.energy = clamp(this.energy + pickup.value, 0, 100);
              }
              pickup.sprite.destroy();
              this.pickups.splice(i, 1);
            }
          }
        }

        private updateRings(delta: number) {
          for (let i = this.rings.length - 1; i >= 0; i -= 1) {
            const ring = this.rings[i];
            ring.life -= delta;
            const t = 1 - ring.life / ring.maxLife;
            ring.sprite.setRadius(ring.startR + (ring.endR - ring.startR) * t);
            ring.sprite.setAlpha(Math.max(0, 0.44 * (1 - t)));
            if (ring.life <= 0) {
              ring.sprite.destroy();
              this.rings.splice(i, 1);
            }
          }
        }

        private spawnFloatText(
          x: number,
          y: number,
          text: string,
          color = '#e2e8f0',
          size = 17,
          life = 0.82,
          vx = 0,
          vy = -34,
        ) {
          this.nextFloatId += 1;
          const sprite = this.add
            .text(x, y, text, {
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
              fontSize: `${size}px`,
              fontStyle: '700',
              color,
              stroke: '#020617',
              strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setDepth(13);
          this.floatTexts.push({
            id: this.nextFloatId,
            sprite,
            life,
            maxLife: life,
            vx,
            vy,
          });
        }

        private updateFloatTexts(delta: number) {
          for (let i = this.floatTexts.length - 1; i >= 0; i -= 1) {
            const text = this.floatTexts[i];
            text.life -= delta;
            text.sprite.x += text.vx * delta;
            text.sprite.y += text.vy * delta;
            text.sprite.setAlpha(Math.max(0, text.life / text.maxLife));
            if (text.life <= 0) {
              text.sprite.destroy();
              this.floatTexts.splice(i, 1);
            }
          }
        }

        private takeDamage(amount: number) {
          if (this.invuln > 0) return;
          const shieldMult = this.shieldActive > 0 ? 0.35 : 1;
          const finalDamage = Math.max(1, Math.round(amount * shieldMult * this.runMutator.enemyDamageMultiplier));
          this.health = Math.max(0, this.health - finalDamage);
          this.invuln = 0.26;
          this.combo = 0;
          this.comboMilestone = 0;
          this.flashDamage = 1;
          this.spawnFloatText(this.player.x, this.player.y - 48, `-${finalDamage}`, '#fb7185', 16, 0.5);
          this.cameras.main.shake(60, 0.0014 + finalDamage * 0.00003);
          if (this.health <= 0) {
            this.gameOver(false);
          }
        }

        private killEnemy(enemy: EnemyEntity, byNova: boolean) {
          const index = this.enemies.findIndex((entry) => entry.id === enemy.id);
          if (index === -1) return;
          this.enemies.splice(index, 1);
          enemy.sprite.destroy();

          if (enemy.kind === 'boss') {
            this.bossActive = false;
            this.bridge.onLog(`Boss defeated on wave ${this.wave}.`);
          }

          this.kills += 1;
          this.combo += 1;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          const scoreGain =
            ((enemy.kind === 'boss' ? 520 : enemy.kind === 'tank' ? 180 : 115) + this.combo * 8 + this.wave * 5) * this.scoreMultiplier;
          this.score += scoreGain;
          this.spawnFloatText(enemy.sprite.x, enemy.sprite.y - enemy.radius - 10, `+${Math.round(scoreGain)}`, '#fef08a', 14, 0.6);
          this.addXp(enemy.kind === 'boss' ? 95 : enemy.kind === 'tank' ? 32 : 20);

          const nextMilestone = Math.floor(this.combo / 10);
          if (nextMilestone > this.comboMilestone) {
            this.comboMilestone = nextMilestone;
            this.spawnFloatText(this.player.x, this.player.y - 56, `COMBO x${this.combo}`, '#c4b5fd', 20, 0.7);
            this.score += 80 * nextMilestone * this.scoreMultiplier;
            this.bridge.onLog(`Combo surge x${this.combo}. Bonus score injected.`);
          }

          const dropRoll = Math.random();
          if (dropRoll < 0.7) this.spawnPickup(enemy.sprite.x, enemy.sprite.y, 'xp', 14 + this.wave);
          if (dropRoll < 0.16) this.spawnPickup(enemy.sprite.x + 12, enemy.sprite.y - 8, 'health', 18);
          if (dropRoll > 0.72 && dropRoll < 0.92) this.spawnPickup(enemy.sprite.x - 10, enemy.sprite.y + 8, 'energy', 20);

          if (byNova) this.spawnRing(enemy.sprite.x, enemy.sprite.y, 12, 48, 0x22d3ee, 0.24);
        }

        private addXp(amount: number) {
          this.xp += amount;
        }

        private checkLevelUp() {
          if (this.mode !== 'playing') return;
          while (this.xp >= this.xpNeed) {
            this.xp -= this.xpNeed;
            this.level += 1;
            this.xpNeed = Math.round(this.xpNeed * 1.27 + 28);
            this.mode = 'upgrade';
            this.activeChoices = pickUpgradeChoices(this.upgrades);
            this.bridge.onUpgrades(this.activeChoices);
            this.updateBanner();
            this.spawnFloatText(this.player.x, this.player.y - 70, `LEVEL ${this.level}`, '#22d3ee', 26, 0.95);
            this.cameras.main.flash(120, 34, 211, 238, true);
            this.bridge.onLog(`Level ${this.level} reached. Pick an upgrade.`);
          }
        }

        private spawnPickup(x: number, y: number, kind: PickupKind, value: number) {
          this.nextPickupId += 1;
          const color = kind === 'xp' ? 0x67e8f9 : kind === 'health' ? 0x34d399 : 0xfde047;
          const radius = kind === 'xp' ? 5 : 7;
          const sprite = this.add.circle(x, y, radius, color, 0.95);
          sprite.setDepth(9);
          this.pickups.push({
            id: this.nextPickupId,
            kind,
            sprite,
            value,
            age: 0,
            radius,
          });
        }

        private spawnRing(x: number, y: number, startR: number, endR: number, color: number, life: number) {
          this.nextRingId += 1;
          const sprite = this.add.circle(x, y, startR, color, 0);
          sprite.setStrokeStyle(3, color, 0.9);
          sprite.setDepth(11);
          this.rings.push({
            id: this.nextRingId,
            sprite,
            life,
            maxLife: life,
            startR,
            endR,
          });
        }

        private updateVisualLayers(delta: number) {
          this.reticle.x = this.player.x + this.facingX * 30;
          this.reticle.y = this.player.y + this.facingY * 30;
          this.shieldBubble.setPosition(this.player.x, this.player.y);
          this.shieldBubble.setVisible(this.shieldActive > 0);
          this.shieldBubble.setRadius(36 + Math.sin(this.elapsed * 8) * 2 + this.upgrades.shield * 2);
          this.shieldBubble.setAlpha(this.shieldActive > 0 ? 0.24 + Math.sin(this.elapsed * 9) * 0.03 : 0.12);

          const invulnFlash = this.invuln > 0 && Math.floor(this.elapsed * 36) % 2 === 0;
          this.player.setAlpha(invulnFlash ? 0.42 : 1);

          if (this.flashDamage > 0) {
            const tint = clamp(this.flashDamage, 0, 1);
            this.player.fillColor = Phaser.Display.Color.Interpolate.ColorWithColor(
              Phaser.Display.Color.ValueToColor(0x7dd3fc),
              Phaser.Display.Color.ValueToColor(0xfb7185),
              100,
              Math.floor(tint * 100),
            ).color;
          } else {
            this.player.fillColor = 0x7dd3fc;
          }

          for (const pickup of this.pickups) {
            pickup.sprite.rotation += delta * 1.7;
            pickup.sprite.setAlpha(0.7 + Math.sin(this.elapsed * 7 + pickup.id) * 0.2);
          }

          this.updateFloatTexts(delta);
        }

        private updateBanner() {
          if (!this.bannerTitle || !this.bannerBody) return;
          if (this.mode === 'playing') {
            this.bannerTitle.setVisible(false);
            this.bannerBody.setVisible(false);
            return;
          }
          this.bannerTitle.setVisible(true);
          this.bannerBody.setVisible(true);

          if (this.mode === 'menu') {
            this.bannerTitle.setText('RIFT PULSE ASCENDANT');
            this.bannerBody.setText(
              'Survive for 120 seconds. Build upgrades mid-run and clear boss waves.\nEnter or Start Run to begin.',
            );
          } else if (this.mode === 'paused') {
            this.bannerTitle.setText('PAUSED');
            this.bannerBody.setText('Press P or Resume to continue the run.');
          } else if (this.mode === 'upgrade') {
            this.bannerTitle.setText('LEVEL UP');
            this.bannerBody.setText('Pick one of three upgrades in the sidebar (or keys 1/2/3).');
          } else if (this.mode === 'victory') {
            this.bannerTitle.setText('STAGE CLEARED');
            this.bannerBody.setText(`Final score ${Math.floor(this.score)} • Max combo x${this.maxCombo}\nRestart to push a higher clear.`);
          } else {
            this.bannerTitle.setText('CREW DOWN');
            this.bannerBody.setText(`Final score ${Math.floor(this.score)} • Max combo x${this.maxCombo}\nRestart and optimize your route.`);
          }
        }

        private renderHud(force = false) {
          const now = performance.now();
          if (!force && now - this.lastHudUpdate < HUD_UPDATE_INTERVAL_MS) return;
          this.lastHudUpdate = now;
          this.bridge.onHud({
            mode: this.mode,
            score: Math.floor(this.score),
            bestScore: bestScoreRef.current,
            scoreMultiplier: this.scoreMultiplier,
            combo: this.combo,
            maxCombo: this.maxCombo,
            level: this.level,
            xp: Math.floor(this.xp),
            xpNeed: this.xpNeed,
            health: Math.round(this.health),
            maxHealth: this.maxHealth,
            energy: Math.round(this.energy),
            wave: this.wave,
            enemies: this.enemies.length,
            timeRemaining: Number(this.timeRemaining.toFixed(1)),
            fireCooldown: Number(this.fireCooldown.toFixed(2)),
            dashCooldown: Number(this.dashCooldown.toFixed(2)),
            novaCooldown: Number(this.novaCooldown.toFixed(2)),
            shieldCooldown: Number(this.shieldCooldown.toFixed(2)),
            shieldActive: Number(this.shieldActive.toFixed(2)),
            mutatorLabel: this.runMutator.title,
            credits: metaRef.current.credits,
          });
        }

        private renderGameToText() {
          return JSON.stringify({
            coordinateSystem: 'Origin is top-left (0,0). +x goes right, +y goes down. Arena size 1240x720.',
            mode: this.mode,
            score: Math.floor(this.score),
            scoreMultiplier: this.scoreMultiplier,
            wave: this.wave,
            level: this.level,
            timeRemaining: Number(this.timeRemaining.toFixed(2)),
            combo: this.combo,
            maxCombo: this.maxCombo,
            mutator: {
              id: this.runMutator.id,
              title: this.runMutator.title,
            },
            meta: {
              credits: metaRef.current.credits,
              runs: metaRef.current.runs,
              highestWave: metaRef.current.highestWave,
              perks: metaRef.current.perks,
            },
            player: {
              x: Number(this.player.x.toFixed(1)),
              y: Number(this.player.y.toFixed(1)),
              r: 16,
              health: Number(this.health.toFixed(1)),
              maxHealth: this.maxHealth,
              energy: Number(this.energy.toFixed(1)),
              facing: {
                x: Number(this.facingX.toFixed(2)),
                y: Number(this.facingY.toFixed(2)),
              },
            },
            cooldowns: {
              fire: Number(this.fireCooldown.toFixed(2)),
              dash: Number(this.dashCooldown.toFixed(2)),
              nova: Number(this.novaCooldown.toFixed(2)),
              shield: Number(this.shieldCooldown.toFixed(2)),
              shieldActive: Number(this.shieldActive.toFixed(2)),
            },
            enemies: this.enemies.slice(0, 14).map((enemy) => ({
              id: enemy.id,
              kind: enemy.kind,
              x: Number(enemy.sprite.x.toFixed(1)),
              y: Number(enemy.sprite.y.toFixed(1)),
              hp: Number(enemy.hp.toFixed(1)),
              r: enemy.radius,
            })),
            playerShots: this.playerShots.slice(0, 16).map((shot) => ({
              id: shot.id,
              x: Number(shot.sprite.x.toFixed(1)),
              y: Number(shot.sprite.y.toFixed(1)),
              life: Number(shot.life.toFixed(2)),
            })),
            enemyShots: this.enemyShots.slice(0, 16).map((shot) => ({
              id: shot.id,
              x: Number(shot.sprite.x.toFixed(1)),
              y: Number(shot.sprite.y.toFixed(1)),
              kind: shot.kind,
              life: Number(shot.life.toFixed(2)),
            })),
            pickups: this.pickups.slice(0, 12).map((pickup) => ({
              id: pickup.id,
              kind: pickup.kind,
              x: Number(pickup.sprite.x.toFixed(1)),
              y: Number(pickup.sprite.y.toFixed(1)),
              value: pickup.value,
            })),
            floatTexts: this.floatTexts.slice(0, 10).map((text) => ({
              id: text.id,
              x: Number(text.sprite.x.toFixed(1)),
              y: Number(text.sprite.y.toFixed(1)),
              label: text.sprite.text,
              life: Number(text.life.toFixed(2)),
            })),
            upgradeChoices: this.activeChoices,
          });
        }

        private advanceTime(ms: number) {
          const duration = Number.isFinite(ms) ? Math.max(ms, 0) : 16.67;
          const steps = Math.max(1, Math.round(duration / (FIXED_FRAME * 1000)));
          const dt = duration / 1000 / steps;
          this.manualStepLockUntil = performance.now() + 120;
          for (let i = 0; i < steps; i += 1) {
            if (this.mode === 'playing') this.simulateStep(dt || FIXED_FRAME);
            else this.updateVisualLayers(dt || FIXED_FRAME);
          }
          this.renderHud(true);
        }
      }

      const bridge: UiBridge = {
        onHud: (next) => {
          if (!mountedRef.current) return;
          setHud((current) => ({ ...current, ...next }));
        },
        onUpgrades: (choices) => {
          if (!mountedRef.current) return;
          setUpgradeChoices(choices);
        },
        onLog: (message) => {
          if (!mountedRef.current) return;
          pushLog(message);
        },
        onBest: (score, combo) => {
          if (!mountedRef.current) return;
          const nextScore = Math.max(bestScoreRef.current, Math.floor(score));
          const nextCombo = Math.max(bestComboRef.current, Math.floor(combo));
          if (nextScore !== bestScoreRef.current) {
            bestScoreRef.current = nextScore;
            setBestScore(nextScore);
          }
          if (nextCombo !== bestComboRef.current) {
            bestComboRef.current = nextCombo;
            setBestCombo(nextCombo);
          }
        },
        onMeta: (nextMeta) => {
          if (!mountedRef.current) return;
          const normalized = sanitizeMetaProgress(nextMeta);
          metaRef.current = normalized;
          setMetaProgress(normalized);
          setHud((current) => ({ ...current, credits: normalized.credits }));
        },
        setApi: (api) => {
          sceneApiRef.current = api;
          if (api && queuedStartRef.current) {
            queuedStartRef.current = false;
            api.startRun();
          }
        },
      };

      const scene = new RiftPulseScene(bridge);

      const game = new Phaser.Game({
        type: Phaser.CANVAS,
        width: ARENA_WIDTH,
        height: ARENA_HEIGHT,
        parent: containerRef.current,
        backgroundColor: '#020617',
        scene,
        render: {
          antialias: true,
          roundPixels: false,
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: ARENA_WIDTH,
          height: ARENA_HEIGHT,
        },
      });

      gameRef.current = game;
    };

    void boot();

    return () => {
      cancelled = true;
      sceneApiRef.current = null;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [pushLog]);

  useEffect(() => {
    const gameWindow = window as GameWindow;
    gameWindow.render_game_to_text = () => sceneApiRef.current?.renderText() ?? JSON.stringify({ mode: 'booting' });
    gameWindow.advanceTime = (ms: number) => {
      sceneApiRef.current?.advanceTime(ms);
    };
    return () => {
      delete gameWindow.render_game_to_text;
      delete gameWindow.advanceTime;
    };
  }, []);

  const requestStart = useCallback(() => {
    if (sceneApiRef.current) {
      sceneApiRef.current.startRun();
      return;
    }
    queuedStartRef.current = true;
    pushLog('Arena booting... run will auto-start when Phaser is ready.');
  }, [pushLog]);

  const statusLine = useMemo(() => {
    if (hud.mode === 'menu') return 'Launch a run and build your loadout through mid-combat upgrades.';
    if (hud.mode === 'upgrade') return 'Run is frozen until you lock one upgrade choice.';
    if (hud.mode === 'paused') return 'Run paused. Resume when your next route is planned.';
    if (hud.mode === 'victory') return 'Timer cleared. Push for a higher score and cleaner combo path.';
    if (hud.mode === 'gameover') return 'Wiped by pressure. Rebuild with stronger defensive upgrades.';
    return `${hud.mutatorLabel} • Score x${hud.scoreMultiplier.toFixed(2)} • Fire ${hud.fireCooldown.toFixed(2)}s • Dash ${hud.dashCooldown.toFixed(2)}s`;
  }, [hud]);

  const perkCards = useMemo(
    () =>
      PERK_ORDER.map((id) => {
        const def = META_PERKS[id];
        const level = metaProgress.perks[id];
        const maxed = level >= def.maxLevel;
        const nextCost = maxed ? null : getMetaPerkCost(id, level);
        return {
          ...def,
          level,
          maxed,
          nextCost,
        };
      }),
    [metaProgress],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#020617_45%,_#030712_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/75">Phaser Combat Prototype</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-slate-50 md:text-5xl">Rift Pulse Ascendant</h1>
          <p className="mx-auto mt-3 max-w-4xl text-base text-slate-300 md:text-lg">
            A deeper online-ready combat loop: pressure waves, boss bursts, and level-up loadout decisions that actually change how the run plays.
          </p>
        </header>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-3xl border border-cyan-300/30 bg-slate-950/85 p-4 shadow-[0_40px_140px_rgba(6,182,212,0.16)]">
            <div ref={containerRef} className="mx-auto aspect-[1240/720] w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950" />
          </div>

          <aside className="rounded-3xl border border-slate-700/80 bg-slate-900/95 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.6)]">
            <div className="rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Status</p>
              <p className="mt-1 text-xl font-semibold text-white">{MODE_LABEL[hud.mode]}</p>
              <p className="mt-2 text-sm text-slate-300">{statusLine}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Score</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">{hud.score.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Best</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">{Math.max(bestScore, hud.bestScore).toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Credits</div>
                <div className="mt-1 text-xl font-semibold text-amber-300">{hud.credits.toLocaleString()}</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Score Mult</div>
                <div className="mt-1 text-xl font-semibold text-cyan-200">x{hud.scoreMultiplier.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Wave</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">{hud.wave}</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Time</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">{hud.timeRemaining.toFixed(1)}s</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Health</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">
                  {hud.health} / {hud.maxHealth}
                </div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Energy</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">{hud.energy}</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Level</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">{hud.level}</div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Combo</div>
                <div className="mt-1 text-xl font-semibold text-slate-50">
                  x{hud.combo} <span className="text-sm text-slate-400">(max x{Math.max(hud.maxCombo, bestCombo)})</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                id="start-btn"
                type="button"
                onClick={requestStart}
                className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-105"
              >
                Start Run
              </button>
              <button
                id="pause-btn"
                type="button"
                onClick={() => sceneApiRef.current?.togglePause()}
                className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                {hud.mode === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button
                id="restart-btn"
                type="button"
                onClick={() => sceneApiRef.current?.restartRun()}
                className="w-full rounded-xl border border-slate-500 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-200 hover:text-cyan-100"
              >
                Restart
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                id="dash-btn"
                type="button"
                onClick={() => sceneApiRef.current?.triggerDash()}
                className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100 transition hover:border-cyan-300 hover:text-cyan-100"
              >
                Dash
              </button>
              <button
                id="nova-btn"
                type="button"
                onClick={() => sceneApiRef.current?.triggerNova()}
                className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100 transition hover:border-cyan-300 hover:text-cyan-100"
              >
                Nova
              </button>
              <button
                id="shield-btn"
                type="button"
                onClick={() => sceneApiRef.current?.triggerShield()}
                className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100 transition hover:border-cyan-300 hover:text-cyan-100"
              >
                Shield
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-100/90">Ops Hangar Perks</p>
              <p className="mt-1 text-xs text-slate-300">
                Credits: <span className="font-semibold text-amber-200">{metaProgress.credits.toLocaleString()}</span> • Runs:{' '}
                {metaProgress.runs.toLocaleString()} • Best Wave: {metaProgress.highestWave}
              </p>
              <div className="mt-3 space-y-2">
                {perkCards.map((perk) => (
                  <div key={perk.id} className="rounded-xl border border-amber-100/20 bg-slate-900/70 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">
                          {perk.title} <span className="text-xs text-slate-400">Lv.{perk.level}/{perk.maxLevel}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-300">{perk.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => sceneApiRef.current?.buyMetaPerk(perk.id)}
                        disabled={perk.maxed || hud.mode === 'playing' || hud.mode === 'upgrade'}
                        className="shrink-0 rounded-lg border border-amber-200/35 bg-amber-300/10 px-2 py-1 text-xs font-semibold text-amber-100 transition enabled:hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {perk.maxed ? 'MAX' : `Buy ${perk.nextCost?.toLocaleString()}`}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {upgradeChoices.length > 0 && (
              <div className="mt-4 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-3">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">Choose Upgrade</p>
                <div className="mt-2 space-y-2">
                  {upgradeChoices.map((option, index) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => sceneApiRef.current?.chooseUpgrade(option.id)}
                      className="w-full rounded-xl border border-cyan-200/30 bg-slate-900/70 px-3 py-2 text-left transition hover:border-cyan-200/70 hover:bg-slate-800/80"
                    >
                      <div className="text-sm font-semibold text-slate-100">
                        {index + 1}. {option.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-300">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Controls</p>
              <ul className="mt-2 space-y-1">
                <li>Move: `WASD` or arrows</li>
                <li>Fire: Hold click or `Space`</li>
                <li>Dash: `E`</li>
                <li>Nova: `Q`</li>
                <li>Shield: `R`</li>
                <li>Pause: `P`</li>
                <li>Fullscreen: `F` (Esc to exit)</li>
                <li>Upgrade choices: `1`, `2`, `3`</li>
                <li>Spend credits on perks between runs.</li>
              </ul>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Battle Feed</p>
              {logs.length === 0 ? (
                <p className="mt-2 text-slate-400">Events will stream here once the run starts.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {logs.map((entry, index) => (
                    <li key={`${entry}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1">
                      {entry}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => sceneApiRef.current?.toggleFullscreen()}
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Toggle Fullscreen
              </button>
              <Link
                href="/play"
                prefetch={false}
                className="inline-flex items-center justify-center rounded-xl border border-slate-500 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-300 hover:text-white"
              >
                Game Hub
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
