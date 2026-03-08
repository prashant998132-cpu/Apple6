'use client';
import { useState, useEffect } from 'react';
import { getDB } from '@/lib/db';

interface Session { id: string; preview: string; ts: number; count: number; }
interface Props { onSelect: (sessionId: string) => void; currentSession: string; }

export default function ChatHistorySidebar({ onSelect, currentSession }: Props) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  const load = async () => {
    const db = getDB(); if (!db) return;
    const all = await db.messages.toArray();
    const map = new Map<string, Session>();
    for (const m of all) {
      if (!map.has(m.sessionId)) map.set(m.sessionId, { id: m.sessionId, preview: '', ts: m.ts, count: 0 });
      const s = map.get(m.sessionId)!;
      s.count++;
      s.ts = Math.max(s.ts, m.ts);
      if (m.role === 'user' && !s.preview) s.preview = m.content.slice(0, 50);
    }
    setSessions([...map.values()].sort((a,b) => b.ts - a.ts).slice(0, 30));
  };

  useEffect(() => { if (open) load(); }, [open]);

  const deleteSession = async (id: string) => {
    const db = getDB(); if (!db) return;
    await db.messages.where('sessionId').equals(id).delete();
    setSessions(s => s.filter(x => x.id !== id));
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-white text-xl transition-colors" title="Chat History">🕐</button>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <div className="font-bold text-sm">🕐 Chat History</div>
              <button onClick={() => setOpen(false)} className="text-gray-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {sessions.length === 0 && (
                <div className="text-center py-12 text-gray-500 text-sm">Koi history nahi</div>
              )}
              {sessions.map(s => (
                <div key={s.id} className={`flex items-start gap-2 px-3 py-2.5 hover:bg-gray-800 cursor-pointer transition-colors group ${s.id === currentSession ? 'bg-gray-800/50' : ''}`}
                  onClick={() => { onSelect(s.id); setOpen(false); }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{s.preview || 'New chat'}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {new Date(s.ts).toLocaleDateString('hi-IN')} · {s.count} msgs
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-sm transition-all">🗑️</button>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-800">
              <button onClick={async () => { const db = getDB(); if (db) { await db.messages.clear(); setSessions([]); } }}
                className="w-full py-2 rounded-xl bg-red-500/10 text-red-400 text-xs border border-red-500/20">
                🗑️ Sab Delete Karo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
