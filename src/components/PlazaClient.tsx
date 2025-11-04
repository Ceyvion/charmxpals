"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';

import type { PlayerState, S2C } from '@/lib/mmo/messages';
import type { MmoSessionClaims } from '@/lib/mmo/token';
import { filterProfanity } from '@/lib/profanity';

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
  { code: 'wave', label: 'Wave', glyph: '👋' },
  { code: 'cheer', label: 'Cheer', glyph: '✨' },
  { code: 'dance', label: 'Dance', glyph: '💃' },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

export default function PlazaClient({ height = 420 }: PlazaClientProps) {
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
  const pingSentAt = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const [playerCount, setPlayerCount] = useState(0);

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
        const body = await res.json();
        const token = body.token as string;
        tokenRef.current = token;
        const claims = body.claims as Partial<MmoSessionClaims> | undefined;
        const owned = Array.isArray(claims?.owned)
          ? (claims?.owned || []).filter((item): item is string => typeof item === 'string')
          : [];
        setOwnedChars(owned);
        const initialChar = owned[0] || 'demo';
        selectedCharRef.current = initialChar;
        setSelectedChar(initialChar);
        const envUrl = process.env.NEXT_PUBLIC_MMO_WS_URL;
        let base = envUrl;
        if (!base && typeof window !== 'undefined') {
          const host = window.location.hostname;
          const isLocal =
            host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
          if (isLocal) {
            const port = process.env.NEXT_PUBLIC_MMO_WS_PORT || '8787';
            base = `ws://${host}:${port}`;
          }
        }
        if (!base) {
          throw new Error('No plaza server configured. Set NEXT_PUBLIC_MMO_WS_URL.');
        }
        const url = `${base}?token=${encodeURIComponent(token)}`;
        if (!stop) {
          setWsUrl(url);
        }
      } catch (err: any) {
        if (stop) return;
        let message = err?.message || 'Failed to connect';
        if (message === 'plaza_unconfigured') {
          message = 'Plaza server not configured. Set NEXT_PUBLIC_MMO_WS_URL.';
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
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'select_avatar', characterId: value }));
  }, []);

  // Connect WS
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
      const avatar = selectedCharRef.current || 'demo';
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
          setStatus('ready');
          setInfo('Connected to Signal Plaza');
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
              text: `${player.displayName || 'New pal'} joined.`,
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
                text: `${leavingName} left the instance.`,
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
                target.activeEmote = { code: payload.emote, until: performance.now() + 1_600 };
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
  }, [wsUrl, hydratePlayer, replacePlayers, updatePlayers, appendMessage]);

  // Input loop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const setAxis = (key: string, pressed: boolean) => {
        const a = axesRef.current;
        if (key === 'w' || key === 'ArrowUp') a.y = pressed ? -1 : (a.y === -1 ? 0 : a.y);
        if (key === 's' || key === 'ArrowDown') a.y = pressed ? 1 : (a.y === 1 ? 0 : a.y);
        if (key === 'a' || key === 'ArrowLeft') a.x = pressed ? -1 : (a.x === -1 ? 0 : a.x);
        if (key === 'd' || key === 'ArrowRight') a.x = pressed ? 1 : (a.x === 1 ? 0 : a.x);
      };
      if (e.type === 'keydown') setAxis(e.key, true);
      else setAxis(e.key, false);
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
  }, [sendInput]);

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
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#F7F5FF';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(198,165,255,0.28)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const now = performance.now();
      const lastFrame = lastFrameRef.current ?? timestamp;
      const dt = Math.min(0.12, (timestamp - lastFrame) / 1000);
      lastFrameRef.current = timestamp;

      const scale = 22;
      const ox = w / 2;
      const oy = h / 2;

      playersRef.current.forEach((player, id) => {
        if (!player.renderPos) {
          player.renderPos = { ...player.pos };
        }
        if (!player.targetPos) {
          player.targetPos = { ...player.pos };
        }

        if (id === youIdRef.current) {
          const speed = 2.8;
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

        const px = ox + player.renderPos.x * scale;
        const py = oy + player.renderPos.y * scale;
        ctx.fillStyle = id === youIdRef.current ? '#FF8EC9' : '#7FE6FF';
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(48,18,67,0.45)';
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(player.rot) * 14, py + Math.sin(player.rot) * 14);
        ctx.stroke();

        ctx.fillStyle = '#301243';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(player.displayName || id.slice(0, 4), px, py - 12);

        if (player.activeEmote) {
          const glyph = EMOTES.find((e) => e.code === player.activeEmote?.code)?.glyph || player.activeEmote.code;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.fillRect(px - 12, py - 34, 24, 18);
          ctx.fillStyle = '#301243';
          ctx.font = '11px system-ui';
          ctx.fillText(glyph, px, py - 20);
        }
      });

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

  return (
    <div className="cp-panel space-y-4 p-4">
      <div className="flex flex-col gap-2 text-sm text-gray-300 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Status: {status}
          {info ? ` — ${info}` : ''}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <span>Players {playerCount}</span>
          {latency !== null && <span>Ping {latency}ms</span>}
          <span>WASD / Arrows to move</span>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative">
          <canvas ref={canvasRef} style={{ width: '100%', height }} />
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />
          <div className="absolute bottom-3 left-3 flex gap-2">
            {EMOTES.map((emote) => (
              <button
                key={emote.code}
                type="button"
                onClick={() => sendInput({ emote: emote.code })}
                className="rounded-full bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:bg-white/50"
                disabled={!isReady}
              >
                {emote.glyph} {emote.label}
              </button>
            ))}
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
          <div className="flex h-48 flex-col rounded-2xl border border-white/10 bg-white/60 p-3 shadow-inner">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Chat</div>
            <div className="mt-2 flex-1 space-y-2 overflow-y-auto pr-1 text-sm text-slate-700">
              {chatLog.length === 0 && <div className="text-xs text-slate-400">No messages yet — say hi!</div>}
              {chatLog.map((entry) => (
                <div key={entry.id} className={entry.system ? 'text-xs text-slate-500' : ''}>
                  {!entry.system && (
                    <span className="mr-2 font-medium text-slate-900">
                      {entry.authorId === youId ? 'You' : entry.from}
                    </span>
                  )}
                  <span className={entry.flagged ? 'text-rose-500' : ''}>{entry.text}</span>
                </div>
              ))}
            </div>
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendChat(chatInput);
                setChatInput('');
              }}
            >
              <input
                className="flex-1 rounded-full border border-white/60 bg-white/90 px-3 py-1 text-sm text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Send a message…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={200}
                disabled={!isReady}
              />
              <button
                type="submit"
                className="rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-rose-300"
                disabled={!isReady || !chatInput.trim()}
              >
                Send
              </button>
            </form>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/60 p-3">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Players</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {playerList.length === 0 && <li className="text-xs text-slate-400">Waiting for joiners…</li>}
              {playerList.map((player) => (
                <li key={player.id} className={player.id === youId ? 'font-semibold text-rose-500' : ''}>
                  {player.displayName || player.id.slice(0, 6)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
