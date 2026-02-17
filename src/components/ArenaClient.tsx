"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';

import type { ArenaMapId, ArenaRotation, PlayerState, S2C } from '@/lib/mmo/messages';
import type { MmoSessionClaims } from '@/lib/mmo/token';
import { resolveClientWsBase } from '@/lib/mmo/wsUrl';

type ArenaClientProps = { height?: number };

type Vec2 = { x: number; y: number };

type PlayerView = PlayerState & {
  renderPos: Vec2;
  targetPos: Vec2;
  lastUpdate: number;
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
  victims?: unknown[];
  killer?: string;
  killerId?: string;
  victim?: string;
  message?: string;
  targetKills?: number;
  winner?: string;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const asArenaEventData = (value: unknown): ArenaEventData =>
  typeof value === 'object' && value !== null ? (value as ArenaEventData) : {};
const DAILY_RESET_HOUR_UTC = 6;
const ARENA_MAPS: Array<{ id: ArenaMapId; label: string; src: string; summary: string }> = [
  { id: 'neon-grid', label: 'Neon Grid', src: '/assets/arena/maps/neon-grid.png', summary: 'Wide lanes and long chases.' },
  { id: 'crystal-rift', label: 'Crystal Rift', src: '/assets/arena/maps/crystal-rift.png', summary: 'Mid-lane ambushes and tight pivots.' },
  { id: 'voltage-foundry', label: 'Voltage Foundry', src: '/assets/arena/maps/voltage-foundry.png', summary: 'Fast rotations around pressure zones.' },
];

type DailyProgress = {
  dateKey: string;
  pulses: number;
  eliminations: number;
  matches: number;
};

const missionStorageKey = 'cp:arena:daily-progress';
const emptyProgress = (dateKey: string): DailyProgress => ({ dateKey, pulses: 0, eliminations: 0, matches: 0 });
const toDateKey = (now = Date.now()) => {
  const shifted = now - DAILY_RESET_HOUR_UTC * 60 * 60 * 1000;
  return new Date(shifted).toISOString().slice(0, 10);
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
  const [arenaConfig, setArenaConfig] = useState<ArenaRotation | null>(null);
  const [selectedMap, setSelectedMap] = useState<ArenaMapId>('neon-grid');
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>(() => emptyProgress(toDateKey()));

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
  const matchTrackedRef = useRef(false);
  const spriteCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const appendFeed = useCallback((entry: FeedEntry) => {
    setFeed((prev) => [...prev.slice(-19), entry]);
  }, []);

  const syncDailyProgress = useCallback((mutate: (current: DailyProgress) => DailyProgress) => {
    setDailyProgress((prev) => {
      const dateKey = toDateKey();
      const current = prev.dateKey === dateKey ? prev : emptyProgress(dateKey);
      const next = mutate(current);
      try {
        window.localStorage.setItem(missionStorageKey, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const getSprite = useCallback((characterId: string) => {
    const cached = spriteCacheRef.current.get(characterId);
    if (cached) return cached;
    const image = new Image();
    image.src = `/assets/characters/${characterId}/sprite.png`;
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
    if (cooldownMs > 0) return;
    ws.send(JSON.stringify({ type: 'ability_cast', ability: 'pulse' }));
    syncDailyProgress((current) => ({ ...current, pulses: current.pulses + 1 }));
    setCooldownMs(850);
    if (abilityTimerRef.current) {
      clearInterval(abilityTimerRef.current);
    }
    abilityTimerRef.current = window.setInterval(() => {
      setCooldownMs((value) => {
        const next = Math.max(0, value - 50);
        if (next === 0 && abilityTimerRef.current) {
          clearInterval(abilityTimerRef.current);
          abilityTimerRef.current = null;
        }
        return next;
      });
    }, 50);
  }, [cooldownMs, syncDailyProgress]);

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
    try {
      const raw = window.localStorage.getItem(missionStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DailyProgress>;
        if (parsed && typeof parsed.dateKey === 'string') {
          if (parsed.dateKey === toDateKey()) {
            setDailyProgress({
              dateKey: parsed.dateKey,
              pulses: Number(parsed.pulses || 0),
              eliminations: Number(parsed.eliminations || 0),
              matches: Number(parsed.matches || 0),
            });
          } else {
            setDailyProgress(emptyProgress(toDateKey()));
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockMs(Date.now());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const map = ARENA_MAPS.find((entry) => entry.id === selectedMap);
    const image = new Image();
    image.src = map?.src || '/assets/arena/maps/neon-grid.png';
    image.onload = () => {
      mapImageRef.current = image;
    };
  }, [selectedMap]);

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
          }
          break;
        case 'auth_ok':
          setStatus('ready');
          setInfo('Connected to Rift Arena');
          readyRef.current = true;
          setYouId(message.sessionId);
          youIdRef.current = message.sessionId;
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
          if (!matchTrackedRef.current) {
            matchTrackedRef.current = true;
            syncDailyProgress((current) => ({ ...current, matches: current.matches + 1 }));
          }
          appendFeed({ id: `joined-${Date.now()}`, text: 'Entered Rift Arena.', ts: Date.now() });
          break;
        }
        case 'state':
          updatePlayers((prev) => {
            const next = new Map(prev);
            const now = performance.now();
            for (const partial of message.players) {
              const id = partial.id;
              const target = next.get(id);
              if (!target) continue;
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
              target.lastUpdate = now;
              next.set(id, target);
            }
            return next;
          });
          break;
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
            appendFeed({
              id: `combat-${Date.now()}`,
              text: hitCount > 0 ? `${actor} cast pulse and hit ${hitCount} target${hitCount > 1 ? 's' : ''}.` : `${actor} cast pulse.`,
              ts: Date.now(),
            });
          } else if (message.event === 'score') {
            const killer = typeof data.killer === 'string' ? data.killer : 'Unknown';
            const victim = typeof data.victim === 'string' ? data.victim : 'Unknown';
            if (typeof data.killerId === 'string' && data.killerId === youIdRef.current) {
              syncDailyProgress((current) => ({ ...current, eliminations: current.eliminations + 1 }));
            }
            appendFeed({ id: `score-${Date.now()}`, text: `${killer} eliminated ${victim}.`, ts: Date.now() });
          } else if (message.event === 'match_end') {
            matchTrackedRef.current = false;
            appendFeed({ id: `end-${Date.now()}`, text: typeof data.message === 'string' ? data.message : 'Match finished.', ts: Date.now() });
          } else if (message.event === 'system') {
            const msg = typeof data.message === 'string' ? data.message : 'System message';
            appendFeed({ id: `system-${Date.now()}`, text: msg, ts: Date.now() });
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
      matchTrackedRef.current = false;
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
      matchTrackedRef.current = false;
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      ws.close();
      wsRef.current = null;
    };
  }, [appendFeed, hydratePlayer, replacePlayers, syncDailyProgress, updatePlayers, wsUrl]);

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

      ctx.fillStyle = '#0a0f20';
      ctx.fillRect(0, 0, w, h);

      const mapImage = mapImageRef.current;
      if (mapImage) {
        ctx.globalAlpha = 0.38;
        ctx.drawImage(mapImage, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      ctx.strokeStyle = 'rgba(122, 212, 255, 0.15)';
      for (let x = 0; x < w; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const last = lastFrameRef.current ?? timestamp;
      const dt = Math.min(0.12, (timestamp - last) / 1000);
      lastFrameRef.current = timestamp;

      const scale = 26;
      const ox = w / 2;
      const oy = h / 2;

      playersRef.current.forEach((player, id) => {
        if (!player.renderPos) player.renderPos = { ...player.pos };
        if (!player.targetPos) player.targetPos = { ...player.pos };

        if (id === youIdRef.current) {
          const speed = 2.8;
          player.renderPos.x = clamp(player.renderPos.x + axesRef.current.x * speed * dt, -14, 14);
          player.renderPos.y = clamp(player.renderPos.y + axesRef.current.y * speed * dt, -8, 8);
          player.renderPos.x = lerp(player.renderPos.x, player.pos.x, dt * 7);
          player.renderPos.y = lerp(player.renderPos.y, player.pos.y, dt * 7);
        } else {
          player.renderPos.x = lerp(player.renderPos.x, player.targetPos.x, dt * 9);
          player.renderPos.y = lerp(player.renderPos.y, player.targetPos.y, dt * 9);
        }

        const px = ox + player.renderPos.x * scale;
        const py = oy + player.renderPos.y * scale;

        const sprite = getSprite(player.characterId);
        if (sprite.complete && sprite.naturalWidth > 0) {
          ctx.drawImage(sprite, px - 15, py - 17, 30, 30);
        } else {
          ctx.fillStyle = id === youIdRef.current ? '#ff79b1' : '#6fe5ff';
          ctx.beginPath();
          ctx.arc(px, py, 9, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(player.rot) * 13, py + Math.sin(player.rot) * 13);
        ctx.stroke();

        const hp = clamp(Number(player.hp ?? 100), 0, 100);
        const barW = 30;
        const barH = 4;
        ctx.fillStyle = 'rgba(14, 18, 34, 0.75)';
        ctx.fillRect(px - barW / 2, py - 19, barW, barH);
        ctx.fillStyle = hp > 60 ? '#49f3a7' : hp > 30 ? '#ffd36a' : '#ff7575';
        ctx.fillRect(px - barW / 2, py - 19, (barW * hp) / 100, barH);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(player.displayName || id.slice(0, 4), px, py - 24);
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [getSprite]);

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
            onClick={() => setSelectedMap(map.id)}
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              selectedMap === map.id ? 'border-rose-300 bg-rose-100/70 text-slate-800' : 'border-white/20 bg-white/45 text-slate-700'
            }`}
          >
            <div className="text-xs uppercase tracking-[0.24em] opacity-70">{map.label}</div>
            <div className="mt-1 text-xs">{map.summary}</div>
          </button>
        ))}
      </div>

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
