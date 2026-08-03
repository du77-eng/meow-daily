/* ===== features/home.js — 首页 ===== */
import { $ } from '../ui.js';
import { data } from '../store.js';
import { getTodayOrders } from './orders.js';
import { getPeriodStatus, getPredictions, formatShortDate } from './period.js';
import { getSortedWeights, kgToDisplay, unitSuffix, calcBMI } from './weight.js';
import { getWaterGoal, getTodayWaterRecords } from './water.js';

export function renderHome(){
  const today = getTodayOrders();
  const counts = {};
  let total = 0;
  let doneCount = 0;
  Object.keys(data.prices).forEach(function(k){ counts[k]=0; });
  today.orders.forEach(function(o){
    if(o.done) doneCount++;
    o.foods.forEach(function(f){
      counts[f.name] = (counts[f.name]||0) + f.qty;
      total += f.qty * (data.prices[f.name]||0);
    });
  });
  $('homeOrderCount').textContent = today.orders.length;
  $('homeDoneCount').textContent = doneCount;
  $('homeIncome').textContent = '¥'+total;

  // Period
  const status = getPeriodStatus();
  const pred = getPredictions();
  let periodHtml = '';
  periodHtml += '<div class="mini-item" style="padding-top:0">';
  periodHtml += '<div class="mini-left"><div class="mini-icon">'+status.icon+'</div><div><div class="mini-title">'+status.title+'</div><div class="mini-sub">'+status.sub+'</div></div></div>';
  periodHtml += '<div class="mini-right" onclick="switchTab(\'period\')">查看 &rsaquo;</div>';
  periodHtml += '</div>';
  if(pred){
    periodHtml += '<div class="mini-item"><div class="mini-left"><div class="mini-icon">📅</div><div><div class="mini-title">预计下次 '+formatShortDate(pred.nextStart)+'</div><div class="mini-sub">排卵日 '+formatShortDate(pred.ovulation)+'</div></div></div></div>';
  }
  $('homePeriodStatus').innerHTML = periodHtml;

  // Weight
  const ws = getSortedWeights();
  const latest = ws.length > 0 ? ws[ws.length-1] : null;
  let weightHtml = '';
  if(latest){
    const bmi = calcBMI(latest.weight, data.height||160);
    weightHtml += '<div class="mini-item" style="padding-top:0">';
    weightHtml += '<div class="mini-left"><div class="mini-icon">⚖️</div><div><div class="mini-title">'+kgToDisplay(latest.weight).toFixed(2)+' '+unitSuffix()+'</div><div class="mini-sub">BMI '+bmi+' · '+latest.date+'</div></div></div>';
    weightHtml += '<div class="mini-right" onclick="switchTab(\'weight\')">记录 &rsaquo;</div>';
    weightHtml += '</div>';
  } else {
    weightHtml += '<div class="empty" style="padding:20px"><p>还没有体重记录，去体重tab记录一下吧~</p></div>';
  }
  $('homeWeightStatus').innerHTML = weightHtml;

  // Water
  const wGoal = getWaterGoal();
  const wRecs = getTodayWaterRecords();
  const wTotal = wRecs.reduce(function(s,r){return s+r.amount},0);
  const wPct = Math.min(100, Math.round(wTotal/wGoal*100));
  let waterHtml = '';
  waterHtml += '<div class="mini-item" style="padding-top:0">';
  waterHtml += '<div class="mini-left"><div class="mini-icon" style="background:#E8F4FD">💧</div><div><div class="mini-title">'+wTotal+'ml / '+wGoal+'ml</div><div class="mini-sub">已完成 '+wPct+'%'+(wPct>=100?' 🎉':'')+'</div></div></div>';
  waterHtml += '<div class="mini-right" onclick="switchTab(\'water\')">打卡 &rsaquo;</div>';
  waterHtml += '</div>';
  $('homeWaterStatus').innerHTML = waterHtml;
}

export function updateGreeting(){
  const h = new Date().getHours();
  let g = '';
  if(h<6) g='夜深了，注意休息喵~';
  else if(h<9) g='早上好，准备出摊喵~';
  else if(h<12) g='上午好，订单来啦喵~';
  else if(h<14) g='中午好，送餐中喵~';
  else if(h<18) g='下午好，辛苦啦喵~';
  else if(h<22) g='晚上好，收摊啦喵~';
  else g='夜深了，注意休息喵~';
  $('greeting').textContent = g;
  const d = new Date();
  const week = ['日','一','二','三','四','五','六'][d.getDay()];
  $('todayLabel').textContent = (d.getMonth()+1)+'月'+d.getDate()+'日 周'+week+' 订单';
  $('topDate').textContent = (d.getMonth()+1)+'月'+d.getDate()+'日 周'+week;
}
