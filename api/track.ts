import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors, readBody, redis, upstash } from "./_lib";

export const config = { runtime: "nodejs" };

interface TrackEvent {
  type?: string;
  meta?: Record<string, unknown>;
  referrer?: string;
}

const sanitize = (s: unknown, max = 40) =>
  String(s ?? "")
    .replace(/[^a-zA-Z0-9_.:-]/g, "_")
    .slice(0, max);

/**
 * POST /api/track  { session, events: [{type, meta, referrer}] }
 * Lightweight privacy-friendly counters in Redis:
 *   track:<type>                 total per event type
 *   track:day:<YYYY-MM-DD>       pageviews per day
 *   track:slide:<slug>           slide views
 *   track:sticker:<name>         sticker clicks
 *   track:ref:<host>             referrers
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  // Always answer quickly; tracking must never break the site.
  if (!upstash()) return res.status(204).end();

  const body = readBody<{ events?: TrackEvent[] }>(req);
  const events = Array.isArray(body?.events) ? body!.events.slice(0, 50) : [];
  if (events.length === 0) return res.status(204).end();

  const day = new Date().toISOString().slice(0, 10);
  const jobs: Promise<unknown>[] = [];
  for (const ev of events) {
    const type = sanitize(ev.type);
    if (!type) continue;
    jobs.push(redis(["INCR", `track:${type}`]));
    if (type === "pageview") {
      jobs.push(redis(["INCR", `track:day:${day}`]));
      if (ev.referrer) jobs.push(redis(["INCR", `track:ref:${sanitize(ev.referrer, 80)}`]));
    } else if (type === "slide_view" && ev.meta?.slide) {
      jobs.push(redis(["INCR", `track:slide:${sanitize(ev.meta.slide)}`]));
    } else if (type === "sticker_click" && ev.meta?.sticker) {
      jobs.push(redis(["INCR", `track:sticker:${sanitize(ev.meta.sticker)}`]));
    }
  }
  await Promise.allSettled(jobs);
  return res.status(204).end();
}
