import { useEffect, useRef } from "react";
import { isTouch, prefersReducedMotion } from "../lib/scroll";

/** Dot + lagging ring; the ring opens over links and buttons. Desktop only. */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const active = !isTouch && !prefersReducedMotion;

  useEffect(() => {
    if (!active || !dot.current || !ring.current) return;
    const d = dot.current, r = ring.current;
    document.documentElement.classList.add("has-cursor");
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, hover = false, raf = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      hover = !!(e.target as Element | null)?.closest("a, button, [data-hover]");
      d.style.opacity = r.style.opacity = "1";
    };
    const leave = () => { d.style.opacity = r.style.opacity = "0"; };
    const loop = () => {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      d.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
      r.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%) scale(${hover ? 1.8 : 1})`;
      r.style.borderColor = hover ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-cursor");
      removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
    };
  }, [active]);

  if (!active) return null;
  return (
    <>
      <div ref={dot} className="cur-dot" aria-hidden="true" />
      <div ref={ring} className="cur-ring" aria-hidden="true" />
    </>
  );
}
