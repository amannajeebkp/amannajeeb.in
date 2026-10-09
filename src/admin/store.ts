import type { Slide, HotTake, Sticker } from "../data/types";
import bundledSlides from "../data/slides.json";
import bundledHotTakes from "../data/hotTakes.json";
import bundledStickers from "../data/stickers.json";
import { adminHeaders } from "../lib/adminAuth";

/**
 * Admin content store.
 *
 * Every collection lives in two places:
 *  - localStorage (instant, local draft, lets the editor feel snappy)
 *  - the cloud (`/api/content?key=…`, Upstash) — this is what visitors see.
 *
 * Saves write locally first, then sync to the cloud (debounced). Failures
 * surface through `onSyncError` so editors can show a toast.
 */

export const KEYS = {
  slides: "nj_admin_slides",
  hotTakes: "nj_admin_hot_takes",
  stickers: "nj_admin_stickers",
  settings: "nj_admin_settings",
} as const;

type CloudKey = "slides" | "hot_takes" | "stickers" | "settings";
const CLOUD_KEY: Record<string, CloudKey> = {
  [KEYS.slides]: "slides",
  [KEYS.hotTakes]: "hot_takes",
  [KEYS.stickers]: "stickers",
  [KEYS.settings]: "settings",
};

export interface SiteSettings {
  title: string;
  description: string;
  calendlyUrl: string;
  linkedinUrl: string;
  whatsappNumber: string;
  email: string;
  lumaUrl: string;
  instagramUrl?: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  title: "NJ's Home",
  description: "AI Engineer building intelligent systems, LLM applications and production ML.",
  calendlyUrl: "",
  linkedinUrl: "https://linkedin.com/in/amannajeebkp",
  whatsappNumber: "+919659700100",
  email: "hello@amannajeeb.in",
  lumaUrl: "",
  instagramUrl: "",
};

/** True when a Calendly URL is real (not empty / not the template placeholder). */
export function hasCalendly(settings: SiteSettings): boolean {
  const u = (settings.calendlyUrl || "").trim();
  return /^https?:\/\/(www\.)?calendly\.com\/[^/\s]+/i.test(u) && !/YOUR_CALENDLY/i.test(u);
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
}

type SyncListener = (info: { key: string; ok: boolean; error?: string }) => void;
const syncListeners = new Set<SyncListener>();
export function onSyncResult(fn: SyncListener) {
  syncListeners.add(fn);
  return () => {
    syncListeners.delete(fn);
  };
}

const timers: Record<string, ReturnType<typeof setTimeout>> = {};

/** Push a collection to the cloud. Resolves with the server's verdict. */
export async function syncToCloud(key: string, data: unknown): Promise<{ ok: boolean; error?: string }> {
  const cloudKey = CLOUD_KEY[key];
  if (!cloudKey) return { ok: false, error: "unknown key" };
  try {
    const res = await fetch(`/api/content?key=${cloudKey}`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(data),
    });
    const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    const result = { ok: !!d.ok && res.ok, error: d.error || (res.ok ? undefined : `HTTP ${res.status}`) };
    syncListeners.forEach((fn) => fn({ key, ...result }));
    return result;
  } catch (e) {
    const result = { ok: false, error: e instanceof Error ? e.message : "Network error" };
    syncListeners.forEach((fn) => fn({ key, ...result }));
    return result;
  }
}

function save(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* storage full / private mode */ }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nj_admin_update", { detail: { key, data } }));
    if (timers[key]) clearTimeout(timers[key]);
    timers[key] = setTimeout(() => void syncToCloud(key, data), 400);
  }
}

export function subscribeAdminUpdate(callback: (event: CustomEvent<{ key: string; data: unknown }>) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => callback(e as CustomEvent<{ key: string; data: unknown }>);
  window.addEventListener("nj_admin_update", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("nj_admin_update", handler);
    window.removeEventListener("storage", handler);
  };
}

/** Pull the published version of a collection from the cloud (null if none). */
export async function fetchCloud<T>(cloudKey: CloudKey): Promise<T | null> {
  try {
    const res = await fetch(`/api/content?key=${cloudKey}`, { cache: "no-store" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) return null;
    const data = (await res.json()) as T | null;
    return data ?? null;
  } catch {
    return null;
  }
}

/** Seed the local draft from the cloud so the editor starts from what's live. */
export async function hydrateFromCloud() {
  const [slides, hotTakes, stickers, settings] = await Promise.all([
    fetchCloud<Slide[]>("slides"),
    fetchCloud<HotTake[]>("hot_takes"),
    fetchCloud<Sticker[]>("stickers"),
    fetchCloud<SiteSettings>("settings"),
  ]);
  const put = (key: string, v: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("nj_admin_update", { detail: { key, data: v } }));
  };
  if (Array.isArray(slides) && slides.length) put(KEYS.slides, slides);
  if (Array.isArray(hotTakes) && hotTakes.length) put(KEYS.hotTakes, hotTakes);
  if (Array.isArray(stickers) && stickers.length) put(KEYS.stickers, stickers);
  if (settings && typeof settings === "object") put(KEYS.settings, { ...DEFAULT_SETTINGS, ...settings });
}

// Slides
export function getSlides(): Slide[] {
  return load<Slide[]>(KEYS.slides, bundledSlides as Slide[]);
}
export function saveSlides(slides: Slide[]) {
  save(KEYS.slides, slides);
}
export function addSlide(slide: Slide) {
  const slides = getSlides();
  slides.push(slide);
  saveSlides(slides);
}
export function updateSlide(id: string, updates: Partial<Slide>) {
  saveSlides(getSlides().map((s) => (s.id === id ? { ...s, ...updates } : s)));
}
export function deleteSlide(id: string) {
  saveSlides(getSlides().filter((s) => s.id !== id));
}
export function reorderSlides(orderedIds: string[]) {
  const slides = getSlides();
  const map = new Map(slides.map((s) => [s.id, s]));
  const reordered = orderedIds
    .map((id, i) => {
      const s = map.get(id);
      if (s) s.order = i + 1;
      return s;
    })
    .filter((s): s is Slide => !!s);
  saveSlides(reordered);
}

// Hot Takes
export function getHotTakes(): HotTake[] {
  return load<HotTake[]>(KEYS.hotTakes, bundledHotTakes as HotTake[]);
}
export function saveHotTakes(takes: HotTake[]) {
  save(KEYS.hotTakes, takes);
}
export function addHotTake(take: HotTake) {
  const takes = getHotTakes();
  takes.push(take);
  saveHotTakes(takes);
}
export function updateHotTake(id: string, updates: Partial<HotTake>) {
  saveHotTakes(getHotTakes().map((t) => (t.id === id ? { ...t, ...updates } : t)));
}
export function deleteHotTake(id: string) {
  saveHotTakes(getHotTakes().filter((t) => t.id !== id));
}

// Stickers
export function getStickers(): Sticker[] {
  return load<Sticker[]>(KEYS.stickers, bundledStickers as Sticker[]);
}
export function saveStickers(stickers: Sticker[]) {
  save(KEYS.stickers, stickers);
}
export function addSticker(sticker: Sticker) {
  const stickers = getStickers();
  stickers.push(sticker);
  saveStickers(stickers);
}
export function updateSticker(id: string, updates: Partial<Sticker>) {
  saveStickers(getStickers().map((s) => (s.id === id ? { ...s, ...updates } : s)));
}
export function deleteSticker(id: string) {
  saveStickers(getStickers().filter((s) => s.id !== id));
}
export function duplicateSticker(id: string): Sticker | null {
  const current = getStickers();
  const target = current.find((s) => s.id === id);
  if (!target) return null;
  const clone: Sticker = { ...target, id: crypto.randomUUID(), x: target.x + 30, y: target.y + 30 };
  current.push(clone);
  saveStickers(current);
  return clone;
}

// Settings
export function getSettings(): SiteSettings {
  return { ...DEFAULT_SETTINGS, ...load<Partial<SiteSettings>>(KEYS.settings, {}) };
}
export function saveSettings(settings: SiteSettings) {
  save(KEYS.settings, settings);
}

// Export / Import
export function exportAll() {
  return JSON.stringify(
    { slides: getSlides(), hotTakes: getHotTakes(), stickers: getStickers(), settings: getSettings() },
    null,
    2,
  );
}
export function importAll(json: string) {
  const data = JSON.parse(json);
  if (data.slides) saveSlides(data.slides);
  if (data.hotTakes) saveHotTakes(data.hotTakes);
  if (data.stickers) saveStickers(data.stickers);
  if (data.settings) saveSettings(data.settings);
}
/** Clears the local draft only; the published cloud content is untouched. */
export function resetAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
