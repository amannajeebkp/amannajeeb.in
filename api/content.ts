import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors, getJson, isAdmin, readBody, rejectUnauthorized, setJson, upstash } from "./_lib.js";

export const config = { runtime: "nodejs" };

/**
 * Generic site-content store backed by Upstash.
 *
 *   GET  /api/content?key=slides|hot_takes|settings|stickers   → JSON value or null
 *   POST /api/content?key=...  (x-admin-auth)                   → { ok: true }
 *
 * Stickers keep their legacy Redis key so existing data is preserved.
 */
const KEYS: Record<string, string> = {
  slides: "site_slides_v1",
  hot_takes: "site_hot_takes_v1",
  settings: "site_settings_v1",
  stickers: "stickers_v1",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const keyParam = Array.isArray(req.query.key) ? req.query.key[0] : req.query.key;
  const redisKey = keyParam ? KEYS[keyParam] : undefined;
  if (!redisKey) return res.status(400).json({ ok: false, error: "Unknown content key" });

  if (!upstash()) {
    if (req.method === "GET") return res.status(200).json(null);
    return res.status(503).json({ ok: false, error: "Database not configured" });
  }

  try {
    if (req.method === "GET") {
      const value = await getJson<unknown>(redisKey);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(value ?? null);
    }

    if (req.method === "POST") {
      if (!isAdmin(req)) return rejectUnauthorized(res);
      const body = readBody<unknown>(req);
      if (body == null) return res.status(400).json({ ok: false, error: "Expected JSON body" });
      if (keyParam !== "settings" && !Array.isArray(body))
        return res.status(400).json({ ok: false, error: "Expected array" });
      await setJson(redisKey, body);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: msg });
  }
}
