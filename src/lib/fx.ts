import { motionValue } from "framer-motion";

/**
 * Shared "effects" state: capability flags and a global, normalised pointer
 * position every ambient effect reads from (one listener, many consumers).
 */

const win = typeof window !== "undefined" ? window : null;

export const prefersReducedMotion =
  !!win && win.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isTouchDevice =
  !!win && (win.matchMedia("(hover: none), (pointer: coarse)").matches || "ontouchstart" in win);

/** Cheap heuristic for phones / weak laptops: fewer shader octaves, lower resolution. */
export const isLowPower =
  !!win &&
  (isTouchDevice ||
    (navigator.hardwareConcurrency || 8) <= 4 ||
    (navigator as unknown as { deviceMemory?: number }).deviceMemory !== undefined &&
      ((navigator as unknown as { deviceMemory?: number }).deviceMemory as number) <= 4);

/** Ambient effects on at all? (shader, float, sparks, cursor) */
export const fxEnabled = !prefersReducedMotion;

/** Pointer position normalised to -1..1 (x right, y up), updated once per move. */
export const pointerX = motionValue(0);
export const pointerY = motionValue(0);

let installed = false;
export function installPointerTracking() {
  if (!win || installed) return;
  installed = true;
  const onMove = (e: PointerEvent) => {
    const w = win.innerWidth || 1;
    const h = win.innerHeight || 1;
    pointerX.set((e.clientX / w) * 2 - 1);
    pointerY.set(1 - (e.clientY / h) * 2);
  };
  win.addEventListener("pointermove", onMove, { passive: true });
}

/** Palette shared by shader, sparks and glows. */
export const PALETTE = {
  violet: "#c084fc",
  pink: "#f472b6",
  sky: "#38bdf8",
  yellow: "#f1ff29",
};

export function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  return [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255];
}
