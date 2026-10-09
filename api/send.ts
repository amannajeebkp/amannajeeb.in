import type { VercelRequest, VercelResponse } from "@vercel/node";
import { cors, readBody, redis, strip, upstash } from "./_lib.js";

export const config = { runtime: "nodejs" };

const MAX_MESSAGE = 4000;
const RATE_LIMIT_PER_HOUR = 5;

/**
 * POST /api/send  { email, message }
 *
 * 1. Stores the message in Redis (list `contact_messages`) so nothing is lost.
 * 2. If RESEND_API_KEY + CONTACT_TO are set, also emails it to you via Resend.
 * Returns 503 when neither storage nor email is configured so the client can
 * fall back to a mailto: link instead of faking success.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const body = readBody<{ email?: string; message?: string }>(req) || {};
  const email = String(body.email || "").trim().slice(0, 254);
  const message = String(body.message || "").trim().slice(0, MAX_MESSAGE);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: "Invalid email" });
  if (message.length < 2) return res.status(400).json({ ok: false, error: "Message is empty" });

  const resendKey = strip(process.env.RESEND_API_KEY || "");
  const contactTo = strip(process.env.CONTACT_TO || "");
  const contactFrom = strip(process.env.CONTACT_FROM || "NJ's Home <onboarding@resend.dev>");
  const hasRedis = !!upstash();

  if (!hasRedis && !(resendKey && contactTo)) {
    return res.status(503).json({ ok: false, error: "Contact form is not configured" });
  }

  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || "").split(",")[0].trim() || "unknown";

  let stored = false;
  let emailed = false;

  try {
    if (hasRedis) {
      // simple per-IP rate limit
      const rlKey = `contact_rl:${ip}`;
      const n = await redis<number>(["INCR", rlKey]);
      if (n === 1) await redis(["EXPIRE", rlKey, 3600]);
      if (n > RATE_LIMIT_PER_HOUR) return res.status(429).json({ ok: false, error: "Too many messages, try again later" });

      await redis([
        "LPUSH",
        "contact_messages",
        JSON.stringify({ email, message, at: new Date().toISOString(), ua: String(req.headers["user-agent"] || "").slice(0, 200) }),
      ]);
      await redis(["LTRIM", "contact_messages", 0, 999]);
      stored = true;
    }
  } catch (e) {
    console.error("contact: redis store failed", e);
  }

  if (resendKey && contactTo) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: contactFrom,
          to: [contactTo],
          reply_to: email,
          subject: `New message from ${email} via amannajeeb.in`,
          text: `${message}\n\n— from ${email}\nIP: ${ip}`,
        }),
      });
      emailed = r.ok;
      if (!r.ok) console.error("contact: resend failed", r.status, await r.text().catch(() => ""));
    } catch (e) {
      console.error("contact: resend error", e);
    }
  }

  if (!stored && !emailed) return res.status(500).json({ ok: false, error: "Could not deliver message" });
  return res.status(200).json({ ok: true, stored, emailed });
}
