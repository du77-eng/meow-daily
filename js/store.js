/* ===== store.js — data model on top of MeowStorage ===== */
import { MeowStorage } from './storage.js';
import { todayKey } from './util.js';

export const STORAGE_KEY = 'meow_daily_data';
export const SNAPSHOT_KEY = 'meow_daily_snapshots';

export let data = defaults();

export function setData(d){ data = d; }

export function defaults(){
  return {prices:{'面皮':8,'肉酱米线':10,'手打柠檬茶':3}, dates:{}, periods:[], weights:[], water:{}, rest:{}, books:[], height:160, weightUnit:'kg', theme:'pink'};
}

export function migrate(raw){
  const d = defaults();
  raw.prices = (raw.prices && typeof raw.prices === 'object') ? raw.prices : d.prices;
  raw.dates = raw.dates || {}; raw.periods = raw.periods || []; raw.weights = raw.weights || [];
  raw.water = raw.water || {}; raw.rest = raw.rest || {}; raw.books = raw.books || [];
  if(raw.height === undefined) raw.height = 160;
  raw.weightUnit = raw.weightUnit || 'kg';
  raw.theme = raw.theme || 'pink';
  return raw;
}

export async function load(){
  const raw = await MeowStorage.get(STORAGE_KEY);
  data = (raw && typeof raw === 'object') ? migrate(raw) : defaults();
  return data;
}

export async function save(){
  await MeowStorage.set(STORAGE_KEY, data);
  await autoSnapshot();
}

export async function autoSnapshot(){
  try{
    const key = todayKey();
    let list = await MeowStorage.get(SNAPSHOT_KEY) || [];
    if(!Array.isArray(list)) list = [];
    if(list.length && list[list.length-1].date === key) return;
    list.push({date:key, ts:Date.now(), data: JSON.parse(JSON.stringify(data))});
    if(list.length > 7) list = list.slice(list.length-7);
    await MeowStorage.set(SNAPSHOT_KEY, list);
  }catch(e){}
}

export async function getSnapshots(){
  const l = await MeowStorage.get(SNAPSHOT_KEY);
  return Array.isArray(l) ? l : [];
}

export async function restoreSnapshot(date){
  const list = await MeowStorage.get(SNAPSHOT_KEY) || [];
  const snap = Array.isArray(list) ? list.find(s => s.date === date) : null;
  if(!snap || !snap.data) throw new Error('not found');
  data = migrate(snap.data);
  await save();
}

export function exportBackup(){
  return JSON.stringify({__meow_backup__:true, app:'喵喵日常', version:'3.0.0', exportedAt:new Date().toISOString(), data: JSON.parse(JSON.stringify(data))}, null, 2);
}

export async function importBackup(str){
  const obj = JSON.parse(str);
  const src = (obj && obj.__meow_backup__ && obj.data) ? obj.data : obj;
  if(!src || typeof src !== 'object' || !src.prices) throw new Error('bad backup');
  data = migrate(src);
  await save();
}
