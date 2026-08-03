/* ===== storage.js — localStorage wrapper with transparent AES-GCM encryption ===== */
import { encryptJSON, decryptJSON, randomSalt, bytesToB64, HAS_SUBTLE } from './crypto.js';

const DEVICE_SECRET_KEY = 'meow_device_secret';
const LOCK_VERIFIER_KEY = 'meow_lock_verifier';

let _deviceSecret = '';
let _unlocked = true; // becomes false if a lock verifier exists and user hasn't unlocked yet

export const MeowStorage = {
  async init(){
    let s = (globalThis.localStorage && localStorage.getItem(DEVICE_SECRET_KEY)) || '';
    if(!s){ s = bytesToB64(randomSalt()); localStorage.setItem(DEVICE_SECRET_KEY, s); }
    _deviceSecret = s;
    _unlocked = !(localStorage.getItem(LOCK_VERIFIER_KEY));
  },
  isLocked(){ return !_unlocked; },
  async get(key){
    if(!_unlocked) return null;
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    try { return await decryptJSON(raw, _deviceSecret); } catch(e){ return null; }
  },
  async set(key, value){
    if(!_unlocked) throw new Error('locked');
    localStorage.setItem(key, await encryptJSON(value, _deviceSecret));
  },
  async remove(key){ localStorage.removeItem(key); },
  async enableLock(pin){
    if(!HAS_SUBTLE) throw new Error('当前环境不支持密码锁（缺少 Web Crypto），数据仍以本地方式存储');
    if(!pin || String(pin).length < 4) throw new Error('PIN too short');
    localStorage.setItem(LOCK_VERIFIER_KEY, await encryptJSON('__ok__', pin + '||' + _deviceSecret));
    _unlocked = true; // current session stays unlocked
  },
  async disableLock(pin){
    if(!HAS_SUBTLE) throw new Error('当前环境不支持密码锁');
    if(!(await this.unlock(pin))) throw new Error('wrong pin');
    localStorage.removeItem(LOCK_VERIFIER_KEY);
    _unlocked = true;
  },
  async unlock(pin){
    const verifier = localStorage.getItem(LOCK_VERIFIER_KEY);
    if(!verifier){ _unlocked = true; return true; }
    try {
      const t = await decryptJSON(verifier, (pin||'') + '||' + _deviceSecret);
      if(t === '__ok__'){ _unlocked = true; return true; }
    } catch(e){}
    return false;
  },
  hasLock(){
    return !!(globalThis.localStorage && localStorage.getItem(LOCK_VERIFIER_KEY));
  }
};
