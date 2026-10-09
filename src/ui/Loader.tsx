import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

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
      const tl = gsap.timeline({ onComplete: onDone });
      tl.to(root.current.querySelector(".ld-line"), { scaleX: 1, duration: 0.35, ease: "power3.inOut" }, 0)
        .to(root.current.querySelector(".ld-num"), { y: -20, opacity: 0, duration: 0.4, ease: "power3.in" }, 0.1)
        .to(root.current, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "power4.inOut" }, 0.35);
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
