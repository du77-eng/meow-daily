/* ===== features/weight.js ===== */
import { $, showToast } from '../ui.js';
import { data, save } from '../store.js';
import { todayKey, calcBMI as utilCalcBMI } from '../util.js';
import { renderHome } from './home.js';

export function getWeightUnit(){ return (data.weightUnit==='jin') ? 'jin' : 'kg'; }
export function kgToDisplay(kg){ return getWeightUnit()==='jin' ? kg*2 : kg; }
export function displayToKg(v){ return getWeightUnit()==='jin' ? v/2 : v; }
export function unitSuffix(){ return getWeightUnit()==='jin' ? '斤' : 'kg'; }
export function fmtWeight(kg){ return kgToDisplay(kg).toFixed(2) + ' ' + unitSuffix(); }

export function getSortedWeights(){
  return (data.weights||[]).slice().sort(function(a,b){ return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
}

/** 与旧版一致：返回 1 位小数的字符串，或 null */
export function calcBMI(w, h){
  const v = utilCalcBMI(w, h);
  return v === null ? null : v.toFixed(1);
}

export async function switchWeightUnit(u){
  data.weightUnit = u;
  await save();
  $('unitKg').classList.toggle('active', u==='kg');
  $('unitJin').classList.toggle('active', u==='jin');
  $('weightUnitLabel').textContent = u==='jin' ? '斤' : 'kg';
  renderWeight();
  renderHome();
  showToast('单位已切换为'+(u==='jin'?'斤':'KG'));
}

export async function saveWeight(){
  const input = $('weightInput');
  const val = parseFloat(input.value);
  if(!val || val<=0){ showToast('请输入有效的体重'); return; }
  if(!data.weights) data.weights = [];
  const kg = displayToKg(val);   // 按当前单位换算回 kg 存储
  const today = todayKey();
  const idx = data.weights.findIndex(function(w){ return w.date === today; });
  if(idx>=0){
    data.weights[idx].weight = kg;
  } else {
    data.weights.push({date:today, weight:kg});
  }
  await save();
  input.value = '';
  renderWeight();
  renderHome();
  showToast('已记录今日体重：'+fmtWeight(kg));
}

export async function deleteWeight(date){
  if(!confirm('确定删除这条体重记录吗？')) return;
  data.weights = data.weights.filter(function(w){ return w.date !== date; });
  await save();
  renderWeight();
  renderHome();
  showToast('已删除');
}

export function renderWeight(){
  $('unitKg').classList.toggle('active', getWeightUnit()==='kg');
  $('unitJin').classList.toggle('active', getWeightUnit()==='jin');
  $('weightUnitLabel').textContent = unitSuffix();
  const ws = getSortedWeights();
  const latest = ws.length > 0 ? ws[ws.length-1] : null;
  const prev = ws.length > 1 ? ws[ws.length-2] : null;

  $('weightLatest').textContent = latest ? kgToDisplay(latest.weight).toFixed(2) + ' ' + unitSuffix() : '--';
  $('weightBMI').textContent = latest ? calcBMI(latest.weight, data.height||160) : '--';

  const factor = getWeightUnit()==='jin' ? 2 : 1;  // 差值按单位换算
  const changeEl = $('weightChange');
  if(latest && prev){
    const diff = (latest.weight - prev.weight) * factor;
    const sign = diff > 0 ? '+' : '';
    changeEl.textContent = sign + diff.toFixed(2);
    changeEl.style.color = diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--red)' : 'var(--text-mute)';
  } else {
    changeEl.textContent = '--';
    changeEl.style.color = 'var(--text-mute)';
  }

  // Chart placeholder (simple sparkline with text)
  const chart = $('weightChart');
  if(ws.length < 2){
    chart.textContent = '至少记录2次体重后显示趋势';
  } else {
    const recent = ws.slice(-7);
    const min = Math.min.apply(null, recent.map(function(x){return x.weight}));
    const max = Math.max.apply(null, recent.map(function(x){return x.weight}));
    const range = max - min || 1;
    const bars = recent.map(function(x){
      const h = Math.max(10, Math.round(((x.weight - min)/range)*80));
      return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1"><div style="width:8px;height:'+h+'px;background:var(--pink);border-radius:4px"></div><div style="font-size:9px;color:var(--text-mute)">'+x.date.slice(5)+'</div></div>';
    }).join('');
    chart.innerHTML = '<div style="display:flex;align-items:flex-end;gap:4px;height:90px;width:100%;padding:0 4px">'+bars+'</div>';
  }

  // List
  const list = $('weightList');
  if(ws.length === 0){
    list.innerHTML = '<div class="empty"><p>还没有体重记录喵~</p></div>';
    return;
  }
  let html = '';
  for(let i=ws.length-1; i>=0; i--){
    const w = ws[i];
    const prevW = i > 0 ? ws[i-1] : null;
    const diff = prevW ? ((w.weight - prevW.weight) * factor).toFixed(2) : null;
    let changeHtml = '';
    if(diff !== null){
      const d = parseFloat(diff);
      changeHtml = '<span class="weight-list-change" style="color:'+(d<0?'var(--green)':d>0?'var(--red)':'var(--text-mute)')+'">'+(d>0?'+':'')+diff+'</span>';
    }
    html += '<div class="weight-list-item">';
    html += '<div class="weight-list-date">'+w.date+'</div>';
    html += '<div style="display:flex;align-items:center">';
    html += '<span class="weight-list-value">'+kgToDisplay(w.weight).toFixed(2)+' '+unitSuffix()+'</span>';
    html += changeHtml;
    html += '<button class="o-del" onclick="deleteWeight(\''+w.date+'\')">&times;</button>';
    html += '</div></div>';
  }
  list.innerHTML = html;

  // settings count
  $('weightCount').textContent = ws.length + ' 条';
  $('heightInput').value = data.height || 160;
}
