import { useState, useEffect } from 'react';
import { getSlides, saveSlides, addSlide, updateSlide, deleteSlide } from './store';
import { Slide } from '../data/types';
import { Plus, Trash2, Save, ArrowUp, ArrowDown } from 'lucide-react';

const defaultSlide: Omit<Slide, 'id'> = {
  slug: '',
  title: '',
  type: 'text',
  order: 0,
  content: {
    text: '',
    headline: '',
  },
  button_text: null,
  button_link: null,
  is_visible: true,
};

export default function SlidesEditor() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Slide, 'id'>>(defaultSlide);

  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = () => {
    setSlides(getSlides());
  };

  const handleAdd = () => {
    const newSlide: Omit<Slide, 'id'> = {
      ...defaultSlide,
      order: slides.length,
    };
    setForm(newSlide);
    setEditingId('new');
  };

  const handleEdit = (slide: Slide) => {
    setForm({
      slug: slide.slug,
      title: slide.title,
      type: slide.type,
      order: slide.order,
      content: { ...slide.content },
      button_text: slide.button_text,
      button_link: slide.button_link,
      is_visible: slide.is_visible,
    });
    setEditingId(slide.id);
  };

  const handleSave = () => {
    if (editingId === 'new') {
      const newSlide: Slide = {
        ...form,
        id: `slide-${Date.now()}`,
      };
      addSlide(newSlide);
    } else if (editingId) {
      updateSlide(editingId, form);
    }
    setEditingId(null);
    loadSlides();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this slide?')) {
      deleteSlide(id);
      if (editingId === id) setEditingId(null);
      loadSlides();
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...slides];
    const tempOrder = updated[index].order;
    updated[index].order = updated[index - 1].order;
    updated[index - 1].order = tempOrder;
    saveSlides(updated);
    loadSlides();
  };

  const handleMoveDown = (index: number) => {
    if (index === slides.length - 1) return;
    const updated = [...slides];
    const tempOrder = updated[index].order;
    updated[index].order = updated[index + 1].order;
    updated[index + 1].order = tempOrder;
    saveSlides(updated);
    loadSlides();
  };

  const handleFormChange = (field: string, value: string | number | boolean | null) => {
    if (field.startsWith('content.')) {
      const key = field.replace('content.', '');
      setForm((prev) => ({
        ...prev,
        content: { ...prev.content, [key]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const inputClass = 'bg-black border border-white/20 rounded-lg px-4 py-2 text-white focus:border-white outline-none w-full';

  const sortedSlides = [...slides].sort((a, b) => a.order - b.order);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6 font-mono">Slides Editor</h1>

      <button
        onClick={handleAdd}
        className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-gray-200 mb-6 inline-flex items-center gap-2"
      >
        <Plus size={16} /> Add Slide
      </button>

      {editingId && (
        <div className="bg-black/50 border border-white/10 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4 font-mono">
            {editingId === 'new' ? 'New Slide' : 'Edit Slide'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm mb-1 block font-mono">Slug</label>
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) => handleFormChange('slug', e.target.value)}
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block font-mono">Title</label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => handleFormChange('title', e.target.value)}
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block font-mono">Order</label>
              <input
                className={inputClass}
                type="number"
                value={form.order}
                onChange={(e) => handleFormChange('order', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block font-mono">Headline</label>
              <input
                className={inputClass}
                value={form.content.headline}
                onChange={(e) => handleFormChange('content.headline', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-white/60 text-sm mb-1 block font-mono">Text</label>
              <textarea
                className={inputClass}
                rows={3}
                value={form.content.text}
                onChange={(e) => handleFormChange('content.text', e.target.value)}
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block font-mono">Button Text</label>
              <input
                className={inputClass}
                value={form.button_text ?? ''}
                onChange={(e) => handleFormChange('button_text', e.target.value || null)}
              />
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block font-mono">Button Link</label>
              <input
                className={inputClass}
                value={form.button_link ?? ''}
                onChange={(e) => handleFormChange('button_link', e.target.value || null)}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-white/60 text-sm font-mono">Visible</label>
              <input
                type="checkbox"
                checked={form.is_visible}
                onChange={(e) => handleFormChange('is_visible', e.target.checked)}
                className="w-5 h-5"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-gray-200 inline-flex items-center gap-2"
            >
              <Save size={16} /> Save
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="border border-white/20 text-white px-4 py-2 rounded-lg font-bold hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sortedSlides.map((slide, index) => (
          <div
            key={slide.id}
            className="bg-black/50 border border-white/10 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-white/40 font-mono text-sm w-6 text-center">{slide.order}</span>
              <div>
                <p className="text-white font-mono font-bold">{slide.title || 'Untitled'}</p>
                <p className="text-white/40 text-sm font-mono">{slide.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                className="text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp size={16} />
              </button>
              <button
                onClick={() => handleMoveDown(index)}
                disabled={index === sortedSlides.length - 1}
                className="text-white/40 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowDown size={16} />
              </button>
              <button
                onClick={() => handleEdit(slide)}
                className="bg-white text-black px-4 py-2 rounded-lg font-bold hover:bg-gray-200 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(slide.id)}
                className="text-red-400 hover:text-red-300 p-2"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}