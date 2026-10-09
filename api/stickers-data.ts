import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors, getJson, isAdmin, readBody, rejectUnauthorized, setJson, upstash } from "./_lib";

export const config = { runtime: "nodejs" };

const KEY = "stickers_v1";

/**
 * GET  /api/stickers-data                 → Sticker[] (empty array when none)
 * POST /api/stickers-data (x-admin-auth)  → { ok: true }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!upstash()) {
    if (req.method === "GET") return res.status(200).json([]);
    return res.status(503).json({ ok: false, error: "Database not configured" });
  }

  try {
    if (req.method === "GET") {
      const list = await getJson<unknown>(KEY);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(Array.isArray(list) ? list : []);
    }

    if (req.method === "POST") {
      if (!isAdmin(req)) return rejectUnauthorized(res);
      const stickers = readBody<unknown>(req);
      if (!Array.isArray(stickers)) return res.status(400).json({ ok: false, error: "Expected array" });
      await setJson(KEY, stickers);
      return res.status(200).json({ ok: true, count: stickers.length });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: msg });
  }
}
