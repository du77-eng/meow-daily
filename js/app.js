/* ===== app.js — 引导 / 编排 / 全局暴露 =====
 * 该文件是唯一的入口（<script type="module" src="js/app.js">）。
 * index.html 中的 inline onclick/onchange 依赖 window.* 全局函数，
 * 因此本文件在末尾把所有 handler 挂到 window 上。
 */
import { MeowStorage } from './storage.js';
import { data, load, save, defaults, setData } from './store.js';
import { $, showToast, closeModal, openModal } from './ui.js';
import { THEMES, applyTheme, switchTheme, renderThemeGrid } from './theme.js';
import { runSelfTest } from './selftest.js';

import { renderHome, updateGreeting } from './features/home.js';
import {
  saveWeight, switchWeightUnit, deleteWeight, renderWeight,
  getWeightUnit, kgToDisplay, displayToKg, unitSuffix, fmtWeight, getSortedWeights, calcBMI
} from './features/weight.js';
import {
  renderPeriod, calPrevMonth, calNextMonth, logPeriodStart, endPeriodToday,
  setPeriodFlow, undoPeriodCheckin, togglePeriodHistory, deletePeriod
} from './features/period.js';
import {
  renderWater, addWater, addCustomWater, deleteWater, getWaterGoal
} from './features/water.js';
import { renderRest, clockInRest, toggleBackfill, selectBackfillPeriod, backfillRest } from './features/rest.js';
import {
  renderSummary, renderOrders, getTodayOrders,
  updatePrice, updateHeight, clearToday, clearAllData,
  openImportModal, previewRelay, confirmImport, smartParseOrder,
  openAddModal, openEditModal, resetFoodBuilder, renderFoodBuilder,
  addFoodRow, removeFoodRow, updateFoodRow, onFoodTypeChange, confirmAdd,
  toggleDone, deleteOrder
} from './features/orders.js';
import {
  renderBook, switchBookTab, startReadingBook, finishBook, editBook,
  deleteBook, openBookModal, fillBookFromLibrary, saveBook,
  addRecommendedBook, renderBookRecommendations,
  updateAuthorSuggestions, pickAuthor, searchBooksByTitle
} from './features/books.js';
import {
  updateSettings, addNewFood, deleteFood,
  openBackup, copyBackup, fallbackCopy, downloadBackup,
  openRestore, restoreData, restoreFromFile,
  renderSnapshots, restoreSnapshot,
  openLockModal, saveLock, closeLock, disableLockNow, renderLockStatus,
  runSelfTestPanel
} from './features/settings.js';

/* ===== 当前 tab ===== */
export let currentTab = 'home';

export function switchTab(name, btn){
  if(!name) name = 'home';
  currentTab = name;
  document.querySelectorAll('.tab-panel').forEach(function(t){ t.classList.remove('active'); });
  const panel = $('tab-'+name);
  if(panel) panel.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(function(t){ t.classList.remove('active'); });
  if(btn){
    btn.classList.add('active');
  } else {
    const indexMap = {home:0, weight:1, period:2, water:3, work:4, rest:5, book:6};
    const idx = indexMap[name];
    if(idx !== undefined){
      const navItems = document.querySelectorAll('.nav-item');
      if(navItems[idx]) navItems[idx].classList.add('active');
    }
  }

  if(name === 'period') renderPeriod();
  if(name === 'water') renderWater();
  if(name === 'work') renderOrders();
  if(name === 'rest') renderRest();
  if(name === 'book') renderBook();
}

export function renderAll(){
  renderSummary();
  renderOrders();
  updateGreeting();
  updateSettings();
  renderHome();
  renderWeight();
  renderThemeGrid();
  if(currentTab === 'period') renderPeriod();
  if(currentTab === 'water') renderWater();
  if(currentTab === 'rest') renderRest();
  if(currentTab === 'book') renderBook();
}

/* ===== 锁屏 ===== */
function showLockScreen(){
  const el = $('lockScreen');
  if(el) el.classList.add('show');
  const input = $('lockInput');
  if(input){ input.value = ''; setTimeout(function(){ try{ input.focus(); }catch(e){} }, 100); }
}

function hideLockScreen(){
  const el = $('lockScreen');
  if(el) el.classList.remove('show');
}

export async function unlockApp(pin){
  const input = $('lockInput');
  const value = (pin !== undefined && pin !== null) ? String(pin) : (input ? String(input.value || '') : '');
  const ok = await MeowStorage.unlock(value.trim());
  if(!ok){
    const err = $('lockError');
    if(err){ err.textContent = '密码不正确，请重试'; err.style.display = 'block'; }
    if(input) input.value = '';
    if(navigator.vibrate) navigator.vibrate([20,40,20]);
    return false;
  }
  const err = $('lockError');
  if(err) err.style.display = 'none';
  hideLockScreen();
  await startApp();
  return true;
}

/* ===== 自检 UI ===== */
export function initSelfTestUI(){
  const btn = $('selfTestBtn');
  if(btn && !btn.dataset.bound){
    btn.dataset.bound = '1';
    btn.addEventListener('click', function(){ runSelfTestPanel(); });
  }
}

/* ===== 启动 ===== */
async function startApp(){
  await load();
  if(!data.theme || !THEMES[data.theme]) data.theme = 'pink';
  applyTheme(data.theme);
  renderAll();
  renderLockStatus();
  initSelfTestUI();
}

async function boot(){
  await MeowStorage.init();

  if(MeowStorage.isLocked()){
    showLockScreen();
  } else {
    await startApp();
  }

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js?v=45').catch(function(){});
  }
}

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}

/* ===== 暴露给 inline handler 的全局函数 ===== */
const GLOBALS = {
  // 导航 / 渲染
  switchTab, renderAll,
  // 体重
  saveWeight, switchWeightUnit, deleteWeight, renderWeight,
  getWeightUnit, kgToDisplay, displayToKg, unitSuffix, fmtWeight, getSortedWeights, calcBMI,
  // 休息
  clockInRest, renderRest, toggleBackfill, selectBackfillPeriod, backfillRest,
  // 经期
  calPrevMonth, calNextMonth, logPeriodStart, endPeriodToday, setPeriodFlow,
  undoPeriodCheckin, togglePeriodHistory, deletePeriod, renderPeriod,
  // 饮水
  addWater, addCustomWater, deleteWater, renderWater, getWaterGoal,
  // 主题
  switchTheme, applyTheme, renderThemeGrid, THEMES,
  // 订单
  updatePrice, updateHeight, clearToday, clearAllData,
  openImportModal, previewRelay, confirmImport, smartParseOrder,
  openAddModal, openEditModal, resetFoodBuilder, renderFoodBuilder,
  addFoodRow, removeFoodRow, updateFoodRow, onFoodTypeChange, confirmAdd,
  toggleDone, deleteOrder, renderOrders, renderSummary, getTodayOrders,
  // 读书
  switchBookTab, startReadingBook, finishBook, editBook, deleteBook,
  openBookModal, fillBookFromLibrary, saveBook, addRecommendedBook,
  renderBook, renderBookRecommendations,
  updateAuthorSuggestions, pickAuthor, searchBooksByTitle,
  // 首页
  renderHome, updateGreeting,
  // 设置 / 备份
  updateSettings, addNewFood, deleteFood,
  openBackup, copyBackup, fallbackCopy, downloadBackup,
  openRestore, restoreData, restoreFromFile, renderSnapshots, restoreSnapshot,
  // 弹窗
  closeModal, openModal, showToast,
  // 隐私与安全
  openLockModal, saveLock, closeLock, unlockApp, disableLockNow, renderLockStatus,
  // 自检
  runSelfTest, runSelfTestPanel, initSelfTestUI,
  // 存储（调试用）
  MeowStorage
};

if(typeof window !== 'undefined'){
  Object.keys(GLOBALS).forEach(function(k){ window[k] = GLOBALS[k]; });
  // data 需为实时引用，用 getter 暴露
  Object.defineProperty(window, 'meowData', { get: function(){ return data; } });
}
