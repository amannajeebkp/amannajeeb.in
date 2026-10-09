import type { VercelRequest, VercelResponse } from "@vercel/node";
import { redis, upstash } from "./_lib.js";

export const config = { runtime: "nodejs" };

/** GET /api/sticker-image?id=stk_img_... → the stored image bytes. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!idParam) return res.status(400).send("Missing image id");
  const safeKey = idParam.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeKey.startsWith("stk_img_")) return res.status(400).send("Invalid image id");

  if (!upstash()) return res.status(503).send("Database not configured");

  try {
    let data = await redis<string | null>(["GET", safeKey]);
    if (data == null) return res.status(404).send("Image not found");

    // Older uploads were stored wrapped as {"value": "<dataurl>"}; unwrap if so.
    if (typeof data === "string" && data.startsWith("{")) {
      try {
        const parsed = JSON.parse(data) as { value?: unknown; result?: unknown };
        const inner = parsed.value ?? parsed.result;
        if (typeof inner === "string") data = inner;
      } catch {
        /* raw string */
      }
    }
    if (!data || typeof data !== "string") return res.status(404).send("Image content empty");

    let mimeType = "image/png";
    let base64Content = data;
    const m = data.match(/^data:([^;]+);base64,(.*)$/);
    if (m) {
      mimeType = m[1];
      base64Content = m[2];
    } else if (data.startsWith("UklGR")) mimeType = "image/webp";
    else if (data.startsWith("/9j/")) mimeType = "image/jpeg";

    const buf = Buffer.from(base64Content, "base64");
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(buf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).send(`Server error: ${msg}`);
  }
}
