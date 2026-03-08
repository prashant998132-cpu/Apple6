'use client';
import { useState, useEffect } from 'react';
import { getDB, Goal } from '@/lib/db';
import { addXP } from '@/lib/memory';

export default function TargetPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', deadline: '', priority: 'medium' as any });

  const load = async () => {
    const db = getDB(); if (!db) return;
    const g = await db.goals.orderBy('ts').reverse().toArray();
    setGoals(g);
  };

  useEffect(() => { load(); }, []);

  const addGoal = async () => {
    if (!form.title) return;
    const db = getDB(); if (!db) return;
    await db.goals.add({ ...form, progress: 0, status: 'pending', ts: Date.now() });
    setForm({ title: '', description: '', deadline: '', priority: 'medium' });
    setShowForm(false);
    await load();
    await addXP(5);
  };

  const updateProgress = async (id: number, progress: number) => {
    const db = getDB(); if (!db) return;
    const status = progress >= 100 ? 'completed' : progress > 0 ? 'in-progress' : 'pending';
    await db.goals.update(id, { progress, status });
    if (progress >= 100) await addXP(20);
    await load();
  };

  const deleteGoal = async (id: number) => {
    const db = getDB(); if (!db) return;
    await db.goals.delete(id);
    await load();
  };

  const priColor: Record<string, string> = { high: 'text-red-400 bg-red-500/10 border-red-500/30', medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30', low: 'text-green-400 bg-green-500/10 border-green-500/30' };

  return (
    <div className="h-full overflow-y-auto px-4 py-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">🎯 Goals</h1>
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 bg-blue-600 rounded-xl text-sm font-medium">+ Add</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[['Total', goals.length, '📋'], ['Active', goals.filter(g => g.status === 'in-progress').length, '🔄'], ['Done', goals.filter(g => g.status === 'completed').length, '✅']].map(([l, v, i]) => (
          <div key={String(l)} className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700/50">
            <div className="text-2xl font-bold text-blue-400">{v}</div>
            <div className="text-xs text-gray-400">{i} {l}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700 mb-4">
          <div className="text-sm font-bold mb-3">New Goal</div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Goal title *"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm mb-2 outline-none text-gray-200" />
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (optional)"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm mb-2 outline-none text-gray-200" />
          <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm mb-2 outline-none text-gray-200" />
          <div className="flex gap-2 mb-3">
            {['high', 'medium', 'low'].map(p => (
              <button key={p} onClick={() => setForm({ ...form, priority: p })}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize border ${form.priority === p ? priColor[p] : 'border-gray-700 text-gray-400'}`}>
                {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={addGoal} className="flex-1 py-2 bg-blue-600 rounded-xl text-sm font-medium">Add Goal</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 rounded-xl text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Goals list */}
      <div className="space-y-3">
        {goals.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-sm">Koi goal nahi — Add karo!</div>
          </div>
        )}
        {goals.map(g => (
          <div key={g.id} className={`bg-gray-800/50 rounded-2xl p-4 border ${g.status === 'completed' ? 'border-green-500/30' : 'border-gray-700/50'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold ${g.status === 'completed' ? 'line-through text-gray-500' : ''}`}>{g.title}</div>
                {g.description && <div className="text-xs text-gray-400 mt-0.5">{g.description}</div>}
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${priColor[g.priority]}`}>{g.priority}</span>
                <button onClick={() => deleteGoal(g.id!)} className="text-gray-500 hover:text-red-400 text-sm">✕</button>
              </div>
            </div>
            {g.deadline && <div className="text-xs text-gray-500 mb-2">📅 {new Date(g.deadline).toLocaleDateString('hi-IN')}</div>}
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${g.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${g.progress}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-8">{g.progress}%</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[0, 25, 50, 75, 100].map(p => (
                <button key={p} onClick={() => updateProgress(g.id!, p)}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${g.progress === p ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                  {p}%
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
