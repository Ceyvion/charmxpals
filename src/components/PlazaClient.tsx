"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

import type { PlayerState, S2C } from '@/lib/mmo/messages';
import type { MmoSessionClaims } from '@/lib/mmo/token';
import { resolveClientWsBase } from '@/lib/mmo/wsUrl';
import { filterProfanity } from '@/lib/profanity';
import { loreBySlug } from '@/data/characterLore';
import type { PlazaThreeScenePlayer, PlazaThreeSceneProps } from './PlazaThreeScene';

type PlazaClientProps = { height?: number };

type Vec2 = { x: number; y: number };

type PlayerView = PlazaThreeScenePlayer;

type ChatMessage = {
  id: string;
  text: string;
  ts: number;
  from?: string;
  authorId?: string;
  system?: boolean;
  flagged?: boolean;
};

type HttpPlazaSession = {
  token: string;
  syncPath: string;
  snapshotInterval: number;
};

type HttpPlazaResponse = {
  ok?: boolean;
  sessionId?: string;
  motd?: string;
  snapshotInterval?: number;
  players?: PlayerState[];
  playerCount?: number;
  chat?: Array<{
    id: string;
    text: string;
    ts: number;
    from?: string;
    authorId?: string;
    flagged?: boolean;
  }>;
  error?: string;
};

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const EMOTES = [
  { code: 'wave', label: 'Wave', glyph: '\u{1F44B}', key: '1' },
  { code: 'cheer', label: 'Cheer', glyph: '\u2728', key: '2' },
  { code: 'dance', label: 'Dance', glyph: '\u{1F483}', key: '3' },
  { code: 'fire', label: 'Fire', glyph: '\u{1F525}', key: '4' },
];

const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const PlazaThreeScene = dynamic<PlazaThreeSceneProps>(() => import('./PlazaThreeScene'), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-[0.18em]"
      style={{ color: 'rgba(255,255,255,0.34)' }}
    >
      Preparing Signal Plaza
    </div>
  ),
});

/** Resolve a character color from lore data, with fallback */
function charColor(characterId: string | undefined | null): string {
  if (!characterId) return '#7FE6FF';
  return loreBySlug[characterId]?.color ?? '#7FE6FF';
}

function charName(characterId: string | undefined | null): string | null {
  if (!characterId) return null;
  return loreBySlug[characterId]?.name ?? null;
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
  const [httpSession, setHttpSession] = useState<HttpPlazaSession | null>(null);
  const [youId, setYouId] = useState<string | null>(null);
  const youIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const httpModeRef = useRef(false);
  const pendingEmoteRef = useRef<string | null>(null);
  const pendingChatRef = useRef<string | null>(null);
  const gameStageRef = useRef<HTMLDivElement | null>(null);
  const axesRef = useRef({ x: 0, y: 0 });
  const seqRef = useRef(1);
  const wsRef = useRef<WebSocket | null>(null);
  const disconnectReasonRef = useRef<string | null>(null);
  const pingSentAt = useRef<number | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const node = chatScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
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
          transport?: 'ws' | 'http';
          claims?: Partial<MmoSessionClaims>;
          wsBase?: string;
          syncPath?: string;
          snapshotInterval?: number;
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
        if (body.transport === 'http') {
          if (!stop) {
            setWsUrl(null);
            setHttpSession({
              token,
              syncPath: body.syncPath || '/api/mmo/sync',
              snapshotInterval: typeof body.snapshotInterval === 'number' ? body.snapshotInterval : 220,
            });
          }
          return;
        }
        const host = typeof window !== 'undefined' ? window.location.hostname : null;
        const base = resolveClientWsBase({ serverBase: body.wsBase, locationHostname: host });
        if (!base) {
          throw new Error('No plaza server configured. Set MMO_WS_URL or NEXT_PUBLIC_MMO_WS_URL.');
        }
        const url = `${base}?token=${encodeURIComponent(token)}`;
        if (!stop) {
          setHttpSession(null);
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
      if (httpModeRef.current) {
        if (payload?.emote) {
          pendingEmoteRef.current = payload.emote;
        }
        return;
      }
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
    const trimmed = text.trim();
    if (!trimmed) return;
    const { clean } = filterProfanity(trimmed);
    if (httpModeRef.current) {
      pendingChatRef.current = clean;
      return;
    }
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !readyRef.current) return;
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

  // HTTP polling transport for hosted environments that cannot run a WebSocket server.
  useEffect(() => {
    if (!httpSession) {
      httpModeRef.current = false;
      return;
    }

    let stop = false;
    let timer: number | null = null;
    let joined = false;
    httpModeRef.current = true;
    readyRef.current = false;
    setStatus('authenticating');
    setInfo('Syncing plaza...');

    const applyPlayers = (incoming: PlayerState[]) => {
      const now = performance.now();
      const next = new Map<string, PlayerView>();
      for (const state of incoming) {
        const previous = playersRef.current.get(state.id);
        if (previous) {
          const view: PlayerView = {
            ...previous,
            ...state,
            pos: { ...state.pos },
            targetPos: { ...state.pos },
            renderPos: previous.renderPos || { ...state.pos },
            lastUpdate: now,
          };
          if (state.emote) {
            view.activeEmote = { code: state.emote, until: now + 1_800 };
          }
          next.set(state.id, view);
        } else {
          const hydrated = hydratePlayer(state);
          if (state.emote) {
            hydrated.activeEmote = { code: state.emote, until: now + 1_800 };
          }
          next.set(state.id, hydrated);
        }
      }
      replacePlayers(next);
    };

    const poll = async () => {
      if (stop) return;
      const emote = pendingEmoteRef.current;
      const chat = pendingChatRef.current;
      pendingEmoteRef.current = null;
      pendingChatRef.current = null;

      try {
        const started = Date.now();
        const response = await fetch(httpSession.syncPath, {
          method: 'POST',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            token: httpSession.token,
            seq: seqRef.current++,
            axes: axesRef.current,
            characterId: selectedCharRef.current,
            ...(emote ? { emote } : {}),
            ...(chat ? { chat } : {}),
          }),
        });
        const body = await response.json().catch(() => null) as HttpPlazaResponse | null;
        if (!response.ok || !body?.ok) {
          throw new Error(body?.error || `sync_http_${response.status}`);
        }
        const sessionId = body.sessionId || youIdRef.current;
        if (sessionId) {
          setYouId(sessionId);
          youIdRef.current = sessionId;
        }
        if (!joined) {
          joined = true;
          readyRef.current = true;
          setStatus('ready');
          setInfo(body.motd || 'Connected');
          appendMessage({ id: `system-${Date.now()}`, text: 'You entered the plaza.', ts: Date.now(), system: true });
        }
        if (Array.isArray(body.players)) {
          applyPlayers(body.players);
        }
        if (Array.isArray(body.chat)) {
          setChatLog(body.chat.map((entry) => ({
            id: entry.id,
            text: entry.text,
            ts: entry.ts,
            from: entry.from,
            authorId: entry.authorId,
            flagged: Boolean(entry.flagged),
          })));
        }
        if (typeof body.playerCount === 'number') {
          setPlayerCount(body.playerCount);
        }
        setLatency(Date.now() - started);
      } catch (error: any) {
        if (stop) return;
        readyRef.current = false;
        setStatus('error');
        setInfo(error?.message || 'Plaza sync failed.');
      }
    };

    void poll();
    timer = window.setInterval(() => {
      void poll();
    }, httpSession.snapshotInterval);

    return () => {
      stop = true;
      httpModeRef.current = false;
      readyRef.current = false;
      if (timer !== null) {
        window.clearInterval(timer);
      }
    };
  }, [httpSession, hydratePlayer, replacePlayers, appendMessage]);

  // Connect WS
  useEffect(() => {
    if (!wsUrl) return;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    readyRef.current = false;
    setStatus('authenticating');
    setInfo('Handshaking...');

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
      const normalizedKey = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const isMovementKey = MOVEMENT_KEYS.has(normalizedKey);
      if (chatFocused) {
        if (!isKeyDown && isMovementKey) {
          const a = axesRef.current;
          if (normalizedKey === 'w' || normalizedKey === 'ArrowUp') a.y = a.y === -1 ? 0 : a.y;
          if (normalizedKey === 's' || normalizedKey === 'ArrowDown') a.y = a.y === 1 ? 0 : a.y;
          if (normalizedKey === 'a' || normalizedKey === 'ArrowLeft') a.x = a.x === -1 ? 0 : a.x;
          if (normalizedKey === 'd' || normalizedKey === 'ArrowRight') a.x = a.x === 1 ? 0 : a.x;
        }
        return;
      }
      if (isMovementKey) {
        e.preventDefault();
        gameStageRef.current?.focus({ preventScroll: true });
      }
      const setAxis = (key: string, pressed: boolean) => {
        const a = axesRef.current;
        if (key === 'w' || key === 'ArrowUp') a.y = pressed ? -1 : (a.y === -1 ? 0 : a.y);
        if (key === 's' || key === 'ArrowDown') a.y = pressed ? 1 : (a.y === 1 ? 0 : a.y);
        if (key === 'a' || key === 'ArrowLeft') a.x = pressed ? -1 : (a.x === -1 ? 0 : a.x);
        if (key === 'd' || key === 'ArrowRight') a.x = pressed ? 1 : (a.x === 1 ? 0 : a.x);
      };
      setAxis(normalizedKey, isKeyDown);
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

  const playerList = useMemo(() => {
    return Array.from(players.values()).sort((a, b) =>
      (a.displayName || '').localeCompare(b.displayName || ''),
    );
  }, [players]);
  const scenePlayers = useMemo(() => Array.from(players.values()), [players]);

  useEffect(() => {
    const renderState = () => JSON.stringify({
      mode: 'signal-plaza',
      coordinates: 'Three.js world space: x increases right, y payload maps to scene z/depth.',
      status,
      info,
      playerCount,
      youId,
      players: Array.from(playersRef.current.values()).map((player) => ({
        id: player.id,
        you: player.id === youIdRef.current,
        displayName: player.displayName,
        characterId: player.characterId,
        pos: player.pos,
        emote: player.activeEmote?.code ?? null,
      })),
      chatCount: chatLog.length,
    });
    window.render_game_to_text = renderState;
    window.advanceTime = (_ms: number) => undefined;
    return () => {
      if (window.render_game_to_text === renderState) {
        delete window.render_game_to_text;
      }
      delete window.advanceTime;
    };
  }, [chatLog.length, info, playerCount, status, youId]);

  const isReady = status === 'ready';

  /* ── Status indicator ── */
  const statusDot =
    status === 'ready' ? '#30D158' :
    status === 'connecting' || status === 'authenticating' ? '#FFD60A' :
    status === 'error' ? '#FF3B30' : '#737373';

  const statusLabel =
    status === 'ready' ? 'Connected' :
    status === 'connecting' ? 'Connecting...' :
    status === 'authenticating' ? 'Authenticating...' :
    status === 'error' ? 'Disconnected' : 'Idle';

  const renderStatusPanel = () => (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-4 text-xs font-bold uppercase tracking-[0.08em] sm:gap-4 sm:px-5 sm:text-sm"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035))',
        border: '1px solid rgba(127,230,255,0.18)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: statusDot, boxShadow: `0 0 16px ${statusDot}` }} />
        <span className="whitespace-nowrap" style={{ color: '#f8fbff' }}>{statusLabel}</span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4" style={{ color: 'rgba(255,255,255,0.64)' }}>
        <span>{playerCount} online</span>
        {latency !== null && <span className="hidden sm:inline" style={{ color: '#30d158' }}>{latency}ms</span>}
      </div>
      {info && status === 'error' && (
        <span className="hidden basis-full text-xs normal-case tracking-normal sm:block" style={{ color: 'rgba(255,59,48,0.8)' }}>
          {info}
        </span>
      )}
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
      <section
        className="overflow-hidden rounded-lg"
        style={{
          background: 'linear-gradient(180deg, rgba(10,18,30,0.88), rgba(4,7,16,0.92))',
          border: '1px solid rgba(127,230,255,0.12)',
          boxShadow: '0 28px 90px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div
          className="flex flex-col gap-5 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-lg"
                style={{
                  color: '#23f3ff',
                  border: '1px solid rgba(35,243,255,0.28)',
                  background: 'rgba(35,243,255,0.06)',
                  boxShadow: '0 0 24px rgba(35,243,255,0.12)',
                }}
                aria-hidden="true"
              >
                &#x1F4E1;
              </span>
              <span
                className="rounded-md px-3 py-1 text-xs font-black uppercase tracking-[0.16em]"
                style={{
                  background: 'rgba(35,243,255,0.075)',
                  color: '#23f3ff',
                  border: '1px solid rgba(35,243,255,0.26)',
                }}
              >
                Preview
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl font-black leading-none tracking-normal md:text-5xl" style={{ color: '#f8fbff' }}>
              Signal Plaza
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed md:text-base" style={{ color: 'rgba(248,251,255,0.66)' }}>
              The nightly link-up inside the Skylink Atrium. DJ Prismix keeps the shard stable
              so crews can sync strats, swap charm loadouts, and show off new footwork.
            </p>
          </div>

          <Link
            href="/play"
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition lg:self-center"
            style={{
              border: '1px solid rgba(255,255,255,0.13)',
              color: 'rgba(248,251,255,0.72)',
              background: 'rgba(255,255,255,0.035)',
            }}
          >
            <span aria-hidden="true">&larr;</span>
            Back to Play
          </Link>
        </div>

        <div className="px-4 pb-4 lg:hidden">
          {renderStatusPanel()}
        </div>

        <div
          ref={gameStageRef}
          tabIndex={0}
          role="application"
          aria-label="Signal Plaza multiplayer game stage"
          className="relative isolate overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[#7FE6FF]/60"
          style={{
            height: `clamp(430px, 52svh, ${Math.max(430, height - 160)}px)`,
            minHeight: 420,
            background: '#050b16',
            boxShadow: 'inset 0 0 0 1px rgba(35,243,255,0.1), inset 0 -70px 120px rgba(0,0,0,0.42)',
            touchAction: 'none',
            overscrollBehavior: 'contain',
          }}
          onPointerDown={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest('button, select, input, textarea')) return;
            gameStageRef.current?.focus({ preventScroll: true });
          }}
        >
          <Image
            src="/assets/plaza/signal-plaza-stage.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            fill
            priority
            sizes="(min-width: 1024px) calc(100vw - 620px), 100vw"
            className="pointer-events-none absolute inset-0 select-none object-cover"
          />
          <div className="absolute inset-0">
            <PlazaThreeScene players={scenePlayers} youId={youId} axesRef={axesRef} />
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.05), transparent 15%, transparent 78%, rgba(0,0,0,0.42)), radial-gradient(circle at 50% 50%, transparent 49%, rgba(3,8,16,0.5))',
            }}
          />
          <div
            className="pointer-events-none absolute bottom-5 left-5 hidden rounded-lg border px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] md:block"
            style={{
              color: 'rgba(248,251,255,0.72)',
              background: 'rgba(3,6,14,0.66)',
              borderColor: 'rgba(127,230,255,0.16)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div className="grid grid-cols-[34px_34px_34px_1fr] gap-1.5">
              <span />
              <kbd className="rounded border px-2 py-1 text-center" style={{ borderColor: 'rgba(35,243,255,0.42)', color: '#23f3ff' }}>W</kbd>
              <span />
              <span className="row-span-2 ml-4 flex items-center text-left leading-5" style={{ color: 'rgba(248,251,255,0.58)' }}>
                Move<br />Click emotes<br />Chat to connect
              </span>
              <kbd className="rounded border px-2 py-1 text-center" style={{ borderColor: 'rgba(35,243,255,0.42)', color: '#23f3ff' }}>A</kbd>
              <kbd className="rounded border px-2 py-1 text-center" style={{ borderColor: 'rgba(35,243,255,0.42)', color: '#23f3ff' }}>S</kbd>
              <kbd className="rounded border px-2 py-1 text-center" style={{ borderColor: 'rgba(35,243,255,0.42)', color: '#23f3ff' }}>D</kbd>
            </div>
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

        <div
          className="flex flex-wrap items-center justify-center gap-3 px-4 py-5 sm:justify-start sm:px-6"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.07)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(0,0,0,0.1))',
          }}
        >
          {EMOTES.map((emote) => (
            <button
              key={emote.code}
              type="button"
              onClick={() => sendInput({ emote: emote.code })}
              className="flex min-w-[54px] items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-extrabold transition-all sm:min-w-[170px] sm:px-5"
              style={{
                background: 'linear-gradient(180deg, rgba(10,18,32,0.94), rgba(5,8,17,0.94))',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(127,230,255,0.18)',
                color: 'rgba(255,255,255,0.88)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
              }}
              disabled={!isReady}
              title={`${emote.label} (${emote.key})`}
            >
              <span className="text-lg">{emote.glyph}</span>
              <span className="hidden sm:inline">{emote.label}</span>
              <span className="hidden rounded border px-2 py-0.5 text-[0.62rem] sm:inline" style={{ borderColor: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.5)' }}>
                {emote.key}
              </span>
            </button>
          ))}
        </div>
      </section>

      <aside
        className="flex flex-col gap-4"
        style={{ minHeight: `clamp(560px, 74svh, ${height + 20}px)` }}
      >
        <div className="hidden lg:block">
          {renderStatusPanel()}
        </div>

        {/* Chat panel */}
        <div
          className="flex flex-1 flex-col rounded-lg"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.026))',
            border: '1px solid rgba(127,230,255,0.14)',
            minHeight: '420px',
            boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
          }}
        >
          <div
            className="flex items-center gap-8 px-5 py-4 text-sm font-black uppercase tracking-[0.1em]"
            style={{ color: 'rgba(255,255,255,0.54)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span style={{ color: '#23f3ff', textShadow: '0 0 16px rgba(35,243,255,0.45)' }}>Chat</span>
            <span>Players</span>
            <span className="ml-auto rounded-md border px-2 py-0.5 text-xs" style={{ borderColor: 'rgba(255,255,255,0.14)' }}>{playerCount}</span>
          </div>
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-5 py-4 text-sm"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent',
              overscrollBehavior: 'contain',
            }}
          >
            {chatLog.length === 0 && (
              <div className="flex min-h-[260px] items-center justify-center text-center text-sm" style={{ color: 'rgba(255,255,255,0.32)' }}>
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
            className="flex items-center gap-3 px-4 py-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            onSubmit={(e) => {
              e.preventDefault();
              sendChat(chatInput);
              setChatInput('');
            }}
          >
            <input
              ref={chatInputRef}
              className="min-w-0 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-1"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.8)',
                caretColor: '#FF8EC9',
              }}
              placeholder="Send a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onFocus={() => setChatFocused(true)}
              onBlur={() => setChatFocused(false)}
              maxLength={200}
              disabled={!isReady}
            />
            <button
              type="submit"
              className="rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all"
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
          className="rounded-lg"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.026))',
            border: '1px solid rgba(127,230,255,0.14)',
            boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
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
          <ul className="max-h-44 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {playerList.length === 0 && (
              <li className="py-3 text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Waiting for players...
              </li>
            )}
            {playerList.map((player) => {
              const isYouPlayer = player.id === youId;
              const color = charColor(player.characterId);
              return (
                <li
                  key={player.id}
                  className="flex items-center gap-3 py-1.5"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: color, boxShadow: `0 0 12px ${color}` }}
                  />
                  <span
                    className="truncate text-xs font-black"
                    style={{ color: isYouPlayer ? '#FF8EC9' : 'rgba(255,255,255,0.58)' }}
                  >
                    {isYouPlayer ? 'You' : (player.displayName || player.id.slice(0, 6))}
                  </span>
                  {player.characterId && (
                    <span
                      className="ml-auto truncate text-[0.6rem]"
                      style={{ color: 'rgba(255,255,255,0.24)' }}
                    >
                      {charName(player.characterId) || player.characterId}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
