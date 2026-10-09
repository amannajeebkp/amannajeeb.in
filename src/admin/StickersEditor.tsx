import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { getStickers, saveStickers, syncToCloud, KEYS } from "./store";
import { Sticker } from "../data/types";
import { Upload, Trash2, Save, GripVertical, Plus, X, Eye, RefreshCw } from "lucide-react";
import { uploadAndReplaceSticker, deleteStickerImage } from "../lib/optimizeImage";

const CANVAS_W = 672;
const CANVAS_H = 504;

export default function StickersEditor() {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Sticker>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const load = async () => {
      let loaded = getStickers();
      try {
        const res = await fetch("/api/stickers-data", { cache: "no-store" });
        if (res.ok && (res.headers.get("content-type") || "").includes("json")) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            loaded = data;
            saveStickers(data);
          }
        }
      } catch { /* ignore */ }
      setStickers(loaded);
    };
    load();
  }, []);

  const autoSave = useCallback(async (next: Sticker[]) => {
    // saveStickers() stores locally and syncs to the cloud (debounced, authenticated).
    saveStickers(next);
    const result = await syncToCloud(KEYS.stickers, next);
    if (!result.ok) toast.error("Save failed: " + (result.error || "Server error"), { id: "stk-save" });
    else toast.success("Saved to server", { id: "stk-save" });
  }, []);

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.loading("Optimizing & uploading replacement sticker...", { id: "rep-stk" });
      const { url: permanentUrl } = await uploadAndReplaceSticker(
        editingId || crypto.randomUUID(),
        file,
        form.url,
      );
      setPreview(permanentUrl);
      setForm((prev) => ({ ...prev, url: permanentUrl }));
      toast.success("Replacement image uploaded & old image purged!", { id: "rep-stk" });
    } catch (err: any) {
      toast.error("Upload error: " + err.message, { id: "rep-stk" });
    }
    e.target.value = "";
  };

  const handleSelectAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setForm((prev) => ({ ...prev, audio: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newStickers: Sticker[] = [];
    let loaded = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        newStickers.push({
          id: crypto.randomUUID(),
          url: dataUrl,
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 50,
          width: 200,
          height: null,
          rotation: Math.round((Math.random() - 0.5) * 10),
          layer: "front",
          name: file.name.replace(/\.[^.]+$/, ""),
        });
        loaded++;
        if (loaded === files.length) {
          const updated = [...stickers, ...newStickers];
          setStickers(updated);
          autoSave(updated);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      toast.loading("Optimizing & uploading replacement sticker...", { id: "rep-stk" });
      const { url: permanentUrl } = await uploadAndReplaceSticker(
        editingId || crypto.randomUUID(),
        file,
        form.url,
      );
      setPreview(permanentUrl);
      setForm((prev) => ({ ...prev, url: permanentUrl }));
      toast.success("Replacement image uploaded & old image purged!", { id: "rep-stk" });
    } catch (err: any) {
      toast.error("Upload error: " + err.message, { id: "rep-stk" });
    }
  };

  const handleEdit = (sticker: Sticker) => {
    setEditingId(sticker.id);
    setForm({ ...sticker });
    setPreview(sticker.url || null);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const updated = stickers.map((s) => (s.id === editingId ? { ...s, ...form } : s));
    setStickers(updated);
    autoSave(updated);
    setEditingId(null);
    setForm({});
    setPreview(null);
  };

  const handleDelete = (id: string) => {
    const target = stickers.find((s) => s.id === id);
    if (target?.url) {
      deleteStickerImage(target.url);
    }
    const updated = stickers.filter((s) => s.id !== id);
    setStickers(updated);
    autoSave(updated);
    toast.success("Sticker and its image removed permanently from server.");
  };

  const handleAddNew = () => {
    const newSticker: Sticker = {
      id: crypto.randomUUID(),
      url: "",
      x: 200,
      y: 200,
      width: 200,
      height: null,
      rotation: 0,
      layer: "front",
      name: "New Sticker",
    };
    setEditingId(newSticker.id);
    setForm(newSticker);
    setPreview(null);
    const updated = [...stickers, newSticker];
    setStickers(updated);
    autoSave(updated);
  };

  const updateStickerProp = (id: string, key: string, value: unknown) => {
    const updated = stickers.map((s) => (s.id === id ? { ...s, [key]: value } : s));
    setStickers(updated);
    autoSave(updated);
  };

  // Drag reorder
  const onDragStart = (idx: number) => setDragIdx(idx);
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...stickers];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setStickers(reordered);
    setDragIdx(idx);
    autoSave(reordered);
  };
  const onDragEnd = () => setDragIdx(null);

  const inputClass =
    "w-full bg-black border border-white/20 rounded-lg px-4 py-2 text-white focus:border-white outline-none";

  if (editingId) {
    const editing = stickers.find((s) => s.id === editingId);
    if (!editing) {
      setEditingId(null);
      return null;
    }
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white font-mono">Edit Sticker</h2>
          <button
            onClick={() => {
              setEditingId(null);
              setForm({});
              setPreview(null);
            }}
            className="text-white/40 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-w-xl space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1 font-mono">Name</label>
            <input
              type="text"
              value={form.name || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1 font-mono">Layer</label>
            <select
              value={form.layer || "front"}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, layer: e.target.value as "front" | "back" }))
              }
              className={inputClass}
            >
              <option value="front">Front</option>
              <option value="back">Back</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1 font-mono">Width</label>
              <input
                type="range"
                min={20}
                max={3500}
                value={form.width ?? 200}
                onChange={(e) => setForm((prev) => ({ ...prev, width: Number(e.target.value) }))}
                className="w-full"
              />
              <input
                type="number"
                min={10}
                max={3500}
                value={form.width ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, width: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1 font-mono">Height</label>
              <input
                type="range"
                min={0}
                max={3500}
                value={form.height ?? 0}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    height: Number(e.target.value) || null,
                  }))
                }
                className="w-full"
              />
              <input
                type="number"
                min={0}
                placeholder="auto"
                value={form.height ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    height: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1 font-mono">Rotation</label>
              <input
                type="range"
                min={-180}
                max={180}
                value={form.rotation ?? 0}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, rotation: Number(e.target.value) }))
                }
                className="w-full"
              />
              <input
                type="number"
                min={-180}
                max={180}
                value={form.rotation ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, rotation: Number(e.target.value) }))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/60 mb-1 font-mono">X Position</label>
              <input
                type="number"
                value={form.x ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, x: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1 font-mono">Y Position</label>
              <input
                type="number"
                value={form.y ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, y: Number(e.target.value) }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 space-y-3">
            <h3 className="text-purple-300 text-sm font-bold font-mono flex items-center gap-1.5">
              📱 Mobile Layout Overrides (Optional)
            </h3>
            <p className="text-white/50 text-xs font-mono">
              Leave blank to automatically use the PC position &amp; size on mobile devices.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/60 mb-1 font-mono">Mobile X Position</label>
                <input
                  type="number"
                  placeholder={`Inherit (${form.x ?? 0})`}
                  value={form.mobile_x ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      mobile_x: e.target.value !== "" ? Number(e.target.value) : undefined,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1 font-mono">Mobile Y Position</label>
                <input
                  type="number"
                  placeholder={`Inherit (${form.y ?? 0})`}
                  value={form.mobile_y ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      mobile_y: e.target.value !== "" ? Number(e.target.value) : undefined,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1 font-mono">Mobile Width (px)</label>
                <input
                  type="number"
                  placeholder={`Inherit (${form.width ?? 200})`}
                  value={form.mobile_width ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      mobile_width: e.target.value !== "" ? Number(e.target.value) : undefined,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1 font-mono">Mobile Rotation (°)</label>
                <input
                  type="number"
                  placeholder={`Inherit (${form.rotation ?? 0})`}
                  value={form.mobile_rotation ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      mobile_rotation: e.target.value !== "" ? Number(e.target.value) : undefined,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs font-mono text-white/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.mobile_layer === "back"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      mobile_layer: e.target.checked ? "back" : "front",
                    }))
                  }
                  className="rounded accent-purple-500"
                />
                Send to Back layer on Mobile
              </label>
              <label className="flex items-center gap-2 text-xs font-mono text-red-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(form.mobile_hidden)}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      mobile_hidden: e.target.checked || undefined,
                    }))
                  }
                  className="rounded accent-red-500"
                />
                Hide this sticker on Mobile
              </label>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <h3 className="text-white/80 text-sm font-bold font-mono">Click Behavior</h3>
            <div>
              <label className="block text-sm text-white/60 mb-1 font-mono">
                Click Text (speech bubble)
              </label>
              <textarea
                value={form.click_text || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, click_text: e.target.value || undefined }))
                }
                placeholder="Text shown when sticker is clicked..."
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1 font-mono">Audio URL (remote)</label>
              <input
                type="url"
                value={form.audio_url || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, audio_url: e.target.value || undefined }))
                }
                placeholder="https://example.com/song.mp3"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-white/60 mb-1 font-mono">Audio File (upload)</label>
              <div
                onClick={() => audioInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-white/40 cursor-pointer transition-colors"
              >
                {form.audio ? (
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <span className="text-sm font-mono">Audio loaded</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((prev) => ({ ...prev, audio: undefined }));
                      }}
                      className="text-red-400 hover:text-red-300 text-xs cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-white/40 flex flex-col items-center gap-1">
                    <Upload size={20} />
                    <span className="text-xs font-mono">Click to upload audio file</span>
                  </div>
                )}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleSelectAudio}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1 font-mono">Image</label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-white/40 hover:bg-white/5 cursor-pointer transition-all group"
            >
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="Preview" className="max-h-60 mx-auto rounded-lg" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-mono text-sm">Click to replace image</span>
                  </div>
                </div>
              ) : (
                <div className="text-white/40 flex flex-col items-center gap-2">
                  <Upload size={32} />
                  <span className="font-mono">Drag & drop or click to upload</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelectFile}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSaveEdit}
              className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              <Save size={16} />
              Save Sticker
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setForm({});
                setPreview(null);
              }}
              className="px-6 py-2 rounded-lg border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white font-mono">Stickers</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors ${
              showPreview ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Eye size={14} />
            {showPreview ? "Preview" : "Live Preview"}
          </button>
          <button
            onClick={() => bulkFileInputRef.current?.click()}
            className="flex items-center gap-2 bg-white/10 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm hover:bg-white/20 transition-colors"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Bulk Upload</span>
            <span className="sm:hidden">Upload</span>
          </button>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-white/10 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm hover:bg-white/20 transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Sticker</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      <input
        ref={bulkFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleBulkUpload}
        className="hidden"
      />

      {showPreview && (
        <div className="mb-6">
          <h3 className="text-sm text-white/60 font-mono mb-2">Live Canvas Preview</h3>
          <div
            className="relative bg-black border border-white/20 rounded-xl overflow-hidden"
            style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: "100%" }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-10"
              style={{
                backgroundImage: `linear-gradient(to right, #444 1px, transparent 1px), linear-gradient(to bottom, #444 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />
            {stickers.map((s) => (
              <div
                key={s.id}
                className="absolute pointer-events-none"
                style={{
                  left: `calc(50% + ${s.x}px)`,
                  top: `calc(50% + ${s.y}px)`,
                  width: s.width,
                  height: s.height ?? "auto",
                  transform: `rotate(${s.rotation}deg)`,
                  zIndex: s.layer === "back" ? 0 : 10,
                  opacity: s.url ? 1 : 0.3,
                }}
              >
                {s.url ? (
                  <img src={s.url} alt={s.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-20 bg-white/10 rounded flex items-center justify-center text-white/30 text-xs">
                    {s.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {stickers.length === 0 ? (
        <p className="text-white/40">No stickers found.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-white/30 text-xs font-mono mb-4">
            Drag to reorder. All changes auto-save permanently.
          </p>
          {stickers.map((sticker, idx) => (
            <div
              key={sticker.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragEnd={onDragEnd}
              className={`flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 bg-black border rounded-xl p-3 cursor-move transition-colors ${
                dragIdx === idx ? "border-white/60 bg-white/5" : "border-white/10"
              } hover:border-white/30`}
            >
              <div className="text-white/30 flex-shrink-0 hidden sm:block">
                <GripVertical size={18} />
              </div>

              <label
                className="relative group w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer border border-white/10 hover:border-blue-400 transition-all"
                title="Click to replace this sticker image"
                onClick={(e) => e.stopPropagation()}
              >
                {sticker.url ? (
                  <img
                    src={sticker.url}
                    alt={sticker.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-white/20">
                    <Upload size={20} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-[10px] text-white font-mono gap-0.5">
                  <RefreshCw size={12} className="text-blue-400" />
                  <span>Replace</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      toast.loading("Replacing sticker & saving to server...", { id: `rep-${sticker.id}` });
                      const { url: newUrl } = await uploadAndReplaceSticker(sticker.id, file, sticker.url);
                      const updated = stickers.map((s) => (s.id === sticker.id ? { ...s, url: newUrl } : s));
                      setStickers(updated);
                      await autoSave(updated);
                      toast.success("Sticker image replaced & saved permanently! Previous sticker removed.", { id: `rep-${sticker.id}` });
                    } catch (err: any) {
                      toast.error("Replace failed: " + err.message, { id: `rep-${sticker.id}` });
                    }
                    e.target.value = "";
                  }}
                />
              </label>

              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{sticker.name}</div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      sticker.layer === "front"
                        ? "bg-blue-500/20 text-blue-300"
                        : "bg-purple-500/20 text-purple-300"
                    }`}
                  >
                    {sticker.layer}
                  </span>
                  {sticker.click_text && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                      text
                    </span>
                  )}
                  {(sticker.audio || sticker.audio_url) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                      audio
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                <div className="flex flex-col items-center">
                  <label className="text-[10px] text-white/30 font-mono">W</label>
                  <input
                    type="range"
                    min={20}
                    max={1500}
                    value={sticker.width}
                    onChange={(e) => updateStickerProp(sticker.id, "width", Number(e.target.value))}
                    className="w-20"
                  />
                  <input
                    type="number"
                    min={20}
                    value={sticker.width}
                    onChange={(e) => updateStickerProp(sticker.id, "width", Number(e.target.value))}
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs text-center focus:border-white outline-none"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-[10px] text-white/30 font-mono">H</label>
                  <input
                    type="range"
                    min={0}
                    max={1500}
                    value={sticker.height ?? 0}
                    onChange={(e) =>
                      updateStickerProp(sticker.id, "height", Number(e.target.value) || null)
                    }
                    className="w-20"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="auto"
                    value={sticker.height ?? ""}
                    onChange={(e) =>
                      updateStickerProp(
                        sticker.id,
                        "height",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs text-center focus:border-white outline-none"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <label className="text-[10px] text-white/30 font-mono">Rot</label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={sticker.rotation}
                    onChange={(e) =>
                      updateStickerProp(sticker.id, "rotation", Number(e.target.value))
                    }
                    className="w-20"
                  />
                  <input
                    type="number"
                    min={-180}
                    max={180}
                    value={sticker.rotation}
                    onChange={(e) =>
                      updateStickerProp(sticker.id, "rotation", Number(e.target.value))
                    }
                    className="w-16 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs text-center focus:border-white outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleEdit(sticker)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex-1 sm:flex-none"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(sticker.id)}
                  className="text-xs px-2 py-1.5 rounded-lg bg-white/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
