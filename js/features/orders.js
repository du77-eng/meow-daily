/* ===== features/orders.js — 工作 / 订单 ===== */
import { $, showToast, closeModal } from '../ui.js';
import { data, save, setData, defaults } from '../store.js';
import { todayKey, escapeHtml, extractFoods, parseRelay, parseSingleOrder } from '../util.js';
import { renderAll } from '../app.js';
import { renderWeight } from './weight.js';
import { renderHome } from './home.js';

/* ---- module state ---- */
export let editOrderId = null;
export let pendingModifyId = null;
export let foodRows = [];

export function getTodayOrders(){
  const k = todayKey();
  if(!data.dates[k]) data.dates[k] = {orders:[], nextSeq:1};
  return data.dates[k];
}

export async function updatePrice(name, val){
  data.prices[name] = parseInt(val)||0;
  await save();
  renderAll();
}

export async function updateHeight(val){
  data.height = parseInt(val)||160;
  await save();
  renderWeight();
  renderHome();
}

export function renderSummary(){
  const today = getTodayOrders();
  const counts = {};
  const priceKeys = Object.keys(data.prices);
  priceKeys.forEach(function(k){ counts[k] = 0; });
  let total = 0;
  let doneCount = 0;
  today.orders.forEach(function(o){
    if(o.done) doneCount++;
    o.foods.forEach(function(f){
      counts[f.name] = (counts[f.name]||0) + f.qty;
      total += f.qty * (data.prices[f.name]||0);
    });
  });
  let html = '';
  Object.keys(counts).forEach(function(k){
    const unit = /茶|饮|汁|汤|奶/.test(k) ? '杯' : '份';
    html += '<div class="sum-card"><div class="num">'+counts[k]+'</div><div class="lbl">'+k+'('+unit+')</div></div>';
  });
  html += '<div class="sum-card amber"><div class="num">¥'+total+'</div><div class="lbl">总金额</div></div>';
  html += '<div class="sum-card green"><div class="num">'+doneCount+'/'+today.orders.length+'</div><div class="lbl">已送达</div></div>';
  $('summaryRow').innerHTML = html;
}

export function renderOrders(){
  const today = getTodayOrders();
  const list = $('orderList');
  if(today.orders.length === 0){
    list.innerHTML = '<div class="empty"><svg width="60" height="60" viewBox="0 0 100 100"><path d="M18 42 C10 28, 8 50, 14 66 C18 76, 30 72, 32 60" fill="none" stroke="#FFC0CB" stroke-width="2"/><path d="M82 42 C90 28, 92 50, 86 66 C82 76, 70 72, 68 60" fill="none" stroke="#FFC0CB" stroke-width="2"/><ellipse cx="50" cy="58" rx="32" ry="28" fill="none" stroke="#FFC0CB" stroke-width="2"/><circle cx="40" cy="54" r="2.5" fill="#FFC0CB"/><circle cx="60" cy="54" r="2.5" fill="#FFC0CB"/><ellipse cx="50" cy="64" rx="3" ry="2" fill="#FFC0CB"/></svg><p>还没有订单汪~<br>点击上方按钮导入接龙或添加订单</p></div>';
    return;
  }
  const pending = today.orders.filter(function(o){return !o.done});
  const done = today.orders.filter(function(o){return o.done});
  pending.sort(function(a,b){ return timeSort(a.time) - timeSort(b.time); });
  const sorted = pending.concat(done);

  let html = '';
  sorted.forEach(function(o){
    const totalQty = o.foods.reduce(function(s,f){return s + (parseInt(f.qty)||0);},0);
    const isMulti = totalQty >= 2;
    let foodHtml = '';
    o.foods.forEach(function(f){
      const spice = f.spice ? '('+f.spice+')' : '';
      const multiCls = (parseInt(f.qty)||0) >= 2 ? ' multi' : '';
      foodHtml += '<span class="o-food-tag'+multiCls+'">'+f.name+' '+f.qty+f.unit+spice+'</span>';
    });
    html += '<div class="order-card'+(o.done?' done':'')+(isMulti?' multi':'')+(o.edited?' locked':'')+'" data-id="'+o.id+'">';
    html += '<div class="o-top">';
    html += '<div class="o-check'+(o.done?' checked':'')+'" onclick="toggleDone('+o.id+')">';
    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    html += '</div>';
    html += '<span class="o-time">'+o.time+'</span>';
    html += '<span class="o-seq">#'+o.seq+'</span>';
    html += '<span class="o-nick">'+escapeHtml(o.nick)+'</span>';
    if(isMulti) html += '<span class="o-multi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>多份×'+totalQty+'</span>';
    if(o.edited) html += '<span class="o-lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>已锁定</span>';
    html += '<button class="o-edit" onclick="openEditModal('+o.id+')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>';
    html += '<button class="o-del" onclick="deleteOrder('+o.id+')">&times;</button>';
    html += '</div>';
    html += '<div class="o-food">'+foodHtml+'</div>';
    html += '<div class="o-loc"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'+escapeHtml(o.location)+'</div>';
    if(o.note){
      html += '<div class="o-note"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg><span>'+escapeHtml(o.note)+'</span></div>';
    }
    html += '</div>';
  });
  list.innerHTML = html;
}

export function timeSort(t){
  if(!t || t==='未指定') return 9999;
  const p = t.split(':');
  return parseInt(p[0])*60+(parseInt(p[1])||0);
}

export async function toggleDone(id){
  const today = getTodayOrders();
  const o = today.orders.find(function(x){return x.id===id});
  if(o){
    o.done = !o.done;
    await save();
    renderAll();
    if(o.done) showToast('已标记为已送达');
    if(navigator.vibrate) navigator.vibrate(10);
  }
}

export async function deleteOrder(id){
  const today = getTodayOrders();
  today.orders = today.orders.filter(function(x){return x.id!==id});
  await save();
  renderAll();
  showToast('已删除');
}

export async function clearToday(){
  if(!confirm('确定清空今天的所有订单吗？')) return;
  data.dates[todayKey()] = {orders:[], nextSeq:1};
  await save();
  renderAll();
  showToast('已清空今日订单');
}

export async function clearAllData(){
  if(!confirm('确定清空所有数据吗？此操作不可恢复！')) return;
  if(!confirm('再次确认：将删除所有日期的订单、经期、体重数据！')) return;
  const theme = data.theme;
  const fresh = defaults();
  fresh.theme = theme;
  setData(fresh);
  await save();
  renderAll();
  showToast('已清空所有数据');
}

/* ===== Import Modal ===== */
export function openImportModal(){
  $('relayText').value = '';
  $('parsePreview').style.display = 'none';
  $('importModal').classList.add('show');
}

export function previewRelay(){
  const text = $('relayText').value.trim();
  if(!text){showToast('请先粘贴接龙文字'); return}
  const result = parseRelay(text, data.prices);
  let html = '';
  if(Object.keys(result.menu).length>0){
    html += '<div style="margin-bottom:8px"><b>菜单：</b>';
    for(const k in result.menu) html += k+' '+result.menu[k]+'元 ';
    html += '</div>';
  }
  html += '<div><b>解析到 '+result.orders.length+' 条订单：</b></div>';
  result.orders.forEach(function(o){
    const foods = o.foods.map(function(f){return f.name+' '+f.qty+f.unit+(f.spice?'('+f.spice+')':'')}).join('、');
    html += '<div style="padding:6px 0;border-bottom:1px solid #ffe0ea">';
    html += '<b>#'+o.seq+' '+escapeHtml(o.nick)+'</b> ';
    html += '<span style="color:#FF85A2">'+o.time+'</span> ';
    html += '<span style="color:#9B8B8B">'+escapeHtml(o.location)+'</span><br>';
    html += '<span style="font-size:12px">'+escapeHtml(foods)+'</span>';
    html += '</div>';
  });
  $('parseResult').innerHTML = html;
  $('parsePreview').style.display = 'block';
}

export function normNick(s){
  return String(s||'').trim().toLowerCase().replace(/\s+/g,'');
}

export function findOrderByNick(nick, onlyNonEdited){
  const today = getTodayOrders();
  let match = null;
  today.orders.forEach(function(o){
    if(onlyNonEdited && o.edited) return;
    if(normNick(o.nick) === normNick(nick)){
      if(!o.done) match = o;
      else if(!match) match = o;
    }
  });
  return match;
}

export async function confirmImport(){
  const text = $('relayText').value.trim();
  if(!text){showToast('请先粘贴接龙文字'); return}
  const result = parseRelay(text, data.prices);
  if(result.orders.length===0){showToast('未解析到有效订单'); return}
  const today = getTodayOrders();
  for(const k in result.menu){
    data.prices[k] = result.menu[k];
  }
  // 收集已“锁定”（手动修改过）的订单昵称，导入时绝不覆盖
  const lockedNicks = {};
  today.orders.forEach(function(o){ if(o.edited) lockedNicks[normNick(o.nick)] = true; });

  const newOrders = [];
  result.orders.forEach(function(o){
    o.id = today.nextSeq++;
    o.edited = false;
    o.done = false;
    // 与锁定的手动修改订单同名 → 跳过，保留手动修改版本（权重最高）
    if(lockedNicks[normNick(o.nick)]) return;
    // 与未锁定的同名订单 → 用接龙数据更新它
    const exist = findOrderByNick(o.nick, true);
    if(exist){
      exist.nick = o.nick;
      exist.foods = o.foods;
      exist.location = o.location;
      exist.time = o.time;
      if(o.note) exist.note = o.note;  // 仅当接龙有备注才覆盖，避免清空手填备注
    } else {
      newOrders.push(o);
    }
  });
  newOrders.forEach(function(o){ today.orders.push(o); });
  await save();
  closeModal('importModal');
  renderAll();
  const lockedCount = Object.keys(lockedNicks).length;
  showToast('已导入/更新 '+result.orders.length+' 条' + (lockedCount ? ('，'+lockedCount+' 条手动修改已锁定保留') : ''));
}

/* ===== Add/Edit Modal ===== */
export function smartParseOrder(){
  const raw = $('quickAddText').value.trim();
  if(!raw){showToast('先粘贴一段话吧~'); return}
  const r = parseSingleOrder(raw, data.prices);
  $('addNick').value = r.nick;
  $('addLoc').value = r.location;
  $('addTime').value = r.time;
  $('addNote').value = r.note;
  if(r.foods.length>0){
    foodRows = r.foods.map(function(f){ return {type:f.name, qty:f.qty, spice:f.spice||''}; });
  } else {
    resetFoodBuilder();
  }
  renderFoodBuilder();
  const pop = $('parsePop');
  let html = '';

  // 判断是否“单独说修改”：含修改关键词 且 昵称命中已有订单 → 更新并锁定
  const modifyKw = /(修改|更正|变更|调整|改成|换成|改为|订成|改一下|改下|更新|改单|调整单|改项|改份|改数量)/;
  pendingModifyId = null;
  let modifyHint = '';
  if(r.nick && modifyKw.test(raw)){
    const exist = findOrderByNick(r.nick, false);
    if(exist){
      pendingModifyId = exist.id;
      modifyHint = '<div class="pp-modify">⚠️ 检测到修改指令，将更新已有订单「'+escapeHtml(exist.nick)+'」并<b>锁定</b>（优先级高于接龙导入）</div>';
    }
  }

  html += '<div class="pp-row"><span class="pp-key">昵称</span><span class="pp-val">'+(r.nick||'<i style="color:#bbb">未识别</i>')+'</span></div>';
  html += '<div class="pp-row"><span class="pp-key">地点</span><span class="pp-val">'+(r.location||'<i style="color:#bbb">未识别</i>')+'</span></div>';
  html += '<div class="pp-row"><span class="pp-key">时间</span><span class="pp-val">'+(r.time||'<i style="color:#bbb">未识别</i>')+'</span></div>';
  const foodStr = r.foods.map(function(f){return f.name+' '+f.qty+f.unit+(f.spice?('('+f.spice+')'):'');}).join('，');
  html += '<div class="pp-row"><span class="pp-key">菜品</span><span class="pp-val">'+(foodStr||'<i style="color:#bbb">未识别</i>')+'</span></div>';
  html += '<div class="pp-row"><span class="pp-key">备注</span><span class="pp-val">'+(r.note||'<i style="color:#bbb">未识别</i>')+'</span></div>';
  html += modifyHint;
  pop.innerHTML = html;
  pop.style.display = 'block';
  showToast(pendingModifyId ? '将更新并锁定已有订单，请确认' : '已智能识别，请确认后保存');
}

export function openAddModal(){
  editOrderId = null;
  pendingModifyId = null;
  $('addModalTitle').textContent = '添加订单';
  $('addNick').value = '';
  $('addLoc').value = '';
  $('addTime').value = '';
  $('addNote').value = '';
  $('addFoodText').value = '';
  $('quickAddText').value = '';
  $('parsePop').style.display = 'none';
  resetFoodBuilder();
  $('addModal').classList.add('show');
}

export function openEditModal(id){
  const today = getTodayOrders();
  const o = today.orders.find(function(x){return x.id===id});
  if(!o) return;
  editOrderId = id;
  pendingModifyId = null;
  $('addModalTitle').textContent = '编辑订单';
  $('addNick').value = o.nick;
  $('addLoc').value = o.location === '未注明' ? '' : o.location;
  $('addTime').value = o.time === '未指定' ? '' : o.time;
  $('addNote').value = o.note || '';
  $('addFoodText').value = '';
  $('quickAddText').value = '';
  $('parsePop').style.display = 'none';
  foodRows = o.foods.map(function(f){ return {type:f.name, qty:f.qty, spice:f.spice||''}; });
  if(foodRows.length === 0){
    const keys = Object.keys(data.prices);
    foodRows = [{type: keys[0]||'面皮', qty:1, spice:''}];
  }
  renderFoodBuilder();
  $('addModal').classList.add('show');
}

export function resetFoodBuilder(){
  const keys = Object.keys(data.prices);
  foodRows = [{type: keys[0]||'面皮', qty:1, spice:''}];
  renderFoodBuilder();
}

export function renderFoodBuilder(){
  let keys = Object.keys(data.prices);
  if(keys.length === 0) keys = ['面皮'];
  let html = '';
  foodRows.forEach(function(r, i){
    const isTea = /茶|饮|汁|汤|奶/.test(r.type);
    html += '<div class="food-item-row">';
    html += '<select class="food-type" onchange="updateFoodRow('+i+',\'type\',this.value)">';
    keys.forEach(function(k){
      html += '<option value="'+k+'"'+(r.type===k?' selected':'')+'>'+k+'</option>';
    });
    html += '</select>';
    html += '<input type="number" class="food-qty" value="'+r.qty+'" min="1" style="width:60px" onchange="updateFoodRow('+i+',\'qty\',this.value)">';
    const showSpice = !isTea;
    html += '<select class="food-spice" style="width:80px'+(showSpice?'':';display:none')+'" onchange="updateFoodRow('+i+',\'spice\',this.value)">';
    html += '<option value=""'+(r.spice===''?' selected':'')+'>不辣</option>';
    html += '<option value="微辣"'+(r.spice==='微辣'?' selected':'')+'>微辣</option>';
    html += '<option value="中辣"'+(r.spice==='中辣'?' selected':'')+'>中辣</option>';
    html += '<option value="特辣"'+(r.spice==='特辣'?' selected':'')+'>特辣</option>';
    html += '</select>';
    if(i>0) html += '<button class="o-del" onclick="removeFoodRow('+i+')">&times;</button>';
    html += '</div>';
  });
  html += '<button class="food-add-btn" onclick="addFoodRow()">+ 加菜</button>';
  $('foodBuilder').innerHTML = html;
}

export function addFoodRow(){
  const keys = Object.keys(data.prices);
  foodRows.push({type: keys[0]||'面皮', qty:1, spice:''});
  renderFoodBuilder();
}

export function removeFoodRow(i){
  foodRows.splice(i, 1);
  renderFoodBuilder();
}

export function updateFoodRow(i, field, val){
  if(foodRows[i]){
    foodRows[i][field] = val;
    if(field==='type') renderFoodBuilder();
  }
}

export function onFoodTypeChange(sel){}

export async function confirmAdd(){
  let nick = $('addNick').value.trim();
  if(!nick) nick = '客户';
  const loc = $('addLoc').value.trim() || '未注明';
  const time = $('addTime').value.trim() || '未指定';
  const note = $('addNote').value.trim();
  const foodText = $('addFoodText').value.trim();

  const foods = [];
  foodRows.forEach(function(r){
    const unit = /茶|饮|汁|汤|奶/.test(r.type) ? '杯' : '份';
    foods.push({name:r.type, qty:parseInt(r.qty)||1, spice:r.spice, unit:unit});
  });
  if(foodText){
    const parsed = extractFoods(foodText, Object.keys(data.prices));
    parsed.forEach(function(f){ foods.push(f); });
  }
  if(foods.length===0){showToast('请至少添加一种菜品'); return}

  const today = getTodayOrders();
  let msg = '已添加订单';
  if(editOrderId !== null){
    const o = today.orders.find(function(x){return x.id===editOrderId});
    if(o){ o.nick = nick; o.foods = foods; o.location = loc; o.time = time; o.note = note; o.edited = true; }
    msg = '已更新订单（已锁定）';
  } else if(pendingModifyId !== null){
    const o2 = today.orders.find(function(x){return x.id===pendingModifyId});
    if(o2){ o2.nick = nick; o2.foods = foods; o2.location = loc; o2.time = time; o2.note = note; o2.edited = true; }
    else { today.orders.push({id:today.nextSeq++, seq:today.nextSeq-1, nick:nick, foods:foods, location:loc, time:time, note:note, done:false, edited:true}); }
    msg = '已修改并锁定（高于接龙）';
  } else {
    today.orders.push({id:today.nextSeq++, seq:today.nextSeq-1, nick:nick, foods:foods, location:loc, time:time, note:note, done:false, edited:false});
  }
  await save();
  $('quickAddText').value = '';
  $('parsePop').style.display = 'none';
  pendingModifyId = null;
  closeModal('addModal');
  renderAll();
  showToast(msg);
}
