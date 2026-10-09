import { useState, useEffect } from 'react';
import {
  getHotTakes,
  addHotTake,
  updateHotTake,
  deleteHotTake,
} from './store';
import type { HotTake } from '../data/types';
import { Plus, Trash2, Save } from 'lucide-react';

type Category = 'hat' | 'dog';

export default function HotTakesEditor() {
  const [takes, setTakes] = useState<HotTake[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [form, setForm] = useState<{ content: string; category: Category }>({
    content: '',
    category: 'hat',
  });

  useEffect(() => {
    setTakes(getHotTakes());
  }, []);

  const filtered = filter === 'all' ? takes : takes.filter((t) => t.category === filter);

  function handleAdd() {
    const id = crypto.randomUUID();
    const take: HotTake = { id, content: form.content, category: form.category };
    addHotTake(take);
    setTakes(getHotTakes());
    setForm({ content: '', category: 'hat' });
  }

  function handleUpdate() {
    if (!editingId) return;
    updateHotTake(editingId, { content: form.content, category: form.category });
    setTakes(getHotTakes());
    setEditingId(null);
    setForm({ content: '', category: 'hat' });
  }

  function handleDelete(id: string) {
    deleteHotTake(id);
    setTakes(getHotTakes());
    if (editingId === id) {
      setEditingId(null);
      setForm({ content: '', category: 'hat' });
    }
  }

  function startEdit(take: HotTake) {
    setEditingId(take.id);
    setForm({ content: take.content, category: (take.category as Category) || 'hat' });
  }

  function categoryBadge(category: string | null) {
    if (category === 'dog') {
      return (
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-300">
          Dog
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-300">
        Hat
      </span>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Hot Takes</h1>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ content: '', category: 'hat' });
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Plus size={16} />
          Add Hot Take
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'hat', 'dog'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors capitalize ${
              filter === cat
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-black/50 border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4 text-white/70 uppercase tracking-wider">
          {editingId ? 'Edit Hot Take' : 'New Hot Take'}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Type your hot take..."
              rows={3}
              className="w-full bg-black border border-white/20 rounded-lg text-white px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-white/40 resize-none"
            />
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="bg-black border border-white/20 rounded-lg text-white px-3 py-2 text-sm focus:outline-none focus:border-white/40"
              >
                <option value="hat">Hat</option>
                <option value="dog">Dog</option>
              </select>
            </div>
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              disabled={!form.content.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">Content</th>
              <th className="text-left px-4 py-3 font-medium w-24">Category</th>
              <th className="text-right px-4 py-3 font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-white/30">
                  No hot takes found.
                </td>
              </tr>
            )}
            {filtered.map((take) => (
              <tr
                key={take.id}
                className={`border-b border-white/5 transition-colors ${
                  editingId === take.id ? 'bg-white/5' : 'hover:bg-white/[0.02]'
                }`}
              >
                <td className="px-4 py-3 text-white">{take.content}</td>
                <td className="px-4 py-3">{categoryBadge(take.category)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(take)}
                      className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(take.id)}
                      className="p-1.5 rounded bg-white/10 hover:bg-red-500/20 text-white/50 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
