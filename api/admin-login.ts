import type { VercelRequest, VercelResponse } from "@vercel/node";
import { adminPassword, cors, isAdmin } from "./_lib.js";

export const config = { runtime: "nodejs" };

/**
 * POST /api/admin-login  (x-admin-auth: <password>)  → { ok: true }
 * Verifies the admin password server-side. The password itself is never
 * shipped in the client bundle; it lives in the ADMIN_PASSWORD env var.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  if (!adminPassword()) {
    return res.status(503).json({
      ok: false,
      error: "ADMIN_PASSWORD is not set in the Vercel project environment variables.",
    });
  }
  if (!isAdmin(req)) {
    // small delay to blunt brute-force attempts
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ ok: false, error: "Wrong password" });
  }
  return res.status(200).json({ ok: true });
}
