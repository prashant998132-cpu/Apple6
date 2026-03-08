'use client';

// ══════════════════════════════════════════════════════════════
// PUTER.JS — Free GPT-4o mini, DALL-E 3, TTS, 1GB Cloud FS
// No API key needed — runs on user's own Puter account
// Docs: puter.com/docs
// ══════════════════════════════════════════════════════════════

declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (messages: any, opts?: any) => Promise<any>;
        txt2img: (prompt: string, opts?: any) => Promise<any>;
        txt2speech: (text: string, opts?: any) => Promise<HTMLAudioElement>;
        img2txt: (image: any, prompt?: string) => Promise<string>;
      };
      fs: {
        write: (path: string, data: any, opts?: any) => Promise<any>;
        read: (path: string) => Promise<any>;
        readdir: (path: string) => Promise<any[]>;
        mkdir: (path: string, opts?: any) => Promise<void>;
        delete: (path: string, opts?: any) => Promise<void>;
        stat: (path: string) => Promise<any>;
        move: (from: string, to: string) => Promise<void>;
        copy: (from: string, to: string) => Promise<void>;
      };
      auth: {
        getUser: () => Promise<{ username: string; uuid: string; email: string }>;
        signIn: () => Promise<any>;
        isSignedIn: () => Promise<boolean>;
        signOut: () => Promise<void>;
      };
    };
  }
}

let _sdkLoaded = false;
let _sdkLoading = false;
const _loadCallbacks: Array<(ok: boolean) => void> = [];

// ── Load SDK once ────────────────────────────────────────────
export function loadPuter(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.puter) { _sdkLoaded = true; return Promise.resolve(true); }
  if (_sdkLoaded) return Promise.resolve(true);

  if (_sdkLoading) {
    return new Promise(resolve => _loadCallbacks.push(resolve));
  }
  _sdkLoading = true;

  return new Promise(resolve => {
    _loadCallbacks.push(resolve);
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    s.async = true;
    s.onload = () => {
      _sdkLoaded = true; _sdkLoading = false;
      _loadCallbacks.forEach(cb => cb(true));
      // Init JARVIS folders
      initPuterFolders();
    };
    s.onerror = () => {
      _sdkLoading = false;
      _loadCallbacks.forEach(cb => cb(false));
    };
    document.head.appendChild(s);
  });
}

// ── Init folder structure ─────────────────────────────────────
async function initPuterFolders() {
  const p = window.puter; if (!p) return;
  try {
    const signedIn = await p.auth.isSignedIn();
    if (!signedIn) return;
    for (const folder of ['jarvis-pro/photos', 'jarvis-pro/videos', 'jarvis-pro/audio', 'jarvis-pro/docs', 'jarvis-pro/generated']) {
      await p.fs.mkdir(folder, { recursive: true }).catch(() => {});
    }
  } catch {}
}

// ── Auth helpers ──────────────────────────────────────────────
export async function puterSignIn(): Promise<string | null> {
  await loadPuter();
  const p = window.puter; if (!p) return null;
  try {
    const signedIn = await p.auth.isSignedIn();
    if (!signedIn) await p.auth.signIn();
    const user = await p.auth.getUser();
    return user.username;
  } catch { return null; }
}

export async function isPuterSignedIn(): Promise<boolean> {
  await loadPuter();
  const p = window.puter; if (!p) return false;
  try { return await p.auth.isSignedIn(); } catch { return false; }
}

// ══════════════════════════════════════════════════════════════
// AI CHAT — GPT-4o mini (FREE, no key)
// ══════════════════════════════════════════════════════════════
export async function puterChat(messages: Array<{role:string; content:string}>, model = 'gpt-4o-mini'): Promise<string | null> {
  await loadPuter();
  const p = window.puter; if (!p) return null;
  try {
    const signedIn = await p.auth.isSignedIn();
    if (!signedIn) return null; // Will trigger sign-in UI
    const res = await p.ai.chat(messages, { model });
    return res?.message?.content?.[0]?.text || res?.message?.content || String(res) || null;
  } catch (e) { console.warn('[Puter chat]', e); return null; }
}

// ══════════════════════════════════════════════════════════════
// IMAGE GENERATION — DALL-E 3 (FREE via Puter)
// ══════════════════════════════════════════════════════════════
export async function puterGenerateImage(prompt: string): Promise<string | null> {
  await loadPuter();
  const p = window.puter; if (!p) return null;
  try {
    const signedIn = await p.auth.isSignedIn();
    if (!signedIn) return null;
    const img = await p.ai.txt2img(prompt);
    // Returns image element — get src
    if (img?.src) return img.src;
    if (img instanceof HTMLImageElement) return img.src;
    return null;
  } catch (e) { console.warn('[Puter img]', e); return null; }
}

// ══════════════════════════════════════════════════════════════
// TTS — High quality (free via Puter)
// ══════════════════════════════════════════════════════════════
export async function puterSpeak(text: string, voice = 'nova'): Promise<boolean> {
  await loadPuter();
  const p = window.puter; if (!p) return false;
  try {
    const signedIn = await p.auth.isSignedIn();
    if (!signedIn) return false;
    const audio = await p.ai.txt2speech(text.slice(0, 500), { voice });
    audio.play();
    return true;
  } catch { return false; }
}

// ══════════════════════════════════════════════════════════════
// VISION — Image analysis
// ══════════════════════════════════════════════════════════════
export async function puterVision(imageBlob: Blob, prompt = 'Describe this image in detail.'): Promise<string | null> {
  await loadPuter();
  const p = window.puter; if (!p) return null;
  try {
    const signedIn = await p.auth.isSignedIn();
    if (!signedIn) return null;
    const result = await p.ai.img2txt(imageBlob, prompt);
    return result || null;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════
// CLOUD FILE SYSTEM
// ══════════════════════════════════════════════════════════════
const FOLDERS: Record<string, string> = {
  image: 'jarvis-pro/photos',
  video: 'jarvis-pro/videos',
  audio: 'jarvis-pro/audio',
  doc:   'jarvis-pro/docs',
  generated: 'jarvis-pro/generated',
};

export async function puterUpload(file: File | Blob, type: keyof typeof FOLDERS, name: string): Promise<string | null> {
  await loadPuter();
  const p = window.puter; if (!p) return null;
  try {
    const signedIn = await p.auth.isSignedIn();
    if (!signedIn) { await p.auth.signIn(); }
    const folder = FOLDERS[type] || 'jarvis-pro/photos';
    const path = `${folder}/${Date.now()}_${name}`;
    await p.fs.write(path, file);
    return path;
  } catch (e) { console.warn('[Puter upload]', e); return null; }
}

export async function puterRead(path: string): Promise<Blob | null> {
  await loadPuter();
  const p = window.puter; if (!p) return null;
  try {
    const file = await p.fs.read(path);
    return file as Blob;
  } catch { return null; }
}

export async function puterDelete(path: string): Promise<boolean> {
  await loadPuter();
  const p = window.puter; if (!p) return false;
  try { await p.fs.delete(path); return true; } catch { return false; }
}

export async function puterListFolder(type: keyof typeof FOLDERS): Promise<any[]> {
  await loadPuter();
  const p = window.puter; if (!p) return [];
  try {
    const folder = FOLDERS[type] || 'jarvis-pro/photos';
    return await p.fs.readdir(folder);
  } catch { return []; }
}

export async function puterGetStorageInfo(): Promise<{ used: number; total: number } | null> {
  await loadPuter();
  const p = window.puter; if (!p) return null;
  try {
    // Estimate: list all files and sum sizes
    const types = Object.keys(FOLDERS) as Array<keyof typeof FOLDERS>;
    let used = 0;
    for (const t of types) {
      const files = await puterListFolder(t).catch(() => []);
      for (const f of files) { used += f.size || 0; }
    }
    return { used, total: 1_000_000_000 }; // 1GB free
  } catch { return null; }
}
