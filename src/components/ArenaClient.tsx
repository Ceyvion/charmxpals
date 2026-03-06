"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';

import type { ArenaMapId, ArenaPickup, ArenaRotation, PlayerState, S2C } from '@/lib/mmo/messages';
import type { MmoSessionClaims } from '@/lib/mmo/token';
import { resolveClientWsBase } from '@/lib/mmo/wsUrl';
import { MAP_DATA, clampToWalkable, isInSpeedZone, isInPowerZone } from '@/lib/mmo/mapData';
import type { MapCollisionData } from '@/lib/mmo/mapData';
import {
  createFxState,
  updateFx,
  spawnPulseEffect,
  spawnHitEffect,
  spawnHitFlash,
  spawnDeathEffect,
  spawnRespawnEffect,
  spawnPickupEffect,
  addTrailParticle,
  addAnnouncement,
  ensureAmbient,
  drawAmbientParticles,
  drawTrailParticles,
  drawShockwaves,
  drawBurstParticles,
  drawDamageNumbers,
  drawAnnouncements,
  getHitFlashAlpha,
  getShakeOffset,
} from '@/lib/mmo/arenaFx';
import type { ArenaFxState } from '@/lib/mmo/arenaFx';
import {
  emptyArenaDailyProgress,
  incrementArenaDailyProgress,
  toArenaProgressDateKey,
  type ArenaDailyProgress,
} from '@/lib/arenaProgress';

type ArenaClientProps = { height?: number };

type Vec2 = { x: number; y: number };

type PlayerView = PlayerState & {
  renderPos: Vec2;
  targetPos: Vec2;
  lastUpdate: number;
  prevPos?: Vec2;
};

type FeedEntry = {
  id: string;
  text: string;
  ts: number;
};

type ArenaEventData = {
  player?: PlayerState;
  id?: string;
  actor?: string;
  actorId?: string;
  victims?: Array<{ id?: string; displayName?: string; hp?: number; pos?: Vec2 }>;
  killer?: string;
  killerId?: string;
  victim?: string;
  victimId?: string;
  victimPos?: Vec2;
  respawnPos?: Vec2;
  message?: string;
  targetKills?: number;
  winner?: string;
  pos?: Vec2;
  range?: number;
  playerId?: string;
  arena?: ArenaRotation;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const asArenaEventData = (value: unknown): ArenaEventData =>
  typeof value === 'object' && value !== null ? (value as ArenaEventData) : {};
const ARENA_MAPS: Array<{ id: ArenaMapId; label: string; src: string; summary: string }> = [
  { id: 'neon-grid', label: 'Neon Grid', src: '/assets/arena/maps/neon-grid.webp', summary: 'Wide lanes and long chases.' },
  { id: 'crystal-rift', label: 'Crystal Rift', src: '/assets/arena/maps/crystal-rift.webp', summary: 'Mid-lane ambushes and tight pivots.' },
  { id: 'voltage-foundry', label: 'Voltage Foundry', src: '/assets/arena/maps/voltage-foundry.webp', summary: 'Fast rotations around pressure zones.' },
];

const STREAK_LABELS: Record<number, string> = {
  3: 'Triple Kill!',
  5: 'Rampage!',
  7: 'Unstoppable!',
};

export default function ArenaClient({ height = 500 }: ArenaClientProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'authenticating' | 'ready' | 'error'>('idle');
  const [info, setInfo] = useState('');
  const [players, setPlayers] = useState<Map<string, PlayerView>>(new Map());
  const playersRef = useRef<Map<string, PlayerView>>(new Map());
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [latency, setLatency] = useState<number | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const youIdRef = useRef<string | null>(null);
  const [ownedChars, setOwnedChars] = useState<string[]>([]);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const selectedCharRef = useRef<string | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [cooldownMs, setCooldownMs] = useState(0);
  const cooldownRef = useRef(0);
  const [arenaConfig, setArenaConfig] = useState<ArenaRotation | null>(null);
  const [selectedMap, setSelectedMap] = useState<ArenaMapId>('neon-grid');
  const selectedMapRef = useRef<ArenaMapId>('neon-grid');
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [dailyProgress, setDailyProgress] = useState<ArenaDailyProgress>(() => emptyArenaDailyProgress());

  const readyRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const axesRef = useRef({ x: 0, y: 0 });
  const seqRef = useRef(1);
  const wsRef = useRef<WebSocket | null>(null);
  const pingSentAt = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const abilityTimerRef = useRef<number | null>(null);
  const spriteCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const fxRef = useRef<ArenaFxState>(createFxState());
  const pickupsRef = useRef<Map<string, ArenaPickup & { fadeIn?: number }>>(new Map());
  const killStreakRef = useRef(0);
  const trailTimerRef = useRef(0);

  const appendFeed = useCallback((entry: FeedEntry) => {
    setFeed((prev) => [...prev.slice(-19), entry]);
  }, []);

  const applyDailyProgress = useCallback((record: ArenaDailyProgress) => {
    setDailyProgress((prev) => {
      if (prev.dateKey !== record.dateKey) return record;
      return {
        ...record,
        pulses: Math.max(prev.pulses, record.pulses),
        eliminations: Math.max(prev.eliminations, record.eliminations),
        matches: Math.max(prev.matches, record.matches),
      };
    });
  }, []);

  const loadDailyProgress = useCallback(async () => {
    try {
      const response = await fetch('/api/arena/daily-progress', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as { success?: boolean; record?: ArenaDailyProgress };
      if (payload.success && payload.record) {
        applyDailyProgress(payload.record);
      }
    } catch {
      // no-op
    }
  }, [applyDailyProgress]);

  const applyDerivedDailyProgress = useCallback((event: 'pulse' | 'elimination') => {
    setDailyProgress((prev) => incrementArenaDailyProgress(prev, event, Date.now()));
  }, []);

  const getSprite = useCallback((characterId: string) => {
    const cached = spriteCacheRef.current.get(characterId);
    if (cached) return cached;
    const image = new Image();
    image.src = `/assets/characters/${characterId}/sprite.webp`;
    image.onerror = () => {
      if (image.src.includes('/sprite.webp')) {
        image.src = `/assets/characters/${characterId}/sprite.png`;
      }
    };
    spriteCacheRef.current.set(characterId, image);
    return image;
  }, []);

  const hydratePlayer = useCallback((state: PlayerState): PlayerView => {
    return {
      ...state,
      hp: typeof state.hp === 'number' ? state.hp : 100,
      kills: typeof state.kills === 'number' ? state.kills : 0,
      deaths: typeof state.deaths === 'number' ? state.deaths : 0,
      renderPos: { ...state.pos },
      targetPos: { ...state.pos },
      lastUpdate: performance.now(),
    };
  }, []);

  const replacePlayers = useCallback((next: Map<string, PlayerView>) => {
    playersRef.current = next;
    setPlayers(next);
    setPlayerCount(next.size);
  }, []);

  const updatePlayers = useCallback((mutator: (prev: Map<string, PlayerView>) => Map<string, PlayerView>) => {
    setPlayers((prev) => {
      const next = mutator(new Map(prev));
      playersRef.current = next;
      setPlayerCount(next.size);
      return next;
    });
  }, []);

  const sendInput = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return;
    const seq = seqRef.current++;
    ws.send(
      JSON.stringify({
        type: 'input',
        seq,
        ts: Date.now(),
        axes: axesRef.current,
      }),
    );
  }, []);

  const castPulse = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return;
    if (cooldownRef.current > 0) return;
    ws.send(JSON.stringify({ type: 'ability_cast', ability: 'pulse' }));
    cooldownRef.current = 850;
    setCooldownMs(850);
    if (abilityTimerRef.current) {
      clearInterval(abilityTimerRef.current);
    }
    abilityTimerRef.current = window.setInterval(() => {
      cooldownRef.current = Math.max(0, cooldownRef.current - 50);
      setCooldownMs(cooldownRef.current);
      if (cooldownRef.current === 0 && abilityTimerRef.current) {
        clearInterval(abilityTimerRef.current);
        abilityTimerRef.current = null;
      }
    }, 50);
  }, []);

  const handleSelectAvatar = useCallback((value: string) => {
    setSelectedChar(value);
    selectedCharRef.current = value;
    updatePlayers((prev) => {
      const next = new Map(prev);
      const you = youIdRef.current ? next.get(youIdRef.current) : null;
      if (you) {
        you.characterId = value;
        next.set(you.id, you);
      }
      return next;
    });
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'select_avatar', characterId: value }));
  }, [updatePlayers]);

  useEffect(() => {
    selectedCharRef.current = selectedChar;
  }, [selectedChar]);

  useEffect(() => {
    selectedMapRef.current = selectedMap;
  }, [selectedMap]);

  useEffect(() => {
    void loadDailyProgress();
  }, [loadDailyProgress]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const dateKey = toArenaProgressDateKey(clockMs);
    setDailyProgress((prev) => (
      prev.dateKey === dateKey ? prev : emptyArenaDailyProgress(dateKey, new Date(clockMs).toISOString())
    ));
  }, [clockMs]);

  useEffect(() => {
    const map = ARENA_MAPS.find((entry) => entry.id === selectedMap);
    const image = new Image();
    image.src = map?.src || '/assets/arena/maps/neon-grid.webp';
    image.onerror = () => {
      if (image.src.includes('.webp')) {
        const fallback = (map?.src || '/assets/arena/maps/neon-grid.webp').replace('.webp', '.png');
        image.src = fallback;
      }
    };
    image.onload = () => {
      mapImageRef.current = image;
    };
  }, [selectedMap]);

  // --- Token + WS URL ---
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setStatus('connecting');
        const res = await fetch('/api/mmo/token?mode=arena', { cache: 'no-store' });
        if (res.status === 401) {
          if (!stop) {
            setStatus('error');
            setInfo('Sign in to enter the arena.');
            signIn(undefined, { callbackUrl: '/arena' }).catch(() => {});
          }
          return;
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(typeof payload?.error === 'string' ? payload.error : 'Failed to mint arena session.');
        }
        const body = await res.json() as {
          token: string;
          claims?: Partial<MmoSessionClaims>;
          wsBase?: string;
        };
        const token = body.token;
        tokenRef.current = token;
        const claims = body.claims;
        const owned = Array.isArray(claims?.owned)
          ? (claims?.owned || []).filter((item): item is string => typeof item === 'string')
          : [];
        setOwnedChars(owned);
        const initialChar = owned[0] || 'neon-city';
        selectedCharRef.current = initialChar;
        setSelectedChar(initialChar);

        const host = typeof window !== 'undefined' ? window.location.hostname : null;
        const base = resolveClientWsBase({ serverBase: body.wsBase, locationHostname: host });
        if (!base) throw new Error('No arena server configured. Set MMO_WS_URL or NEXT_PUBLIC_MMO_WS_URL.');
        const url = `${base}?token=${encodeURIComponent(token)}`;
        if (!stop) setWsUrl(url);
      } catch (err: unknown) {
        if (stop) return;
        const message = err instanceof Error ? err.message : 'Failed to connect';
        setStatus('error');
        setInfo(message);
      }
    })();
    return () => {
      stop = true;
    };
  }, []);

  // --- WebSocket connection ---
  useEffect(() => {
    if (!wsUrl) return;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    readyRef.current = false;
    setStatus('authenticating');
    setInfo('Handshaking…');

    ws.onopen = () => {
      const hello = { type: 'hello', build: 'dev', locale: typeof navigator !== 'undefined' ? navigator.language : 'en' };
      ws.send(JSON.stringify(hello));
      if (tokenRef.current) {
        ws.send(JSON.stringify({ type: 'auth', token: tokenRef.current }));
      }
      const avatar = selectedCharRef.current || 'neon-city';
      ws.send(JSON.stringify({ type: 'select_avatar', characterId: avatar }));
      ws.send(JSON.stringify({ type: 'arena_ready' }));
    };

    ws.onmessage = (event) => {
      let message: S2C | null = null;
      try {
        message = JSON.parse(String(event.data)) as S2C;
      } catch {
        return;
      }
      if (!message) return;

      switch (message.type) {
        case 'welcome':
          setInfo(message.motd ? message.motd : `Instance ${message.instanceId}`);
          if (message.arena) {
            setArenaConfig(message.arena);
            setSelectedMap(message.arena.mapId);
            selectedMapRef.current = message.arena.mapId;
          }
          break;
        case 'auth_ok':
          setStatus('ready');
          setInfo('Connected to Rift Arena');
          readyRef.current = true;
          setYouId(message.sessionId);
          youIdRef.current = message.sessionId;
          killStreakRef.current = 0;
          void loadDailyProgress();
          if (pingTimerRef.current) clearInterval(pingTimerRef.current);
          pingTimerRef.current = window.setInterval(() => {
            const current = wsRef.current;
            if (!current || current.readyState !== WebSocket.OPEN) return;
            const ts = Date.now();
            pingSentAt.current = ts;
            current.send(JSON.stringify({ type: 'ping', ts }));
          }, 5000);
          break;
        case 'auth_error':
          setStatus('error');
          setInfo(message.reason || 'Authentication failed');
          readyRef.current = false;
          replacePlayers(new Map());
          break;
        case 'joined': {
          const map = new Map<string, PlayerView>();
          const you = hydratePlayer(message.you);
          map.set(message.you.id, you);
          for (const other of message.others) {
            map.set(other.id, hydratePlayer(other));
          }
          replacePlayers(map);
          void loadDailyProgress();
          appendFeed({ id: `joined-${Date.now()}`, text: 'Entered Rift Arena.', ts: Date.now() });
          break;
        }
        case 'state': {
          // Pickup state sync
          if (message.pickups) {
            for (const p of message.pickups) {
              pickupsRef.current.set(p.id, { ...p });
            }
          }

          updatePlayers((prev) => {
            const next = new Map(prev);
            const now = performance.now();
            for (const partial of message.players) {
              const id = partial.id;
              const target = next.get(id);
              if (!target) continue;
              // Track previous position for respawn detection
              target.prevPos = { ...target.pos };
              if (partial.pos) {
                const pos = partial.pos as Vec2;
                target.pos = { ...pos };
                target.targetPos = { ...pos };
                if (id === youIdRef.current) {
                  target.renderPos = { ...pos };
                }
              }
              if (typeof partial.characterId === 'string' && partial.characterId) target.characterId = partial.characterId;
              if (typeof partial.rot === 'number') target.rot = partial.rot;
              if (typeof partial.hp === 'number') target.hp = Number(partial.hp);
              if (typeof partial.kills === 'number') target.kills = Number(partial.kills);
              if (typeof partial.deaths === 'number') target.deaths = Number(partial.deaths);
              if (typeof partial.inPowerZone === 'boolean') target.inPowerZone = partial.inPowerZone;
              target.lastUpdate = now;
              next.set(id, target);
            }
            return next;
          });
          break;
        }
        case 'event': {
          const data = asArenaEventData(message.data);
          if (message.event === 'join') {
            const player = data.player;
            if (!player) break;
            updatePlayers((prev) => {
              const next = new Map(prev);
              if (!next.has(player.id)) next.set(player.id, hydratePlayer(player));
              return next;
            });
            appendFeed({ id: `join-${Date.now()}`, text: `${player.displayName || 'New player'} joined.`, ts: Date.now() });
          } else if (message.event === 'leave') {
            const leavingId = String(data.id || '');
            if (!leavingId) break;
            let leavingName = '';
            updatePlayers((prev) => {
              const next = new Map(prev);
              const leaving = next.get(leavingId);
              leavingName = leaving?.displayName || 'A player';
              next.delete(leavingId);
              return next;
            });
            appendFeed({ id: `leave-${Date.now()}`, text: `${leavingName} left.`, ts: Date.now() });
          } else if (message.event === 'combat') {
            const actor = typeof data.actor === 'string' ? data.actor : 'Someone';
            const victims = Array.isArray(data.victims) ? data.victims : [];
            const hitCount = victims.length;
            const isLocalActor = data.actorId === youIdRef.current;
            appendFeed({
              id: `combat-${Date.now()}`,
              text: hitCount > 0 ? `${actor} cast pulse and hit ${hitCount} target${hitCount > 1 ? 's' : ''}.` : `${actor} cast pulse.`,
              ts: Date.now(),
            });
            if (isLocalActor) {
              applyDerivedDailyProgress('pulse');
            }

            // --- VFX: pulse shockwave + hit effects ---
            const fx = fxRef.current;
            const mapId = selectedMapRef.current;
            const theme = MAP_DATA[mapId]?.theme;
            if (data.pos && theme) {
              const isLocal = data.actorId === youIdRef.current;
              const range = typeof data.range === 'number' ? data.range : 2.2;
              spawnPulseEffect(fx, data.pos.x, data.pos.y, theme.pulse, range, isLocal);
            }
            for (const v of victims) {
              if (v.pos && theme) {
                spawnHitEffect(fx, v.pos.x, v.pos.y, 35, theme.secondary);
              }
              if (v.id) {
                spawnHitFlash(fx, v.id);
              }
            }
          } else if (message.event === 'score') {
            const killer = typeof data.killer === 'string' ? data.killer : 'Unknown';
            const victim = typeof data.victim === 'string' ? data.victim : 'Unknown';
            const isLocalKill = typeof data.killerId === 'string' && data.killerId === youIdRef.current;
            const isLocalDeath = typeof data.victimId === 'string' && data.victimId === youIdRef.current;

            if (isLocalKill) {
              applyDerivedDailyProgress('elimination');
              killStreakRef.current += 1;
              const streakLabel = STREAK_LABELS[killStreakRef.current];
              if (streakLabel) {
                const theme = MAP_DATA[selectedMapRef.current]?.theme;
                addAnnouncement(fxRef.current, streakLabel, theme?.primary || '#ff79b1');
              }
            }
            if (isLocalDeath) {
              killStreakRef.current = 0;
            }

            // Death VFX
            const fx = fxRef.current;
            const theme = MAP_DATA[selectedMapRef.current]?.theme;
            if (data.victimPos && theme) {
              spawnDeathEffect(fx, data.victimPos.x, data.victimPos.y, theme.secondary);
            }
            if (data.respawnPos && theme) {
              spawnRespawnEffect(fx, data.respawnPos.x, data.respawnPos.y, theme.primary);
            }

            appendFeed({ id: `score-${Date.now()}`, text: `${killer} eliminated ${victim}.`, ts: Date.now() });
          } else if (message.event === 'arena_rotation') {
            if (data.arena?.mapId) {
              setArenaConfig(data.arena);
              setSelectedMap(data.arena.mapId);
              selectedMapRef.current = data.arena.mapId;
            }
            const msg = typeof data.message === 'string' ? data.message : 'Arena map rotated.';
            appendFeed({ id: `rotation-${Date.now()}`, text: msg, ts: Date.now() });
          } else if (message.event === 'match_end') {
            killStreakRef.current = 0;
            void loadDailyProgress();
            appendFeed({ id: `end-${Date.now()}`, text: typeof data.message === 'string' ? data.message : 'Match finished.', ts: Date.now() });
          } else if (message.event === 'system') {
            const msg = typeof data.message === 'string' ? data.message : 'System message';
            appendFeed({ id: `system-${Date.now()}`, text: msg, ts: Date.now() });
          } else if (message.event === 'pickup_consumed') {
            const pickupId = typeof data.id === 'string' ? data.id : '';
            const pickup = pickupsRef.current.get(pickupId);
            if (pickup) {
              pickup.active = false;
              spawnPickupEffect(fxRef.current, pickup.pos.x, pickup.pos.y);
            }
          } else if (message.event === 'pickup_respawn') {
            const pickupId = typeof data.id === 'string' ? data.id : '';
            const pickup = pickupsRef.current.get(pickupId);
            if (pickup) {
              pickup.active = true;
              pickup.fadeIn = 1;
            }
          }
          break;
        }
        case 'pong':
          if (typeof message.ts === 'number' && pingSentAt.current !== null) {
            setLatency(Date.now() - message.ts);
            pingSentAt.current = null;
          }
          break;
        case 'kick':
          setStatus('error');
          setInfo(message.reason || 'Disconnected');
          readyRef.current = false;
          break;
      }
    };

    ws.onclose = () => {
      readyRef.current = false;
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      replacePlayers(new Map());
      setStatus((prev) => (prev === 'error' ? prev : 'error'));
      setInfo((prev) => (prev ? prev : 'Connection closed.'));
    };

    ws.onerror = () => {
      setStatus('error');
      setInfo('WebSocket error.');
    };

    return () => {
      readyRef.current = false;
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      ws.close();
      wsRef.current = null;
    };
  }, [appendFeed, applyDerivedDailyProgress, hydratePlayer, loadDailyProgress, replacePlayers, updatePlayers, wsUrl]);

  // --- Input ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const a = axesRef.current;
      if (key === 'w' || key === 'ArrowUp') a.y = -1;
      if (key === 's' || key === 'ArrowDown') a.y = 1;
      if (key === 'a' || key === 'ArrowLeft') a.x = -1;
      if (key === 'd' || key === 'ArrowRight') a.x = 1;
      if (key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        castPulse();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      const a = axesRef.current;
      if ((key === 'w' || key === 'ArrowUp') && a.y === -1) a.y = 0;
      if ((key === 's' || key === 'ArrowDown') && a.y === 1) a.y = 0;
      if ((key === 'a' || key === 'ArrowLeft') && a.x === -1) a.x = 0;
      if ((key === 'd' || key === 'ArrowRight') && a.x === 1) a.x = 0;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const interval = window.setInterval(() => {
      sendInput();
    }, 50);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.clearInterval(interval);
    };
  }, [castPulse, sendInput]);

  // --- Init pickups from map data when map changes ---
  useEffect(() => {
    const mapDef = MAP_DATA[selectedMap];
    if (!mapDef) return;
    const pickups = new Map<string, ArenaPickup & { fadeIn?: number }>();
    for (const hp of mapDef.healthPickups) {
      pickups.set(hp.id, { id: hp.id, type: 'health', pos: hp.pos, active: true, respawnAt: 0 });
    }
    pickupsRef.current = pickups;
  }, [selectedMap]);

  // =========================================================================
  // Canvas draw loop
  // =========================================================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (timestamp: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const last = lastFrameRef.current ?? timestamp;
      const dt = Math.min(0.12, (timestamp - last) / 1000);
      lastFrameRef.current = timestamp;

      const mapId = selectedMapRef.current;
      const mapDef: MapCollisionData | undefined = MAP_DATA[mapId];
      const theme = mapDef?.theme;
      const fx = fxRef.current;
      const scale = 26;
      const ox = w / 2;
      const oy = h / 2;

      // Get local player for parallax + reactive grid
      const localPlayer = youIdRef.current ? playersRef.current.get(youIdRef.current) : null;
      const lpx = localPlayer?.renderPos?.x ?? 0;
      const lpy = localPlayer?.renderPos?.y ?? 0;

      // 1. Background
      ctx.fillStyle = '#0a0f20';
      ctx.fillRect(0, 0, w, h);

      // 2. Map image with parallax
      const mapImage = mapImageRef.current;
      if (mapImage) {
        ctx.globalAlpha = 0.42;
        const parallaxX = -(lpx / 14) * 15;
        const parallaxY = -(lpy / 8) * 10;
        ctx.drawImage(mapImage, parallaxX - 15, parallaxY - 10, w + 30, h + 20);
        ctx.globalAlpha = 1;
      }

      // 3. Reactive grid — glows near local player
      const gridR = theme?.gridTint ?? [122, 212, 255];
      const playerScreenX = ox + lpx * scale;
      const playerScreenY = oy + lpy * scale;
      const glowRadius = 5 * scale;
      for (let gx = 0; gx < w; gx += 28) {
        const dist = Math.abs(gx - playerScreenX);
        const glow = Math.max(0, 1 - dist / glowRadius);
        const alpha = 0.06 + glow * 0.28;
        ctx.strokeStyle = `rgba(${gridR[0]}, ${gridR[1]}, ${gridR[2]}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 28) {
        const dist = Math.abs(gy - playerScreenY);
        const glow = Math.max(0, 1 - dist / glowRadius);
        const alpha = 0.06 + glow * 0.28;
        ctx.strokeStyle = `rgba(${gridR[0]}, ${gridR[1]}, ${gridR[2]}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      // 4. Screen shake offset
      const shake = getShakeOffset(fx);
      ctx.translate(shake.x, shake.y);

      // 5. Speed zone overlays
      if (mapDef && theme) {
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = theme.primary;
        for (const zone of mapDef.speedZones) {
          const sx = ox + zone.x1 * scale;
          const sy = oy + zone.y1 * scale;
          const sw = (zone.x2 - zone.x1) * scale;
          const sh = (zone.y2 - zone.y1) * scale;
          ctx.fillRect(sx, sy, sw, sh);
          // Animated diagonal stripes
          ctx.save();
          ctx.globalAlpha = 0.12;
          ctx.strokeStyle = theme.primary;
          ctx.lineWidth = 1;
          const offset = (timestamp * 0.03) % 20;
          ctx.beginPath();
          for (let d = -sh; d < sw + sh; d += 20) {
            ctx.moveTo(sx + d + offset, sy);
            ctx.lineTo(sx + d + offset - sh, sy + sh);
          }
          ctx.stroke();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // 6. Health pickup nodes
      pickupsRef.current.forEach((pickup) => {
        const px = ox + pickup.pos.x * scale;
        const correctedPy = oy + pickup.pos.y * scale;
        const fadeInMultiplier = pickup.fadeIn ? Math.max(0, 1 - pickup.fadeIn) : 1;
        if (pickup.fadeIn) {
          pickup.fadeIn = Math.max(0, pickup.fadeIn - dt * 2.5);
          if (pickup.fadeIn === 0) delete pickup.fadeIn;
        }
        if (pickup.active) {
          const pulse = 0.7 + Math.sin(timestamp * 0.004) * 0.3;
          ctx.globalAlpha = 0.7 * pulse * fadeInMultiplier;
          ctx.fillStyle = '#49f3a7';
          ctx.beginPath();
          ctx.arc(px, correctedPy, 6 + pulse * 3, 0, Math.PI * 2);
          ctx.fill();
          // Glow
          ctx.globalAlpha = 0.15 * pulse * fadeInMultiplier;
          ctx.beginPath();
          ctx.arc(px, correctedPy, 14 + pulse * 4, 0, Math.PI * 2);
          ctx.fill();
          // Cross icon
          ctx.globalAlpha = 0.9 * fadeInMultiplier;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px - 3, correctedPy);
          ctx.lineTo(px + 3, correctedPy);
          ctx.moveTo(px, correctedPy - 3);
          ctx.lineTo(px, correctedPy + 3);
          ctx.stroke();
        } else {
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = '#49f3a7';
          ctx.beginPath();
          ctx.arc(px, correctedPy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
      });

      // 7. Power zone
      if (mapDef && theme) {
        const pz = mapDef.powerZone;
        const pzx = ox + pz.cx * scale;
        const pzy = oy + pz.cy * scale;
        const pzr = pz.r * scale;
        const pulse = 0.4 + Math.sin(timestamp * 0.002) * 0.2;
        // Outer ring
        ctx.globalAlpha = 0.12 * pulse;
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pzx, pzy, pzr, 0, Math.PI * 2);
        ctx.stroke();
        // Inner pulsing ring
        ctx.globalAlpha = 0.08 * pulse;
        ctx.beginPath();
        ctx.arc(pzx, pzy, pzr * 0.6 + Math.sin(timestamp * 0.003) * pzr * 0.1, 0, Math.PI * 2);
        ctx.stroke();
        // Fill
        const grad = ctx.createRadialGradient(pzx, pzy, 0, pzx, pzy, pzr);
        grad.addColorStop(0, `rgba(255, 200, 50, ${(0.06 * pulse).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(pzx - pzr, pzy - pzr, pzr * 2, pzr * 2);
        ctx.lineWidth = 1;
      }

      // 8. Ambient particles
      if (theme) {
        ensureAmbient(fx, theme);
      }
      drawAmbientParticles(fx, ctx, ox, oy, scale);

      // 9. Trail particles
      drawTrailParticles(fx, ctx, ox, oy, scale);

      // --- Update FX ---
      if (theme) {
        updateFx(fx, dt, theme);
      }

      // --- Player movement + rendering ---
      trailTimerRef.current += dt;
      const emitTrail = trailTimerRef.current > 0.06;
      if (emitTrail) trailTimerRef.current = 0;

      playersRef.current.forEach((player, id) => {
        if (!player.renderPos) player.renderPos = { ...player.pos };
        if (!player.targetPos) player.targetPos = { ...player.pos };

        const prevRx = player.renderPos.x;
        const prevRy = player.renderPos.y;

        if (id === youIdRef.current) {
          const speed = 2.8;
          // Client-side collision prediction
          const rawX = clamp(player.renderPos.x + axesRef.current.x * speed * dt, -14, 14);
          const rawY = clamp(player.renderPos.y + axesRef.current.y * speed * dt, -8, 8);
          if (mapDef) {
            // Speed zone on client for responsive feel
            const inSpeed = isInSpeedZone(mapDef, player.renderPos.x, player.renderPos.y);
            const effSpeed = inSpeed ? speed * 1.6 : speed;
            const rawXS = clamp(player.renderPos.x + axesRef.current.x * effSpeed * dt, -14, 14);
            const rawYS = clamp(player.renderPos.y + axesRef.current.y * effSpeed * dt, -8, 8);
            const resolved = clampToWalkable(mapDef, player.renderPos.x, player.renderPos.y, rawXS, rawYS);
            player.renderPos.x = resolved.x;
            player.renderPos.y = resolved.y;
          } else {
            player.renderPos.x = rawX;
            player.renderPos.y = rawY;
          }
          player.renderPos.x = lerp(player.renderPos.x, player.pos.x, dt * 7);
          player.renderPos.y = lerp(player.renderPos.y, player.pos.y, dt * 7);
          if (mapDef) {
            player.inPowerZone = isInPowerZone(mapDef, player.renderPos.x, player.renderPos.y);
          }
        } else {
          player.renderPos.x = lerp(player.renderPos.x, player.targetPos.x, dt * 9);
          player.renderPos.y = lerp(player.renderPos.y, player.targetPos.y, dt * 9);
        }

        const px = ox + player.renderPos.x * scale;
        const py = oy + player.renderPos.y * scale;

        // Trail particles for moving players
        const movedDist = Math.abs(player.renderPos.x - prevRx) + Math.abs(player.renderPos.y - prevRy);
        if (emitTrail && movedDist > 0.01 && theme) {
          addTrailParticle(fx, player.renderPos.x, player.renderPos.y, id === youIdRef.current ? theme.primary : theme.ambient);
        }

        // Power zone aura
        if (player.inPowerZone && theme) {
          const auraR = 18 + Math.sin(timestamp * 0.005) * 3;
          const auraGrad = ctx.createRadialGradient(px, py, 0, px, py, auraR);
          auraGrad.addColorStop(0, `rgba(255, 200, 50, 0.2)`);
          auraGrad.addColorStop(1, 'rgba(255, 200, 50, 0)');
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(px, py, auraR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Hit flash
        const flashAlpha = getHitFlashAlpha(fx, id);

        // Sprite
        const sprite = getSprite(player.characterId);
        if (sprite.complete && sprite.naturalWidth > 0) {
          ctx.drawImage(sprite, px - 15, py - 17, 30, 30);
          // Hit flash overlay
          if (flashAlpha > 0) {
            ctx.globalAlpha = flashAlpha * 0.6;
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(sprite, px - 15, py - 17, 30, 30);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.fillStyle = id === youIdRef.current ? '#ff79b1' : '#6fe5ff';
          if (flashAlpha > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.5 + flashAlpha * 0.5;
          }
          ctx.beginPath();
          ctx.arc(px, py, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Direction indicator
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(player.rot) * 13, py + Math.sin(player.rot) * 13);
        ctx.stroke();

        // Health bar
        const hp = clamp(Number(player.hp ?? 100), 0, 100);
        const barW = 30;
        const barH = 4;
        ctx.fillStyle = 'rgba(14, 18, 34, 0.75)';
        ctx.fillRect(px - barW / 2, py - 19, barW, barH);
        ctx.fillStyle = hp > 60 ? '#49f3a7' : hp > 30 ? '#ffd36a' : '#ff7575';
        ctx.fillRect(px - barW / 2, py - 19, (barW * hp) / 100, barH);

        // Name
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(player.displayName || id.slice(0, 4), px, py - 24);

        // 11. Cooldown radial arc around local player
        if (id === youIdRef.current && cooldownRef.current > 0) {
          const progress = cooldownRef.current / 850;
          ctx.beginPath();
          ctx.arc(px, py, 18, -Math.PI / 2, -Math.PI / 2 + (1 - progress) * Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 121, 177, ${(0.3 + progress * 0.5).toFixed(2)})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.lineWidth = 1;
        }
      });

      // 12. Shockwaves
      drawShockwaves(fx, ctx, ox, oy, scale);

      // 13. Burst particles
      drawBurstParticles(fx, ctx, ox, oy, scale);

      // 14. Damage numbers
      drawDamageNumbers(fx, ctx, ox, oy, scale);

      // Remove shake offset for UI overlays
      ctx.translate(-shake.x, -shake.y);

      // 15. Low HP vignette
      const localHp = localPlayer ? clamp(Number(localPlayer.hp ?? 100), 0, 100) : 100;
      if (localHp < 35) {
        const vignetteAlpha = (1 - localHp / 35) * 0.35;
        const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.65);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(255, 0, 0, ${vignetteAlpha.toFixed(3)})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      // 16. Announcements
      drawAnnouncements(fx, ctx, w);

      // 17. Minimap
      const mmW = 120;
      const mmH = 70;
      const mmX = w - mmW - 10;
      const mmY = h - mmH - 10;
      ctx.fillStyle = 'rgba(10, 15, 32, 0.65)';
      ctx.fillRect(mmX, mmY, mmW, mmH);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.strokeRect(mmX, mmY, mmW, mmH);

      // Power zone on minimap
      if (mapDef) {
        const pz = mapDef.powerZone;
        const mmPzX = mmX + ((pz.cx + 14) / 28) * mmW;
        const mmPzY = mmY + ((pz.cy + 8) / 16) * mmH;
        const mmPzR = (pz.r / 28) * mmW;
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.3)';
        ctx.beginPath();
        ctx.arc(mmPzX, mmPzY, mmPzR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Pickups on minimap
      pickupsRef.current.forEach((pickup) => {
        if (!pickup.active) return;
        const dotX = mmX + ((pickup.pos.x + 14) / 28) * mmW;
        const dotY = mmY + ((pickup.pos.y + 8) / 16) * mmH;
        ctx.fillStyle = '#49f3a7';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(dotX - 1, dotY - 1, 2, 2);
      });
      ctx.globalAlpha = 1;

      // Players on minimap
      playersRef.current.forEach((player, id) => {
        const dotX = mmX + ((player.renderPos.x + 14) / 28) * mmW;
        const dotY = mmY + ((player.renderPos.y + 8) / 16) * mmH;
        ctx.fillStyle = id === youIdRef.current ? '#ff79b1' : '#6fe5ff';
        ctx.beginPath();
        ctx.arc(dotX, dotY, id === youIdRef.current ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getSprite]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (abilityTimerRef.current) clearInterval(abilityTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const leaderboard = useMemo(() => {
    return Array.from(players.values())
      .sort((a, b) => {
        const killDiff = (b.kills ?? 0) - (a.kills ?? 0);
        if (killDiff !== 0) return killDiff;
        return (a.deaths ?? 0) - (b.deaths ?? 0);
      })
      .slice(0, 8);
  }, [players]);

  const selectedMapMeta = useMemo(
    () => ARENA_MAPS.find((entry) => entry.id === selectedMap) ?? ARENA_MAPS[0],
    [selectedMap],
  );
  const rotationRemainingMs = arenaConfig ? Math.max(0, arenaConfig.rotationEndsAt - clockMs) : 0;
  const rotationCountdown = arenaConfig
    ? `${Math.floor(rotationRemainingMs / 60000)}m ${Math.floor((rotationRemainingMs % 60000) / 1000)
        .toString()
        .padStart(2, '0')}s`
    : '—';
  const missionCards = [
    { label: 'Cast pulse', value: dailyProgress.pulses, target: 20 },
    { label: 'Eliminations', value: dailyProgress.eliminations, target: 8 },
    { label: 'Matches played', value: dailyProgress.matches, target: 3 },
  ];
  const isReady = status === 'ready';

  return (
    <div className="cp-panel space-y-4 p-4">
      <div className="flex flex-col gap-2 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Status: {status}
          {info ? ` — ${info}` : ''}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <span>Map {selectedMapMeta.label}</span>
          <span>Players {playerCount}</span>
          <span>Target {arenaConfig?.targetKills ?? 8} kills</span>
          <span>Rotate in {rotationCountdown}</span>
          {latency !== null && <span>Ping {latency}ms</span>}
          <span>WASD / Arrows move</span>
          <span>Space casts pulse</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {ARENA_MAPS.map((map) => (
          <button
            key={map.id}
            type="button"
            disabled
            title="Map rotates automatically on the server"
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              selectedMap === map.id
                ? 'border-rose-300 bg-rose-100/70 text-slate-800'
                : 'border-white/20 bg-white/45 text-slate-700 opacity-75'
            }`}
          >
            <div className="text-xs uppercase tracking-[0.24em] opacity-70">{map.label}</div>
            <div className="mt-1 text-xs">{map.summary}</div>
          </button>
        ))}
      </div>
      <div className="text-xs text-slate-500">Maps rotate automatically every 20 minutes.</div>

      {arenaConfig?.modifiers?.length ? (
        <div className="rounded-2xl border border-white/15 bg-white/45 p-3 text-xs text-slate-700">
          <div className="mb-2 uppercase tracking-[0.24em] text-slate-500">Active Modifiers</div>
          <div className="flex flex-wrap gap-2">
            {arenaConfig.modifiers.map((modifier) => (
              <span key={modifier} className="rounded-full border border-slate-300/80 bg-white/75 px-3 py-1">
                {modifier}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative">
          <canvas ref={canvasRef} style={{ width: '100%', height }} />
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <button
              type="button"
              onClick={castPulse}
              disabled={!isReady || cooldownMs > 0}
              className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              Pulse {cooldownMs > 0 ? `(${Math.ceil(cooldownMs / 100)}s)` : 'Ready'}
            </button>
          </div>
          {ownedChars.length > 1 && (
            <div className="absolute right-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs text-slate-700 shadow-sm">
              <label className="flex items-center gap-2">
                <span>Avatar</span>
                <select
                  className="rounded-full bg-transparent text-xs text-slate-700 focus:outline-none"
                  value={selectedChar ?? ''}
                  onChange={(e) => handleSelectAvatar(e.target.value)}
                  disabled={!isReady}
                >
                  {ownedChars.map((charId) => (
                    <option key={charId} value={charId}>
                      {charId}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/60 p-3">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Daily Arena Missions</div>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {missionCards.map((mission) => {
                const progress = Math.min(100, Math.round((mission.value / mission.target) * 100));
                return (
                  <li key={mission.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span>{mission.label}</span>
                      <span>
                        {mission.value}/{mission.target}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-rose-400" style={{ width: `${progress}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/60 p-3">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Leaderboard</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {leaderboard.length === 0 && <li className="text-xs text-slate-400">Waiting for players…</li>}
              {leaderboard.map((player) => (
                <li key={player.id} className={player.id === youId ? 'font-semibold text-rose-500' : ''}>
                  <span>{player.displayName || player.id.slice(0, 6)}</span>{' '}
                  <span className="text-xs text-slate-500">
                    {(player.kills ?? 0)}K / {(player.deaths ?? 0)}D
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex h-56 flex-col rounded-2xl border border-white/10 bg-white/60 p-3 shadow-inner">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Combat Feed</div>
            <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1 text-sm text-slate-700">
              {feed.length === 0 && <div className="text-xs text-slate-400">No events yet. Cast pulse to start the fight.</div>}
              {feed
                .slice()
                .reverse()
                .map((entry) => (
                  <div key={entry.id}>{entry.text}</div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
