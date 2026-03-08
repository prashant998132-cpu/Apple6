'use client';
import Dexie, { Table } from 'dexie';

export interface ChatMessage {
  id?: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  mode?: string;
  pinned?: boolean;
  liked?: boolean;
}

export interface Memory {
  id?: number;
  text: string;
  type: 'name' | 'location' | 'preference' | 'correction' | 'habit' | 'joke' | 'general';
  importance: number; // 0-10
  ts: number;
  usedCount?: number;
}

export interface Goal {
  id?: number;
  title: string;
  description?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  progress: number; // 0-100
  status: 'pending' | 'in-progress' | 'completed';
  ts: number;
}

export interface Profile {
  id?: number;
  name?: string;
  nickname?: string;
  city?: string;
  interests?: string[];
  xp: number;
  level: number;
  streak: number;
  lastActive: number;
  totalMessages: number;
  badges: string[];
  personality: 'default' | 'motivation' | 'chill' | 'focus' | 'philosopher' | 'roast';
  thinkMode: 'auto' | 'flash' | 'think' | 'deep';
  theme: 'dark' | 'light' | 'amoled';
  pinHash?: string;
}

export interface MediaCache {
  id?: number;
  puterPath?: string;
  type: 'image' | 'video' | 'audio' | 'doc';
  name: string;
  size: number;
  thumb?: string;
  ts: number;
}

class JarvisDB extends Dexie {
  messages!: Table<ChatMessage>;
  memory!: Table<Memory>;
  goals!: Table<Goal>;
  profile!: Table<Profile>;
  media!: Table<MediaCache>;

  constructor() {
    super('jarvis_v8');
    this.version(1).stores({
      messages: '++id, sessionId, role, ts',
      memory: '++id, type, importance, ts',
      goals: '++id, status, priority, ts',
      profile: '++id',
      media: '++id, type, ts',
    });
  }
}

let _db: JarvisDB | null = null;
export function getDB(): JarvisDB | null {
  if (typeof window === 'undefined') return null;
  if (!_db) _db = new JarvisDB();
  return _db;
}

// ── Relationship levels ──────────────────────────────────────────
export const RELATIONSHIP_LEVELS = [
  { level: 1, name: 'Stranger', minXP: 0 },
  { level: 2, name: 'Acquaintance', minXP: 100 },
  { level: 3, name: 'Friend', minXP: 300 },
  { level: 4, name: 'Best Friend', minXP: 700 },
  { level: 5, name: 'JARVIS MODE', minXP: 1500 },
];

export function getRelationshipLevel(xp: number) {
  return [...RELATIONSHIP_LEVELS].reverse().find(r => xp >= r.minXP) || RELATIONSHIP_LEVELS[0];
}
