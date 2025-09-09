"use client";

import { useEffect, useRef, useState } from 'react';

type GameState = 'menu' | 'playing' | 'paused' | 'over';

type RunnerProps = {
  stats?: Record<string, number> | null;
  audio?: { enabled: boolean; playJump?: () => void; playCoin?: () => void } | null;
  onGameOver?: (finalScore: number, coins: number) => void;
};

export default function Runner({ stats, audio, onGameOver }: RunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [state, setState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);

  const world = useRef({
    t: 0,
    speed: 240, // px/s base (will be adjusted by stats)
    gravity: 1800,
    ground: 0,
    lastSpawn: 0,
    lastCoinSpawn: 0,
    obstacles: [] as Array<{ x:number;y:number;w:number;h:number; kind:'ground'|'flying' }>,
    coins: [] as Array<{ x:number;y:number;r:number }>,
    player: { x: 0, y: 0, w: 38, h: 44, vy: 0, onGround: true, sliding:false, slideUntil:0, doubleLeft:1, invulnUntil:0 },
    tuning: { baseSpeed: 260, slideMs: 420, invulnMs: 800 },
  });

  // Resize canvas to container and devicePixelRatio
  useEffect(() => {
    const resize = () => {
      const el = canvasRef.current, c = containerRef.current;
      if (!el || !c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(320, c.clientWidth);
      const h = Math.max(260, Math.round(Math.min(480, c.clientWidth * 0.55)));
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      el.style.width = w + 'px';
      el.style.height = h + 'px';
      const ground = Math.round(h * 0.82);
      world.current.ground = ground / dpr;
      world.current.player.x = Math.round((w * 0.18) / dpr);
    };
    resize();
    const obs = new ResizeObserver(resize);
    if (containerRef.current) obs.observe(containerRef.current);
    window.addEventListener('orientationchange', resize);
    return () => { obs.disconnect(); window.removeEventListener('orientationchange', resize); };
  }, []);

  const reset = () => {
    const w = world.current;
    // derive tuning from stats (defaults center around 50)
    const spd = Math.max(0, Math.min(100, Number((stats as any)?.speed ?? (stats as any)?.Speed ?? (stats as any)?.SPEED ?? (stats as any)?.['Speed'] ?? 50)));
    const intl = Math.max(0, Math.min(100, Number((stats as any)?.intelligence ?? (stats as any)?.Intelligence ?? (stats as any)?.INTELLIGENCE ?? (stats as any)?.['Intelligence'] ?? 50)));
    const def = Math.max(0, Math.min(100, Number((stats as any)?.defense ?? (stats as any)?.Defense ?? (stats as any)?.DEFENSE ?? (stats as any)?.['Defense'] ?? 50)));
    w.tuning.baseSpeed = Math.round(220 + spd * 0.8); // 220..300
    w.tuning.invulnMs = Math.round(700 + intl * 6);   // 700..1300
    w.tuning.slideMs = Math.round(350 + def * 4);     // 350..750

    w.t = 0; w.speed = w.tuning.baseSpeed; w.lastSpawn = 0; w.lastCoinSpawn = 0;
    w.obstacles = []; w.coins = [];
    w.player.y = 0; w.player.vy = 0; w.player.onGround = true; w.player.sliding = false; w.player.doubleLeft = 1; w.player.invulnUntil = 0;
    setScore(0); setCoins(0);
  };

  const jump = () => {
    if (state !== 'playing') return;
    const p = world.current.player;
    if (p.onGround) { p.vy = -580; p.onGround = false; audio?.enabled && audio?.playJump?.(); }
    else if (p.doubleLeft > 0) { p.vy = -520; p.doubleLeft -= 1; }
  };
  const slide = () => {
    if (state !== 'playing') return;
    const p = world.current.player;
    if (!p.sliding && p.onGround) {
      p.sliding = true; p.slideUntil = world.current.t + world.current.tuning.slideMs; // ms (defense)
    }
  };

  // Input: keyboard + touch
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); slide(); }
      if (e.code === 'Enter' && state !== 'playing') { e.preventDefault(); setState('playing'); reset(); }
      if (e.code === 'KeyP') { setState((s) => s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s); }
    };
    let touchStartY = 0, touchStartX = 0;
    const onTouchStart = (e: TouchEvent) => { const t = e.touches[0]; touchStartY = t.clientY; touchStartX = t.clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      const dy = t.clientY - touchStartY; const dx = Math.abs(t.clientX - touchStartX);
      if (dy > 24 && dx < 80) slide(); else jump();
    };
    window.addEventListener('keydown', onKey);
    const el = canvasRef.current; el?.addEventListener('touchstart', onTouchStart, { passive: true }); el?.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { window.removeEventListener('keydown', onKey); el?.removeEventListener('touchstart', onTouchStart); el?.removeEventListener('touchend', onTouchEnd); };
  }, [state]);

  // Loop
  useEffect(() => {
    const step = (now: number) => {
      const c = canvasRef.current; if (!c) { rafRef.current = requestAnimationFrame(step); return; }
      const ctx = c.getContext('2d')!;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = c.width / dpr, H = c.height / dpr;
      const w = world.current;
      // timing
      const prev = (step as any)._prev || now; (step as any)._prev = now;
      const dt = Math.min(48, now - prev); // ms
      if (state === 'playing') w.t += dt;

      // update physics
      if (state === 'playing') {
        w.speed = Math.min(520, w.speed + dt * 0.02);
        const p = w.player;
        p.vy += (w.gravity * dt) / 1000 * (p.sliding ? 1.15 : 1);
        p.y += (p.vy * dt) / 1000;
        const groundY = 0; // in our system, player y=0 is ground offset (we draw with ground line)
        if (p.y > groundY) { p.y = groundY; p.vy = 0; if (!p.onGround) p.doubleLeft = 1; p.onGround = true; }
        if (p.sliding && w.t > p.slideUntil) p.sliding = false;

        // move obstacles/coins
        const dx = (w.speed * dt) / 1000;
        w.obstacles.forEach(o => o.x -= dx);
        w.coins.forEach(cn => cn.x -= dx);
        w.obstacles = w.obstacles.filter(o => o.x + o.w > -4);
        w.coins = w.coins.filter(co => co.x + co.r > -4);

        // spawn
        if (w.t - w.lastSpawn > Math.max(520, 1400 - (w.speed - 260))) {
          w.lastSpawn = w.t;
          if (Math.random() < 0.3) {
            // flying
            const h = 26 + Math.random() * 16, wdt = 34 + Math.random() * 24;
            const y = (H * 0.55) - (Math.random() * 40);
            w.obstacles.push({ x: W + 30, y, w: wdt, h, kind: 'flying' });
          } else {
            // ground
            const h = 26 + Math.random() * 70, wdt = 24 + Math.random() * 40;
            const y = w.ground - h;
            w.obstacles.push({ x: W + 30, y, w: wdt, h, kind: 'ground' });
          }
        }
        if (w.t - w.lastCoinSpawn > 900) {
          w.lastCoinSpawn = w.t;
          const baseY = H * (0.45 + Math.random() * 0.2);
          const n = 3 + Math.floor(Math.random() * 4);
          for (let i=0;i<n;i++) w.coins.push({ x: W + 30 + i*24, y: baseY - i * 6, r: 7 });
        }

        // collisions
        const px = w.player.x, py = (w.ground - (w.player.sliding ? 28 : w.player.h)) - w.player.y;
        const pw = w.player.w, ph = w.player.sliding ? 28 : w.player.h;
        const nowMs = w.t;
        for (const o of w.obstacles) {
          if (nowMs < w.player.invulnUntil) continue;
          const hit = !(px+pw < o.x || px > o.x+o.w || py+ph < o.y || py > o.y+o.h);
          if (hit) { setState('over'); w.player.invulnUntil = nowMs + w.tuning.invulnMs; onGameOver?.(score, coins); }
        }
        // coin collect
        w.coins = w.coins.filter(co => {
          const hit = !(px+pw < co.x-co.r || px > co.x+co.r || py+ph < co.y-co.r || py > co.y+co.r);
          if (hit) { setCoins((c)=>c+1); audio?.enabled && audio?.playCoin?.(); }
          return !hit;
        });

        // score
        setScore(s => s + Math.round((w.speed * dt) / 1200));
      }

      // draw
      ctx.save();
      ctx.scale(dpr, dpr);
      // sky
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(16,20,30,0.9)');
      g.addColorStop(1, 'rgba(24,28,40,0.9)');
      ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
      // parallax hills
      const baseX = (w.t * 0.04) % (W*2);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i=-1;i<3;i++) {
        const x = -baseX + i*W*0.9; const y = H*0.75;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x+W*0.2, y-90, x+W*0.45, y);
        ctx.quadraticCurveTo(x+W*0.7, y+60, x+W*0.95, y); ctx.lineTo(x+W, H); ctx.lineTo(x, H); ctx.closePath(); ctx.fill();
      }
      // ground line
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(0, w.ground+1, W, 2);
      // grid marks
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x=0;x<W;x+=24) { ctx.moveTo(x, w.ground); ctx.lineTo(x, H); }
      ctx.stroke();

      // coins
      for (const co of w.coins) { ctx.fillStyle = 'rgba(255,215,0,0.9)'; ctx.beginPath(); ctx.arc(co.x, co.y, co.r, 0, Math.PI*2); ctx.fill(); }

      // obstacles
      for (const o of w.obstacles) {
        ctx.fillStyle = o.kind==='ground' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.7)';
        ctx.fillRect(o.x, o.y, o.w, o.h);
      }

      // player
      const px = w.player.x, py = (w.ground - (w.player.sliding ? 28 : w.player.h)) - w.player.y;
      ctx.fillStyle = 'white';
      ctx.save();
      ctx.translate(px, py);
      ctx.fillRect(0,0,w.player.w, w.player.sliding ? 28 : w.player.h);
      // face
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(8,8,6,6); ctx.fillRect(22,8,6,6);
      ctx.restore();

      // HUD
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 16px Inter, system-ui, sans-serif'; ctx.fillText(`Score ${score}`, 12, 22);
      ctx.fillText(`Coins ${coins}`, 12, 42);
      // show stat hooks when available
      if (stats) {
        ctx.font = '500 12px Inter, system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(`Base ${world.current.tuning.baseSpeed}px/s • Slide ${world.current.tuning.slideMs}ms • Invuln ${world.current.tuning.invulnMs}ms`, 12, 62);
      }
      if (state !== 'playing') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle = 'white'; ctx.textAlign = 'center';
        ctx.font = '800 28px Inter, system-ui, sans-serif';
        ctx.fillText(state==='menu'?'Endless Runner':'Game Over', W/2, H/2 - 24);
        ctx.font = '400 14px Inter, system-ui, sans-serif';
        ctx.fillText('Tap/Space to jump • Swipe/Down to slide', W/2, H/2 + 2);
        ctx.fillText('Press Enter to Start', W/2, H/2 + 22);
      }
      ctx.restore();

      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [state, score, coins]);

  return (
    <div className="w-full" ref={containerRef}>
      <canvas ref={canvasRef} className="w-full rounded-xl border border-white/10 bg-black/40" onClick={() => state!=='playing'? (setState('playing'), reset()) : undefined} />
      <div className="mt-3 text-center text-white/80 text-sm">Tap to jump • Swipe down to slide • P to pause</div>
    </div>
  );
}
