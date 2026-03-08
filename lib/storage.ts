'use client';

// ══════════════════════════════════════════════════════════════
// ULTRA STORAGE LAYER
// Layer 1 (Primary):    Puter Cloud FS (1GB free, no key)
// Layer 2 (Backup):     Cloudflare R2 (optional, env var)
// Layer 3 (Local):      IndexedDB thumbnails + metadata
// Zero Vercel bandwidth
// ══════════════════════════════════════════════════════════════

import { puterUpload, puterRead, puterDelete } from './puter';
import { getDB } from './db';

export type MediaType = 'image' | 'video' | 'audio' | 'doc' | 'generated';

export interface UploadedMedia {
  id: string;
  name: string;
  type: MediaType;
  size: number;
  puterPath: string | null;
  r2Url: string | null;
  thumb: string | null;   // base64 thumbnail (stored in IndexedDB)
  aiTags: string[];
  ts: number;
}

// ── Image compression (Canvas) ───────────────────────────────
export async function compressImage(
  file: File,
  maxW = 1200,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject('Compress failed'), 'image/jpeg', quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Thumbnail generator (120x120) ───────────────────────────
export async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (file.type.startsWith('video/')) {
      // Video thumbnail via <video> element
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      video.src = url;
      video.currentTime = 2;
      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 120; canvas.height = 120;
        const ctx = canvas.getContext('2d')!;
        // Crop center
        const s = Math.min(video.videoWidth, video.videoHeight);
        ctx.drawImage(video, (video.videoWidth - s) / 2, (video.videoHeight - s) / 2, s, s, 0, 0, 120, 120);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      });
      video.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(''); });
    } else if (file.type.startsWith('image/')) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = 120; canvas.height = 120;
        const ctx = canvas.getContext('2d')!;
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 120, 120);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(''); };
      img.src = url;
    } else {
      resolve(''); // No thumb for audio/docs
    }
  });
}

// ── Cloudflare R2 upload (optional) ─────────────────────────
async function r2Upload(blob: Blob, name: string): Promise<string | null> {
  // R2 needs a signed URL — we call our own API route for this
  try {
    const fd = new FormData();
    fd.append('file', blob, name);
    const r = await fetch('/api/r2-upload', { method: 'POST', body: fd });
    if (!r.ok) return null;
    const d = await r.json();
    return d.url || null;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════
// MAIN UPLOAD FUNCTION
// ══════════════════════════════════════════════════════════════
export async function uploadMedia(
  file: File,
  type: MediaType,
  onProgress?: (stage: string, pct: number) => void
): Promise<UploadedMedia | null> {
  try {
    const id = `media_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Stage 1: Compress (images only)
    onProgress?.('Compressing...', 10);
    let uploadBlob: Blob = file;
    if (type === 'image' && file.type.startsWith('image/')) {
      try { uploadBlob = await compressImage(file); } catch {}
    }

    // Stage 2: Generate thumbnail
    onProgress?.('Thumbnail...', 25);
    const thumb = await generateThumbnail(file);

    // Stage 3: Upload to Puter (primary)
    onProgress?.('Uploading to cloud...', 40);
    const puterPath = await puterUpload(uploadBlob, type, `${id}_${file.name}`);

    // Stage 4: Backup to R2 (optional)
    onProgress?.('Backup...', 70);
    const r2Url = await r2Upload(uploadBlob, `${id}_${file.name}`).catch(() => null);

    // Stage 5: Store metadata in IndexedDB
    onProgress?.('Saving metadata...', 85);
    const meta: UploadedMedia = {
      id, name: file.name, type, size: uploadBlob.size,
      puterPath, r2Url, thumb, aiTags: [], ts: Date.now(),
    };
    const db = getDB();
    if (db) {
      await db.media.add({
        id: undefined,
        puterPath: puterPath || undefined,
        type,
        name: file.name,
        size: uploadBlob.size,
        thumb: thumb || undefined,
        ts: Date.now(),
      });
    }
    // Also store full meta in localStorage for fast access
    const allMeta: UploadedMedia[] = getLocalMediaMeta();
    allMeta.push(meta);
    localStorage.setItem('jarvis_media_meta', JSON.stringify(allMeta.slice(-200)));

    onProgress?.('Done!', 100);
    return meta;
  } catch (e) {
    console.error('[uploadMedia]', e);
    return null;
  }
}

// ── Metadata helpers ──────────────────────────────────────────
export function getLocalMediaMeta(type?: MediaType): UploadedMedia[] {
  if (typeof window === 'undefined') return [];
  try {
    const all: UploadedMedia[] = JSON.parse(localStorage.getItem('jarvis_media_meta') || '[]');
    return type ? all.filter(m => m.type === type) : all;
  } catch { return []; }
}

export async function deleteMedia(id: string): Promise<void> {
  const all = getLocalMediaMeta();
  const item = all.find(m => m.id === id);
  if (item?.puterPath) await puterDelete(item.puterPath).catch(() => {});
  const updated = all.filter(m => m.id !== id);
  localStorage.setItem('jarvis_media_meta', JSON.stringify(updated));
  const db = getDB();
  if (db) await db.media.where('puterPath').equals(item?.puterPath || '').delete().catch(() => {});
}

export async function readMedia(item: UploadedMedia): Promise<string | null> {
  // Try Puter first
  if (item.puterPath) {
    const blob = await puterRead(item.puterPath);
    if (blob) return URL.createObjectURL(blob as Blob);
  }
  // Try R2 CDN
  if (item.r2Url) return item.r2Url;
  return null;
}

// ── Add AI tags to media item ─────────────────────────────────
export async function addAITags(id: string, tags: string[]): Promise<void> {
  const all = getLocalMediaMeta();
  const item = all.find(m => m.id === id);
  if (item) { item.aiTags = [...new Set([...item.aiTags, ...tags])]; }
  localStorage.setItem('jarvis_media_meta', JSON.stringify(all));
}

// ── Search media by AI tags or name ──────────────────────────
export function searchMedia(query: string): UploadedMedia[] {
  const q = query.toLowerCase();
  return getLocalMediaMeta().filter(m =>
    m.name.toLowerCase().includes(q) ||
    m.aiTags.some(t => t.toLowerCase().includes(q))
  );
}

// ── Storage stats ─────────────────────────────────────────────
export function getStorageStats() {
  const all = getLocalMediaMeta();
  const byType: Record<string, number> = {};
  let totalSize = 0;
  for (const m of all) {
    byType[m.type] = (byType[m.type] || 0) + 1;
    totalSize += m.size || 0;
  }
  return { total: all.length, byType, totalSize };
}
