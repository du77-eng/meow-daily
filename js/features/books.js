/* ===== features/books.js — 读书 ===== */
import { $, showToast, closeModal } from '../ui.js';
import { data, save } from '../store.js';
import { todayKey, escapeHtml, recommendBooks } from '../util.js';

/* ---- module state ---- */
export let currentBookTab = 'unread';

/* ===== Books Library ===== */
export const BOOK_CATEGORIES = ['小说','文学','历史','商业','自我成长','心理学','科幻','悬疑','传记','美食','综合'];
export const BUILT_IN_LIBRARY = [
  {title:'活着',author:'余华',category:'小说',desc:'一个人一生的苦难与坚韧，余华代表作。'},
  {title:'围城',author:'钱钟书',category:'小说',desc:'婚姻是一座围城，城外的人想进去，城里的人想出来。'},
  {title:'平凡的世界',author:'路遥',category:'小说',desc:'黄土高原上普通人的奋斗史诗。'},
  {title:'白鹿原',author:'陈忠实',category:'小说',desc:'渭河平原五十年的家族恩怨与时代变迁。'},
  {title:'百年孤独',author:'加西亚·马尔克斯',category:'小说',desc:'布恩迪亚家族七代人的魔幻传奇。'},
  {title:'追风筝的人',author:'卡勒德·胡赛尼',category:'小说',desc:'关于背叛、救赎与友谊的动人故事。'},
  {title:'解忧杂货店',author:'东野圭吾',category:'小说',desc:'一间杂货店连接过去与未来，治愈人心。'},
  {title:'挪威的森林',author:'村上春树',category:'小说',desc:'青春、爱情与失落的日式物语。'},
  {title:'霍乱时期的爱情',author:'马尔克斯',category:'小说',desc:'一段跨越半个多世纪的爱情史诗。'},
  {title:'白夜行',author:'东野圭吾',category:'小说',desc:'绝望的爱与缜密的悬疑交织。'},
  {title:'小王子',author:'圣埃克苏佩里',category:'小说',desc:'写给大人的童话，关于爱与责任。'},
  {title:'了不起的盖茨比',author:'菲茨杰拉德',category:'小说',desc:'美国梦的华丽与幻灭。'},
  {title:'我们仨',author:'杨绛',category:'文学',desc:'一家三口六十三年相守相助的温暖回忆。'},
  {title:'目送',author:'龙应台',category:'文学',desc:'关于亲情、离别与成长的散文集。'},
  {title:'撒哈拉的故事',author:'三毛',category:'文学',desc:'三毛在撒哈拉沙漠的浪漫与自由。'},
  {title:'皮囊',author:'蔡崇达',category:'文学',desc:'一部直面故乡与自我的散文集。'},
  {title:'人间失格',author:'太宰治',category:'文学',desc:'一个“丧失为人资格”者的内心独白。'},
  {title:'月亮与六便士',author:'毛姆',category:'文学',desc:'理想与现实的永恒拉扯。'},
  {title:'杀死一只知更鸟',author:'哈珀·李',category:'文学',desc:'关于正义与教养的成长小说。'},
  {title:'悉达多',author:'黑塞',category:'文学',desc:'一个人寻找自我与觉悟的诗意旅程。'},
  {title:'万历十五年',author:'黄仁宇',category:'历史',desc:'从一年看大明帝国的命运转折。'},
  {title:'明朝那些事儿',author:'当年明月',category:'历史',desc:'轻松读懂大明三百年兴衰。'},
  {title:'人类简史',author:'尤瓦尔·赫拉利',category:'历史',desc:'从认知革命到科学革命的人类大历史。'},
  {title:'枪炮、病菌与钢铁',author:'贾雷德·戴蒙德',category:'历史',desc:'人类社会发展差异的地理与环境解释。'},
  {title:'叫魂',author:'孔飞力',category:'历史',desc:'乾隆年间一场妖术恐慌背后的帝国危机。'},
  {title:'中国历代政治得失',author:'钱穆',category:'历史',desc:'纵观汉唐宋明清的政治制度得失。'},
  {title:'乡土中国',author:'费孝通',category:'历史',desc:'理解中国传统基层社会的经典。'},
  {title:'从0到1',author:'彼得·蒂尔',category:'商业',desc:'创业不是竞争，而是创造垄断。'},
  {title:'精益创业',author:'埃里克·里斯',category:'商业',desc:'快速试错、持续验证的创业方法论。'},
  {title:'影响力',author:'罗伯特·西奥迪尼',category:'商业',desc:'六大心理原则如何影响人们说“是”。'},
  {title:'原则',author:'瑞·达利欧',category:'商业',desc:'极度透明、极度开放的生活与工作原则。'},
  {title:'穷查理宝典',author:'查理·芒格',category:'商业',desc:'巴菲特搭档芒格的智慧箴言录。'},
  {title:'基业长青',author:'吉姆·柯林斯',category:'商业',desc:'伟大企业为何能长盛不衰。'},
  {title:'定位',author:'特劳特',category:'商业',desc:'如何在用户心智中占据一席之地。'},
  {title:'长尾理论',author:'克里斯·安德森',category:'商业',desc:'小众市场如何汇聚成巨大商机。'},
  {title:'思考，快与慢',author:'丹尼尔·卡尼曼',category:'商业',desc:'人类思维的双系统与决策偏差。'},
  {title:'奈飞文化手册',author:'帕蒂·麦考德',category:'商业',desc:'自由与责任的企业文化范本。'},
  {title:'非暴力沟通',author:'马歇尔·卢森堡',category:'自我成长',desc:'用爱与理解化解冲突的沟通方式。'},
  {title:'被讨厌的勇气',author:'岸见一郎',category:'自我成长',desc:'阿德勒心理学教你摆脱人际烦恼。'},
  {title:'高效能人士的七个习惯',author:'史蒂芬·柯维',category:'自我成长',desc:'从依赖到独立再到互赖的成长框架。'},
  {title:'原子习惯',author:'詹姆斯·克利尔',category:'自我成长',desc:'每天进步1%，一年后强大37倍。'},
  {title:'刻意练习',author:'安德斯·艾利克森',category:'自我成长',desc:'天才并非天赋，而是正确练习的结果。'},
  {title:'心流',author:'米哈里·契克森米哈赖',category:'自我成长',desc:'全神贯注时最幸福的体验。'},
  {title:'深度工作',author:'卡尔·纽波特',category:'自我成长',desc:'在碎片化时代保持专注的能力。'},
  {title:'认知觉醒',author:'周岭',category:'自我成长',desc:'开启自我改变的原动力。'},
  {title:'好好学习',author:'成甲',category:'自我成长',desc:'个人知识管理精进指南。'},
  {title:'终身成长',author:'卡罗尔·德韦克',category:'自我成长',desc:'成长型思维与固定型思维的区别。'},
  {title:'蛤蟆先生去看心理医生',author:'罗伯特·戴博德',category:'心理学',desc:'一场温暖的心理咨询入门之旅。'},
  {title:'也许你该找个人聊聊',author:'洛莉·戈特利布',category:'心理学',desc:'心理咨询师与来访者的真实故事。'},
  {title:'自卑与超越',author:'阿德勒',category:'心理学',desc:'理解自卑感与人生意义。'},
  {title:'乌合之众',author:'古斯塔夫·勒庞',category:'心理学',desc:'群体心理与集体行为的经典剖析。'},
  {title:'社会心理学',author:'戴维·迈尔斯',category:'心理学',desc:'系统理解人与人相互影响的学科。'},
  {title:'爱的艺术',author:'艾里希·弗洛姆',category:'心理学',desc:'爱是一种需要学习的能力。'},
  {title:'亲密关系',author:'罗兰·米勒',category:'心理学',desc:'科学视角下的爱情与婚姻。'},
  {title:'情绪勒索',author:'苏珊·福沃德',category:'心理学',desc:'识别并摆脱情感操控。'},
  {title:'三体',author:'刘慈欣',category:'科幻',desc:'中国科幻巅峰，地球文明的宇宙命运。'},
  {title:'流浪地球',author:'刘慈欣',category:'科幻',desc:'带着地球去流浪的宏大想象。'},
  {title:'银河帝国',author:'阿西莫夫',category:'科幻',desc:'跨越两万年的银河文明兴衰史。'},
  {title:'1984',author:'乔治·奥威尔',category:'科幻',desc:'反乌托邦经典，令人不寒而栗的预言。'},
  {title:'美丽新世界',author:'赫胥黎',category:'科幻',desc:'娱乐至死与科技控制下的未来。'},
  {title:'沙丘',author:'弗兰克·赫伯特',category:'科幻',desc:'沙漠星球上的政治、宗教与命运。'},
  {title:'仿生人会梦见电子羊吗',author:'菲利普·迪克',category:'科幻',desc:'《银翼杀手》原著，人与仿生人的边界。'},
  {title:'华氏451',author:'雷·布拉德伯里',category:'科幻',desc:'一个焚烧书籍的黑暗世界。'},
  {title:'海伯利安',author:'丹·西蒙斯',category:'科幻',desc:'七名朝圣者与神秘时空的史诗。'},
  {title:'福尔摩斯探案集',author:'柯南·道尔',category:'悬疑',desc:'推理小说之父的经典案件。'},
  {title:'无人生还',author:'阿加莎·克里斯蒂',category:'悬疑',desc:'暴风雪山庄模式的鼻祖。'},
  {title:'嫌疑人X的献身',author:'东野圭吾',category:'悬疑',desc:'数学天才为爱设下的完美骗局。'},
  {title:'恶意',author:'东野圭吾',category:'悬疑',desc:'令人脊背发凉的动机之谜。'},
  {title:'沉默的羔羊',author:'托马斯·哈里斯',category:'悬疑',desc:'心理惊悚与犯罪侧写的经典。'},
  {title:'史蒂夫·乔布斯传',author:'沃尔特·艾萨克森',category:'传记',desc:'乔布斯真实、复杂而极致的一生。'},
  {title:'富兰克林自传',author:'本杰明·富兰克林',category:'传记',desc:'美国开国元勋的自律与成长。'},
  {title:'邓小平时代',author:'傅高义',category:'传记',desc:'理解中国改革开放的重要传记。'},
  {title:'苏东坡传',author:'林语堂',category:'传记',desc:'千古文人的豁达与才情。'},
  {title:'随园食单',author:'袁枚',category:'美食',desc:'清代美食家的饮食笔记。'},
  {title:'暴食江湖',author:'焦桐',category:'美食',desc:'台湾作家的美食散文，烟火气十足。'},
  {title:'鱼翅与花椒',author:'扶霞',category:'美食',desc:'一个英国女孩的中国美食冒险。'},
  {title:'人间滋味',author:'汪曾祺',category:'美食',desc:'汪曾祺笔下的食物与人生。'},
  {title:'食物与厨艺',author:'哈洛德·马基',category:'美食',desc:'科学理解烹饪与食材。'},
  {title:'如何阅读一本书',author:'莫提默·艾德勒',category:'综合',desc:'系统提升阅读能力的经典指南。'},
  {title:'纳瓦尔宝典',author:'埃里克·乔根森',category:'综合',desc:'关于财富与幸福的智慧合集。'},
  {title:'达·芬奇传',author:'沃尔特·艾萨克森',category:'综合',desc:'跨界天才的好奇心与创造力。'},
  {title:'第五项修炼',author:'彼得·圣吉',category:'综合',desc:'学习型组织的艺术与实务。'}
];

export function switchBookTab(tab){
  currentBookTab = tab;
  document.querySelectorAll('.book-tab').forEach(function(b){b.classList.remove('active');});
  const id = 'bookTab' + tab.charAt(0).toUpperCase() + tab.slice(1);
  const el = $(id);
  if(el) el.classList.add('active');
  renderBookList();
}

export function renderBook(){
  if(!data.books) data.books = [];
  let unread=0, reading=0, done=0;
  data.books.forEach(function(b){
    if(b.status === 'unread') unread++;
    else if(b.status === 'reading') reading++;
    else if(b.status === 'done') done++;
  });
  const unEl=$('bookUnreadNum');
  const rEl=$('bookReadingNum');
  const dEl=$('bookDoneNum');
  if(unEl) unEl.textContent = unread;
  if(rEl) rEl.textContent = reading;
  if(dEl) dEl.textContent = done;
  const titleEl=$('bookHeroTitle');
  const subEl=$('bookHeroSub');
  if(titleEl){
    if(reading > 0) titleEl.textContent = '正在读 '+reading+' 本书喵~';
    else if(done > 0) titleEl.textContent = '已经读完 '+done+' 本书啦~';
    else titleEl.textContent = '读一本好书喵~';
  }
  if(subEl) subEl.textContent = '未读 '+unread+' · 在读 '+reading+' · 已读 '+done;
  renderBookList();
  renderBookRecommendations();
}

export function renderBookList(){
  const box = $('bookList');
  if(!box) return;
  const list = (data.books || []).filter(function(b){return b.status === currentBookTab;});
  list.sort(function(a,b){
    if(currentBookTab === 'unread') return b.added < a.added ? -1 : 1;
    if(currentBookTab === 'reading') return (b.progress||0) - (a.progress||0);
    if(currentBookTab === 'done'){
      if(a.finished && b.finished) return b.finished < a.finished ? -1 : 1;
      if(a.finished) return -1;
      if(b.finished) return 1;
      return b.added < a.added ? -1 : 1;
    }
    return 0;
  });
  if(list.length === 0){
    const emptyMsg = {'unread':'还没有未读的书喵~ 去添加几本吧','reading':'没有在读书籍，挑一本开始吧','done':'还没有读完的书，继续加油喵~'};
    box.innerHTML = '<div class="book-empty">'+emptyMsg[currentBookTab]+'</div>';
    return;
  }
  const statusMap = {unread:'未读',reading:'在读',done:'已读'};
  let html = '';
  list.forEach(function(b){
    html += '<div class="book-item">';
    html += '<div class="book-cover">📚</div>';
    html += '<div class="book-info">';
    html += '<div class="book-title">'+escapeHtml(b.title)+'</div>';
    html += '<div class="book-author">'+(b.author ? escapeHtml(b.author) : '未知作者')+'</div>';
    html += '<div class="book-meta">';
    html += '<span class="book-status '+b.status+'">'+statusMap[b.status]+'</span>';
    html += '<span class="book-cat">'+escapeHtml(b.category||'综合')+'</span>';
    if(b.rating) html += '<span style="font-size:12px;color:#FFB800">'+('★'.repeat(b.rating))+'</span>';
    html += '</div>';
    if(b.status === 'reading' && b.progress){
      html += '<div class="book-progress"><div style="width:'+b.progress+'%"></div></div>';
    }
    if(b.note){
      html += '<div class="book-note">'+escapeHtml(b.note)+'</div>';
    }
    html += '<div class="book-actions">';
    if(b.status === 'unread'){
      html += '<button class="primary" onclick="startReadingBook('+b.id+')">开始读</button>';
    } else if(b.status === 'reading'){
      html += '<button class="primary" onclick="finishBook('+b.id+')">标记读完</button>';
      html += '<button onclick="editBook('+b.id+')">更新进度</button>';
    } else {
      html += '<button onclick="editBook('+b.id+')">写笔记</button>';
    }
    html += '<button onclick="editBook('+b.id+')">编辑</button>';
    html += '<button class="danger" onclick="deleteBook('+b.id+')">删除</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  });
  box.innerHTML = html;
}

export async function startReadingBook(id){
  const b = (data.books||[]).find(function(x){return x.id === id;});
  if(!b) return;
  b.status = 'reading';
  b.progress = b.progress || 0;
  b.started = todayKey();
  await save();
  renderBook();
  showToast('📖 开始阅读《'+b.title+'》');
}

export async function finishBook(id){
  const b = (data.books||[]).find(function(x){return x.id === id;});
  if(!b) return;
  b.status = 'done';
  b.progress = 100;
  b.finished = todayKey();
  await save();
  renderBook();
  showToast('✅ 读完《'+b.title+'》啦~');
}

export async function deleteBook(id){
  if(!confirm('确定删除这本书吗？')) return;
  data.books = (data.books||[]).filter(function(x){return x.id !== id;});
  await save();
  renderBook();
  showToast('已删除');
}

export function openBookModal(id){
  const modal = $('bookModal');
  const titleEl = $('bookModalTitle');
  const idEl = $('bookEditId');
  const libSel = $('bookLibrarySelect');
  const catSel = $('bookCategory');
  catSel.innerHTML = BOOK_CATEGORIES.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
  libSel.innerHTML = '<option value="">-- 手动输入 --</option>' + BUILT_IN_LIBRARY.map(function(b,i){return '<option value="'+i+'">'+escapeHtml(b.title)+' · '+escapeHtml(b.author)+'</option>';}).join('');
  if(id){
    const b = (data.books||[]).find(function(x){return x.id === id;});
    if(!b){ showToast('书籍不存在'); return; }
    titleEl.textContent = '编辑书籍';
    idEl.value = b.id;
    $('bookTitle').value = b.title || '';
    $('bookAuthor').value = b.author || '';
    catSel.value = b.category || BOOK_CATEGORIES[0];
    $('bookStatus').value = b.status || 'unread';
    $('bookProgress').value = b.progress || 0;
    $('bookRating').value = b.rating || 0;
    $('bookNote').value = b.note || '';
    libSel.value = '';
  } else {
    titleEl.textContent = '添加书籍';
    idEl.value = '';
    $('bookTitle').value = '';
    $('bookAuthor').value = '';
    catSel.value = BOOK_CATEGORIES[0];
    $('bookStatus').value = 'unread';
    $('bookProgress').value = 0;
    $('bookRating').value = 0;
    $('bookNote').value = '';
    libSel.value = '';
  }
  modal.classList.add('show');
}

export function fillBookFromLibrary(val){
  if(!val) return;
  const idx = parseInt(val,10);
  const b = BUILT_IN_LIBRARY[idx];
  if(!b) return;
  $('bookTitle').value = b.title;
  $('bookAuthor').value = b.author;
  $('bookCategory').value = b.category;
}

export async function saveBook(){
  const idIn = $('bookEditId').value;
  const title = $('bookTitle').value.trim();
  const author = $('bookAuthor').value.trim();
  const category = $('bookCategory').value;
  const status = $('bookStatus').value;
  let progress = parseInt($('bookProgress').value,10) || 0;
  let rating = parseInt($('bookRating').value,10) || 0;
  const note = $('bookNote').value.trim();
  if(!title){ showToast('请输入书名'); return; }
  if(progress < 0) progress = 0; if(progress > 100) progress = 100;
  if(rating < 0) rating = 0; if(rating > 5) rating = 5;
  const now = todayKey();
  if(idIn){
    const id = parseInt(idIn,10);
    const b = (data.books||[]).find(function(x){return x.id === id;});
    if(!b){ showToast('书籍不存在'); return; }
    b.title = title; b.author = author; b.category = category; b.status = status;
    b.progress = progress; b.rating = rating; b.note = note;
    if(status === 'reading' && !b.started) b.started = now;
    if(status === 'done'){ b.progress = 100; if(!b.finished) b.finished = now; }
  } else {
    const newBook = {
      id: Date.now(),
      title: title,
      author: author,
      category: category,
      status: status,
      progress: progress,
      rating: rating,
      note: note,
      added: now
    };
    if(status === 'reading') newBook.started = now;
    if(status === 'done'){ newBook.progress = 100; newBook.finished = now; }
    if(!data.books) data.books = [];
    data.books.push(newBook);
  }
  await save();
  closeModal('bookModal');
  renderBook();
  showToast('已保存');
}

export function editBook(id){ openBookModal(id); }

export function renderBookRecommendations(){
  const box = $('bookRecommendList');
  if(!box) return;
  const recs = getBookRecommendations();
  if(recs.length === 0){
    box.innerHTML = '<div class="book-empty">还没有足够数据推荐，去读几本或添加一些书吧~</div>';
    return;
  }
  let html = '';
  recs.forEach(function(r){
    html += '<div class="book-rec-item">';
    html += '<div class="book-cover" style="width:40px;height:56px;font-size:16px">✨</div>';
    html += '<div class="book-rec-info">';
    html += '<div class="book-rec-title">'+escapeHtml(r.title)+'</div>';
    html += '<div class="book-rec-author">'+escapeHtml(r.author)+' · '+escapeHtml(r.category)+'</div>';
    html += '<div class="book-rec-desc">'+escapeHtml(r.desc)+'</div>';
    html += '<div class="book-rec-actions">';
    html += '<button onclick="addRecommendedBook('+r._idx+')">加入未读</button>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  });
  box.innerHTML = html;
}

/** 与旧版行为一致：没有书 / 没有已读或在读的书时不推荐；否则走 util.recommendBooks */
export function getBookRecommendations(){
  if(!data.books || data.books.length === 0) return [];
  const hasSignal = data.books.some(function(b){ return b.status === 'done' || b.status === 'reading'; });
  if(!hasSignal) return [];
  return recommendBooks(BUILT_IN_LIBRARY, data.books).map(function(b){
    return {_idx: BUILT_IN_LIBRARY.indexOf(b), title:b.title, author:b.author, category:b.category, desc:b.desc};
  });
}

export async function addRecommendedBook(idx){
  const b = BUILT_IN_LIBRARY[idx];
  if(!b) return;
  if(!data.books) data.books = [];
  const exists = data.books.some(function(x){return x.title === b.title;});
  if(exists){ showToast('这本书已经在你的书单里啦'); return; }
  data.books.push({
    id: Date.now(),
    title: b.title,
    author: b.author,
    category: b.category,
    status: 'unread',
    progress: 0,
    rating: 0,
    note: '',
    added: todayKey()
  });
  await save();
  renderBook();
  showToast('《'+b.title+'》已加入未读');
}

/* renderRecommend 别名，保持接口一致 */
export const renderRecommend = renderBookRecommendations;
