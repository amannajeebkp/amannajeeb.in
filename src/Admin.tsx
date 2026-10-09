import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AdminLayout from "./admin/AdminLayout";
import SlidesEditor from "./admin/SlidesEditor";
import StickersEditor from "./admin/StickersEditor";
import HotTakesEditor from "./admin/HotTakesEditor";
import SettingsEditor from "./admin/SettingsEditor";
import Inbox from "./admin/Inbox";
import { hydrateFromCloud } from "./admin/store";
import { getAdminToken, setAdminToken, verifyAdminPassword } from "./lib/adminAuth";

/**
 * The password is checked by /api/admin-login against the ADMIN_PASSWORD env
 * var on Vercel — it never ships in this bundle.
 */
function LoginGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    const result = await verifyAdminPassword(pw);
    setBusy(false);
    if (result.ok) {
      setAdminToken(pw);
      onAuth();
    } else {
      setError(result.error || "Wrong password");
      setPw("");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-white/40 text-sm">Enter password to continue</p>
        </div>
        <div>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setError(null); }}
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
            className={`w-full bg-white/5 border ${error ? "border-red-500" : "border-white/20"} rounded-xl px-4 py-3 text-white text-center text-lg tracking-widest focus:border-white outline-none transition-colors`}
          />
          {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter"}
        </button>
      </form>
    </div>
  );
}

function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <a href="/admin/slides" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
          <div className="text-3xl font-bold">Slides</div>
          <div className="text-white/50 text-sm mt-1">Edit your slide deck</div>
        </a>
        <a href="/admin/stickers" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
          <div className="text-3xl font-bold">Stickers</div>
          <div className="text-white/50 text-sm mt-1">Manage sticker images</div>
        </a>
        <a href="/admin/hot-takes" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
          <div className="text-3xl font-bold">Hot Takes</div>
          <div className="text-white/50 text-sm mt-1">Edit hot take content</div>
        </a>
        <a href="/admin/settings" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
          <div className="text-3xl font-bold">Settings</div>
          <div className="text-white/50 text-sm mt-1">Site-wide configuration</div>
        </a>
        <a href="/admin/inbox" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
          <div className="text-3xl font-bold">Inbox</div>
          <div className="text-white/50 text-sm mt-1">Messages from the contact form</div>
        </a>
      </div>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Re-validate a remembered token on load (it may have been rotated server-side).
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setAuthed(false);
      return;
    }
    verifyAdminPassword(token).then((r) => {
      if (!r.ok) setAdminToken(null);
      setAuthed(r.ok);
    });
  }, []);

  // Once signed in, start the editors from what is actually published.
  useEffect(() => {
    if (authed) void hydrateFromCloud();
  }, [authed]);

  if (authed === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/40">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} />;

  return (
    <Routes>
      <Route element={<AdminLayout onLogout={() => { setAdminToken(null); setAuthed(false); }} />}>
        <Route index element={<Dashboard />} />
        <Route path="slides" element={<SlidesEditor />} />
        <Route path="stickers" element={<StickersEditor />} />
        <Route path="hot-takes" element={<HotTakesEditor />} />
        <Route path="settings" element={<SettingsEditor />} />
        <Route path="inbox" element={<Inbox />} />
      </Route>
    </Routes>
  );
}
