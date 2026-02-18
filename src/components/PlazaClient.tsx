"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';

import type { PlayerState, S2C } from '@/lib/mmo/messages';
import type { MmoSessionClaims } from '@/lib/mmo/token';
import { resolveClientWsBase } from '@/lib/mmo/wsUrl';
import { filterProfanity } from '@/lib/profanity';
import { loreBySlug } from '@/data/characterLore';

type PlazaClientProps = { height?: number };

type Vec2 = { x: number; y: number };

type PlayerView = PlayerState & {
  renderPos: Vec2;
  targetPos: Vec2;
  lastUpdate: number;
  activeEmote?: { code: string; until: number };
};

type ChatMessage = {
  id: string;
  text: string;
  ts: number;
  from?: string;
  authorId?: string;
  system?: boolean;
  flagged?: boolean;
};

const EMOTES = [
  { code: 'wave', label: 'Wave', glyph: '\u{1F44B}', key: '1' },
  { code: 'cheer', label: 'Cheer', glyph: '\u2728', key: '2' },
  { code: 'dance', label: 'Dance', glyph: '\u{1F483}', key: '3' },
  { code: 'fire', label: 'Fire', glyph: '\u{1F525}', key: '4' },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Resolve a character color from lore data, with fallback */
function charColor(characterId: string | undefined | null): string {
  if (!characterId) return '#7FE6FF';
  return loreBySlug[characterId]?.color ?? '#7FE6FF';
}

function charName(characterId: string | undefined | null): string | null {
  if (!characterId) return null;
  return loreBySlug[characterId]?.name ?? null;
}

/** Convert hex to rgba */
function hexRgba(hex: string, a: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return `rgba(127,230,255,${a})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ── Isometric-style floor tile drawing ── */

function drawFloor(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  // Dark background
  ctx.fillStyle = '#0a0b14';
  ctx.fillRect(0, 0, w, h);

  // Dot grid
  const spacing = 28;
  const pulse = Math.sin(time * 0.001) * 0.3 + 0.7;
  for (let x = spacing / 2; x < w; x += spacing) {
    for (let y = spacing / 2; y < h; y += spacing) {
      const dist = Math.sqrt((x - w / 2) ** 2 + (y - h / 2) ** 2);
      const fade = Math.max(0, 1 - dist / (Math.max(w, h) * 0.55));
      const alpha = fade * 0.15 * pulse;
      ctx.fillStyle = `rgba(124,58,237,${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Center glow
  const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.38);
  grd.addColorStop(0, 'rgba(255,214,10,0.06)');
  grd.addColorStop(0.5, 'rgba(124,58,237,0.03)');
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // Border glow lines
  ctx.strokeStyle = 'rgba(124,58,237,0.08)';
  ctx.lineWidth = 1;
  const pad = 40;
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
}

/* ── Draw a player avatar ── */

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
  name: string,
  isYou: boolean,
  rot: number,
  emoteGlyph: string | null,
  time: number,
) {
  const bodyRadius = isYou ? 11 : 10;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(px, py + bodyRadius + 2, bodyRadius * 0.9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glow ring for you
  if (isYou) {
    const glowPulse = Math.sin(time * 0.003) * 0.15 + 0.35;
    ctx.strokeStyle = hexRgba(color, glowPulse);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, bodyRadius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Body circle with gradient
  const grad = ctx.createRadialGradient(px - 2, py - 3, 0, px, py, bodyRadius);
  grad.addColorStop(0, hexRgba(color, 1));
  grad.addColorStop(1, hexRgba(color, 0.7));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py, bodyRadius, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = isYou ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = isYou ? 2 : 1;
  ctx.beginPath();
  ctx.arc(px, py, bodyRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Direction indicator
  const dirLen = bodyRadius + 6;
  ctx.strokeStyle = hexRgba(color, 0.6);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(px + Math.cos(rot) * bodyRadius, py + Math.sin(rot) * bodyRadius);
  ctx.lineTo(px + Math.cos(rot) * dirLen, py + Math.sin(rot) * dirLen);
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Name tag
  ctx.font = `600 ${isYou ? 11 : 10}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  const nameText = name;
  const metrics = ctx.measureText(nameText);
  const tagW = metrics.width + 10;
  const tagH = 16;
  const tagY = py - bodyRadius - 14;

  // Tag background
  ctx.fillStyle = isYou ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)';
  const tagRadius = 4;
  ctx.beginPath();
  ctx.roundRect(px - tagW / 2, tagY - tagH / 2, tagW, tagH, tagRadius);
  ctx.fill();

  ctx.fillStyle = isYou ? '#ffffff' : 'rgba(255,255,255,0.8)';
  ctx.fillText(nameText, px, tagY + 4);

  // Emote bubble
  if (emoteGlyph) {
    const bubbleY = py - bodyRadius - 32;
    ctx.font = '16px system-ui';
    ctx.fillText(emoteGlyph, px, bubbleY);
  }
}

export default function PlazaClient({ height = 520 }: PlazaClientProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'authenticating' | 'ready' | 'error'>('idle');
  const [info, setInfo] = useState<string>('');
  const [players, setPlayers] = useState<Map<string, PlayerView>>(new Map());
  const playersRef = useRef<Map<string, PlayerView>>(new Map());
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [latency, setLatency] = useState<number | null>(null);
  const [ownedChars, setOwnedChars] = useState<string[]>([]);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const selectedCharRef = useRef<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const youIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const axesRef = useRef({ x: 0, y: 0 });
  const seqRef = useRef(1);
  const wsRef = useRef<WebSocket | null>(null);
  const disconnectReasonRef = useRef<string | null>(null);
  const pingSentAt = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [chatFocused, setChatFocused] = useState(false);

  const hydratePlayer = useCallback((state: PlayerState): PlayerView => {
    return {
      ...state,
      renderPos: { ...state.pos },
      targetPos: { ...state.pos },
      lastUpdate: performance.now(),
      activeEmote: undefined,
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

  const appendMessage = useCallback((entry: ChatMessage) => {
    setChatLog((prev) => [...prev.slice(-49), entry]);
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // Fetch token and compute WS URL
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setStatus('connecting');
        const res = await fetch('/api/mmo/token', { cache: 'no-store' });
        if (res.status === 401) {
          if (!stop) {
            setStatus('error');
            setInfo('Sign in to join the plaza.');
            signIn(undefined, { callbackUrl: '/plaza' }).catch(() => {});
          }
          return;
        }
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const errorMsg =
            typeof payload?.error === 'string'
              ? payload.error
              : 'Failed to mint plaza session.';
          throw new Error(errorMsg);
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
        if (!base) {
          throw new Error('No plaza server configured. Set MMO_WS_URL or NEXT_PUBLIC_MMO_WS_URL.');
        }
        const url = `${base}?token=${encodeURIComponent(token)}`;
        if (!stop) {
          setWsUrl(url);
        }
      } catch (err: any) {
        if (stop) return;
        let message = err?.message || 'Failed to connect';
        if (message === 'plaza_unconfigured') {
          message = 'Plaza server not configured. Set MMO_WS_URL or NEXT_PUBLIC_MMO_WS_URL.';
        } else if (message === 'plaza_unavailable') {
          message = 'Plaza server unreachable. Start the MMO WS server locally.';
        }
        setStatus('error');
        setInfo(message);
      }
    })();
    return () => {
      stop = true;
    };
  }, []);

  useEffect(() => {
    selectedCharRef.current = selectedChar;
  }, [selectedChar]);

  const sendInput = useCallback(
    (payload?: { emote?: string }) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return;
      const seq = seqRef.current++;
      ws.send(
        JSON.stringify({
          type: 'input',
          seq,
          ts: Date.now(),
          axes: axesRef.current,
          ...(payload?.emote ? { emote: payload.emote } : {}),
        }),
      );
    },
    [],
  );

  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const { clean } = filterProfanity(trimmed);
    const now = Date.now();
    ws.send(JSON.stringify({ type: 'chat', id: `local-${now}`, ts: now, text: clean }));
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

  // Connect WS
  useEffect(() => {
    if (!wsUrl) return;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    readyRef.current = false;
    setStatus('authenticating');
    setInfo('Handshaking\u2026');

    ws.onopen = () => {
      disconnectReasonRef.current = null;
      const hello = { type: 'hello', build: 'dev', locale: typeof navigator !== 'undefined' ? navigator.language : 'en' };
      ws.send(JSON.stringify(hello));
      if (tokenRef.current) {
        ws.send(JSON.stringify({ type: 'auth', token: tokenRef.current }));
      }
      const avatar = selectedCharRef.current || 'neon-city';
      ws.send(JSON.stringify({ type: 'select_avatar', characterId: avatar }));
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
          break;
        case 'auth_ok':
          disconnectReasonRef.current = null;
          setStatus('ready');
          setInfo('Connected');
          readyRef.current = true;
          setYouId(message.sessionId);
          youIdRef.current = message.sessionId;
          if (pingTimerRef.current) {
            clearInterval(pingTimerRef.current);
          }
          pingTimerRef.current = window.setInterval(() => {
            const current = wsRef.current;
            if (!current || current.readyState !== WebSocket.OPEN) return;
            const ts = Date.now();
            pingSentAt.current = ts;
            current.send(JSON.stringify({ type: 'ping', ts }));
          }, 5_000);
          break;
        case 'auth_error':
          disconnectReasonRef.current = message.reason || 'Authentication failed';
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
          appendMessage({ id: `system-${Date.now()}`, text: 'You entered the plaza.', ts: Date.now(), system: true });
          break;
        }
        case 'state':
          updatePlayers((prev) => {
            const next = new Map(prev);
            const now = performance.now();
            for (const partial of message.players) {
              const id = (partial as any).id as string;
              const target = next.get(id);
              if (!target) continue;
              if ((partial as any).pos) {
                const pos = (partial as any).pos as Vec2;
                target.pos = { ...pos };
                target.targetPos = { ...pos };
                if (id === youIdRef.current) {
                  target.renderPos = { ...pos };
                }
              }
              if (typeof (partial as any).characterId === 'string' && (partial as any).characterId) {
                target.characterId = (partial as any).characterId as string;
              }
              if ((partial as any).rot !== undefined) {
                target.rot = (partial as any).rot as number;
              }
              target.lastUpdate = now;
              next.set(id, target);
            }
            return next;
          });
          break;
        case 'event':
          if (message.event === 'join') {
            const player = message.data.player as PlayerState;
            updatePlayers((prev) => {
              const next = new Map(prev);
              if (!next.has(player.id)) {
                next.set(player.id, hydratePlayer(player));
              }
              return next;
            });
            appendMessage({
              id: `join-${player.id}-${Date.now()}`,
              text: `${player.displayName || 'New pal'} joined the plaza.`,
              ts: Date.now(),
              system: true,
            });
          } else if (message.event === 'leave') {
            const leavingId = message.data.id as string;
            let leavingName = '';
            updatePlayers((prev) => {
              const next = new Map(prev);
              const target = next.get(leavingId);
              if (target) {
                leavingName = target.displayName || 'A pal';
              }
              next.delete(leavingId);
              return next;
            });
            if (leavingName) {
              appendMessage({
                id: `leave-${leavingId}-${Date.now()}`,
                text: `${leavingName} left.`,
                ts: Date.now(),
                system: true,
              });
            }
          } else if (message.event === 'chat') {
            const payload = message.data as { id: string; text: string; displayName?: string; flagged?: boolean };
            appendMessage({
              id: `chat-${payload.id}-${Date.now()}`,
              text: payload.text,
              ts: Date.now(),
              from: payload.displayName || payload.id.slice(0, 4),
              authorId: payload.id,
              flagged: Boolean(payload.flagged),
            });
          } else if (message.event === 'emote') {
            const payload = message.data as { id: string; emote: string };
            updatePlayers((prev) => {
              const next = new Map(prev);
              const target = next.get(payload.id);
              if (target) {
                target.activeEmote = { code: payload.emote, until: performance.now() + 2_000 };
                next.set(payload.id, target);
              }
              return next;
            });
          } else if (message.event === 'system') {
            const raw = typeof message.data?.message === 'string' ? message.data.message : 'System notice.';
            const friendly =
              raw === 'chat_rate_limited'
                ? 'You are sending messages too quickly.'
                : raw === 'emote_rate_limited'
                  ? 'Emote cooldown active.'
                  : raw;
            appendMessage({ id: `system-${Date.now()}`, text: friendly, ts: Date.now(), system: true });
          }
          break;
        case 'pong':
          if (typeof message.ts === 'number' && pingSentAt.current !== null) {
            const delta = Date.now() - message.ts;
            setLatency(delta);
            pingSentAt.current = null;
          }
          break;
        case 'kick':
          disconnectReasonRef.current = message.reason || 'Disconnected';
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
      setInfo(disconnectReasonRef.current || 'Connection closed.');
      disconnectReasonRef.current = null;
    };

    ws.onerror = () => {
      disconnectReasonRef.current = 'WebSocket error.';
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
  }, [wsUrl, hydratePlayer, replacePlayers, updatePlayers, appendMessage]);

  // Clear movement as soon as chat takes focus so no axis can stay latched.
  useEffect(() => {
    if (!chatFocused) return;
    axesRef.current = { x: 0, y: 0 };
    sendInput();
  }, [chatFocused, sendInput]);

  // Input loop — ignore keydown while chat is focused, but still process keyup.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isKeyDown = e.type === 'keydown';
      if (chatFocused && isKeyDown) return;
      const setAxis = (key: string, pressed: boolean) => {
        const a = axesRef.current;
        if (key === 'w' || key === 'ArrowUp') a.y = pressed ? -1 : (a.y === -1 ? 0 : a.y);
        if (key === 's' || key === 'ArrowDown') a.y = pressed ? 1 : (a.y === 1 ? 0 : a.y);
        if (key === 'a' || key === 'ArrowLeft') a.x = pressed ? -1 : (a.x === -1 ? 0 : a.x);
        if (key === 'd' || key === 'ArrowRight') a.x = pressed ? 1 : (a.x === 1 ? 0 : a.x);
      };
      setAxis(e.key, isKeyDown);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    const interval = window.setInterval(() => {
      sendInput();
    }, 50);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.clearInterval(interval);
    };
  }, [sendInput, chatFocused]);

  // Render canvas
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

      const now = performance.now();
      const lastFrame = lastFrameRef.current ?? timestamp;
      const dt = Math.min(0.12, (timestamp - lastFrame) / 1000);
      lastFrameRef.current = timestamp;

      // Draw floor
      drawFloor(ctx, w, h, now);

      const scale = 24;
      const ox = w / 2;
      const oy = h / 2;

      // Collect and sort players by Y for depth ordering
      const sorted: Array<[string, PlayerView]> = [];
      playersRef.current.forEach((player, id) => {
        if (!player.renderPos) player.renderPos = { ...player.pos };
        if (!player.targetPos) player.targetPos = { ...player.pos };

        if (id === youIdRef.current) {
          const speed = 3.2;
          player.renderPos.x = clamp(player.renderPos.x + axesRef.current.x * speed * dt, -10, 10);
          player.renderPos.y = clamp(player.renderPos.y + axesRef.current.y * speed * dt, -6, 6);
          player.renderPos.x = lerp(player.renderPos.x, player.pos.x, dt * 6);
          player.renderPos.y = lerp(player.renderPos.y, player.pos.y, dt * 6);
        } else {
          player.renderPos.x = lerp(player.renderPos.x, player.targetPos.x, dt * 8);
          player.renderPos.y = lerp(player.renderPos.y, player.targetPos.y, dt * 8);
        }

        if (player.activeEmote && player.activeEmote.until < now) {
          delete player.activeEmote;
        }

        sorted.push([id, player]);
      });

      sorted.sort((a, b) => a[1].renderPos.y - b[1].renderPos.y);

      for (const [id, player] of sorted) {
        const px = ox + player.renderPos.x * scale;
        const py = oy + player.renderPos.y * scale;
        const color = charColor(player.characterId);
        const isYou = id === youIdRef.current;
        const name = isYou ? 'You' : (player.displayName || charName(player.characterId) || id.slice(0, 6));

        let emoteGlyph: string | null = null;
        if (player.activeEmote) {
          emoteGlyph = EMOTES.find((e) => e.code === player.activeEmote?.code)?.glyph || player.activeEmote.code;
        }

        drawPlayer(ctx, px, py, color, name, isYou, player.rot, emoteGlyph, now);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const playerList = useMemo(() => {
    return Array.from(players.values()).sort((a, b) =>
      (a.displayName || '').localeCompare(b.displayName || ''),
    );
  }, [players]);

  const isReady = status === 'ready';

  /* ── Status indicator ── */
  const statusDot =
    status === 'ready' ? '#30D158' :
    status === 'connecting' || status === 'authenticating' ? '#FFD60A' :
    status === 'error' ? '#FF3B30' : '#737373';

  const statusLabel =
    status === 'ready' ? 'Connected' :
    status === 'connecting' ? 'Connecting\u2026' :
    status === 'authenticating' ? 'Authenticating\u2026' :
    status === 'error' ? 'Disconnected' : 'Idle';

  return (
    <div className="flex flex-col gap-3">
      {/* Status bar */}
      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg px-4 py-2.5 text-xs font-medium"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: statusDot }} />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{statusLabel}</span>
          {info && status === 'error' && (
            <span style={{ color: 'rgba(255,59,48,0.8)' }}>&mdash; {info}</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <span>{playerCount} online</span>
          {latency !== null && <span>{latency}ms</span>}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Canvas area */}
        <div className="relative overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <canvas
            ref={canvasRef}
            className="block w-full"
            style={{ height, background: '#0a0b14' }}
          />

          {/* Emote bar */}
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {EMOTES.map((emote) => (
              <button
                key={emote.code}
                type="button"
                onClick={() => sendInput({ emote: emote.code })}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.8)',
                }}
                disabled={!isReady}
                title={`${emote.label} (${emote.key})`}
              >
                <span className="text-sm">{emote.glyph}</span>
                <span className="hidden sm:inline">{emote.label}</span>
              </button>
            ))}
          </div>

          {/* Avatar selector */}
          {ownedChars.length > 1 && (
            <div
              className="absolute right-3 top-3 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Avatar</span>
              <select
                className="rounded bg-transparent text-xs font-semibold focus:outline-none"
                style={{ color: 'rgba(255,255,255,0.8)' }}
                value={selectedChar ?? ''}
                onChange={(e) => handleSelectAvatar(e.target.value)}
                disabled={!isReady}
              >
                {ownedChars.map((charId) => {
                  const name = charName(charId) || charId;
                  return (
                    <option key={charId} value={charId} style={{ background: '#1a1a2e', color: '#fff' }}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Not connected overlay */}
          {status === 'error' && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: 'rgba(10,11,20,0.85)', backdropFilter: 'blur(4px)' }}
            >
              <div className="text-center">
                <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {info || 'Disconnected'}
                </div>
                <div className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {info?.includes('server') ? 'Run npm run mmo:server to start the plaza server.' : 'Check your connection and try again.'}
                </div>
              </div>
            </div>
          )}

          {(status === 'connecting' || status === 'authenticating') && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(10,11,20,0.7)', backdropFilter: 'blur(2px)' }}
            >
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: '#FFD60A',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
                {statusLabel}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-3">
          {/* Chat panel */}
          <div
            className="flex flex-1 flex-col rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              minHeight: '260px',
              maxHeight: `${height - 60}px`,
            }}
          >
            <div
              className="px-4 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.2em]"
              style={{ color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              Chat
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 text-sm" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              {chatLog.length === 0 && (
                <div className="py-8 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  No messages yet &mdash; say hi!
                </div>
              )}
              {chatLog.map((entry) => (
                <div key={entry.id} className="py-0.5">
                  {entry.system ? (
                    <span className="text-xs italic" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {entry.text}
                    </span>
                  ) : (
                    <>
                      <span
                        className="mr-1.5 text-xs font-bold"
                        style={{ color: entry.authorId === youId ? '#FF8EC9' : 'rgba(255,255,255,0.6)' }}
                      >
                        {entry.authorId === youId ? 'You' : entry.from}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: entry.flagged ? '#FF3B30' : 'rgba(255,255,255,0.5)' }}
                      >
                        {entry.text}
                      </span>
                    </>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form
              className="flex items-center gap-2 px-3 py-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              onSubmit={(e) => {
                e.preventDefault();
                sendChat(chatInput);
                setChatInput('');
              }}
            >
              <input
                ref={chatInputRef}
                className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.8)',
                  caretColor: '#FF8EC9',
                }}
                placeholder="Send a message\u2026"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onFocus={() => setChatFocused(true)}
                onBlur={() => setChatFocused(false)}
                maxLength={200}
                disabled={!isReady}
              />
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: isReady && chatInput.trim() ? '#FF8EC9' : 'rgba(255,255,255,0.06)',
                  color: isReady && chatInput.trim() ? '#0a0a0a' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                }}
                disabled={!isReady || !chatInput.trim()}
              >
                Send
              </button>
            </form>
          </div>

          {/* Players panel */}
          <div
            className="rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span
                className="text-[0.65rem] font-bold uppercase tracking-[0.2em]"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Players
              </span>
              <span
                className="text-[0.65rem] font-semibold"
                style={{ color: 'rgba(255,255,255,0.2)' }}
              >
                {playerCount}
              </span>
            </div>
            <ul className="max-h-36 overflow-y-auto px-4 py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
              {playerList.length === 0 && (
                <li className="py-3 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                  Waiting for players\u2026
                </li>
              )}
              {playerList.map((player) => {
                const isYouPlayer = player.id === youId;
                const color = charColor(player.characterId);
                return (
                  <li
                    key={player.id}
                    className="flex items-center gap-2 py-1"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <span
                      className="truncate text-xs font-semibold"
                      style={{ color: isYouPlayer ? '#FF8EC9' : 'rgba(255,255,255,0.5)' }}
                    >
                      {isYouPlayer ? 'You' : (player.displayName || player.id.slice(0, 6))}
                    </span>
                    {player.characterId && (
                      <span
                        className="ml-auto truncate text-[0.6rem]"
                        style={{ color: 'rgba(255,255,255,0.2)' }}
                      >
                        {charName(player.characterId) || player.characterId}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
