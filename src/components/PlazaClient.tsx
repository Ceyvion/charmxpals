"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlayerState, S2C } from '@/lib/mmo/messages';

type PlazaClientProps = { height?: number };

type PlayerView = PlayerState & { ghost?: { x: number; y: number; t: number } };

export default function PlazaClient({ height = 420 }: PlazaClientProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [info, setInfo] = useState<string>('');
  const [players, setPlayers] = useState<Map<string, PlayerView>>(new Map());
  const [youId, setYouId] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const axesRef = useRef({ x: 0, y: 0 });
  const seqRef = useRef(1);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch token and compute WS URL
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        setStatus('connecting');
        let res = await fetch('/api/mmo/token', { cache: 'no-store' });
        if (res.status === 401) {
          // try dev user in non-prod
          await fetch('/api/dev/user', { cache: 'no-store' });
          res = await fetch('/api/mmo/token', { cache: 'no-store' });
        }
        if (!res.ok) throw new Error('token fetch failed');
        const body = await res.json();
        const token = body.token as string;
        const base = process.env.NEXT_PUBLIC_MMO_WS_URL || `ws://localhost:${process.env.NEXT_PUBLIC_MMO_WS_PORT || 8787}`;
        const url = `${base}?token=${encodeURIComponent(token)}`;
        if (stop) return;
        setWsUrl(url);
      } catch (e: any) {
        setStatus('error');
        setInfo(e?.message || 'failed');
      }
    })();
    return () => { stop = true; };
  }, []);

  // Connect WS
  useEffect(() => {
    if (!wsUrl) return;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      setStatus('connected');
      ws.send(JSON.stringify({ type: 'hello', build: 'dev' }));
      ws.send(JSON.stringify({ type: 'select_avatar', characterId: 'demo' }));
    };
    ws.onmessage = (e) => {
      let msg: S2C | null = null;
      try { msg = JSON.parse(String(e.data)); } catch {}
      if (!msg) return;
      if (msg.type === 'welcome') setInfo(`instance ${msg.instanceId}`);
      if (msg.type === 'auth_ok') setYouId(msg.sessionId);
      if (msg.type === 'joined') {
        const map = new Map<string, PlayerView>();
        map.set(msg.you.id, msg.you as PlayerView);
        for (const p of msg.others) map.set(p.id, p as PlayerView);
        setPlayers(map);
      }
      if (msg.type === 'state') {
        setPlayers((prev) => {
          const map = new Map(prev);
          for (const p of msg.players) {
            const id = (p as any).id as string;
            const current = map.get(id);
            if (!current) continue;
            const next = { ...current } as PlayerView;
            if ((p as any).pos) {
              const np = (p as any).pos;
              // interpolate others; snap self
              if (id === youId) {
                next.pos = np;
              } else {
                next.ghost = { x: next.pos.x, y: next.pos.y, t: performance.now() };
                next.pos = np;
              }
            }
            if ((p as any).rot !== undefined) next.rot = (p as any).rot as number;
            map.set(id, next);
          }
          return map;
        });
      }
      if (msg.type === 'event') {
        if (msg.event === 'join') {
          setPlayers((prev) => {
            const map = new Map(prev);
            const pv = msg.data.player as PlayerView;
            map.set(pv.id, pv);
            return map;
          });
        }
        if (msg.event === 'leave') setPlayers((prev) => { const m = new Map(prev); m.delete(msg.data.id); return m; });
        if (msg.event === 'chat') setInfo(`${msg.data.id}: ${msg.data.text}`);
      }
    };
    ws.onclose = () => setStatus('error');
    return () => { ws.close(); wsRef.current = null; };
  }, [wsUrl, youId]);

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
    const iv = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const seq = seqRef.current++;
      wsRef.current.send(JSON.stringify({ type: 'input', seq, ts: Date.now(), axes: axesRef.current }));
    }, 50);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); clearInterval(iv); };
  }, []);

  // Render canvas
  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let raf = 0;
    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = c.clientWidth, H = c.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
        c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      }
      ctx.save(); ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, W, H);
      // background grid
      ctx.fillStyle = '#F7F5FF'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(198,165,255,0.28)'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // world bounds
      const scale = 22; // world units to px
      const ox = W / 2, oy = H / 2;

      // draw players
      players.forEach((p) => {
        const px = ox + p.pos.x * scale;
        const py = oy + p.pos.y * scale;
        ctx.fillStyle = p.id === youId ? '#FF8EC9' : '#7FE6FF';
        ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
        // direction
        ctx.strokeStyle = 'rgba(48,18,67,0.45)';
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(p.rot) * 14, py + Math.sin(p.rot) * 14); ctx.stroke();
        // label
        ctx.fillStyle = '#301243'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(p.displayName || p.id.slice(0, 4), px, py - 12);
      });
      ctx.restore();
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [players, youId]);

  return (
    <div className="cp-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-300">Status: {status}{info ? ` — ${info}` : ''}</div>
        <div className="text-xs text-gray-400">WASD/Arrows to move</div>
      </div>
      <div className="relative w-full">
        <canvas ref={canvasRef} style={{ width: '100%', height }} />
      </div>
    </div>
  );
}
