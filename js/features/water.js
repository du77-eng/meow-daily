/* ===== features/water.js — 饮水追踪 ===== */
import { $, showToast } from '../ui.js';
import { data, save } from '../store.js';
import { todayKey, computeWaterGoal } from '../util.js';
import { getSortedWeights, kgToDisplay, unitSuffix } from './weight.js';
import { renderHome } from './home.js';

export function getWaterGoal(){
  const ws = getSortedWeights();
  const latest = ws.length > 0 ? ws[ws.length-1] : null;
  if(latest && latest.weight){
    return computeWaterGoal(latest.weight);
  }
  return 2000;
}

export function getTodayWaterRecords(){
  const k = todayKey();
  if(!data.water) data.water = {};
  if(!data.water[k]) data.water[k] = [];
  return data.water[k];
}

export async function addWater(amount){
  amount = parseInt(amount);
  if(!amount || amount<=0){ showToast('请输入有效毫升数'); return; }
  const records = getTodayWaterRecords();
  const now = new Date();
  const time = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  records.push({time:time, amount:amount, id:Date.now()});
  await save();
  renderWater();
  renderHome();
  if(navigator.vibrate) navigator.vibrate(10);
  const goal = getWaterGoal();
  const total = records.reduce(function(s,r){return s+r.amount},0);
  if(total >= goal && total - amount < goal){
    showToast('🎉 今日饮水目标达成！');
  } else {
    showToast('已记录 '+amount+'ml 饮水');
  }
}

export function addCustomWater(){
  const input = $('waterCustomInput');
  if(!input) return;
  const val = parseInt(input.value);
  if(!val || val<=0){ showToast('请输入有效毫升数'); return; }
  addWater(val);
  input.value = '';
}

export async function deleteWater(id){
  const records = getTodayWaterRecords();
  data.water[todayKey()] = records.filter(function(r){return r.id !== id});
  await save();
  renderWater();
  renderHome();
  showToast('已删除');
}

export function getWaterTip(total, goal){
  const pct = Math.round(total/goal*100);
  const hour = new Date().getHours();
  if(pct >= 100) return {icon:'🎉', text:'太棒了！今日饮水目标已达成，继续保持~'};
  if(pct >= 80) return {icon:'💪', text:'快完成目标啦，再喝 '+(goal-total)+'ml 就达标了！'};
  if(pct >= 50) return {icon:'👍', text:'已过半，继续加油，还需 '+(goal-total)+'ml'};
  if(hour >= 12 && pct < 30) return {icon:'⚠️', text:'上午喝水偏少，下午记得多喝点水喵~'};
  if(hour >= 18 && pct < 50) return {icon:'⚠️', text:'下午了，饮水量不足，抓紧补充~'};
  return {icon:'💧', text:'今日还需 '+(goal-total)+'ml，每次少喝多次更健康~'};
}

export function renderWater(){
  const container = $('waterContent');
  if(!container) return;
  const goal = getWaterGoal();
  const records = getTodayWaterRecords();
  const total = records.reduce(function(s,r){return s+r.amount},0);
  const pct = Math.min(100, Math.round(total/goal*100));
  const remain = Math.max(0, goal-total);
  const cups = Math.round(total/250*10)/10;
  const goalCups = Math.round(goal/250*10)/10;

  let html = '';
  html += '<div class="water-hero">';
  html += '<div class="water-circle">';
  html += '<div class="water-fill" style="height:'+pct+'%"></div>';
  html += '<div class="water-circle-text">';
  html += '<div class="water-circle-amount">'+total+'</div>';
  html += '<div class="water-circle-unit">ml</div>';
  html += '</div></div>';
  html += '<div class="water-pct-text">已完成 '+pct+'%</div>';
  html += '<div class="water-goal-text">目标 '+goal+'ml ('+goalCups+'杯) · 还需 '+remain+'ml</div>';
  if(pct >= 100) html += '<div style="font-size:13px;color:#3A9DD8;font-weight:600;margin-top:6px">🎉 目标达成！</div>';
  html += '</div>';

  const tip = getWaterTip(total, goal);
  html += '<div class="water-tip"><div class="icon">'+tip.icon+'</div><div>'+tip.text+'</div></div>';

  const ws = getSortedWeights();
  const latestW = ws.length > 0 ? ws[ws.length-1] : null;
  html += '<div class="water-goal-card">';
  html += '<div class="water-goal-icon">⚖️</div>';
  html += '<div class="water-goal-info">';
  html += '<div class="water-goal-title">每日推荐饮水量 '+goal+'ml</div>';
  if(latestW){
    html += '<div class="water-goal-sub">基于最新体重 '+kgToDisplay(latestW.weight).toFixed(2)+unitSuffix()+' · 每公斤35ml计算</div>';
  } else {
    html += '<div class="water-goal-sub">默认目标2000ml · 记录体重后自动调整</div>';
  }
  html += '</div></div>';

  html += '<div class="water-quick">';
  html += '<div class="water-quick-title">💧 快速打卡</div>';
  html += '<div class="water-quick-grid">';
  const amounts = [100, 150, 200, 250, 300, 500];
  amounts.forEach(function(a){
    html += '<button class="water-quick-btn" onclick="addWater('+a+')"><span class="num">'+a+'</span><span class="unit">ml</span></button>';
  });
  html += '</div>';
  html += '<div class="water-custom-row">';
  html += '<input type="number" id="waterCustomInput" placeholder="自定义毫升数" min="1">';
  html += '<button class="btn btn-primary" onclick="addCustomWater()">打卡</button>';
  html += '</div>';
  html += '</div>';

  html += '<div class="water-records">';
  html += '<div class="card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>今日记录 ('+records.length+'次 · '+cups+'杯)</div>';
  if(records.length === 0){
    html += '<div class="empty" style="padding:30px 20px"><p>还没有喝水记录喵~<br>点上方按钮打卡吧</p></div>';
  } else {
    for(let i=records.length-1; i>=0; i--){
      const r = records[i];
      html += '<div class="water-record-item">';
      html += '<div class="water-record-icon">💧</div>';
      html += '<div class="water-record-time">'+r.time+'</div>';
      html += '<div class="water-record-amount">+'+r.amount+'ml</div>';
      html += '<button class="water-record-del" onclick="deleteWater('+r.id+')">&times;</button>';
      html += '</div>';
    }
  }
  html += '</div>';

  container.innerHTML = html;
}
