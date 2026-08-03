/* ===== util.js — PURE helpers (no DOM, no top-level browser access) ===== */

export function todayKey(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

export function cnToNum(s){
  if(!s) return 0;
  if(/^\d+$/.test(s)) return parseInt(s);
  if(s==='半') return 30;
  if(s==='十') return 10;
  const cnMap={'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
  if(s.indexOf('十')<0){let n=0;for(let i=0;i<s.length;i++)n=n*10+(cnMap[s[i]]||0);return n}
  const idx=s.indexOf('十');
  const bf=s.substring(0,idx),af=s.substring(idx+1);
  const t=(bf?cnMap[bf[0]]:1)||1;
  const o=af?(cnMap[af[0]]||0):0;
  return t*10+o;
}

export function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
}

export function extractTime(rest){
  const cnNum = '([一二两三四五六七八九十]+)';
  const patterns = [
    {re: /(\d{1,2})\s*[:：.]\s*(\d{1,2})/, hasMin: true},                                       // 11:30
    {re: /(\d{1,2})\s*点\s*(\d{1,2})\s*分(?!\d)/, hasMin: true},                             // 11点30分
    {re: /(\d{1,2})\s*点\s*(\d{2})(?!\d)(?!\s*(?:份|杯|碗|个|盒|瓶|楼|层|分|号))/, hasMin: true}, // 11点30
    {re: /(\d{1,2})\s*点半/, hasMin: false, half: true},                                      // 11点半
    {re: /(\d{1,2})\s*点/, hasMin: false},                                                    // 11点
    {re: new RegExp(cnNum + '\\s*点\\s*' + cnNum + cnNum + '\\s*分(?![' + cnNum.slice(1,-1) + '])'), hasCnMin: true},
    {re: new RegExp(cnNum + '\\s*点半'), half: true},
    {re: new RegExp(cnNum + '\\s*点'), hasMin: false}
  ];
  for(let i=0;i<patterns.length;i++){
    const p = patterns[i];
    const tm = rest.match(p.re);
    if(tm){
      const h = cnToNum(tm[1]);
      let min = 0;
      if(p.half) min = 30;
      else if(p.hasCnMin) min = cnToNum(tm[2])*10 + cnToNum(tm[3]);
      else if(p.hasMin) min = cnToNum(tm[2]);
      if(h>=0 && h<=23 && min<=59){
        return {text: String(h).padStart(2,'0')+':'+String(min).padStart(2,'0'), raw: tm[0]};
      }
    }
  }
  return null;
}

export function extractLocation(rest){
  const locSuffix = '(?:康复(?:科|室|中心|部)?|科|室|病房|门诊|病区|大厅|中心|部|诊|房|区)';
  // 模式A: 可选科室前缀 + N楼/层 + 可选科室后缀
  const mA = rest.match(new RegExp('((?:[\\u4e00-\\u9fa5A-Za-z0-9]{0,12}'+locSuffix+'\\s*)?(?:[1-9]\\d{0,1}|[一二两三四五六七八九十]+)\\s*(?:楼|层)(?:[\\u4e00-\\u9fa5A-Za-z0-9]{0,12}'+locSuffix+')?)'));
  if(mA){
    const text = mA[1].replace(/^[送达]/,'').trim();
    const raw = mA[0].replace(/^[送达]/,'');
    return {text: text, raw: raw};
  }
  // 模式B: 纯科室/大厅等（无楼层）
  const mB = rest.match(new RegExp('([\\u4e00-\\u9fa5A-Za-z0-9]{0,12}'+locSuffix+')'));
  if(mB){
    const text = mB[1].replace(/^[送达]/,'').trim();
    const raw = mB[0].replace(/^[送达]/,'');
    return {text: text, raw: raw};
  }
  return null;
}

export function extractFoods(text, foodNames){
  const foods = [];
  const cnMap = {'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
  function toNum(s){
    if(!s) return 1;
    if(/^\d+$/.test(s)) return parseInt(s);
    if(s==='十') return 10;
    let n=0;
    for(let i=0;i<s.length;i++){if(cnMap[s[i]])n=n*10+cnMap[s[i]]}
    return n||1;
  }
  const spiceRe = '(微微辣|微辣|中辣|特辣|不辣)';
  const numRe = '(\\d+|[一二两三四五六七八九十]+)';
  const unitStr = '(?:份|杯|碗|个|盒|瓶)';
  const used = [];

  function isUsed(idx, len){
    return used.some(function(u){ return idx < u.end && idx + len > u.start; });
  }
  function inferUnit(name, raw){
    const um = raw.match(unitStr);
    if(um) return um[0];
    if(/茶|饮|汁|汤|奶/.test(name)) return '杯';
    if(/面|粉|皮|饭/.test(name)) return '份';
    return '份';
  }

  const names = (foodNames && foodNames.length > 0) ? foodNames : [];
  const prefixList = '肉酱|手打|凉拌|酸辣|麻辣|特色|招牌|秘制|手工|现做|自制|传统|川味|粤式|香辣|香浓|招牌';
  const patterns = names.map(function(name){
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const shortForm = name.replace(new RegExp('^(?:' + prefixList + ')'), '');
    let shortEscaped = shortForm !== name ? shortForm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
    if(!shortEscaped && name.length >= 4){
      const tail2 = name.substring(name.length-2);
      shortEscaped = tail2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return {name: name, regex: shortEscaped ? escaped + '|' + shortEscaped : escaped};
  });
  patterns.sort(function(a, b){ return b.regex.length - a.regex.length; });

  patterns.forEach(function(p){
    const namePat = '(?:' + p.regex + ')';
    // 先匹配「数量+单位+菜名」（如 3份肉酱米线），避免被后面的规则抢先吃掉菜名
    const reB = new RegExp(numRe + '\\s*' + unitStr + '\\s*' + namePat, 'g');
    let m;
    while((m = reB.exec(text)) !== null){
      if(isUsed(m.index, m[0].length)) continue;
      foods.push({name: p.name, qty: toNum(m[1]), spice: '', unit: inferUnit(p.name, m[0]), raw: m[0]});
      used.push({start: m.index, end: m.index + m[0].length});
    }

    const reA = new RegExp(namePat + '\\s*' + numRe + '?\\s*' + unitStr + '?\\s*[（(]?\\s*' + spiceRe + '?\\s*[)）]?', 'g');
    while((m = reA.exec(text)) !== null){
      if(m[0].length < 2) continue;
      if(isUsed(m.index, m[0].length)) continue;
      foods.push({name: p.name, qty: toNum(m[1]), spice: m[2]||'', unit: inferUnit(p.name, m[0]), raw: m[0]});
      used.push({start: m.index, end: m.index + m[0].length});
    }
  });

  return foods;
}

export function parseRelay(text, prices){
  const lines = text.split('\n').map(function(l){return l.trim()}).filter(function(l){return l});
  const menu = {};
  const orders = [];

  lines.forEach(function(line){
    if(/^\d+\s*[.、．]/.test(line)) return;
    const mm = line.match(/^(.+?)(\d+)\s*元\s*$/);
    if(mm){
      let name = mm[1].trim().replace(/[：:)）\s]+$/,'');
      if(name.indexOf('林檬茶')>=0) name = name.replace(/林檬茶/g,'柠檬茶');
      if(name.length>=2 && name.length<=10){
        menu[name] = parseInt(mm[2]);
      }
    }
  });

  let foodNames = Object.keys(menu);
  if(foodNames.length === 0){
    foodNames = prices ? Object.keys(prices) : [];
  }

  lines.forEach(function(line){
    const m = line.match(/^(\d+)\s*[.、．]\s*(.+)/);
    if(!m) return;
    const seq = parseInt(m[1]);
    let rest = m[2].trim();
    if(/[+\+＋➕]\s*(科室|时间|菜品|几楼)/.test(rest)) return;
    rest = rest.replace(/林檬茶/g,'柠檬茶');
    rest = rest.replace(/[，,、。]/g,' ').replace(/\s+/g,' ').trim();

    const timeObj = extractTime(rest);
    if(timeObj){
      rest = rest.replace(timeObj.raw,' ').replace(/\s*点\s*/g,' ').trim();
    }

    const locObj = extractLocation(rest);
    if(locObj){
      rest = rest.replace(locObj.raw,' ').replace(/\s*[送达]\s*/g,' ').trim();
    }

    const foods = extractFoods(rest, foodNames);
    // 过滤异常数量：无单位且大于10的，大概率是时间/楼层残留
    foods.forEach(function(f){
      if(f.qty > 10 && !/份|杯|碗|个|盒|瓶/.test(f.raw)) f.qty = 1;
    });
    foods.forEach(function(f){ rest = rest.replace(f.raw,' '); });
    rest = rest.replace(/\s+/g,' ').trim();

    const parts = rest.split(/\s+/).filter(function(s){return s});
    const nickParts = [];
    const noteParts = [];
    let noteStarted = false;
    const noteKeywords = ['不要','多加','多放','少放','加','不放','免','去','多','少','微辣','中辣','特辣','微微辣','不辣'];
    parts.forEach(function(w){
      if(!noteStarted && noteKeywords.some(function(k){return w.indexOf(k)===0})){
        noteStarted = true;
      }
      if(noteStarted) noteParts.push(w);
      else nickParts.push(w);
    });
    const nick = nickParts.join(' ').trim();
    const note = noteParts.join(' ').trim();

    if(foods.length > 0){
      orders.push({seq:seq, nick:nick||'未知', foods:foods, location:(locObj?locObj.text:'未注明'), time:(timeObj?timeObj.text:'未指定'), note:note, done:false});
    }
  });

  return {menu:menu, orders:orders};
}

export function cleanNick(s){
  if(!s) return '';
  return String(s).trim()
    .replace(/^[的啦呀啊呢吧哦哟嘛嘞哈~\s]+/,'')
    .replace(/[的啦呀啊呢吧哦哟嘛嘞哈~\s]+$/,'')
    .replace(/[，,、。！!？?~～\s]+/g,'')
    .trim();
}

const GENERIC_FOODS = ['凉面','凉皮','拌面','炒面','汤面','炸酱面','热干面','米粉','米线','粉丝','炒饭','盖饭','蛋炒饭','饺子','包子','馒头','花卷','八宝粥','馄饨','煎饼','肉夹馍','汉堡','三明治','寿司','沙拉','拌饭','螺蛳粉','酸辣粉','土豆粉','春卷','烧麦'];

export function parseSingleOrder(text, prices){
  text = (text||'').replace(/林檬茶/g,'柠檬茶').trim();
  const result = {nick:'', location:'', time:'', foods:[], note:''};
  if(!text) return result;
  const priceNames = prices ? Object.keys(prices) : [];

  // 0. 预处理：显式标记的昵称（昵称 xxx / 昵称：xxx / 昵称是xxx）
  // 允许“昵称 凉面指尖划过时光”这种“菜品+昵称”连写
  const nickMatch = text.match(/昵称\s*[:：是]?\s*/);
  if(nickMatch){
    const after = text.substring(nickMatch.index + nickMatch[0].length);
    const foodNames0 = priceNames;
    const generic = GENERIC_FOODS;
    let allFoods = foodNames0.concat(generic);
    allFoods = Array.from(new Set(allFoods)).sort(function(a,b){return b.length-a.length;});
    let skipLen = 0;
    for(let i=0;i<allFoods.length;i++){
      const f = allFoods[i];
      if(after.indexOf(f)===0){ skipLen = f.length; break; }
      const short = f.replace(/^(特色|招牌|秘制|手工|现做|自制|传统|川味|粤式|香辣|香浓|肉酱|手打|凉拌|酸辣|麻辣)/,'');
      if(short && short!==f && after.indexOf(short)===0){ skipLen = short.length; break; }
    }
    const rest = after.substring(skipLen);
    let nickEnd = rest.search(/[\s，,。！!？?]/);
    if(nickEnd===-1) nickEnd = rest.length;
    result.nick = cleanNick(rest.substring(0, nickEnd));
    if(result.nick){
      text = text.substring(0, nickMatch.index) + ' ' +
             (skipLen ? after.substring(0, skipLen) : '') + ' ' +
             after.substring(skipLen + nickEnd);
    } else {
      text = text.replace(nickMatch[0], ' ');
    }
  }

  // 1. 时间（复用与接龙一致的 extractTime，避免把数量当分钟，如“11点2份”→11:00）
  const tInfo = extractTime(text);
  if(tInfo){
    result.time = tInfo.text;
    text = text.replace(tInfo.raw,' ');
  }

  // 2. 地点（放到菜品之前抽，避免“9楼”被当成份数），与接龙解析顺序一致
  const locMatch = text.match(/((\d+|[一二两三四五六七八九十]+)\s*(楼|层)\s*([\u4e00-\u9fa5A-Za-z]{0,6}(?:科|室|病房|门诊|病区|大厅|部|办|中心|房|区|诊))?)/) ||
                text.match(/([\u4e00-\u9fa5A-Za-z]{1,8}(?:科|室|病房|门诊|病区|大厅|中心|部|诊))/);
  if(locMatch){
    result.location = locMatch[1].trim();
    text = text.replace(locMatch[0],' ');
  }

  // 3. 菜品 + 数量
  const foodNames = priceNames;
  const foods = extractFoods(text, foodNames);
  foods.forEach(function(f){ text = text.replace(f.raw,' '); });
  result.foods = foods;

  // 通用菜品兜底（菜单里没有的常见主食也能识别，如凉面/炒饭）
  if(foods.length === 0){
    const generic = GENERIC_FOODS;
    const gRe = new RegExp('(\\d+|[一二两三四五六七八九十]+)?\\s*(?:份|杯|碗|个|盒|瓶)?\\s*(' + generic.join('|') + ')\\s*(\\d+|[一二两三四五六七八九十]+)?\\s*(?:份|杯|碗|个|盒|瓶)?');
    const gm = text.match(gRe);
    if(gm){
      const gname = gm[2];
      const gqty = gm[1] ? cnToNum(gm[1]) : (gm[3] ? cnToNum(gm[3]) : 1);
      result.foods.push({name:gname, qty:gqty, spice:'', unit:'份', raw:gm[0]});
      text = text.replace(gm[0],' ');
    }
  }

  // 4 & 5. 拆分剩余文本 →【昵称】与【备注】
  // 规则：备注 = 加香菜/辣椒/配菜/辣度/口味等点餐定制；昵称 = 其余名字片段（如 ay、H、指尖划过时光）
  //        像 "ay" 这种不含备注关键词、也不是语气词的片段，一定是昵称
  const left = text.replace(/\[[^\]]*\]/g,'').replace(/[，,、。！!？?~～\s]+/g,' ').trim();
  const fillerClean = /(感谢|谢谢|多谢|辛苦|麻烦|价格好说|价格不贵|老板|亲|在吗|请问|想订|我要|我要订|给我来|来份|要一份|麻烦你|拜托|哈|呢|吧|啊|哦|啦|咯|嘛|呗|吃|点的|点吃|帮我|帮忙|昵称|修改|改成|改为|换成|更正|变更|调整|改下|改一下|更新|的|啥的|之类|啥子|等等|就行|即可|好了|嗯|诶|哟|哎|或者|以及|和|与|还有|也|再|就|都|给|让|帮|请|点半)/g;
  const noteKw = /(加|多加|少加|添|放|来点|不要|少|去|别|免|换|多放|少放)(了)?|香菜|辣椒|葱|蒜|姜|醋|糖|盐|胡椒|花生|芝麻|配菜|鸡蛋|榨菜|青菜|木耳|豆腐|海带|萝卜|藕|笋|辣|麻|酸|甜|咸|冰|汁|汤|口味|味道|微辣|中辣|特辣|重辣|超辣|清淡|原味|免辣|不辣|少糖|多糖|少冰|多冰|常温|温热|凉|烫|辣一点|淡一点|加点|多加|少放|备注|要求|做淡|做辣/;
  const tokens = left.split(/\s+/).filter(function(t){return t.length>0});
  const noteParts = [], nickParts = [];
  tokens.forEach(function(t){
    const c = t.replace(fillerClean,' ').replace(/\s+/g,' ').trim();
    if(!c) return;
    if(noteKw.test(c)) noteParts.push(c);
    else nickParts.push(c);
  });
  if(!result.nick && nickParts.length>0){
    result.nick = cleanNick(nickParts.join(' '));
  }
  let note = noteParts.join(' ');
  note = note.replace(fillerClean,' ').trim();
  // 去掉孤零零的数量词，如“一份”“两杯”“3个”
  note = note.replace(/(^|\s)([一二两三四五六七八九十]|\d+)\s*(份|杯|碗|个|盒|瓶)(?=\s|$)/g,' ').trim();
  note = note.replace(/\s{2,}/g,' ').trim();
  result.note = note;
  return result;
}

/**
 * 纯推荐算法：按用户「已读/在读」书籍的分类权重，从内置书库挑选未拥有的书。
 * @param {Array<{title:string,author:string,category:string,desc:string}>} allBooks
 * @param {Array<{title:string,category:string,status:string}>} userBooks
 * @returns {Array} 最多 6 本（原始对象引用，便于调用方取 index）
 */
export function recommendBooks(allBooks, userBooks){
  const lib = Array.isArray(allBooks) ? allBooks : [];
  const mine = Array.isArray(userBooks) ? userBooks : [];
  if(mine.length === 0) return lib.slice(0, 6);

  const owned = {};
  const weights = {};
  mine.forEach(function(b){
    if(!b) return;
    owned[b.title] = true;
    if(b.status === 'done' || b.status === 'reading'){
      weights[b.category] = (weights[b.category] || 0) + 1;
    }
  });

  const candidates = lib.filter(function(b){ return b && !owned[b.title]; });
  // 稳定排序：分类权重降序，权重相同保持书库原顺序
  const decorated = candidates.map(function(b, i){ return {b: b, i: i, w: weights[b.category] || 0}; });
  decorated.sort(function(x, y){ return y.w - x.w || x.i - y.i; });
  return decorated.slice(0, 6).map(function(d){ return d.b; });
}

/** 每日推荐饮水量（ml）：体重(kg) × 35 */
export function computeWaterGoal(weightKg){
  return Math.round(weightKg * 35);
}

/** BMI，保留 1 位小数，返回 Number 或 null */
export function calcBMI(weightKg, heightCm){
  if(!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return Number((weightKg / (m * m)).toFixed(1));
}

/**
 * 纯函数：切换上午/下午休息打卡状态，返回新对象
 * @param {{am:(string|null), pm:(string|null)}} state
 * @param {'am'|'pm'} period
 */
export function restToggle(state, period){
  const cur = state || {am:null, pm:null};
  const next = {am: cur.am || null, pm: cur.pm || null};
  if(next[period]){
    next[period] = null;
  } else {
    const now = new Date();
    next[period] = String(now.getHours()).padStart(2,'0') + ':' +
                   String(now.getMinutes()).padStart(2,'0') + ':' +
                   String(now.getSeconds()).padStart(2,'0');
  }
  return next;
}
