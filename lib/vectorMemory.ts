'use client';

// ══════════════════════════════════════════════════════════════
// VECTOR MEMORY SYSTEM
// Best:     Upstash Redis Vector (free 10k vectors)
// Fallback: Local TF-IDF + cosine similarity (no API)
// ══════════════════════════════════════════════════════════════

// ── Simple local embeddings (no model needed) ─────────────────
// Uses term frequency as a lightweight embedding proxy
function localEmbed(text: string): number[] {
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  // 50-dim vocab hash embedding
  const vec = new Array(50).fill(0);
  for (const word of words) {
    let hash = 5381;
    for (let i = 0; i < word.length; i++) hash = ((hash << 5) + hash) + word.charCodeAt(i);
    const idx = Math.abs(hash) % 50;
    vec[idx] += 1 / (words.length || 1);
  }
  // Normalize
  const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map(v => v / mag);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0; let ma = 0; let mb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; ma += a[i]*a[i]; mb += b[i]*b[i]; }
  return dot / (Math.sqrt(ma) * Math.sqrt(mb) || 1);
}

// ── Local Vector Store (IndexedDB backed) ─────────────────────
interface VectorEntry {
  id: string;
  text: string;
  vector: number[];
  metadata: Record<string, any>;
  ts: number;
}

const VECTOR_KEY = 'jarvis_vectors';

function loadVectors(): VectorEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(VECTOR_KEY) || '[]'); } catch { return []; }
}

function saveVectors(vectors: VectorEntry[]) {
  if (typeof window === 'undefined') return;
  // Keep max 500 vectors, prune oldest
  const pruned = vectors.slice(-500);
  try { localStorage.setItem(VECTOR_KEY, JSON.stringify(pruned)); } catch {}
}

// ── Upstash Vector (optional — free tier 10k vectors) ─────────
async function upstashUpsert(id: string, vector: number[], metadata: any): Promise<boolean> {
  const url  = process.env.NEXT_PUBLIC_UPSTASH_VECTOR_URL;
  const token = process.env.NEXT_PUBLIC_UPSTASH_VECTOR_TOKEN;
  if (!url || !token) return false;
  try {
    const r = await fetch(`${url}/upsert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ id, vector, metadata }]),
    });
    return r.ok;
  } catch { return false; }
}

async function upstashQuery(vector: number[], topK = 5): Promise<any[]> {
  const url   = process.env.NEXT_PUBLIC_UPSTASH_VECTOR_URL;
  const token = process.env.NEXT_PUBLIC_UPSTASH_VECTOR_TOKEN;
  if (!url || !token) return [];
  try {
    const r = await fetch(`${url}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vector, topK, includeMetadata: true }),
    });
    const d = await r.json();
    return d.result || [];
  } catch { return []; }
}

// ══════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════

export async function storeMemoryVector(
  id: string,
  text: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const vector = localEmbed(text);

  // Try Upstash first
  const ok = await upstashUpsert(id, vector, { text, ...metadata });

  // Always store locally too
  const vectors = loadVectors();
  const existing = vectors.findIndex(v => v.id === id);
  const entry: VectorEntry = { id, text, vector, metadata, ts: Date.now() };
  if (existing >= 0) vectors[existing] = entry;
  else vectors.push(entry);
  saveVectors(vectors);
}

export async function searchMemoryVectors(
  query: string,
  topK = 6
): Promise<Array<{ text: string; score: number; metadata: any }>> {
  const queryVec = localEmbed(query);

  // Try Upstash first
  const upstashResults = await upstashQuery(queryVec, topK);
  if (upstashResults.length > 0) {
    return upstashResults.map(r => ({
      text: r.metadata?.text || '',
      score: r.score,
      metadata: r.metadata,
    }));
  }

  // Local fallback
  const vectors = loadVectors();
  const scored = vectors
    .map(v => ({ ...v, score: cosineSimilarity(queryVec, v.vector) }))
    .filter(v => v.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored.map(v => ({ text: v.text, score: v.score, metadata: v.metadata }));
}

export async function deleteMemoryVector(id: string): Promise<void> {
  const vectors = loadVectors().filter(v => v.id !== id);
  saveVectors(vectors);
}

export function getVectorCount(): number {
  return loadVectors().length;
}
