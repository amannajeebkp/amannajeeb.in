import bundledStickers from "./stickers.json";
import bundledSlides from "./slides.json";
import bundledHotTakes from "./hotTakes.json";
import type { HotTake, Slide, Sticker } from "./types";
import { DEFAULT_SETTINGS, KEYS, type SiteSettings } from "../admin/store";

/**
 * Visitor data loading.
 *
 * Priority for every collection:
 *   1. admin draft in localStorage — only while editing (?edit or /admin)
 *   2. published cloud content      — /api/content?key=…
 *   3. bundled JSON                 — always works offline
 */

export const isEditingContext = () =>
  typeof window !== "undefined" &&
  (window.location.search.includes("edit") || window.location.pathname.startsWith("/admin"));

function readAdmin<T>(key: string): T | null {
  if (!isEditingContext()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as T;
      if (Array.isArray(parsed) ? parsed.length > 0 : parsed && typeof parsed === "object") return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

export const stickers: Sticker[] = readAdmin<Sticker[]>(KEYS.stickers) ?? (bundledStickers as Sticker[]);
export const slides: Slide[] = readAdmin<Slide[]>(KEYS.slides) ?? (bundledSlides as Slide[]);
export const hotTakes: HotTake[] = readAdmin<HotTake[]>(KEYS.hotTakes) ?? (bundledHotTakes as HotTake[]);

async function fetchContent<T>(key: "slides" | "hot_takes" | "settings" | "stickers"): Promise<T | null> {
  try {
    const res = await fetch(`/api/content?key=${key}`, { cache: "no-store" });
    if (!res.ok) return null;
    // Guard against SPA rewrites returning index.html with a 200.
    if (!(res.headers.get("content-type") || "").includes("json")) return null;
    return (await res.json()) as T | null;
  } catch {
    return null;
  }
}

function sortSlides(list: Slide[]): Slide[] {
  return [...list]
    .filter((s) => s.is_visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function loadSlides(): Promise<{ list: Slide[]; fetched: boolean }> {
  const draft = readAdmin<Slide[]>(KEYS.slides);
  if (draft) return { list: sortSlides(draft), fetched: true };
  const cloud = await fetchContent<Slide[]>("slides");
  const list = Array.isArray(cloud) && cloud.length > 0 ? cloud : (bundledSlides as Slide[]);
  return { list: sortSlides(list), fetched: true };
}

export async function loadHotTakes(): Promise<HotTake[]> {
  const draft = readAdmin<HotTake[]>(KEYS.hotTakes);
  if (draft) return draft;
  const cloud = await fetchContent<HotTake[]>("hot_takes");
  return Array.isArray(cloud) && cloud.length > 0 ? cloud : (bundledHotTakes as HotTake[]);
}

export async function loadSettings(): Promise<SiteSettings> {
  const draft = readAdmin<Partial<SiteSettings>>(KEYS.settings);
  if (draft) return { ...DEFAULT_SETTINGS, ...draft };
  const cloud = await fetchContent<Partial<SiteSettings>>("settings");
  return { ...DEFAULT_SETTINGS, ...(cloud && typeof cloud === "object" ? cloud : {}) };
}

export interface ThumbImage {
  id: string;
  url: string;
}

/** Polaroid images shown on the thumbs-up/camera sticker. Bundled only for now. */
export async function loadThumbsUpImages(): Promise<ThumbImage[]> {
  return [];
}
