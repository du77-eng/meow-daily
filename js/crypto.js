/* ===== crypto.js — AES-GCM + PBKDF2 (no DOM, runs in Node 22 & browsers) ===== */
const enc = new TextEncoder();
const dec = new TextDecoder();

// Web Crypto 的 subtle（AES/PBKDF2）需要 secure context（https 或 localhost）。
// 某些本地查看器（如「小码盒」以 file:// 加载）可能没有 subtle，
// 此时降级为纯本地明文混淆存储（v0），保证功能可用、数据仍在手机本地不外传。
export const HAS_SUBTLE = !!(globalThis.crypto && globalThis.crypto.subtle);

export function bytesToB64(bytes){
  let bin = '';
  for(let i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function b64ToBytes(b64){
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomSalt(){
  const s = new Uint8Array(16);
  crypto.getRandomValues(s);
  return s;
}

export async function deriveKey(passphrase, salt){
  if(!HAS_SUBTLE) throw new Error('no subtle');
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase||''), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2', salt, iterations:100000, hash:'SHA-256'},
    baseKey,
    {name:'AES-GCM', length:256},
    false,
    ['encrypt','decrypt']
  );
}

export async function encryptJSON(value, passphrase){
  if(!HAS_SUBTLE) return 'v0.' + bytesToB64(enc.encode(JSON.stringify(value)));
  const salt = randomSalt();
  const key = await deriveKey(passphrase, salt);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(JSON.stringify(value)));
  return 'v1.' + bytesToB64(salt) + '.' + bytesToB64(iv) + '.' + bytesToB64(new Uint8Array(ct));
}

export async function decryptJSON(payload, passphrase){
  const parts = String(payload).split('.');
  if(parts[0] === 'v0') return JSON.parse(dec.decode(b64ToBytes(parts[1])));
  if(parts[0] !== 'v1') throw new Error('bad format');
  const salt = b64ToBytes(parts[1]), iv = b64ToBytes(parts[2]), ct = b64ToBytes(parts[3]);
  const key = await deriveKey(passphrase, salt);
  const pt = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ct);
  return JSON.parse(dec.decode(pt));
}
