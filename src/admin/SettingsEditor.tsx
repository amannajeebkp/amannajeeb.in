import { useState, useEffect } from 'react';
import {
  getSettings,
  saveSettings,
  exportAll,
  importAll,
  resetAll,
  syncToCloud,
  hasCalendly,
  KEYS,
  type SiteSettings,
} from './store';
import { toast } from 'sonner';
import { Save, Download, Upload, AlertTriangle } from 'lucide-react';

export default function SettingsEditor() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [importJson, setImportJson] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  if (!settings) return null;

  async function handleSave() {
    if (!settings) return;
    saveSettings(settings);
    const r = await syncToCloud(KEYS.settings, settings);
    if (r.ok) toast.success("Settings published");
    else toast.error("Publish failed: " + (r.error || "unknown error"));
  }

  function handleExport() {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nj-admin-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    try {
      importAll(importJson);
      setSettings(getSettings());
      setImportJson('');
    } catch {
      alert('Invalid JSON');
    }
  }

  function handleReset() {
    resetAll();
    window.location.reload();
  }

  const fieldClass =
    'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-white/30 transition-colors';

  return (
    <div className="max-w-2xl space-y-8">
      <h2 className="text-2xl font-bold">Site Settings</h2>

      <div className="space-y-5 bg-white/5 border border-white/10 rounded-xl p-6">
        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Title</label>
          <input
            type="text"
            className={fieldClass}
            value={settings.title}
            onChange={(e) => setSettings({ ...settings, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Description</label>
          <textarea
            className={fieldClass}
            rows={3}
            value={settings.description}
            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Calendly URL</label>
          <input
            type="text"
            className={fieldClass}
            placeholder="https://calendly.com/your-handle/30min"
            value={settings.calendlyUrl}
            onChange={(e) => setSettings({ ...settings, calendlyUrl: e.target.value })}
          />
          <p className="text-xs text-white/40 mt-1.5">
            {hasCalendly(settings)
              ? 'Scheduler enabled — the Calendly sticker and "Book a time" buttons open this link.'
              : 'Leave empty to disable scheduling; those buttons open the email form instead.'}
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">LinkedIn URL</label>
          <input
            type="text"
            className={fieldClass}
            value={settings.linkedinUrl}
            onChange={(e) => setSettings({ ...settings, linkedinUrl: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">WhatsApp Number</label>
          <input
            type="text"
            className={fieldClass}
            value={settings.whatsappNumber}
            onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Email</label>
          <input
            type="text"
            className={fieldClass}
            value={settings.email}
            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Meetup / Luma URL</label>
          <input
            type="text"
            className={fieldClass}
            placeholder="Used by the Meetups sticker"
            value={settings.lumaUrl}
            onChange={(e) => setSettings({ ...settings, lumaUrl: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Instagram URL</label>
          <input
            type="text"
            className={fieldClass}
            value={settings.instagramUrl || ''}
            onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
          />
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
        >
          <Save size={16} />
          Save Settings
        </button>
      </div>

      {/* Import / Export */}
      <div className="space-y-4 bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold">Backup & Restore</h3>

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
          >
            <Download size={16} />
            Export All Data
          </button>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/50 mb-1.5">Import JSON</label>
          <textarea
            className={fieldClass}
            rows={4}
            placeholder="Paste exported JSON here..."
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
          />
        </div>

        <button
          onClick={handleImport}
          disabled={!importJson.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Upload size={16} />
          Import Data
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle size={18} />
          <h3 className="text-lg font-semibold">Danger Zone</h3>
        </div>
        <p className="text-sm text-white/50">
          Clears the local draft in this browser (slides, hot takes, stickers, settings) back to the bundled defaults. Published content in the cloud is not touched.
        </p>

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
          >
            Reset Everything
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-400">Are you sure?</span>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Yes, Reset
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
