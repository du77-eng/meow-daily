/* ===== features/period.js — 姨妈追踪 ===== */
import { $, showToast } from '../ui.js';
import { data, save } from '../store.js';
import { renderHome } from './home.js';

/* ---- module state ---- */
export let calMonth = new Date();
export let periodHistoryOpen = false;

export function fmtDate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
}
export function parseDate(s){
  const p = s.split('-');
  return new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]));
}
export function daysBetween(a, b){
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}
export function addDays(s, n){
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

export function getSortedPeriods(){
  return (data.periods||[]).slice().sort(function(a,b){ return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
}
export function getAvgCycle(){
  const ps = getSortedPeriods();
  if(ps.length < 2) return 28;
  let sum = 0, count = 0;
  for(let i=1; i<ps.length; i++){
    sum += daysBetween(ps[i-1].start, ps[i].start);
    count++;
  }
  return Math.round(sum / count);
}
export function getAvgDuration(){
  const ps = getSortedPeriods().filter(function(p){return p.end});
  if(ps.length === 0) return 5;
  let sum = 0;
  ps.forEach(function(p){ sum += daysBetween(p.start, p.end) + 1; });
  return Math.round(sum / ps.length);
}
export function getLastPeriod(){
  const ps = getSortedPeriods();
  return ps.length > 0 ? ps[ps.length-1] : null;
}
export function isOngoing(){
  const last = getLastPeriod();
  return last && !last.end;
}

export function getPredictions(){
  const ps = getSortedPeriods();
  if(ps.length === 0) return null;
  const last = ps[ps.length-1];
  const avgCycle = getAvgCycle();
  const avgDur = getAvgDuration();
  const nextStart = addDays(last.start, avgCycle);
  const ovulation = addDays(nextStart, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

  return {
    nextStart: nextStart,
    nextEnd: addDays(nextStart, avgDur - 1),
    ovulation: ovulation,
    fertileStart: fertileStart,
    fertileEnd: fertileEnd,
    avgCycle: avgCycle,
    avgDur: avgDur
  };
}

export function getPeriodStatus(){
  const today = fmtDate(new Date());
  const ps = getSortedPeriods();
  if(ps.length === 0) return {type:'empty', title:'还没记录', sub:'点击打卡记录第一次经期', icon:'🌸'};

  for(let i=0; i<ps.length; i++){
    const p = ps[i];
    if(today >= p.start && (!p.end || today <= p.end)){
      const day = daysBetween(p.start, today) + 1;
      return {type:'period', title:'经期第'+day+'天', sub:'注意保暖，多喝热水喵~', icon:'🩸', day:day};
    }
  }

  const pred = getPredictions();
  if(!pred) return {type:'empty', title:'还没记录', sub:'点击打卡记录经期', icon:'🌸'};

  if(today >= pred.fertileStart && today <= pred.fertileEnd){
    if(today === pred.ovulation) return {type:'ovulation', title:'排卵日', sub:'易孕期，注意避孕/备孕', icon:'🥚'};
    return {type:'fertile', title:'易孕期', sub:'受孕概率较高', icon:'⚡'};
  }

  const daysToNext = daysBetween(today, pred.nextStart);
  if(daysToNext >= 0 && daysToNext <= 3){
    return {type:'coming', title:'预计'+daysToNext+'天后', sub:'经期即将来潮，备好用品', icon:'⏰', countdown:daysToNext};
  }

  if(daysToNext < 0){
    const overdue = -daysToNext;
    return {type:'overdue', title:'已推迟'+overdue+'天', sub:'别紧张，可能稍有波动', icon:'⏰', countdown:-overdue};
  }

  return {type:'safe', title:'安全期', sub:'距下次经期还有'+daysToNext+'天', icon:'🌿'};
}

export function formatShortDate(s){
  const p = s.split('-');
  return parseInt(p[1])+'月'+parseInt(p[2])+'日';
}

export function renderPeriod(){
  const container = $('periodContent');
  if(!container) return;
  const status = getPeriodStatus();
  const pred = getPredictions();
  const ps = getSortedPeriods();
  const ongoing = isOngoing();
  const today = fmtDate(new Date());

  let html = '';

  html += '<div class="per-hero">';
  html += '<div class="per-hero-row">';
  html += '<div class="per-hero-icon">'+status.icon+'</div>';
  html += '<div class="per-hero-text">';
  html += '<span class="per-phase-badge">'+getStatusLabel(status.type)+'</span>';
  if(status.type === 'empty'){
    html += '<div class="per-hero-title">还没有记录喵~</div>';
    html += '<div class="per-hero-sub">点击下方粉色「今日打卡」按钮，记录第一次经期</div>';
  } else if(status.type === 'period'){
    html += '<div class="per-hero-title">经期第 '+status.day+' 天</div>';
    const lastP = getLastPeriod();
    const avgDur = pred ? pred.avgDur : 5;
    const remain = Math.max(0, avgDur - status.day);
    html += '<div class="per-hero-sub">'+formatShortDate(lastP.start)+'开始 · 预计还有'+remain+'天结束</div>';
  } else if(status.type === 'coming'){
    html += '<div class="per-hero-title">'+status.countdown+' 天后来姨妈</div>';
    if(pred) html += '<div class="per-hero-sub">预计 '+formatShortDate(pred.nextStart)+' 来潮 · 备好用品喵~</div>';
    else html += '<div class="per-hero-sub">'+status.sub+'</div>';
  } else if(status.type === 'overdue'){
    html += '<div class="per-hero-title">已推迟 '+(-status.countdown)+' 天</div>';
    if(pred) html += '<div class="per-hero-sub">预计 '+formatShortDate(pred.nextStart)+' · 别紧张，可能稍有波动</div>';
    else html += '<div class="per-hero-sub">'+status.sub+'</div>';
  } else if(status.type === 'fertile'){
    html += '<div class="per-hero-title">易孕期</div>';
    if(pred) html += '<div class="per-hero-sub">距下次经期 '+daysBetween(today, pred.nextStart)+' 天 · 受孕概率较高</div>';
    else html += '<div class="per-hero-sub">'+status.sub+'</div>';
  } else if(status.type === 'ovulation'){
    html += '<div class="per-hero-title">今天是排卵日 🥚</div>';
    if(pred) html += '<div class="per-hero-sub">距下次经期 '+daysBetween(today, pred.nextStart)+' 天</div>';
    else html += '<div class="per-hero-sub">'+status.sub+'</div>';
  } else if(status.type === 'safe'){
    if(pred){
      const dtn = daysBetween(today, pred.nextStart);
      html += '<div class="per-hero-title">距下次经期 '+dtn+' 天</div>';
      html += '<div class="per-hero-sub">预计 '+formatShortDate(pred.nextStart)+' 来潮</div>';
    } else {
      html += '<div class="per-hero-title">'+status.title+'</div>';
      html += '<div class="per-hero-sub">'+status.sub+'</div>';
    }
  } else {
    html += '<div class="per-hero-title">'+status.title+'</div>';
    html += '<div class="per-hero-sub">'+status.sub+'</div>';
  }
  html += '</div></div>';
  if(pred && ps.length > 0){
    const lastForBar = getLastPeriod();
    const cycleDay = daysBetween(lastForBar.start, today) + 1;
    const progressPct = Math.min(100, Math.round((cycleDay / pred.avgCycle) * 100));
    html += '<div class="per-cycle-bar"><div class="per-cycle-fill" style="width:'+progressPct+'%"></div></div>';
    html += '<div class="per-cycle-labels"><span>第'+cycleDay+'天</span><span>周期'+pred.avgCycle+'天</span></div>';
  }
  html += '</div>';

  const completedPeriods = ps.filter(function(p){return p.end});
  if(completedPeriods.length > 0){
    const lastComp = completedPeriods[completedPeriods.length-1];
    const compDur = daysBetween(lastComp.start, lastComp.end) + 1;
    html += '<div class="per-last-summary">';
    html += '<div class="per-last-info">';
    html += '<div class="per-last-label">上次经期</div>';
    html += '<div class="per-last-date">'+formatShortDate(lastComp.start)+' ~ '+formatShortDate(lastComp.end)+'</div>';
    html += '</div>';
    html += '<div class="per-last-dur">'+compDur+'<small>天</small></div>';
    html += '</div>';
  }

  if(pred && status.type !== 'period'){
    const cdn = daysBetween(today, pred.nextStart);
    const cdnText = cdn >= 0 ? cdn+'天后来' : '已推迟'+(-cdn)+'天';
    html += '<div class="per-pred-countdown">';
    html += '<div class="days">'+(cdn>=0?cdn:-cdn)+'</div>';
    html += '<div class="info">'+cdnText+'姨妈<br>预计 '+formatShortDate(pred.nextStart)+'</div>';
    html += '</div>';
  }

  html += '<div class="per-checkin">';
  html += '<div class="per-checkin-top">';
  html += '<div class="per-checkin-title">姨妈打卡</div>';
  html += '<div class="per-checkin-date">'+formatShortDate(today)+'</div>';
  html += '</div>';
  html += '<div class="per-checkin-main">';
  let last = null;
  if(ongoing){
    last = getLastPeriod();
    const dayNum = daysBetween(last.start, today) + 1;
    html += '<button class="per-checkin-btn end" onclick="endPeriodToday()">结束<br>打卡</button>';
    html += '<div class="per-checkin-info">';
    html += '<div class="big">已打卡 '+dayNum+' 天</div>';
    html += '<div class="small">'+flowText(last.flow)+'，今天感觉怎么样？</div>';
    html += '</div>';
  } else {
    html += '<button class="per-checkin-btn" onclick="logPeriodStart(true)">今日<br>打卡</button>';
    html += '<div class="per-checkin-info">';
    html += '<div class="big">今天来姨妈了吗？</div>';
    html += '<div class="small">点左侧按钮一键记录今天的经期开始</div>';
    html += '</div>';
  }
  html += '</div>';
  if(ongoing){
    html += '<div class="per-checkin-actions">';
    html += '<button class="btn btn-secondary'+(last.flow==='少'?' active':'')+'" onclick="setPeriodFlow(\'少\')">量少</button>';
    html += '<button class="btn btn-secondary'+(last.flow==='中'?' active':'')+'" onclick="setPeriodFlow(\'中\')">量中</button>';
    html += '<button class="btn btn-secondary'+(last.flow==='多'?' active':'')+'" onclick="setPeriodFlow(\'多\')">量多</button>';
    html += '<button class="btn btn-secondary" style="color:var(--red);border-color:#FFB3B3" onclick="undoPeriodCheckin()">撤销</button>';
    html += '</div>';
  } else {
    html += '<div class="per-checkin-actions">';
    html += '<button class="btn btn-secondary" onclick="logPeriodStart(false)">补记经期</button>';
    html += '</div>';
  }
  html += '</div>';

  if(ps.length === 0){
    html += '<div class="per-empty-guide">';
    html += '<div class="icon">🔮</div>';
    html += '<div class="text">';
    html += '<div class="title">预测需要先记录一次经期</div>';
    html += '<div class="sub">点上方<b>「今日打卡」</b>记录今天开始，再点一次<b>「结束打卡」</b>记录结束。有了开始和结束日期，就能自动预测下次姨妈、排卵日和易孕期啦~</div>';
    html += '</div></div>';
  }

  if(ps.length > 0 && pred){
    html += '<div class="per-stats">';
    html += '<div class="per-stat"><div class="num">'+pred.avgCycle+'</div><div class="lbl">平均周期</div></div>';
    html += '<div class="per-stat"><div class="num">'+pred.avgDur+'</div><div class="lbl">平均经期</div></div>';
    html += '<div class="per-stat"><div class="num">'+ps.length+'</div><div class="lbl">记录次数</div></div>';
    html += '</div>';
  }

  if(pred){
    html += '<div class="card">';
    html += '<div class="card-title"><svg viewBox="0 0 24 24"><path d="M12 2C8 2 5 5 5 9c0 4 4 8 7 13 3-5 7-9 7-13 0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>未来预测</div>';
    html += '<div class="per-pred-grid">';
    html += '<div class="per-pred-item"><div class="date">'+formatShortDate(pred.nextStart)+'</div><div class="lbl">预计下次</div></div>';
    html += '<div class="per-pred-item ovulation"><div class="date">'+formatShortDate(pred.ovulation)+'</div><div class="lbl">排卵日</div></div>';
    html += '<div class="per-pred-item fertile"><div class="date">'+formatShortDate(pred.fertileStart)+'</div><div class="lbl">易孕开始</div></div>';
    html += '<div class="per-pred-item fertile"><div class="date">'+formatShortDate(pred.fertileEnd)+'</div><div class="lbl">易孕结束</div></div>';
    html += '</div></div>';
  }

  html += renderPeriodCalendar();

  if(ps.length > 0){
    html += '<div class="per-toggle'+(periodHistoryOpen?' open':'')+'" onclick="togglePeriodHistory()">';
    html += '<div class="per-toggle-title">历史记录 ('+ps.length+')</div>';
    html += '<div class="per-toggle-arrow">&#8250;</div>';
    html += '</div>';
    if(periodHistoryOpen){
      html += '<div class="per-history">';
      for(let i=ps.length-1; i>=0; i--){
        const p = ps[i];
        const dur = p.end ? (daysBetween(p.start, p.end) + 1) + '天' : '进行中';
        let cycleInfo = '';
        if(i > 0){
          const cyc = daysBetween(ps[i-1].start, p.start);
          cycleInfo = '周期'+cyc+'天';
        }
        html += '<div class="per-hist-item">';
        html += '<div><div class="per-hist-date">'+formatShortDate(p.start);
        if(p.end) html += ' ~ '+formatShortDate(p.end);
        html += '</div>';
        if(cycleInfo) html += '<div class="per-hist-cycle">'+cycleInfo+'</div>';
        html += '</div>';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        if(p.flow) html += '<span class="per-hist-tag">'+p.flow+'</span>';
        html += '<span class="per-hist-tag">'+dur+'</span>';
        html += '<button class="per-hist-del" onclick="deletePeriod('+i+')">&times;</button>';
        html += '</div></div>';
      }
      html += '</div>';
    }
  }

  container.innerHTML = html;
}

export function getStatusLabel(type){
  const map = {'empty':'喵~','period':'姨妈期','ovulation':'排卵日','fertile':'易孕期','coming':'快来了','overdue':'推迟了','safe':'安全期'};
  return map[type] || '喵喵日常';
}

export function flowText(flow){
  if(!flow) return '暂无血量记录';
  return '本次血量：'+flow;
}

export function renderPeriodCalendar(){
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const today = fmtDate(new Date());
  const pred = getPredictions();
  const ps = getSortedPeriods();

  const periodDays = {};
  const periodStartDays = {};
  ps.forEach(function(p){
    const start = p.start;
    const end = p.end || fmtDate(new Date());
    const d = parseDate(start);
    const endD = parseDate(end);
    while(d <= endD){
      const ds = fmtDate(d);
      periodDays[ds] = true;
      if(ds === start) periodStartDays[ds] = true;
      d.setDate(d.getDate() + 1);
    }
  });

  const predictedDays = {};
  const fertileDays = {};
  const ovulationDay = {};
  if(pred){
    const pd = parseDate(pred.nextStart);
    const pe = parseDate(pred.nextEnd);
    while(pd <= pe){ predictedDays[fmtDate(pd)] = true; pd.setDate(pd.getDate() + 1); }
    const fd = parseDate(pred.fertileStart);
    const fe = parseDate(pred.fertileEnd);
    while(fd <= fe){ fertileDays[fmtDate(fd)] = true; fd.setDate(fd.getDate() + 1); }
    ovulationDay[pred.ovulation] = true;
  }

  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const dows = ['日','一','二','三','四','五','六'];
  let html = '';
  html += '<div class="per-cal">';
  html += '<div class="per-cal-header">';
  html += '<button class="per-cal-nav" onclick="calPrevMonth()">&#8249;</button>';
  html += '<h4>'+year+'年'+(month+1)+'月</h4>';
  html += '<button class="per-cal-nav" onclick="calNextMonth()">&#8250;</button>';
  html += '</div>';
  html += '<div class="per-cal-grid">';
  dows.forEach(function(d){ html += '<div class="per-cal-dow">'+d+'</div>'; });
  for(let i=0; i<startDow; i++) html += '<div class="per-cal-day empty"></div>';
  for(let day=1; day<=daysInMonth; day++){
    const ds = fmtDate(new Date(year, month, day));
    let cls = 'per-cal-day';
    if(ovulationDay[ds]) cls += ' ovulation';
    else if(periodStartDays[ds]) cls += ' period-start';
    else if(periodDays[ds]) cls += ' period';
    else if(fertileDays[ds]) cls += ' fertile';
    else if(predictedDays[ds]) cls += ' predicted';
    if(ds === today) cls += ' today';
    html += '<div class="'+cls+'">'+day+'</div>';
  }
  html += '</div>';
  html += '<div class="per-cal-legend">';
  html += '<span><span class="dot" style="background:#FF4B6E"></span>经期</span>';
  html += '<span><span class="dot" style="background:var(--pink-light)"></span>预测</span>';
  html += '<span><span class="dot" style="background:#FFD6E5"></span>易孕</span>';
  html += '<span><span class="dot" style="background:#FF4B6E"></span>排卵</span>';
  html += '</div>';
  html += '</div>';
  return html;
}

export function calPrevMonth(){
  calMonth.setMonth(calMonth.getMonth() - 1);
  renderPeriod();
}
export function calNextMonth(){
  calMonth.setMonth(calMonth.getMonth() + 1);
  renderPeriod();
}

export function togglePeriodHistory(){
  periodHistoryOpen = !periodHistoryOpen;
  renderPeriod();
}

export async function setPeriodFlow(flow){
  const last = getLastPeriod();
  if(!last || last.end){ showToast('当前没有进行中的经期'); return; }
  last.flow = flow;
  await save();
  renderPeriod();
  showToast('已记录血量：'+flow);
}

export async function logPeriodStart(useToday){
  let startStr;
  if(useToday){
    startStr = fmtDate(new Date());
    const ps = getSortedPeriods();
    const exists = ps.some(function(p){ return p.start === startStr; });
    if(exists){ showToast('今天已经记录过了'); return; }
  } else {
    startStr = prompt('输入经期开始日期（YYYY-MM-DD）', fmtDate(new Date()));
    if(!startStr || !startStr.trim()) return;
    startStr = startStr.trim();
    if(!/^\d{4}-\d{1,2}-\d{1,2}$/.test(startStr)){
      showToast('日期格式不对，请用 2026-07-31 格式');
      return;
    }
    const parts = startStr.split('-');
    startStr = parts[0]+'-'+parts[1].padStart(2,'0')+'-'+parts[2].padStart(2,'0');
  }

  if(!data.periods) data.periods = [];
  data.periods.push({start: startStr, end: null});
  data.periods.sort(function(a,b){ return a.start < b.start ? -1 : 1; });
  await save();
  renderPeriod();
  renderHome();
  showToast('已记录经期开始：'+formatShortDate(startStr));
}

export async function endPeriodToday(){
  const last = getLastPeriod();
  if(!last || last.end){ showToast('当前没有进行中的经期'); return; }
  const today = fmtDate(new Date());
  if(today < last.start){ showToast('结束日期不能早于开始日期'); return; }
  last.end = today;
  await save();
  renderPeriod();
  renderHome();
  const dur = daysBetween(last.start, today)+1;
  showToast('本次经期持续 '+dur+' 天，辛苦啦~');
}

export async function deletePeriod(idx){
  if(!confirm('确定删除这条经期记录吗？')) return;
  const ps = getSortedPeriods();
  const toDelete = ps[idx];
  data.periods = data.periods.filter(function(p){
    return !(p.start === toDelete.start && p.end === toDelete.end);
  });
  await save();
  renderPeriod();
  renderHome();
  showToast('已删除');
}

export async function undoPeriodCheckin(){
  if(!data.periods || data.periods.length === 0) return;
  const last = getLastPeriod();
  if(!last || last.end){
    showToast('当前没有进行中的经期');
    return;
  }
  if(!confirm('确定撤销这次打卡吗？将删除 '+formatShortDate(last.start)+' 的经期记录')) return;
  data.periods = data.periods.filter(function(p){
    return !(p.start === last.start && p.end === last.end);
  });
  await save();
  renderPeriod();
  renderHome();
  showToast('已撤销打卡');
}
