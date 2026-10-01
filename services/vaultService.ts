const VAULT_KEY = 'copymaster_vault:v2';
const VAULT_LIST_KEY = 'copymaster_vault_list:v2';
const SALT_KEY = 'copymaster_vault_salt:v2';

const enc = new TextEncoder();
const dec = new TextDecoder();

async function getSalt(): Promise<Uint8Array> {
  try {
    const stored = localStorage.getItem(SALT_KEY);
    if (stored) return Uint8Array.from(atob(stored), c => c.charCodeAt(0));
  } catch {}
  const salt = crypto.getRandomValues(new Uint8Array(16));
  try { localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...salt))); } catch {}
  return salt;
}

async function deriveKey(salt: Uint8Array): Promise<CryptoKey> {
  const mat = await crypto.subtle.importKey('raw', enc.encode('vault-master-' + salt.length) as any, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as any, iterations: 100000, hash: 'SHA-256' },
    mat,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptString(plain: string): Promise<string> {
  const salt = await getSalt();
  const key = await deriveKey(salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain));
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decryptString(b64: string): Promise<string> {
  const salt = await getSalt();
  const key = await deriveKey(salt);
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return dec.decode(plain);
}

type VaultData = Record<string, string>;

function readVaultRaw(): VaultData {
  if (typeof window === 'undefined') return {};
  try {
    const v = localStorage.getItem(VAULT_KEY);
    return v ? JSON.parse(v) : {};
  } catch { return {}; }
}

function writeVaultRaw(d: VaultData) {
  try { localStorage.setItem(VAULT_KEY, JSON.stringify(d)); } catch {}
}

export async function setVaultKey(provider: string, apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  const vault = readVaultRaw();
  if (!trimmed) {
    delete vault[provider];
    writeVaultRaw(vault);
    try { localStorage.removeItem(`${provider}_api_key`); } catch {}
    try {
      const list = await getVaultKeys(provider);
      if (list.length) await setVaultKeys(provider, []);
    } catch {}
    return;
  }
  vault[provider] = await encryptString(trimmed);
  writeVaultRaw(vault);
  try { localStorage.removeItem(`${provider}_api_key`); } catch {}
}

export async function getVaultKey(provider: string): Promise<string | null> {
  const legacy = (() => { try { return localStorage.getItem(`${provider}_api_key`); } catch { return null; } })();
  if (legacy && legacy.trim()) {
    try { await setVaultKey(provider, legacy); } catch {}
    return legacy.trim();
  }
  const vault = readVaultRaw();
  const encVal = vault[provider];
  if (!encVal) return null;
  try { return await decryptString(encVal); } catch { return null; }
}

export function hasVaultKey(provider: string): boolean {
  const v = readVaultRaw();
  if (v[provider]) return true;
  try {
    const raw = localStorage.getItem(VAULT_LIST_KEY);
    if (raw) {
      const j = JSON.parse(raw);
      if (j && j[provider]) return true;
    }
  } catch {}
  try { return !!localStorage.getItem(`${provider}_api_key`); } catch { return false; }
}

export function listVaultProviders(): string[] {
  return Object.keys(readVaultRaw());
}

function readVaultListRaw(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const v = localStorage.getItem(VAULT_LIST_KEY);
    return v ? JSON.parse(v) : {};
  } catch { return {}; }
}
function writeVaultListRaw(d: Record<string, string>) {
  try { localStorage.setItem(VAULT_LIST_KEY, JSON.stringify(d)); } catch {}
}
export async function getVaultKeys(provider: string): Promise<string[]> {
  const legacy = (() => { try { return localStorage.getItem(`${provider}_api_key`); } catch { return null; } })();
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (k: string) => {
    const t = (k || '').trim();
    if (t.length < 8 || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  if (legacy && legacy.trim()) push(legacy.trim());
  try {
    const single = await getVaultKey(provider);
    if (single) push(single);
  } catch {}
  try {
    const raw = readVaultListRaw();
    const enc = raw[provider];
    if (enc) {
      const json = await decryptString(enc);
      const arr = JSON.parse(json);
      if (Array.isArray(arr)) for (const k of arr) if (typeof k === 'string') push(k);
    }
  } catch {}
  return out;
}
export async function setVaultKeys(provider: string, keys: string[]): Promise<void> {
  const clean = [...new Set((keys || []).map((k) => (k || '').trim()).filter((k) => k.length >= 8))];
  const raw = readVaultListRaw();
  if (!clean.length) {
    delete raw[provider];
    writeVaultListRaw(raw);
    return;
  }
  raw[provider] = await encryptString(JSON.stringify(clean));
  writeVaultListRaw(raw);
  try {
    const cur = await getVaultKey(provider);
    if (!cur || !clean.includes(cur)) await setVaultKey(provider, clean[0]);
  } catch {}
}
export async function addVaultKey(provider: string, apiKey: string): Promise<void> {
  const t = (apiKey || '').trim();
  if (t.length < 8) return;
  const cur = await getVaultKeys(provider);
  if (cur.includes(t)) return;
  await setVaultKeys(provider, [...cur, t]);
}
export async function removeVaultKey(provider: string, keyToRemove: string): Promise<void> {
  const cur = await getVaultKeys(provider);
  const next = cur.filter((k) => k !== keyToRemove);
  if (next.length === cur.length) return;
  if (!next.length) {
    await setVaultKeys(provider, []);
    await setVaultKey(provider, '');
    return;
  }
  await setVaultKeys(provider, next);
  try {
    const single = await getVaultKey(provider);
    if (single && !next.includes(single)) await setVaultKey(provider, next[0]);
  } catch {}
}
export function listVaultProvidersMulti(): string[] {
  try {
    const a = Object.keys(readVaultRaw());
    const b = Object.keys(readVaultListRaw());
    return [...new Set([...a, ...b])];
  } catch { return listVaultProviders(); }
}
export async function getAllVaultKeysMap(): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const p of listVaultProvidersMulti()) {
    try {
      const arr = await getVaultKeys(p);
      if (arr.length) out[p] = arr;
    } catch {}
  }
  return out;
}

export async function clearVault(): Promise<void> {
  const vault = readVaultRaw();
  for (const k of Object.keys(vault)) {
    try { localStorage.removeItem(`${k}_api_key`); } catch {}
  }
  try { localStorage.removeItem(VAULT_KEY); } catch {}
  try { localStorage.removeItem(SALT_KEY); } catch {}
}

export function migrateLegacyKeys(): void {
  if (typeof window === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.endsWith('_api_key') && !k.includes('vault')) keys.push(k);
  }
  if (keys.length === 0) return;
  (async () => {
    for (const k of keys) {
      const provider = k.replace('_api_key', '');
      const val = localStorage.getItem(k);
      if (val && val.trim()) await setVaultKey(provider, val);
    }
  })();
}
