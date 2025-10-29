"use client";

import { useEffect, useRef } from "react";

export default function InteractionEffects() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || typeof window === "undefined") return;

    const pointerFineQuery = window.matchMedia("(pointer: fine)");
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isInteractive = () => pointerFineQuery.matches && !reducedQuery.matches;

    if (!isInteractive()) {
      cursor.style.display = "none";
      return;
    }

    cursor.dataset.tint = "default";
    cursor.dataset.state = "idle";
    cursor.style.opacity = "0";

    let magnetElements: HTMLElement[] = [];
    let lastRefresh = 0;
    const refreshMagnets = (force = false) => {
      const now = performance.now();
      if (!force && now - lastRefresh < 600) return;
      magnetElements = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
      lastRefresh = now;
    };

    refreshMagnets(true);

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let scale = 1;
    let raf = 0;

    const animate = () => {
      currentX += (targetX - currentX) * 0.22;
      currentY += (targetY - currentY) * 0.22;
      cursor.style.transform = `translate3d(${currentX - 18}px, ${currentY - 18}px, 0) scale(${scale})`;
      raf = window.requestAnimationFrame(animate);
    };
    raf = window.requestAnimationFrame(animate);

    const evaluate = (x: number, y: number) => {
      refreshMagnets();
      let closest: { el: HTMLElement; dist: number; rect: DOMRect } | null = null;
      for (const el of magnetElements) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        if (!closest || dist < closest.dist) {
          closest = { el, dist, rect };
        }
      }

      if (!closest) {
        scale = 1;
        cursor.style.opacity = "0.65";
        cursor.dataset.tint = "default";
        cursor.dataset.state = "idle";
        return;
      }

      const radius = Math.max(120, Math.min(closest.rect.width, closest.rect.height) * 1.8);
      const intensity = Math.max(0, 1 - closest.dist / radius);
      if (intensity <= 0.02) {
        scale = 1;
        cursor.style.opacity = "0.65";
        cursor.dataset.tint = "default";
        cursor.dataset.state = "idle";
        return;
      }

      const magnetCx = closest.rect.left + closest.rect.width / 2;
      const magnetCy = closest.rect.top + closest.rect.height / 2;
      targetX = x + (magnetCx - x) * intensity * 0.18;
      targetY = y + (magnetCy - y) * intensity * 0.18;
      scale = 1 + intensity * 1.25;
      cursor.style.opacity = `${0.65 + intensity * 0.3}`;
      cursor.dataset.tint = closest.el.dataset.magneticColor || "default";
      cursor.dataset.state = "magnet";
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      evaluate(event.clientX, event.clientY);
    };

    const handlePointerLeave = () => {
      cursor.style.opacity = "0";
      cursor.dataset.state = "idle";
    };

    const handlePointerEnter = () => {
      cursor.style.opacity = "0.65";
    };

    const handleResize = () => refreshMagnets(true);
    const handleFocusIn = () => refreshMagnets(true);

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("pointerenter", handlePointerEnter);
    window.addEventListener("resize", handleResize);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("pointerdown", handleFocusIn);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("pointerenter", handlePointerEnter);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("pointerdown", handleFocusIn);
    };
  }, []);

  useEffect(() => {
    const handleRipple = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-ripple]");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "cp-ripple-splash";
      const size = Math.max(rect.width, rect.height) * 1.2;
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      target.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    };
    document.addEventListener("pointerdown", handleRipple);
    return () => document.removeEventListener("pointerdown", handleRipple);
  }, []);

  return <div ref={cursorRef} className="cp-magnetic-cursor" aria-hidden />;
}
