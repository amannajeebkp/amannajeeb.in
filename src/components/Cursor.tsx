import { useEffect, useRef } from "react";
import { fxEnabled, isTouchDevice } from "../lib/fx";

/**
 * Custom cursor: a crisp dot that tracks the pointer exactly, and a ring that
 * lags behind on a spring. The ring widens over anything clickable and shrinks
 * while the mouse is held. Desktop only; native cursor stays in edit mode.
 */
export default function Cursor({ enabled = true }: { enabled?: boolean }) {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const active = enabled && fxEnabled && !isTouchDevice;

  useEffect(() => {
    if (!active) return;
    const dot = dotRef.current, ring = ringRef.current;
    if (!dot || !ring) return;
    document.documentElement.classList.add("nj-cursor");

    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let rx = x, ry = y;
    let hover = false, down = false, visible = false;
    let raf = 0;

    const isInteractive = (el: Element | null) =>
      !!el?.closest('button, a, [role="button"], .sticker-element, input, textarea, label, select');

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      hover = isInteractive(e.target as Element);
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    };
    const onDown = () => { down = true; };
    const onUp = () => { down = false; };
    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const tick = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      const ringSize = down ? 22 : hover ? 52 : 34;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${down ? 0.6 : 1})`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      ring.style.width = ring.style.height = `${ringSize}px`;
      ring.style.borderColor = hover ? "rgba(241,255,41,0.9)" : "rgba(255,255,255,0.6)";
      ring.style.mixBlendMode = hover ? "normal" : "difference";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("nj-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [active]);

  if (!active) return null;
  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="fixed top-0 left-0 w-[6px] h-[6px] rounded-full bg-white pointer-events-none z-[10000] opacity-0 transition-opacity duration-300"
        style={{ mixBlendMode: "difference", willChange: "transform" }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="fixed top-0 left-0 rounded-full border pointer-events-none z-[10000] opacity-0 transition-[opacity,width,height,border-color] duration-300 ease-out"
        style={{ width: 34, height: 34, willChange: "transform" }}
      />
    </>
  );
}
