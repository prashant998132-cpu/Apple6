'use client';

// ══════════════════════════════════════════════════════════════
// CLIENT-SIDE ENCRYPTION (AES-256-GCM)
// Data encrypt → cloud upload → decrypt on device
// Key stored in localStorage — never sent to server
// ══════════════════════════════════════════════════════════════

const ENC_KEY_STORAGE = 'jarvis_enc_key';

// ── Generate or retrieve encryption key ──────────────────────
async function getEncryptionKey(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ENC_KEY_STORAGE);
    if (raw) {
      const keyData = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
      return crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }
    // Generate new key
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = await crypto.subtle.exportKey('raw', key);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    localStorage.setItem(ENC_KEY_STORAGE, b64);
    return key;
  } catch { return null; }
}

// ── Encrypt string ────────────────────────────────────────────
export async function encryptText(plaintext: string): Promise<string | null> {
  const key = await getEncryptionKey();
  if (!key) return plaintext; // fallback: no encryption
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    // Combine IV + ciphertext → base64
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch { return plaintext; }
}

// ── Decrypt string ────────────────────────────────────────────
export async function decryptText(ciphertext: string): Promise<string> {
  const key = await getEncryptionKey();
  if (!key) return ciphertext;
  try {
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch { return ciphertext; }
}

// ── Encrypt object ────────────────────────────────────────────
export async function encryptObject<T>(obj: T): Promise<string | null> {
  return encryptText(JSON.stringify(obj));
}

export async function decryptObject<T>(cipher: string): Promise<T | null> {
  try { return JSON.parse(await decryptText(cipher)) as T; } catch { return null; }
}

// ── Check if encryption is active ─────────────────────────────
export function isEncryptionEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(ENC_KEY_STORAGE);
}

// ── Export key for backup ─────────────────────────────────────
export function exportEncryptionKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ENC_KEY_STORAGE);
}

// ── Import key from backup ────────────────────────────────────
export async function importEncryptionKey(b64Key: string): Promise<boolean> {
  try {
    const keyData = Uint8Array.from(atob(b64Key), c => c.charCodeAt(0));
    await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    localStorage.setItem(ENC_KEY_STORAGE, b64Key);
    return true;
  } catch { return false; }
}

// ── Reset (delete key — all encrypted data unreadable after this) ──
export function resetEncryption() {
  localStorage.removeItem(ENC_KEY_STORAGE);
}
