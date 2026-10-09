import { useEffect, useRef, useState } from "react";

/**
 * Boot screen: a counter and a single line that charges up, then the whole
 * thing irises open. Minimum 1.6s so the reveal always has weight; it also
 * waits for fonts so the hero never flashes unstyled.
 */
export default function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    const start = performance.now();
    const minMs = 1600;
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts?.ready ?? Promise.resolve();
    const tick = () => {
      if (!alive) return;
      const t = Math.min(1, (performance.now() - start) / minMs);
      setN(Math.floor(t * 100));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    Promise.all([fonts, new Promise((r) => setTimeout(r, minMs))]).then(() => {
      if (!alive || !root.current) return;
      setN(100);
      // CSS-driven exit (not rAF) so it finishes on time even in a throttled tab
      root.current.classList.add("out");
      setTimeout(() => alive && onDone(), 1150);
    });
    return () => {
      alive = false;
    };
  }, [onDone]);

  return (
    <div ref={root} className="loader" role="status" aria-live="polite" aria-label="Loading">
      <div className="ld-num">{String(n).padStart(3, "0")}</div>
      <div className="ld-track"><div className="ld-line" style={{ transform: `scaleX(${n / 100})` }} /></div>
      <div className="ld-cap">initialising</div>
    </div>
  );
}
