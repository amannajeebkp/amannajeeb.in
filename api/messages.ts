import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors, isAdmin, redis, rejectUnauthorized, upstash } from "./_lib";

export const config = { runtime: "nodejs" };

/** GET /api/messages (x-admin-auth) → contact-form messages, newest first. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  if (!isAdmin(req)) return rejectUnauthorized(res);
  if (!upstash()) return res.status(200).json([]);

  try {
    const raw = await redis<string[]>(["LRANGE", "contact_messages", 0, 199]);
    const list = (raw || []).map((s) => {
      try {
        return JSON.parse(s);
      } catch {
        return { message: s };
      }
    });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(list);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: msg });
  }
}
