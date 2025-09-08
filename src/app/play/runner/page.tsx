'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function RunnerGame() {
  const [gameState, setGameState] = useState<'menu'|'playing'|'gameOver'>('menu');
  const [score, setScore] = useState(0);
  // simple physics
  const [playerY, setPlayerY] = useState(0); // 0 ground, up negative
  const velRef = useRef(0);
  const obstaclesRef = useRef<Array<{ id: number; x: number; w: number; h: number }>>([]);
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const idCounter = useRef(1);

  const reset = () => {
    setScore(0);
    setPlayerY(0);
    velRef.current = 0;
    obstaclesRef.current = [];
  };

  const startGame = () => {
    reset();
    setGameState('playing');
  };

  const endGame = () => {
    setGameState('gameOver');
    tickRef.current && clearInterval(tickRef.current);
    spawnRef.current && clearInterval(spawnRef.current);
  };

  const jump = () => {
    if (gameState !== 'playing') return;
    if (playerY === 0) {
      velRef.current = -10; // jump impulse
    }
  };

  // Input
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, playerY]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const gravity = 0.6;
    const ground = 0;
    const speed = 4;

    tickRef.current && clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      // physics
      velRef.current += gravity;
      let nextY = playerY + velRef.current;
      if (nextY > ground) { nextY = ground; velRef.current = 0; }
      setPlayerY(nextY);

      // move obstacles
      const width = containerRef.current?.clientWidth || 800;
      obstaclesRef.current = obstaclesRef.current
        .map((o) => ({ ...o, x: o.x - speed }))
        .filter((o) => o.x + o.w > 0);

      // collision check (player at x=10% of width, size 40x40)
      const px = Math.round(width * 0.1);
      const py = Math.round((containerRef.current?.clientHeight || 384) - 40 - nextY);
      const playerRect = { x: px, y: py, w: 40, h: 40 };
      for (const o of obstaclesRef.current) {
        const r = { x: o.x, y: (containerRef.current?.clientHeight || 384) - o.h, w: o.w, h: o.h };
        const overlap = !(playerRect.x + playerRect.w < r.x || playerRect.x > r.x + r.w || playerRect.y + playerRect.h < r.y || playerRect.y > r.y + r.h);
        if (overlap) { endGame(); return; }
      }

      // score increases over time
      setScore((s) => s + 1);
    }, 16);

    // spawn obstacles
    spawnRef.current && clearInterval(spawnRef.current);
    spawnRef.current = setInterval(() => {
      const width = containerRef.current?.clientWidth || 800;
      const h = 30 + Math.round(Math.random() * 40);
      const w = 20 + Math.round(Math.random() * 30);
      obstaclesRef.current.push({ id: idCounter.current++, x: width + 20, w, h });
    }, 1200);

    return () => {
      tickRef.current && clearInterval(tickRef.current);
      spawnRef.current && clearInterval(spawnRef.current);
    };
  }, [gameState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-rose-500 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white bg-opacity-20 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Game Header */}
        <div className="p-4 bg-black bg-opacity-30 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Endless Runner</h1>
          <div className="text-white">
            <span className="text-sm opacity-80">Score</span>
            <div className="text-xl font-bold">{score}</div>
          </div>
        </div>
        
        {/* Game Area */}
        <div ref={containerRef} className="relative h-96 w-full bg-gradient-to-b from-blue-300 to-blue-500 overflow-hidden">
          {gameState === 'menu' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-40">
              <h2 className="text-4xl font-bold text-white mb-4">Endless Runner</h2>
              <p className="text-white text-lg mb-8">Press SPACE or tap to jump</p>
              <button
                className="px-8 py-3 bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold rounded-full shadow-lg"
                onClick={startGame}
              >
                Start Game
              </button>
            </div>
          )}
          
          {gameState === 'gameOver' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-60">
              <h2 className="text-4xl font-bold text-white mb-2">Game Over!</h2>
              <p className="text-2xl text-white mb-8">Score: {score}</p>
              <div className="flex space-x-4">
                <button
                  className="px-6 py-3 bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold rounded-full shadow-lg"
                  onClick={startGame}
                >
                  Play Again
                </button>
                <Link
                  href="/play"
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-amber-500 text-white font-bold rounded-full shadow-lg"
                >
                  Game Hub
                </Link>
              </div>
            </div>
          )}
          
          {gameState === 'playing' && (
            <>
              {/* Player */}
              <div
                className="absolute w-10 h-10 bg-red-500 rounded"
                style={{ left: '10%', bottom: `${playerY}px` }}
              />
              {/* Obstacles */}
              {obstaclesRef.current.map((o) => (
                <div key={o.id} className="absolute bg-gray-900/80" style={{ left: o.x, bottom: 0, width: o.w, height: o.h }} />
              ))}
              {/* Ground */}
              <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-green-700 to-green-500"></div>
            </>
          )}
        </div>
      </div>
      
      <div className="mt-8 flex space-x-4">
        <Link
          href="/play"
          className="px-6 py-3 bg-white bg-opacity-20 text-white rounded-lg font-medium hover:bg-opacity-30 transition-all"
        >
          Back to Games
        </Link>
        <button onClick={jump} className="px-6 py-3 bg-white bg-opacity-20 text-white rounded-lg font-medium hover:bg-opacity-30 transition-all">Jump</button>
        <Link
          href="/"
          className="px-6 py-3 bg-white bg-opacity-20 text-white rounded-lg font-medium hover:bg-opacity-30 transition-all"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
