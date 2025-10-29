"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number;
};

const PARTICLE_COUNT = 72;
const TRAIL_INFLUENCE = 0.018;
const BASE_DRIFT = 0.06;

function createParticle(width: number, height: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * Math.max(width, height);
  const x = Math.cos(angle) * radius * 0.2 + width / 2;
  const y = Math.sin(angle) * radius * 0.2 + height / 2;
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: 0.8 + Math.random() * 2.2,
    alpha: 0.18 + Math.random() * 0.35,
    hue: 250 + Math.random() * 70,
  };
}

export default function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (prefersReduced?.matches) return;

    let animationFrame = 0;
    const pointer = { x: 0, y: 0, active: false };
    const particles: Particle[] = [];
    let deviceRatio = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      deviceRatio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * deviceRatio);
      canvas.height = Math.round(rect.height * deviceRatio);
      ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);

      pointer.x = rect.width / 2;
      pointer.y = rect.height / 2;
      particles.length = 0;
      for (let i = 0; i < PARTICLE_COUNT; i += 1) {
        particles.push(createParticle(rect.width, rect.height));
      }
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      animationFrame = window.requestAnimationFrame(render);
      ctx.clearRect(0, 0, rect.width, rect.height);

      particles.forEach((particle, index) => {
        const dx = pointer.x - particle.x;
        const dy = pointer.y - particle.y;
        const dist = Math.max(12, Math.sqrt(dx * dx + dy * dy));
        const attract = pointer.active ? Math.min(0.35, 12 / dist) : 0.25 / dist;

        particle.vx += Math.cos(index + particle.y * 0.015) * BASE_DRIFT;
        particle.vy += Math.sin(index + particle.x * 0.015) * BASE_DRIFT;
        particle.vx += dx * attract * TRAIL_INFLUENCE;
        particle.vy += dy * attract * TRAIL_INFLUENCE;
        particle.vx *= 0.92;
        particle.vy *= 0.92;
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (
          particle.x < -80 ||
          particle.y < -80 ||
          particle.x > rect.width + 80 ||
          particle.y > rect.height + 80
        ) {
          Object.assign(particle, createParticle(rect.width, rect.height));
        }

        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 24
        );
        gradient.addColorStop(0, `hsla(${particle.hue}, 95%, 76%, ${particle.alpha})`);
        gradient.addColorStop(0.45, `hsla(${particle.hue + 14}, 90%, 72%, ${particle.alpha * 0.65})`);
        gradient.addColorStop(1, `hsla(${particle.hue + 30}, 92%, 60%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 16, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const updatePointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = event.pointerType === "mouse" || event.pointerType === "pen";
    };

    const disablePointer = () => {
      pointer.active = false;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(animationFrame);
      } else {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    resize();
    animationFrame = window.requestAnimationFrame(render);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerleave", disablePointer);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerleave", disablePointer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="cp-hero-particles" aria-hidden />;
}
