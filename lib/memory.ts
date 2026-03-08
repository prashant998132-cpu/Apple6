'use client';
import { getDB, Memory, Profile } from './db';

// ── Default profile ──────────────────────────────────────────────
export const DEFAULT_PROFILE: Profile = {
  xp: 0, level: 1, streak: 0, lastActive: 0,
  totalMessages: 0, badges: [],
  personality: 'default', thinkMode: 'auto',
  theme: 'dark',
};

export async function getProfile(): Promise<Profile> {
  const db = getDB(); if (!db) return DEFAULT_PROFILE;
  const p = await db.profile.toCollection().first();
  return p || DEFAULT_PROFILE;
}

export async function saveProfile(data: Partial<Profile>) {
  const db = getDB(); if (!db) return;
  const p = await db.profile.toCollection().first();
  if (p?.id) await db.profile.update(p.id, data);
  else await db.profile.add({ ...DEFAULT_PROFILE, ...data });
}

// ── XP + Levels ─────────────────────────────────────────────────
export async function addXP(amount: number): Promise<{ leveled: boolean; level: number }> {
  const p = await getProfile();
  const newXP = (p.xp || 0) + amount;
  const newLevel = Math.floor(newXP / 100) + 1;
  const leveled = newLevel > (p.level || 1);
  await saveProfile({ xp: newXP, level: newLevel, totalMessages: (p.totalMessages || 0) + 1 });
  if (leveled) checkBadges(newLevel);
  return { leveled, level: newLevel };
}

export function getLevelProgress(xp: number): number {
  return xp % 100;
}

// ── Streak ──────────────────────────────────────────────────────
export async function updateStreak() {
  const p = await getProfile();
  const today = new Date().toDateString();
  const lastDate = p.lastActive ? new Date(p.lastActive).toDateString() : '';
  if (lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const newStreak = lastDate === yesterday ? (p.streak || 0) + 1 : 1;
  await saveProfile({ streak: newStreak, lastActive: Date.now() });
}

// ── Badges ──────────────────────────────────────────────────────
const BADGE_DEFS = [
  { id: 'first_chat', label: '🌟 First Chat', condition: (p: Profile) => p.totalMessages >= 1 },
  { id: 'streak_3', label: '🔥 3-Day Streak', condition: (p: Profile) => p.streak >= 3 },
  { id: 'streak_7', label: '⚡ Week Warrior', condition: (p: Profile) => p.streak >= 7 },
  { id: 'messages_50', label: '💬 Chatterbox', condition: (p: Profile) => p.totalMessages >= 50 },
  { id: 'messages_200', label: '🗣️ Pro User', condition: (p: Profile) => p.totalMessages >= 200 },
  { id: 'level_5', label: '🚀 Level 5', condition: (p: Profile) => p.level >= 5 },
  { id: 'night_owl', label: '🦉 Night Owl', condition: () => new Date().getHours() >= 0 && new Date().getHours() < 4 },
  { id: 'deep_thinker', label: '🧠 Deep Thinker', condition: (p: Profile) => p.thinkMode === 'think' || p.thinkMode === 'deep' },
];

export async function checkBadges(level?: number) {
  const p = await getProfile();
  const newBadges = [...(p.badges || [])];
  for (const b of BADGE_DEFS) {
    if (!newBadges.includes(b.id) && b.condition(p)) {
      newBadges.push(b.id);
    }
  }
  if (newBadges.length !== (p.badges || []).length) {
    await saveProfile({ badges: newBadges });
  }
  return newBadges;
}

export const ALL_BADGES = BADGE_DEFS;

// ── Memory system ────────────────────────────────────────────────
export async function saveMemory(text: string, type: Memory['type'], importance: number) {
  const db = getDB(); if (!db) return;
  // Don't duplicate
  const existing = await db.memory.where('text').equals(text).first();
  if (existing) { await db.memory.update(existing.id!, { usedCount: (existing.usedCount || 0) + 1 }); return; }
  await db.memory.add({ text, type, importance, ts: Date.now(), usedCount: 0 });
  // Cleanup: delete importance < 3 older than 30 days
  const cutoff = Date.now() - 30 * 86400000;
  await db.memory.where('ts').below(cutoff).and(m => m.importance < 3).delete();
}

export async function getTopMemories(limit = 8): Promise<Memory[]> {
  const db = getDB(); if (!db) return [];
  return db.memory.orderBy('importance').reverse().limit(limit).toArray();
}

export async function getAllMemories(): Promise<Memory[]> {
  const db = getDB(); if (!db) return [];
  return db.memory.orderBy('ts').reverse().toArray();
}

export async function deleteMemory(id: number) {
  const db = getDB(); if (!db) return;
  await db.memory.delete(id);
}

// ── Auto-extract profile info from messages ──────────────────────
export async function extractProfileInfo(text: string) {
  const t = text.toLowerCase();
  // Name
  const nameMatch = t.match(/(?:mera naam|my name is|i am|main hoon|mujhe bulao)\s+([a-zA-Z\u0900-\u097F]+)/i);
  if (nameMatch) {
    await saveMemory(`User ka naam: ${nameMatch[1]}`, 'name', 9);
    await saveProfile({ name: nameMatch[1] });
  }
  // City
  const cities = ['rewa', 'bhopal', 'indore', 'mumbai', 'delhi', 'bangalore', 'hyderabad', 'pune', 'jaipur', 'lucknow', 'maihar', 'satna'];
  for (const city of cities) {
    if (t.includes(city)) { await saveMemory(`User ${city} mein rehta hai`, 'location', 8); break; }
  }
  // Preferences
  if (t.match(/mujhe .+ pasand hai|i love|i like|mujhe .+ chahiye/)) {
    await saveMemory(text.slice(0, 100), 'preference', 5);
  }
}

// ── Semantic search (TF-IDF style) ──────────────────────────────
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
}
function tfidfScore(query: string, doc: string): number {
  const qT = tokenize(query); const dT = new Set(tokenize(doc));
  return qT.filter(t => dT.has(t)).length / Math.max(qT.length, 1);
}
export async function semanticSearch(query: string, limit = 5): Promise<Memory[]> {
  const db = getDB(); if (!db) return [];
  const all = await db.memory.toArray();
  return all
    .map(m => ({ ...m, _s: tfidfScore(query, m.text) * (m.importance / 10) }))
    .filter((m: any) => m._s > 0)
    .sort((a: any, b: any) => b._s - a._s)
    .slice(0, limit);
}

// ── Emotion logging ──────────────────────────────────────────────
export async function logEmotion(emotion: string, context: string) {
  const db = getDB(); if (!db) return;
  const today = new Date().toDateString();
  const existing = await db.memory.filter(m => m.text.startsWith(`[EMOTION:${today}]`)).first();
  if (existing) await db.memory.update(existing.id!, { text: `[EMOTION:${today}] ${emotion} — ${context.slice(0,60)}`, ts: Date.now() });
  else await db.memory.add({ text: `[EMOTION:${today}] ${emotion} — ${context.slice(0,60)}`, type: 'habit', importance: 4, ts: Date.now() });
}

// ── Relationship level ───────────────────────────────────────────
export function getRelationshipName(xp: number): { name: string; icon: string; next: number } {
  if (xp >= 1500) return { name: 'JARVIS MODE', icon: '🤖', next: Infinity };
  if (xp >= 700)  return { name: 'Best Friend', icon: '❤️', next: 1500 };
  if (xp >= 300)  return { name: 'Friend', icon: '🤝', next: 700 };
  if (xp >= 100)  return { name: 'Acquaintance', icon: '👋', next: 300 };
  return { name: 'Stranger', icon: '🌱', next: 100 };
}

// ── Knowledge graph ──────────────────────────────────────────────
export async function trackTopic(topic: string) {
  const db = getDB(); if (!db) return;
  const existing = await db.memory.filter(m => m.text.startsWith(`[TOPIC:${topic}]`)).first();
  if (existing) await db.memory.update(existing.id!, { importance: Math.min(10, (existing.importance||3)+1), usedCount: (existing.usedCount||0)+1 });
  else await db.memory.add({ text: `[TOPIC:${topic}] User yeh topic explore karta hai`, type: 'preference', importance: 3, ts: Date.now(), usedCount: 1 });
}
export async function getTopTopics(limit = 8) {
  const db = getDB(); if (!db) return [];
  const topics = await db.memory.filter(m => m.text.startsWith('[TOPIC:')).toArray();
  return topics.map(m => ({ topic: m.text.replace(/\[TOPIC:(.*?)\].*/, '$1'), count: m.usedCount||1 })).sort((a,b)=>b.count-a.count).slice(0,limit);
}
