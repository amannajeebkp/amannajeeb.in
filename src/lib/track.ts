type EventMeta = Record<string, unknown> | undefined;

const queue: { type: string; path: string; meta?: EventMeta; referrer?: string }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let firstPageview = false;

function flush(useBeacon = false) {
  if (queue.length === 0) return;
  const body = JSON.stringify({
    session: sessionId(),
    events: queue.splice(0, 50),
  });
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    return;
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

let cachedSession: string | null = null;
function sessionId(): string {
  try {
    const key = "nj_sess";
    let s = sessionStorage.getItem(key);
    if (!s) {
      s =
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, s);
    }
    return s;
  } catch {
    if (!cachedSession)
      cachedSession = Math.random().toString(36).slice(2);
    return cachedSession;
  }
}

export function track(type: string, meta?: EventMeta) {
  const event: { type: string; path: string; meta?: EventMeta; referrer?: string } = {
    type,
    path: window.location.pathname,
    meta,
  };
  if (type === "pageview" && !firstPageview) {
    firstPageview = true;
    const ref = document.referrer;
    if (ref && !ref.includes(window.location.hostname)) {
      try {
        event.referrer = new URL(ref).hostname;
      } catch {
        event.referrer = ref.slice(0, 100);
      }
    }
  }
  queue.push(event);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flush(), 4000);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
}
