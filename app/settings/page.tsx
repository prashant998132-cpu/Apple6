'use client';
import React, { useState, useEffect } from 'react';

import { getProfile, saveProfile, getAllMemories, deleteMemory, ALL_BADGES } from '@/lib/memory';
import { getDB } from '@/lib/db';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [tab, setTab] = useState('general');
  const [apiKeys, setApiKeys] = useState<any>({});
  const [saved, setSaved] = useState('');

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfile(p);
      const m = await getAllMemories();
      setMemories(m);
      try {
        const keys = JSON.parse(localStorage.getItem('jarvis_api_keys') || '{}');
        setApiKeys(keys);
      } catch {}
    })();
  }, []);

  const saveKey = (k: string, v: string) => {
    const updated = { ...apiKeys, [k]: v };
    setApiKeys(updated);
    localStorage.setItem('jarvis_api_keys', JSON.stringify(updated));
    setSaved('Keys saved! ✅');
    setTimeout(() => setSaved(''), 2000);
  };

  const nukeData = async () => {
    if (!confirm('Sab kuch delete karna hai? JARVIS ki yaadein, chats, goals — sab!')) return;
    const db = getDB();
    if (db) { await db.messages.clear(); await db.memory.clear(); await db.goals.clear(); await db.profile.clear(); }
    localStorage.clear();
    window.location.reload();
  };

  const tabs = ['general', 'memory', 'keys', 'about'];

  return (
    <div className="h-full overflow-y-auto px-4 py-4 pb-4">
      <h1 className="text-xl font-bold mb-4">⚙️ Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            {t === 'general' ? '⚙️ General' : t === 'memory' ? '🧠 Memory' : t === 'keys' ? '🔑 API Keys' : 'ℹ️ About'}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && profile && (
        <div className="space-y-3">
          <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
            <div className="text-sm font-bold mb-3 text-gray-300">🎭 Personality</div>
            <div className="grid grid-cols-2 gap-2">
              {[['default','🤖 JARVIS','Balanced'],['motivation','🔥 Hype','Tony Stark'],['chill','😎 Chill','Relaxed'],['focus','🎯 Focus','Direct'],['philosopher','🧘 Philo','Deep'],['roast','😂 Roast','Sarcastic']].map(([id, label, desc]) => (
                <button key={id} onClick={async () => { await saveProfile({ personality: id as any }); setProfile({ ...profile, personality: id }); }}
                  className={`p-3 rounded-xl text-left border transition-all ${profile.personality === id ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50'}`}>
                  <div className="text-sm font-bold">{label}</div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
            <div className="text-sm font-bold mb-3 text-gray-300">🎨 Theme</div>
            <div className="flex gap-2">
              {[['dark','🌙 Dark'],['light','☀️ Light'],['amoled','⚫ AMOLED']].map(([id, label]) => (
                <button key={id} onClick={async () => { await saveProfile({ theme: id as any }); setProfile({ ...profile, theme: id }); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${profile.theme === id ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-800/50 text-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
            <div className="text-sm font-bold mb-2 text-gray-300">⚡ Default Think Mode</div>
            <div className="flex gap-2">
              {[['auto','🤖 Auto'],['flash','⚡ Flash'],['think','🧠 Think'],['deep','🔬 Deep']].map(([id, label]) => (
                <button key={id} onClick={async () => { await saveProfile({ thinkMode: id as any }); setProfile({ ...profile, thinkMode: id }); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${profile.thinkMode === id ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-700 bg-gray-800/50 text-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
            <div className="text-sm font-bold mb-3 text-gray-300">📊 Stats</div>
            <div className="grid grid-cols-3 gap-3">
              {[['Level', profile.level || 1, '🏆'], ['XP', profile.xp || 0, '⭐'], ['Messages', profile.totalMessages || 0, '💬'], ['Streak', profile.streak || 0, '🔥'], ['Badges', (profile.badges || []).length, '🎖️'], ['Memories', memories.length, '🧠']].map(([label, val, icon]) => (
                <div key={String(label)} className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{val}</div>
                  <div className="text-xs text-gray-400">{icon} {label}</div>
                </div>
              ))}
            </div>
          </div>


          {/* PIN Setup */}
          <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
            <div className="text-sm font-bold mb-3 text-gray-300">🔒 PIN Lock</div>
            <PinSetup />
          </div>

          <button onClick={nukeData} className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
            🗑️ Sab Delete Karo
          </button>
        </div>
      )}

      {/* Memory */}
      {tab === 'memory' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">{memories.length} memories</div>
            <button onClick={async () => { const db = getDB(); if (db) { await db.memory.where('importance').below(3).delete(); setMemories(await getAllMemories()); } }} className="text-xs text-red-400 border border-red-500/30 px-2 py-1 rounded-lg">🧹 Clean Low</button>
          </div>
          {memories.map(m => (
            <div key={m.id} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-300 truncate">{m.text}</div>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] text-gray-500">{m.type}</span>
                  <span className={`text-[10px] font-bold ${m.importance >= 7 ? 'text-red-400' : m.importance >= 5 ? 'text-amber-400' : 'text-gray-500'}`}>★{m.importance}</span>
                </div>
              </div>
              <button onClick={async () => { await deleteMemory(m.id); setMemories(await getAllMemories()); }} className="text-gray-500 hover:text-red-400 text-sm">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* API Keys */}
      {tab === 'keys' && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 text-xs text-green-400">
            ✅ Keys browser mein store hoti hain — code mein kabhi nahi. Vercel env vars se overrride kar sakte ho.
          </div>
          {[
            ['GROQ_API_KEY', 'Groq', 'groq.com → Free 14400/day', 'gsk_...'],
            ['GEMINI_API_KEY', 'Gemini', 'aistudio.google.com → Free 1500/day', 'AIza...'],
            ['DEEPSEEK_API_KEY', 'DeepSeek', 'platform.deepseek.com', 'sk-...'],
            ['NEWS_API_KEY', 'News API', 'newsapi.org → Free 100/day', '...'],
            ['NASA_API_KEY', 'NASA', 'api.nasa.gov → Free', 'DEMO_KEY works too'],
          ].map(([key, label, hint, ph]) => (
            <div key={key} className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50">
              <div className="text-sm font-bold text-gray-200 mb-1">{label}</div>
              <div className="text-xs text-gray-500 mb-2">{hint}</div>
              <div className="flex gap-2">
                <input type="password" defaultValue={apiKeys[key] || ''} placeholder={ph}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300 outline-none"
                  onChange={e => setApiKeys({ ...apiKeys, [key]: e.target.value })}
                />
                <button onClick={() => saveKey(key, apiKeys[key] || '')} className="px-3 py-2 bg-blue-600 rounded-xl text-xs font-medium">Save</button>
              </div>
            </div>
          ))}
          {saved && <div className="text-center text-green-400 text-sm">{saved}</div>}
        </div>
      )}

      {/* About */}
      {tab === 'about' && (
        <div className="space-y-3">
          <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 text-center">
            <div className="text-4xl mb-2">🤖</div>
            <div className="text-xl font-bold">JARVIS AI</div>
            <div className="text-sm text-gray-400">v8.0.0</div>
            <div className="text-xs text-gray-500 mt-2">Next.js 15 · TypeScript · Vercel · Zero paid infra</div>
          </div>
          <div className="bg-gray-800/50 rounded-2xl p-4 border border-gray-700/50 space-y-2">
            <div className="text-sm font-bold text-gray-300">AI Providers (Free)</div>
            {['Groq — Flash mode (14400/day)', 'Gemini 2.0 — Deep mode (1500/day)', 'DeepSeek — Think mode', 'Pollinations — Always on, no key'].map(p => (
              <div key={p} className="text-xs text-gray-400 flex gap-2"><span className="text-green-400">✓</span>{p}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// PIN setup component — add this to the General tab
// Pin settings section code is already in the settings page

function PinSetup() {
  const [current, setCurrent] = React.useState('');
  const [newPin, setNewPin] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const hasPin = typeof window !== 'undefined' && !!localStorage.getItem('jarvis_pin_hash');

  const setPin = async () => {
    if (newPin !== confirm) { setMsg('❌ PINs match nahi karte'); return; }
    if (newPin.length !== 4) { setMsg('❌ 4 digits chahiye'); return; }
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(newPin));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem('jarvis_pin_hash', hash);
    localStorage.setItem('jarvis_pin_unlock', String(Date.now()));
    setMsg('✅ PIN set! Agle restart pe active hoga.');
    setNewPin(''); setConfirm('');
  };
  const removePin = async () => {
    if (!hasPin) return;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(current));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
    if (hash !== localStorage.getItem('jarvis_pin_hash')) { setMsg('❌ Current PIN wrong'); return; }
    localStorage.removeItem('jarvis_pin_hash');
    setMsg('✅ PIN removed!'); setCurrent('');
  };

  return (
    <div className="space-y-3">
      <div className={`text-xs px-2 py-1 rounded-lg ${hasPin ? 'text-green-400 bg-green-500/10' : 'text-gray-400 bg-gray-700/30'}`}>
        {hasPin ? '🔐 PIN active hai' : '🔓 PIN set nahi hai'}
      </div>
      {hasPin && <input type="password" maxLength={4} value={current} onChange={e=>setCurrent(e.target.value)} placeholder="Current PIN" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none" />}
      <input type="password" maxLength={4} value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="New PIN (4 digits)" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none" />
      <input type="password" maxLength={4} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm PIN" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none" />
      <div className="flex gap-2">
        <button onClick={setPin} className="flex-1 py-2 bg-blue-600 rounded-xl text-xs font-medium">{hasPin ? 'Change PIN' : 'Set PIN'}</button>
        {hasPin && <button onClick={removePin} className="px-3 py-2 bg-red-500/20 text-red-400 rounded-xl text-xs">Remove</button>}
      </div>
      {msg && <div className="text-xs text-center mt-1">{msg}</div>}
    </div>
  );
}
