/**
 * One source of truth for scroll progress (0..1 across the whole page),
 * smoothed for the 3D camera, raw for GSAP.
 */
export const scroll = {
  raw: 0,
  smooth: 0,
  velocity: 0,
};

let installed = false;
export function installScroll() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const read = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scroll.raw = Math.min(1, Math.max(0, window.scrollY / max));
  };
  read();
  window.addEventListener("scroll", read, { passive: true });
  window.addEventListener("resize", read);
}

/** Call once per frame; dt in seconds. */
export function tickScroll(dt: number) {
  const prev = scroll.smooth;
  const k = 1 - Math.exp(-dt * 4.5);
  scroll.smooth += (scroll.raw - scroll.smooth) * k;
  scroll.velocity = (scroll.smooth - prev) / Math.max(dt, 1e-4);
}

export const prefersReducedMotion =
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isTouch =
  typeof window !== "undefined" && window.matchMedia("(hover: none), (pointer: coarse)").matches;

export const isLowPower =
  isTouch || (typeof navigator !== "undefined" && (navigator.hardwareConcurrency || 8) <= 4);

/** Pointer, normalised -1..1 (x right, y up). */
export const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
let pInstalled = false;
export function installPointer() {
  if (pInstalled || typeof window === "undefined") return;
  pInstalled = true;
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = 1 - (e.clientY / window.innerHeight) * 2;
    },
    { passive: true },
  );
}
export function tickPointer(dt: number) {
  const k = 1 - Math.exp(-dt * 3);
  pointer.sx += (pointer.x - pointer.sx) * k;
  pointer.sy += (pointer.y - pointer.sy) * k;
}
