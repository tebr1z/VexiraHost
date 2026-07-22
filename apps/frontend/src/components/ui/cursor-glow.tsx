"use client";

import { useEffect, useRef } from "react";

import { useThemeStore } from "@/stores/theme-store";

const LERP = 0.1;

/** Full glow at top → fades out after ~1 viewport so lower sections stay calm. */
function glowOpacityForScroll(scrollY: number, viewportHeight: number): number {
  const fadeStart = viewportHeight * 0.35;
  const fadeEnd = viewportHeight * 1.15;

  if (scrollY <= fadeStart) return 1;
  if (scrollY >= fadeEnd) return 0;

  const progress = (scrollY - fadeStart) / (fadeEnd - fadeStart);
  return 1 - progress;
}

export function CursorGlow(): React.ReactElement | null {
  const resolved = useThemeStore((s) => s.resolved);
  const target = useRef({ x: -9999, y: -9999 });
  const current = useRef({ x: -9999, y: -9999 });
  const layerRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (resolved !== "dark") return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const updateScrollOpacity = () => {
      if (!layerRef.current) return;
      const opacity = glowOpacityForScroll(window.scrollY, window.innerHeight);
      layerRef.current.style.opacity = String(opacity);
      layerRef.current.style.visibility = opacity <= 0.02 ? "hidden" : "visible";
    };

    const onMove = (event: MouseEvent) => {
      target.current = { x: event.clientX, y: event.clientY };
    };

    const onLeave = () => {
      target.current = { x: -9999, y: -9999 };
    };

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * LERP;
      current.current.y += (target.current.y - current.current.y) * LERP;

      if (primaryRef.current) {
        primaryRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (secondaryRef.current) {
        secondaryRef.current.style.transform = `translate3d(${current.current.x + 36}px, ${current.current.y - 28}px, 0) translate(-50%, -50%)`;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", updateScrollOpacity, { passive: true });
    window.addEventListener("resize", updateScrollOpacity, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    updateScrollOpacity();
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", updateScrollOpacity);
      window.removeEventListener("resize", updateScrollOpacity);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(frameRef.current);
    };
  }, [resolved]);

  if (resolved !== "dark") return null;

  return (
    <div
      ref={layerRef}
      className="cursor-glow-layer pointer-events-none fixed inset-0 z-[25] overflow-hidden transition-opacity duration-300"
      aria-hidden
    >
      <div ref={primaryRef} className="cursor-glow-orb cursor-glow-orb-primary" />
      <div ref={secondaryRef} className="cursor-glow-orb cursor-glow-orb-secondary" />
    </div>
  );
}
