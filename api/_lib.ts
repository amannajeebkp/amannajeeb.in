import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Strip stray quotes that sometimes get pasted into Vercel env vars. */
export function strip(s: string) {
  let r = s;
  while (r.startsWith('"') || r.startsWith("'")) r = r.slice(1);
  while (r.endsWith('"') || r.endsWith("'")) r = r.slice(0, -1);
  return r.trim();
}

export function upstash(): { url: string; token: string } | null {
  const url = strip(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "");
  const token = strip(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "");
  if (!url || !token) return null;
  return { url, token };
}

/** Run a single Redis command through the Upstash REST API. */
export async function redis<T = unknown>(cmd: (string | number)[]): Promise<T> {
  const cfg = upstash();
  if (!cfg) throw new Error("env_missing");
  const resp = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  const body = (await resp.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!resp.ok || body.error) throw new Error(body.error || `upstash_${resp.status}`);
  return body.result as T;
}

/**
 * Read a JSON value that may have been stored either directly or wrapped
 * (older code stored `{"value": "<json>"}`). Returns null when missing/invalid.
 */
export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await redis<string | null>(["GET", key]);
  if (raw == null) return null;
  let v: unknown = raw;
  for (let i = 0; i < 3 && typeof v === "string"; i++) {
    try {
      v = JSON.parse(v);
    } catch {
      return null;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      if ("value" in o && Object.keys(o).length === 1) v = o.value;
      else if ("result" in o && Object.keys(o).length === 1) v = o.result;
    }
  }
  return v as T;
}

export async function setJson(key: string, value: unknown) {
  await redis(["SET", key, JSON.stringify(value)]);
}

export function cors(res: VercelResponse, methods = "GET, POST, OPTIONS") {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-auth");
}

export function adminPassword(): string {
  return strip(process.env.ADMIN_PASSWORD || "");
}

/**
 * Admin writes must carry the shared secret in `x-admin-auth`.
 * The secret lives only in the ADMIN_PASSWORD env var on Vercel.
 */
export function isAdmin(req: VercelRequest): boolean {
  const pw = adminPassword();
  if (!pw) return false;
  const header = req.headers["x-admin-auth"];
  const provided = Array.isArray(header) ? header[0] : header;
  if (!provided || provided.length !== pw.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < pw.length; i++) diff |= pw.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

export function rejectUnauthorized(res: VercelResponse) {
  if (!adminPassword()) {
    return res
      .status(503)
      .json({ ok: false, error: "ADMIN_PASSWORD is not set in the Vercel project environment variables." });
  }
  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

export function readBody<T = unknown>(req: VercelRequest): T | null {
  const b = req.body;
  if (b == null) return null;
  if (typeof b === "string") {
    try {
      return JSON.parse(b) as T;
    } catch {
      return null;
    }
  }
  return b as T;
}
