import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors, isAdmin, readBody, redis, rejectUnauthorized, upstash } from "./_lib.js";

export const config = {
  runtime: "nodejs",
  api: { bodyParser: { sizeLimit: "4mb" } },
};

const KEY_PREFIX = "stk_img_";

function keyFromUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * POST   /api/upload-sticker  { stickerId, imageBase64, oldUrl? }  → { ok, url }
 * DELETE /api/upload-sticker  { imageKey? | oldUrl? }              → { ok }
 * Both require x-admin-auth.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, "POST, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!upstash()) return res.status(503).json({ ok: false, error: "Database not configured" });
  if (!isAdmin(req)) return rejectUnauthorized(res);

  try {
    if (req.method === "DELETE") {
      const body = readBody<{ imageKey?: string; oldUrl?: string }>(req) || {};
      const q = req.query as Record<string, string | string[] | undefined>;
      const candidate =
        body.imageKey || (typeof q.imageKey === "string" ? q.imageKey : undefined) || keyFromUrl(body.oldUrl ?? q.oldUrl);
      if (candidate && candidate.startsWith(KEY_PREFIX)) {
        await redis(["DEL", candidate]);
        return res.status(200).json({ ok: true, deleted: candidate });
      }
      return res.status(200).json({ ok: true, deleted: null });
    }

    if (req.method === "POST") {
      const body = readBody<{ stickerId?: string; imageBase64?: string; oldUrl?: string }>(req) || {};
      const { stickerId, imageBase64, oldUrl } = body;
      if (!imageBase64 || typeof imageBase64 !== "string")
        return res.status(400).json({ ok: false, error: "imageBase64 is required" });
      if (!/^data:image\/(png|webp|jpeg|gif);base64,/.test(imageBase64) && !/^[A-Za-z0-9+/=]+$/.test(imageBase64))
        return res.status(400).json({ ok: false, error: "imageBase64 must be an image data URL" });

      const sId = stickerId ? String(stickerId).replace(/[^a-zA-Z0-9_-]/g, "") : "custom";
      const newKey = `${KEY_PREFIX}${sId}_${Date.now()}`;

      // remove the previous custom image (if any) so Redis doesn't fill up
      const oldKey = keyFromUrl(oldUrl);
      if (oldKey && oldKey.startsWith(KEY_PREFIX) && oldKey !== newKey) {
        await redis(["DEL", oldKey]).catch(() => {});
      }

      await redis(["SET", newKey, imageBase64]);

      return res.status(200).json({
        ok: true,
        key: newKey,
        url: `/api/sticker-image?id=${newKey}`,
        sizeKB: Math.round(Buffer.byteLength(imageBase64) / 1024),
      });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: msg });
  }
}
