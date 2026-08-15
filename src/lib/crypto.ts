const ENCRYPTION_VERSION = 1;
const VERSION_KEY = 'kk_encryption_version';
const SALT = 'koreksikoding-v1';

async function getKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode('koreksikoding-api-key'), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(SALT), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return `enc:v1:${btoa(String.fromCharCode(...combined))}`;
  } catch {
    return plaintext;
  }
}

export async function decryptApiKey(ciphertext: string): Promise<string> {
  if (!ciphertext || !ciphertext.startsWith('enc:v1:')) return ciphertext;
  try {
    const key = await getKey();
    const raw = Uint8Array.from(atob(ciphertext.slice(7)), (c) => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return ciphertext;
  }
}

export function isEncryptionVersionUpToDate(): boolean {
  try {
    return parseInt(localStorage.getItem(VERSION_KEY) || '0', 10) >= ENCRYPTION_VERSION;
  } catch {
    return false;
  }
}

export function setEncryptionVersion(): void {
  try { localStorage.setItem(VERSION_KEY, String(ENCRYPTION_VERSION)); } catch { }
}
