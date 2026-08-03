/* ===== features/settings.js — 设置 / 备份恢复 / 隐私与安全 / 自检 ===== */
import { $, showToast, closeModal, confirmBox, promptBox } from '../ui.js';
import {
  data, save, exportBackup, importBackup,
  getSnapshots, restoreSnapshot as storeRestoreSnapshot
} from '../store.js';
import { MeowStorage } from '../storage.js';
import { todayKey, escapeHtml } from '../util.js';
import { THEMES, applyTheme } from '../theme.js';
import { runSelfTest } from '../selftest.js';
import { renderAll } from '../app.js';

/* ===== 设置面板 ===== */
export function updateSettings(){
  let html = '';
  Object.keys(data.prices).forEach(function(k){
    html += '<div class="setting-row">';
    html += '<label>'+k+'</label>';
    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<input type="number" value="'+(data.prices[k]||0)+'" onchange="updatePrice(\''+k.replace(/'/g,"\\'")+'\',this.value)" style="width:70px"> 元';
    html += '<button class="o-del" onclick="deleteFood(\''+k.replace(/'/g,"\\'")+'\')" style="font-size:16px" title="删除菜品">&times;</button>';
    html += '</div></div>';
  });
  const priceList = $('priceList');
  if(priceList) priceList.innerHTML = html;

  const count = Object.keys(data.dates).length;
  const dataCount = $('dataCount');
  if(dataCount) dataCount.textContent = count+' 天';

  const waterDays = data.water ? Object.keys(data.water).length : 0;
  const waterEl = $('waterCount');
  if(waterEl) waterEl.textContent = waterDays+' 天';

  const bookEl = $('bookCount');
  if(bookEl) bookEl.textContent = (data.books || []).length+' 本';

  renderLockStatus();
}

export async function addNewFood(){
  let name = promptBox('输入新菜品名称（如：凉面、绿豆汤）');
  if(!name || !name.trim()) return;
  name = name.trim();
  if(data.prices[name]!==undefined){ showToast('该菜品已存在'); return; }
  const price = promptBox('输入「'+name+'」的价格（元）', '5');
  if(price===null) return;
  data.prices[name] = parseInt(price)||0;
  await save();
  renderAll();
  showToast('已添加菜品：'+name);
}

export async function deleteFood(name){
  if(!confirmBox('确定删除「'+name+'」吗？已有订单中的该菜品不受影响，但不再计入汇总。')) return;
  delete data.prices[name];
  await save();
  renderAll();
  showToast('已删除菜品：'+name);
}

/* ===== 备份 / 恢复 ===== */
export async function openBackup(){
  const ta = $('backupText');
  if(ta) ta.value = exportBackup();
  const modal = $('backupModal');
  if(modal) modal.classList.add('show');
  await renderSnapshots();
}

export function copyBackup(){
  const ta = $('backupText');
  if(!ta) return;
  ta.focus(); ta.select();
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(ta.value)
        .then(function(){ showToast('已复制✓ 去备忘录粘贴保存吧'); })
        .catch(function(){ fallbackCopy(ta); });
    } else { fallbackCopy(ta); }
  }catch(e){ fallbackCopy(ta); }
}

export function fallbackCopy(ta){
  try{
    const ok = document.execCommand('copy');
    showToast(ok ? '已复制✓ 去备忘录粘贴保存吧' : '请长按文本框→全选→复制');
  }catch(e){ showToast('请长按文本框，全选后手动复制'); }
}

export function downloadBackup(){
  const ta = $('backupText');
  if(!ta) return;
  try{
    const blob = new Blob([ta.value], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '喵喵日常备份_' + todayKey() + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
    showToast('正在下载备份文件…');
  }catch(e){ showToast('下载失败，请用「复制全部」存到备忘录'); }
}

export function openRestore(){
  const ta = $('restoreText');
  if(ta) ta.value = '';
  const f = $('restoreFile');
  if(f) f.value = '';
  const modal = $('restoreModal');
  if(modal) modal.classList.add('show');
}

// 容错：备忘录等富文本会把英文引号变成中文引号，导致 JSON 解析失败
function sanitizeBackup(str){
  let s = (str || '').replace(/﻿/g, '').trim();
  const m = s.match(/\{[\s\S]*\}/);   // 容忍前后夹带的说明文字
  if (m) s = m[0];
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");  // 中文引号还原
  return s;
}

export async function doRestore(jsonStr){
  if(!jsonStr || !jsonStr.trim()){ showToast('请先粘贴或选择备份文件'); return; }
  let parsed;
  const cleaned = sanitizeBackup(jsonStr);
  try{ parsed = JSON.parse(cleaned); }
  catch(e){ try{ parsed = JSON.parse(jsonStr); }catch(e2){ showToast('备份内容格式不对，无法识别'); return; } }
  const src = (parsed && parsed.__meow_backup__ && parsed.data) ? parsed.data : parsed;
  if(!src || typeof src !== 'object' || !src.prices){ showToast('这不是喵喵日常的备份数据'); return; }
  if(!confirmBox('恢复将覆盖当前所有数据，确定继续吗？')) return;

  try{
    await importBackup(jsonStr);
  }catch(e){
    showToast('这不是喵喵日常的备份数据');
    return;
  }

  if(!THEMES[data.theme]) data.theme = 'pink';
  applyTheme(data.theme);
  await save();
  renderAll();
  closeModal('restoreModal');
  showToast('✅ 数据已恢复');
}

export function restoreData(){
  const ta = $('restoreText');
  doRestore(ta ? ta.value : '');
}

export function restoreFromFile(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){ doRestore(e.target.result); };
  reader.onerror = function(){ showToast('文件读取失败'); };
  reader.readAsText(file);
}

/* ===== 自动快照 ===== */
export async function renderSnapshots(){
  const box = $('snapshotList');
  if(!box) return;
  let list = await getSnapshots();
  if(!Array.isArray(list) || !list.length){
    box.innerHTML = '<p style="font-size:12px;color:var(--text-mute)">还没有自动备份，用几天后会每天自动生成一份。</p>';
    return;
  }
  list = list.slice().reverse();
  let html = '<p style="font-size:12px;color:var(--text-mute);margin:4px 0 8px">每天自动保留一份（最近7天），可恢复到那天：</p>';
  html += '<div style="display:flex;flex-direction:column;gap:6px">';
  list.forEach(function(s){
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--pink-bg);border-radius:10px">'
         + '<span style="font-size:13px;font-weight:600">📅 ' + escapeHtml(s.date) + '</span>'
         + '<button class="btn btn-secondary" style="font-size:12px;padding:6px 14px" onclick="restoreSnapshot(\'' + s.date + '\')">恢复</button>'
         + '</div>';
  });
  html += '</div>';
  box.innerHTML = html;
}

export async function restoreSnapshot(date){
  if(!confirmBox('恢复到 ' + date + ' 的自动备份？当前数据会被覆盖。')) return;
  try{
    await storeRestoreSnapshot(date);
  }catch(e){
    showToast('没找到该备份');
    return;
  }
  if(!THEMES[data.theme]) data.theme = 'pink';
  applyTheme(data.theme);
  await save();
  renderAll();
  showToast('✅ 已恢复到 ' + date);
}

/* ===== 隐私与安全：密码锁 ===== */
export function renderLockStatus(){
  const el = $('lockStatus');
  if(!el) return;
  const on = MeowStorage.hasLock();
  el.textContent = on ? '已开启' : '未开启';
  el.style.color = on ? 'var(--green, #4caf50)' : 'var(--text-mute)';
  const btn = $('lockToggleBtn');
  if(btn) btn.textContent = on ? '关闭密码锁' : '开启密码锁';
}

export function openLockModal(){
  const on = MeowStorage.hasLock();
  if(on){ disableLockNow(); return; }
  const p1 = $('lockPin1'); if(p1) p1.value = '';
  const p2 = $('lockPin2'); if(p2) p2.value = '';
  const m = $('lockModal');
  if(m) m.classList.add('show');
}

export function closeLock(){
  const m = $('lockModal');
  if(m) m.classList.remove('show');
}

export async function saveLock(){
  const p1 = $('lockPin1'), p2 = $('lockPin2');
  const pin = p1 ? String(p1.value || '').trim() : '';
  const pin2 = p2 ? String(p2.value || '').trim() : '';
  if(pin.length < 4){ showToast('密码至少 4 位'); return; }
  if(pin !== pin2){ showToast('两次输入不一致'); return; }
  try{
    await MeowStorage.enableLock(pin);
  }catch(e){
    showToast((e && /密码锁/.test(e.message)) ? e.message : '开启失败，请重试');
    return;
  }
  closeLock();
  renderLockStatus();
  showToast('🔒 密码锁已开启');
}

export async function disableLockNow(){
  const pin = promptBox('请输入当前密码以关闭密码锁');
  if(pin === null) return;
  try{
    await MeowStorage.disableLock(String(pin).trim());
  }catch(e){
    showToast((e && /密码锁/.test(e.message)) ? e.message : '密码不正确');
    return;
  }
  renderLockStatus();
  showToast('密码锁已关闭');
}

/* ===== 自检面板 ===== */
export async function runSelfTestPanel(){
  const box = $('selfTestResult');
  if(box) box.innerHTML = '<p style="font-size:12px;color:var(--text-mute)">正在运行自检…</p>';
  let results;
  try{
    results = await runSelfTest();
  }catch(e){
    if(box) box.innerHTML = '<p style="font-size:12px;color:#e53935">自检异常：'+escapeHtml(String(e && e.message || e))+'</p>';
    return;
  }
  const passed = results.filter(function(r){ return r.pass; }).length;
  const total = results.length;
  let html = '<p style="font-size:13px;font-weight:700;margin:4px 0 8px">'
    + (passed === total ? '✅ ' : '⚠️ ')
    + passed + ' / ' + total + ' 项通过</p>';
  html += '<div style="display:flex;flex-direction:column;gap:4px">';
  results.forEach(function(r){
    html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 10px;background:var(--pink-bg);border-radius:8px">'
         + '<span style="font-size:12px">' + (r.pass ? '✅' : '❌') + ' ' + escapeHtml(r.name) + '</span>'
         + '<span style="font-size:11px;color:var(--text-mute);text-align:right">' + escapeHtml(r.detail || '') + '</span>'
         + '</div>';
  });
  html += '</div>';
  if(box) box.innerHTML = html;
  showToast(passed === total ? '自检全部通过 ✓' : '自检有 ' + (total - passed) + ' 项未通过');
}
