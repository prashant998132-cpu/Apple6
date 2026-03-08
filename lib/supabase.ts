'use client';

// ══════════════════════════════════════════════════════════════
// SUPABASE SYNC — Multi-device, optional
// Free: 500MB DB, 1GB storage, 50k MAU
// App works 100% WITHOUT Supabase — pure local fallback
// ══════════════════════════════════════════════════════════════

let _client: any = null;

function getClient(): any {
  if (typeof window === 'undefined') return null;
  if (_client) return _client;
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const aKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !aKey) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    _client = createClient(url, aKey, { auth: { persistSession: true, autoRefreshToken: true } });
    return _client;
  } catch { return null; }
}

function getUID(): string {
  if (typeof window === 'undefined') return 'local';
  let uid = localStorage.getItem('jarvis_uid');
  if (!uid) { uid = `j_${Date.now()}_${Math.random().toString(36).slice(2)}`; localStorage.setItem('jarvis_uid', uid); }
  return uid;
}

// ── Chat sync ─────────────────────────────────────────────────
export async function syncMessageToCloud(msg: { session_id: string; role: string; content: string; ts: number }): Promise<boolean> {
  const sb = getClient(); if (!sb) return false;
  try {
    const { error } = await sb.from('jarvis_messages').upsert({ user_id: getUID(), ...msg });
    return !error;
  } catch { return false; }
}

export async function getCloudSessions(): Promise<{ session_id: string; preview: string; ts: number }[]> {
  const sb = getClient(); if (!sb) return [];
  try {
    const { data } = await sb.from('jarvis_messages').select('session_id,content,ts').eq('user_id', getUID()).eq('role', 'user').order('ts', { ascending: false });
    if (!data) return [];
    const map = new Map<string, any>();
    for (const m of data) { if (!map.has(m.session_id)) map.set(m.session_id, { session_id: m.session_id, preview: m.content.slice(0, 50), ts: m.ts }); }
    return [...map.values()].slice(0, 50);
  } catch { return []; }
}

export async function loadMessagesFromCloud(sessionId: string): Promise<any[]> {
  const sb = getClient(); if (!sb) return [];
  try {
    const { data } = await sb.from('jarvis_messages').select('*').eq('user_id', getUID()).eq('session_id', sessionId).order('ts');
    return data || [];
  } catch { return []; }
}

// ── Profile sync ──────────────────────────────────────────────
export async function syncProfileToCloud(profile: any): Promise<boolean> {
  const sb = getClient(); if (!sb) return false;
  try {
    const { error } = await sb.from('jarvis_profiles').upsert({ user_id: getUID(), ...profile, updated_at: new Date().toISOString() });
    return !error;
  } catch { return false; }
}

export async function loadProfileFromCloud(): Promise<any | null> {
  const sb = getClient(); if (!sb) return null;
  try {
    const { data } = await sb.from('jarvis_profiles').select('*').eq('user_id', getUID()).single();
    return data || null;
  } catch { return null; }
}

// ── Memory sync ───────────────────────────────────────────────
export async function syncMemoriesToCloud(memories: any[]): Promise<boolean> {
  const sb = getClient(); if (!sb) return false;
  try {
    const rows = memories.map(m => ({ ...m, user_id: getUID(), id: undefined }));
    const { error } = await sb.from('jarvis_memories').upsert(rows, { onConflict: 'user_id,text' });
    return !error;
  } catch { return false; }
}

export async function loadMemoriesFromCloud(): Promise<any[]> {
  const sb = getClient(); if (!sb) return [];
  try {
    const { data } = await sb.from('jarvis_memories').select('*').eq('user_id', getUID()).order('importance', { ascending: false }).limit(100);
    return data || [];
  } catch { return []; }
}

// ── GitHub Gist fallback ──────────────────────────────────────
export async function gistBackup(data: any): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('gist_token');
  if (!token) return false;
  try {
    const gistId = localStorage.getItem('gist_id');
    const body = { description: 'JARVIS v8 Backup', public: false, files: { 'jarvis_backup.json': { content: JSON.stringify(data, null, 2) } } };
    const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
    const r = await fetch(url, { method: gistId ? 'PATCH' : 'POST', headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.id) localStorage.setItem('gist_id', d.id);
    return r.ok;
  } catch { return false; }
}

export async function gistRestore(): Promise<any | null> {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('gist_token');
  const gistId = localStorage.getItem('gist_id');
  if (!token || !gistId) return null;
  try {
    const r = await fetch(`https://api.github.com/gists/${gistId}`, { headers: { Authorization: `token ${token}` } });
    const d = await r.json();
    const content = d.files?.['jarvis_backup.json']?.content;
    return content ? JSON.parse(content) : null;
  } catch { return null; }
}

export function isSupabaseEnabled(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
