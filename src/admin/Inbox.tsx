import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Mail } from "lucide-react";
import { adminHeaders } from "../lib/adminAuth";

interface ContactMessage {
  email?: string;
  message?: string;
  at?: string;
  ua?: string;
}

/** Messages submitted through the site's contact form (stored in Redis). */
export default function Inbox() {
  const [items, setItems] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setItems(null);
    try {
      const res = await fetch("/api/messages", { headers: adminHeaders(), cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data)) {
        setError((data && data.error) || `HTTP ${res.status}`);
        setItems([]);
        return;
      }
      setItems(data as ContactMessage[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setItems([]);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inbox</h2>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 cursor-pointer"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <p className="text-white/40 text-sm">
        Every submission of the contact form lands here (newest first). Set <code>RESEND_API_KEY</code> and{" "}
        <code>CONTACT_TO</code> on Vercel to also get them by email.
      </p>

      {error && <div className="text-red-400 text-sm border border-red-500/30 rounded-lg p-3">{error}</div>}

      {items === null ? (
        <div className="text-white/40 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-white/40 text-sm">No messages yet.</div>
      ) : (
        <ul className="space-y-3">
          {items.map((m, i) => (
            <li key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs text-white/50">
                <a href={`mailto:${m.email || ""}`} className="inline-flex items-center gap-1.5 text-white hover:underline">
                  <Mail size={12} /> {m.email || "unknown"}
                </a>
                <span>{m.at ? new Date(m.at).toLocaleString() : ""}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-white/90">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
