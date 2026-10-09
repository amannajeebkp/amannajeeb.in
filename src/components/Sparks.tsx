import { useEffect, useRef } from "react";
import { fxEnabled, PALETTE } from "../lib/fx";

/**
 * Tiny particle bursts on every click/tap, and a big confetti burst on demand
 * (window event "nj:burst"). One canvas, no allocations in the hot loop beyond
 * the particle array itself.
 */

interface P {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; spin: number; rot: number;
}

const COLORS = [PALETTE.violet, PALETTE.pink, PALETTE.sky, PALETTE.yellow, "#ffffff"];

export default function Sparks({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const active = enabled && fxEnabled;

  useEffect(() => {
    if (!active) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const parts: P[] = [];
    let raf = 0;
    let last = performance.now();

    const burst = (x: number, y: number, n: number, power: number, big = false) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (0.35 + Math.random() * 0.65) * power;
        parts.push({
          x, y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - (big ? power * 0.4 : 0),
          life: 0,
          max: big ? 1400 + Math.random() * 900 : 420 + Math.random() * 380,
          size: big ? 5 + Math.random() * 6 : 1.5 + Math.random() * 2.5,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          spin: (Math.random() - 0.5) * 12,
          rot: Math.random() * Math.PI,
        });
      }
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const loop = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        const k = dt / 16.67;
        p.vy += 0.09 * k;              // gravity
        p.vx *= Math.pow(0.96, k);     // drag
        p.vy *= Math.pow(0.96, k);
        p.x += p.vx * k;
        p.y += p.vy * k;
        p.rot += p.spin * 0.02 * k;
        const t = p.life / p.max;
        ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        ctx.fillStyle = p.color;
        if (p.size > 4) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      raf = parts.length ? requestAnimationFrame(loop) : 0;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      burst(e.clientX, e.clientY, 10, 3.4);
    };
    const onBig = () => {
      const cx = window.innerWidth / 2, cy = window.innerHeight * 0.4;
      burst(cx, cy, 160, 14, true);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("nj:burst", onBig);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("nj:burst", onBig);
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-[9000]"
    />
  );
}
