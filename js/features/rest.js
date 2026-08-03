/* ===== features/rest.js — 休息打卡 ===== */
import { $, showToast } from '../ui.js';
import { data, save } from '../store.js';
import { fmtDate } from './period.js';

export function periodName(p){ return p === 'am' ? '上午' : '下午'; }

export async function clockInRest(p, dateKey){
  const key = dateKey || fmtDate(new Date());
  if(!data.rest) data.rest = {};
  if(!data.rest[key]) data.rest[key] = {am:null, pm:null};
  if(data.rest[key][p]){
    if(confirm(key+' 已记录'+periodName(p)+'休息 '+data.rest[key][p]+'，要撤销吗？')){
      data.rest[key][p] = null;
      await save();
      renderRest();
      showToast('已撤销'+periodName(p)+'休息打卡');
    }
    return;
  }
  const now = new Date();
  const t = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  data.rest[key][p] = t;
  await save();
  renderRest();
  const suffix = (dateKey && dateKey !== fmtDate(new Date())) ? (key+' ') : '';
  showToast('已记录'+suffix+periodName(p)+'休息 '+t+' 😴');
}

// ===== 补打卡（指定过去日期）=====
export function toggleBackfill(){
  const panel = $('restBackfillPanel');
  if(!panel) return;
  if(panel.style.display === 'block'){
    panel.style.display = 'none';
    return;
  }
  const dateInput = $('restBackfillDate');
  if(dateInput && !dateInput.value) dateInput.value = fmtDate(new Date());
  selectBackfillPeriod('am');
  panel.style.display = 'block';
}

export function selectBackfillPeriod(p){
  const am = $('restBfAm'), pm = $('restBfPm');
  if(am) am.className = 'btn ' + (p === 'am' ? 'btn-primary' : 'btn-secondary');
  if(pm) pm.className = 'btn ' + (p === 'pm' ? 'btn-primary' : 'btn-secondary');
  const hidden = $('restBackfillPeriod');
  if(hidden) hidden.value = p;
}

export async function backfillRest(){
  const dateInput = $('restBackfillDate');
  const hidden = $('restBackfillPeriod');
  if(!dateInput || !dateInput.value){ showToast('请先选择日期'); return; }
  const p = hidden ? hidden.value : 'am';
  await clockInRest(p, dateInput.value);
  const panel = $('restBackfillPanel');
  if(panel) panel.style.display = 'none';
}

export function renderRest(){
  if(!data.rest) data.rest = {};
  const today = fmtDate(new Date());
  const todayRec = data.rest[today] || {am:null, pm:null};

  const amBtn = $('restAmBtn');
  const pmBtn = $('restPmBtn');
  const amTime = $('restAmTime');
  const pmTime = $('restPmTime');
  const sub = $('restTodaySub');

  if(amBtn){
    if(todayRec.am){
      amBtn.classList.add('done');
      amTime.textContent = '已完成 '+todayRec.am;
    } else {
      amBtn.classList.remove('done');
      amTime.textContent = '点击打卡';
    }
  }
  if(pmBtn){
    if(todayRec.pm){
      pmBtn.classList.add('done');
      pmTime.textContent = '已完成 '+todayRec.pm;
    } else {
      pmBtn.classList.remove('done');
      pmTime.textContent = '点击打卡';
    }
  }
  if(sub){
    const doneCount = (todayRec.am?1:0) + (todayRec.pm?1:0);
    if(doneCount === 0) sub.textContent = '上午 / 下午 各可打卡一次';
    else if(doneCount === 1) sub.textContent = '已打 ' + (todayRec.am?'上午':'下午') + '，还差一次~';
    else sub.textContent = '今天已经休息两次啦，辛苦了 💛';
  }

  // Stats
  const nowD = new Date();
  const ym = nowD.getFullYear() + '-' + String(nowD.getMonth()+1).padStart(2,'0');
  let monthDays = 0, totalDays = 0;
  for(const d in data.rest){
    const rec = data.rest[d];
    const has = (rec.am || rec.pm);
    if(has) totalDays++;
    if(d.indexOf(ym) === 0 && has) monthDays++;
  }
  const monthEl = $('restMonthNum');
  const totalEl = $('restTotalNum');
  if(monthEl) monthEl.textContent = monthDays;
  if(totalEl) totalEl.textContent = totalDays;

  // Week & month overview
  renderRestWeek();
  renderRestMonth();

  // History
  const histEl = $('restHistoryList');
  if(histEl){
    const dates = Object.keys(data.rest).filter(function(d){return data.rest[d].am || data.rest[d].pm;});
    dates.sort(function(a,b){ return a < b ? 1 : -1; });
    if(dates.length === 0){
      histEl.innerHTML = '<div class="empty" style="padding:26px 16px"><p>还没有休息打卡记录喵~<br>点上方按钮记录一下吧</p></div>';
    } else {
      let html = '';
      dates.slice(0, 12).forEach(function(d){
        const rec = data.rest[d];
        const amPill = rec.am ? '<span class="rest-pill tick">☀️ '+rec.am+'</span>' : '<span class="rest-pill none">上午未</span>';
        const pmPill = rec.pm ? '<span class="rest-pill tick">🌙 '+rec.pm+'</span>' : '<span class="rest-pill none">下午未</span>';
        html += '<div class="rest-history-item">';
        html += '<div class="rest-history-date">'+d+'</div>';
        html += '<div class="rest-history-periods">'+amPill+pmPill+'</div>';
        html += '</div>';
      });
      histEl.innerHTML = html;
    }
  }
}

export function renderRestWeek(){
  const grid = $('restWeekGrid');
  if(!grid) return;
  const now = new Date();
  const dow = now.getDay(); // 0=Sun..6=Sat
  const mondayOffset = (dow === 0 ? 6 : dow - 1);
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const dows = ['一','二','三','四','五','六','日'];
  const todayDs = fmtDate(now);
  let html = '';
  for(let i=0;i<7;i++){
    const d = new Date(monday);
    d.setDate(monday.getDate()+i);
    const ds = fmtDate(d);
    const rec = (data.rest && data.rest[ds]) || {am:null,pm:null};
    const isToday = (ds === todayDs);
    const amCls = rec.am ? 'on':'off';
    const pmCls = rec.pm ? 'on':'off';
    html += '<div class="rest-week-cell'+(isToday?' today':'')+'">';
    html += '<div class="rest-week-dow">'+dows[i]+'</div>';
    html += '<div class="rest-week-date">'+d.getDate()+'</div>';
    html += '<div class="rest-week-p '+amCls+'">上</div>';
    html += '<div class="rest-week-p '+pmCls+'">下</div>';
    html += '</div>';
  }
  grid.innerHTML = html;
}

export function renderRestMonth(){
  const grid = $('restMonthGrid');
  if(!grid) return;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const startDow = new Date(y, m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todayDs = fmtDate(now);
  const dows = ['日','一','二','三','四','五','六'];
  let html = '';
  for(let i=0;i<7;i++) html += '<div class="rest-month-dow">'+dows[i]+'</div>';
  for(let b=0;b<startDow;b++) html += '<div class="rest-month-cell other"></div>';
  for(let day=1; day<=daysInMonth; day++){
    const d = new Date(y, m, day);
    const ds = fmtDate(d);
    const rec = (data.rest && data.rest[ds]) || {am:null,pm:null};
    const rested = (rec.am || rec.pm);
    const isToday = (ds === todayDs);
    const cls = 'rest-month-cell' + (rested?' rested':'') + (isToday?' today':'');
    html += '<div class="'+cls+'"><div>'+day+'</div>';
    if(rested) html += '<div class="mdot">休</div>';
    html += '</div>';
  }
  grid.innerHTML = html;
}
