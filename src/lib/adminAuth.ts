/**
 * Client-side handling of the admin secret.
 * The secret is only ever compared on the server (ADMIN_PASSWORD env var);
 * here we just remember it for the session and attach it to write requests.
 */
const KEY = "nj_admin_token";

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "x-admin-auth": token } : {}),
    ...extra,
  };
}

/** Ask the server whether a password is correct. */
export async function verifyAdminPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-auth": password },
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return { ok: !!data.ok && res.ok, error: data.error };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

/**
 * Make sure we hold a valid token; prompts the user if we don't.
 * Used by `?edit` mode which has no login screen of its own.
 */
export async function ensureAdminToken(): Promise<boolean> {
  const existing = getAdminToken();
  if (existing) {
    const check = await verifyAdminPassword(existing);
    if (check.ok) return true;
    setAdminToken(null);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const pw = window.prompt("Admin password (needed to save edits):");
    if (pw == null) return false;
    const check = await verifyAdminPassword(pw);
    if (check.ok) {
      setAdminToken(pw);
      return true;
    }
    if (check.error && /ADMIN_PASSWORD/.test(check.error)) {
      window.alert(check.error);
      return false;
    }
  }
  return false;
}
