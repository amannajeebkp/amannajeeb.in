import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors, redis, upstash } from "./_lib.js";

export const config = { runtime: "nodejs" };

const KEY = "aura_count";

/**
 * GET  /api/aura                → { count }
 * POST /api/aura                → increments by 1, returns { count }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  res.setHeader("Cache-Control", "no-store");

  if (!upstash()) return res.status(200).json({ count: 0, persisted: false });

  try {
    if (req.method === "GET") {
      const raw = await redis<string | number | null>(["GET", KEY]);
      return res.status(200).json({ count: Number(raw ?? 0) });
    }
    if (req.method === "POST") {
      const count = await redis<number>(["INCR", KEY]);
      return res.status(200).json({ count: Number(count) });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
}
