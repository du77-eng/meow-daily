/* ===== features/books.js — 读书 ===== */
import { $, showToast, closeModal } from '../ui.js';
import { data, save } from '../store.js';
import { todayKey, escapeHtml, recommendBooks } from '../util.js';

/* ---- module state ---- */
export let currentBookTab = 'unread';

/* 兼容单作者字符串 / 多作者数组，统一返回作者数组 */
export function libAuthors(b){
  if(!b) return [];
  let a = (b.authors !== undefined) ? b.authors : b.author;
  if(Array.isArray(a)) return a.filter(function(x){ return x !== undefined && x !== null && x !== ''; });
  if(a === undefined || a === null || a === '') return [];
  return [a];
}

/* 规范化书名：去空格、去标点（含《》、中英文标点），转小写，便于模糊匹配 */
function normalizeTitle(t){
  return (t||'').toLowerCase()
    .replace(/\s+/g,'')
    .replace(/[《》「」“”‘’'",，。、：:！!？?（）()\[\]【】\-_—]/g,'');
}

/* 书名 -> {title, authors:[...], category, desc} 索引（多作者合并去重） */
let _titleIndex = null;
function getTitleIndex(){
  if(_titleIndex) return _titleIndex;
  const map = new Map();
  BUILT_IN_LIBRARY.forEach(function(b){
    const key = normalizeTitle(b.title);
    if(!key) return;
    const authors = libAuthors(b);
    if(map.has(key)){
      const cur = map.get(key);
      authors.forEach(function(a){ if(cur.authors.indexOf(a) === -1) cur.authors.push(a); });
    } else {
      map.set(key, { key:key, title:b.title, authors:authors.slice(), category:b.category, desc:b.desc });
    }
  });
  _titleIndex = map;
  return map;
}

/* 输入书名（支持模糊/子串/带《》/带空格），返回匹配的书及其全部作者 */
export function searchBooksByTitle(query){
  const q = normalizeTitle(query);
  const idx = getTitleIndex();
  if(!q) return [];
  const res = [];
  idx.forEach(function(v){
    if(v.key.indexOf(q) !== -1) res.push(v);
  });
  return res.slice(0, 20);
}

/* ===== Books Library ===== */
export const BOOK_CATEGORIES = ['小说','文学','历史','商业','自我成长','心理学','科幻','悬疑','传记','美食','综合'];
export const BUILT_IN_LIBRARY = [
  {title:'活着',author:'余华',category:'小说',desc:'一个人一生的苦难与坚韧，余华代表作。'},
  {title:'背叛',author:'豆豆',category:'小说',desc:'豆豆三部曲之一，商战与人性博弈的深度刻画。'},
  {title:'遥远的救世主',author:'豆豆',category:'小说',desc:'豆豆三部曲之二（电视剧《天道》原著），关于文化属性与强势思维。'},
  {title:'天幕红尘',author:'豆豆',category:'小说',desc:'豆豆三部曲之三，政治与哲学交织的宏大叙事。'},
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
  {title:'社会心理学',authors:['戴维·迈尔斯','琼·特韦奇'],category:'心理学',desc:'系统理解人与人相互影响的学科。'},
  {title:'爱的艺术',author:'艾里希·弗洛姆',category:'心理学',desc:'爱是一种需要学习的能力。'},
  {title:'亲密关系',authors:['罗兰·米勒','丹尼尔·珀尔曼'],category:'心理学',desc:'科学视角下的爱情与婚姻。'},
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
  {title:'第五项修炼',author:'彼得·圣吉',category:'综合',desc:'学习型组织的艺术与实务。'},
  /* —— 常见热门书补充（覆盖市面上常见的中外小说 / 网文 / 经典名著 / 畅销书）—— */
  /* 中国现当代小说 */
  {title:'盗墓笔记',author:'南派三叔',category:'小说',desc:'人气盗墓探险小说，南派三叔代表作。'},
  {title:'鬼吹灯',author:'天下霸唱',category:'小说',desc:'摸金校尉的盗墓传奇。'},
  {title:'诛仙',author:'萧鼎',category:'小说',desc:'仙侠小说经典之作。'},
  {title:'庆余年',author:'猫腻',category:'小说',desc:'穿越权谋题材热门网文。'},
  {title:'琅琊榜',author:'海宴',category:'小说',desc:'架空朝堂权谋与兄弟情义。'},
  {title:'甄嬛传',author:'流潋紫',category:'小说',desc:'后宫生存与权斗的经典之作。'},
  {title:'长安十二时辰',author:'马伯庸',category:'小说',desc:'一天之内拯救长安的紧凑悬疑。'},
  {title:'古董局中局',author:'马伯庸',category:'小说',desc:'古董江湖里的真假谜局。'},
  {title:'显微镜下的大明',author:'马伯庸',category:'小说',desc:'从民间档案看明代基层社会。'},
  {title:'风起陇西',author:'马伯庸',category:'小说',desc:'三国背景下的谍战故事。'},
  {title:'繁花',author:'金宇澄',category:'小说',desc:'沪上百年市井风情画卷。'},
  {title:'尘埃落定',author:'阿来',category:'小说',desc:'土司家族兴衰的藏族史诗。'},
  {title:'穆斯林的葬礼',author:'霍达',category:'小说',desc:'一个穆斯林家族三代人的命运。'},
  {title:'红高粱家族',author:'莫言',category:'小说',desc:'高密东北乡的野性与抗争。'},
  {title:'蛙',author:'莫言',category:'小说',desc:'乡村妇产科医生视角下的计生时代。'},
  {title:'生死疲劳',author:'莫言',category:'小说',desc:'六道轮回中的土地改革史诗。'},
  {title:'丰乳肥臀',author:'莫言',category:'小说',desc:'母亲与时代洪流中的家族命运。'},
  {title:'废都',author:'贾平凹',category:'小说',desc:'西京文人精神困境的世情小说。'},
  {title:'秦腔',author:'贾平凹',category:'小说',desc:'清风街变迁里的乡土中国。'},
  {title:'四世同堂',author:'老舍',category:'小说',desc:'抗战北平胡同里的一家三代。'},
  {title:'骆驼祥子',author:'老舍',category:'小说',desc:'旧北京车夫的奋斗与沉沦。'},
  {title:'茶馆',author:'老舍',category:'小说',desc:'三幕话剧看尽世态炎凉。'},
  {title:'子夜',author:'茅盾',category:'小说',desc:'民族资本家的末路悲歌。'},
  {title:'家',author:'巴金',category:'小说',desc:'封建大家庭里青年的觉醒与反抗。'},
  {title:'春',author:'巴金',category:'小说',desc:'《激流三部曲》之二。'},
  {title:'秋',author:'巴金',category:'小说',desc:'《激流三部曲》之三。'},
  {title:'雷雨',author:'曹禺',category:'小说',desc:'中国现代话剧的经典悲剧。'},
  {title:'边城',author:'沈从文',category:'小说',desc:'湘西小镇纯美而哀伤的爱情。'},
  {title:'呐喊',author:'鲁迅',category:'小说',desc:'唤醒国民灵魂的小说集。'},
  {title:'彷徨',author:'鲁迅',category:'小说',desc:'五四落潮期知识分子的苦闷。'},
  {title:'故事新编',author:'鲁迅',category:'小说',desc:'以神话历史为底色的讽刺小说。'},
  {title:'阿Q正传',author:'鲁迅',category:'小说',desc:'精神胜利法的国民性写照。'},
  {title:'朝花夕拾',author:'鲁迅',category:'文学',desc:'鲁迅的回忆性散文集。'},
  {title:'倾城之恋',author:'张爱玲',category:'小说',desc:'乱世里精明又苍凉的爱情。'},
  {title:'红玫瑰与白玫瑰',author:'张爱玲',category:'小说',desc:'男人心里那两朵玫瑰的隐喻。'},
  {title:'半生缘',author:'张爱玲',category:'小说',desc:'错过与遗憾的都市爱情。'},
  {title:'金锁记',author:'张爱玲',category:'小说',desc:'被金钱与情欲扭曲的人性。'},
  {title:'小团圆',author:'张爱玲',category:'小说',desc:'张爱玲自传色彩的长篇。'},
  {title:'妻妾成群',author:'苏童',category:'小说',desc:'封建宅院里妻妾的争斗与悲凉。'},
  {title:'许三观卖血记',author:'余华',category:'小说',desc:'一个小人物用卖血撑起的家庭。'},
  {title:'兄弟',author:'余华',category:'小说',desc:'两兄弟横跨两个时代的命运。'},
  {title:'第七天',author:'余华',category:'小说',desc:'死后七天里的荒诞与温情。'},
  {title:'在细雨中呼喊',author:'余华',category:'小说',desc:'记忆里破碎的童年与村庄。'},
  {title:'长恨歌',author:'王安忆',category:'小说',desc:'上海小姐王琦瑶的浮沉一生。'},
  {title:'一句顶一万句',author:'刘震云',category:'小说',desc:'中国人说话与孤独的千年追问。'},
  {title:'一地鸡毛',author:'刘震云',category:'小说',desc:'机关小职员琐碎又真实的日常。'},
  {title:'我不是潘金莲',author:'刘震云',category:'小说',desc:'一个女人二十年的告状执念。'},
  {title:'芙蓉镇',author:'古华',category:'小说',desc:'小镇风云里的时代伤痕。'},
  /* 东野圭吾系列 */
  {title:'放学后',author:'东野圭吾',category:'悬疑',desc:'东野圭吾出道获奖作。'},
  {title:'秘密',author:'东野圭吾',category:'悬疑',desc:'灵魂错位下的亲情与爱。'},
  {title:'圣女的救济',author:'东野圭吾',category:'悬疑',desc:'汤川学系列，极致的犯罪手法。'},
  {title:'新参者',author:'东野圭吾',category:'悬疑',desc:'人情味十足的加贺探案。'},
  {title:'红手指',author:'东野圭吾',category:'悬疑',desc:'加贺系列，家庭与罪案的纠葛。'},
  {title:'假面饭店',author:'东野圭吾',category:'悬疑',desc:'饭店里的连环命案与潜伏。'},
  {title:'祈祷落幕时',author:'东野圭吾',category:'悬疑',desc:'加贺系列温情收尾之作。'},
  {title:'幻夜',author:'东野圭吾',category:'悬疑',desc:'欲望与美貌织成的黑夜。'},
  {title:'流星之绊',author:'东野圭吾',category:'悬疑',desc:'三兄妹追凶下的身世谜团。'},
  {title:'湖畔',author:'东野圭吾',category:'悬疑',desc:'为了孩子升学而掩盖的命案。'},
  {title:'时生',author:'东野圭吾',category:'悬疑',desc:'穿越时空父子情，温情科幻。'},
  {title:'拉普拉斯的魔女',author:'东野圭吾',category:'悬疑',desc:'科学与命运交织的连环案。'},
  {title:'沉默的巡游',author:'东野圭吾',category:'悬疑',desc:'加贺系列，为正义而沉默的复仇。'},
  /* 外国文学经典 */
  {title:'灿烂千阳',author:'卡勒德·胡赛尼',category:'小说',desc:'阿富汗女性苦难与相互救赎。'},
  {title:'群山回唱',author:'卡勒德·胡赛尼',category:'小说',desc:'跨越世代的家庭与离别。'},
  {title:'1Q84',author:'村上春树',category:'小说',desc:'两个平行世界里的爱与逃亡。'},
  {title:'海边的卡夫卡',author:'村上春树',category:'小说',desc:'少年离家与命运预言的奇幻之旅。'},
  {title:'且听风吟',author:'村上春树',category:'小说',desc:'村上春树的青春处女作。'},
  {title:'我的名字叫红',author:'奥尔罕·帕慕克',category:'小说',desc:'细密画里的谋杀与文明碰撞。'},
  {title:'雪',author:'奥尔罕·帕慕克',category:'小说',desc:'土耳其边城的政治与信仰风暴。'},
  {title:'伊斯坦布尔',author:'奥尔罕·帕慕克',category:'传记',desc:'一座城市的忧郁记忆。'},
  {title:'岛上书店',author:'加布瑞埃拉·泽文',category:'小说',desc:'一间书店与一个人重新拥抱生活。'},
  {title:'一个人的朝圣',author:'蕾秋·乔伊斯',category:'小说',desc:'87天徒步路上的自我救赎。'},
  {title:'摆渡人',author:'克莱儿·麦克福尔',category:'小说',desc:'灵魂摆渡与跨越生死的爱。'},
  {title:'无声告白',author:'伍绮诗',category:'小说',desc:'一个华人家庭的秘密与期待。'},
  {title:'房思琪的初恋乐园',author:'林奕含',category:'小说',desc:'以文学之名包裹的伤痛叙事。'},
  {title:'82年生的金智英',author:'赵南柱',category:'小说',desc:'一位普通韩国女性的日常困境。'},
  {title:'正常人',author:'萨莉·鲁尼',category:'小说',desc:'两个年轻人纠缠又疏离的成长。'},
  {title:'克拉拉与太阳',author:'石黑一雄',category:'小说',desc:'人工智能少女的温柔注视。'},
  {title:'长日将尽',author:'石黑一雄',category:'小说',desc:'一位管家的尊严与错失的一生。'},
  {title:'远山淡影',author:'石黑一雄',category:'小说',desc:'记忆与创伤交织的漂泊故事。'},
  {title:'别让我走',author:'石黑一雄',category:'小说',desc:'克隆人学校的温情与宿命。'},
  {title:'失明症漫记',author:'若泽·萨拉马戈',category:'小说',desc:'一场失明瘟疫下的人性荒原。'},
  {title:'复明症漫记',author:'若泽·萨拉马戈',category:'小说',desc:'《失明症漫记》续作，荒诞政治寓言。'},
  {title:'修道院纪事',author:'若泽·萨拉马戈',category:'小说',desc:'飞行梦想与宗教审讯的奇幻史。'},
  {title:'飘',author:'玛格丽特·米切尔',category:'小说',desc:'乱世佳人斯嘉丽的倔强与爱情。'},
  {title:'傲慢与偏见',author:'简·奥斯汀',category:'小说',desc:'婚姻与门第间的机智幽默。'},
  {title:'理智与情感',author:'简·奥斯汀',category:'小说',desc:'两姐妹的婚恋观与抉择。'},
  {title:'简爱',author:'夏洛蒂·勃朗特',category:'小说',desc:'平凡家庭教师对尊严与爱的追求。'},
  {title:'呼啸山庄',author:'艾米莉·勃朗特',category:'小说',desc:'爱恨交织的荒原史诗。'},
  {title:'红与黑',author:'司汤达',category:'小说',desc:'野心青年于连的浮沉。'},
  {title:'包法利夫人',author:'福楼拜',category:'小说',desc:'婚外情与虚荣酿成的悲剧。'},
  {title:'悲惨世界',author:'雨果',category:'小说',desc:'冉阿让的救赎与时代的苦难。'},
  {title:'巴黎圣母院',author:'雨果',category:'小说',desc:'钟楼怪人卡西莫多的宿命。'},
  {title:'基督山伯爵',author:'大仲马',category:'小说',desc:'越狱复仇的快意恩仇史诗。'},
  {title:'三个火枪手',author:'大仲马',category:'小说',desc:'“人人为我，我为人人”的侠义。'},
  {title:'茶花女',author:'小仲马',category:'小说',desc:'交际花与门第之爱的悲剧。'},
  {title:'战争与和平',author:'列夫·托尔斯泰',category:'小说',desc:'拿破仑战争下的俄国众生。'},
  {title:'安娜·卡列尼娜',author:'列夫·托尔斯泰',category:'小说',desc:'出轨与道德困境的巨著。'},
  {title:'复活',author:'列夫·托尔斯泰',category:'小说',desc:'贵族忏悔与精神重生。'},
  {title:'罪与罚',author:'陀思妥耶夫斯基',category:'小说',desc:'杀人后的良知审判。'},
  {title:'卡拉马佐夫兄弟',author:'陀思妥耶夫斯基',category:'小说',desc:'弑父疑云里的信仰与理性。'},
  {title:'白痴',author:'陀思妥耶夫斯基',category:'小说',desc:'纯粹善良者在污浊人间的悲剧。'},
  {title:'浮士德',author:'歌德',category:'文学',desc:'灵魂与魔鬼契约的永恒追问。'},
  {title:'少年维特之烦恼',author:'歌德',category:'文学',desc:'青春爱而不得的哀歌。'},
  {title:'约翰·克利斯朵夫',author:'罗曼·罗兰',category:'文学',desc:'音乐家不屈的一生与英雄气质。'},
  {title:'变形记',author:'卡夫卡',category:'小说',desc:'一觉醒来变成甲虫的荒诞寓言。'},
  {title:'审判',author:'卡夫卡',category:'小说',desc:'在无形法庭前的无助与恐惧。'},
  {title:'城堡',author:'卡夫卡',category:'小说',desc:'永远抵达不了权力中心的困局。'},
  {title:'不能承受的生命之轻',author:'米兰·昆德拉',category:'小说',desc:'轻与重、灵与肉的哲学小说。'},
  {title:'玩笑',author:'米兰·昆德拉',category:'小说',desc:'政治玩笑下的人生反讽。'},
  {title:'瓦尔登湖',author:'梭罗',category:'文学',desc:'湖畔独居简朴生活的哲思。'},
  {title:'老人与海',author:'海明威',category:'小说',desc:'人可以被毁灭，不能被打败。'},
  {title:'麦田里的守望者',author:'塞林格',category:'小说',desc:'叛逆少年的迷茫与纯真。'},
  {title:'堂吉诃德',author:'塞万提斯',category:'小说',desc:'荒诞骑士的理想主义冒险。'},
  {title:'神曲',author:'但丁',category:'文学',desc:'穿越地狱炼狱天堂的史诗。'},
  {title:'动物农场',author:'乔治·奥威尔',category:'小说',desc:'一则关于权力异化的政治寓言。'},
  /* 历史 / 商业 / 自我成长 / 心理 常见畅销书 */
  {title:'未来简史',author:'尤瓦尔·赫拉利',category:'历史',desc:'智人之后，算法与数据将主宰什么。'},
  {title:'今日简史',author:'尤瓦尔·赫拉利',category:'历史',desc:'21世纪人类面对的当下议题。'},
  {title:'全球通史',author:'斯塔夫里阿诺斯',category:'历史',desc:'从史前到21世纪的世界全景。'},
  {title:'大秦帝国',author:'孙皓晖',category:'历史',desc:'秦国由弱到强的崛起史诗。'},
  {title:'饥饿的盛世',author:'张宏杰',category:'历史',desc:'乾隆时代的繁华与隐忧。'},
  {title:'中国大历史',author:'黄仁宇',category:'历史',desc:'以宏观视角重读中国历史。'},
  {title:'穷爸爸富爸爸',author:'罗伯特·清崎',category:'商业',desc:'财商启蒙，资产与负债的区分。'},
  {title:'小狗钱钱',author:'博多·舍费尔',category:'商业',desc:'用童话讲透理财入门。'},
  {title:'财富自由之路',author:'李笑来',category:'商业',desc:'关于个人成长与财富的认知升级。'},
  {title:'黑天鹅',author:'塔勒布',category:'商业',desc:'罕见事件如何重塑世界。'},
  {title:'反脆弱',author:'塔勒布',category:'商业',desc:'在不确定中获益的能力。'},
  {title:'随机漫步的傻瓜',author:'塔勒布',category:'商业',desc:'运气、随机性与金融错觉。'},
  {title:'社会性动物',author:'埃利奥特·阿伦森',category:'心理学',desc:'社会心理学必读入门。'},
  {title:'少有人走的路',author:'斯科特·派克',category:'心理学',desc:'自律与爱的心理成长经典。'},
  {title:'正念的奇迹',author:'一行禅师',category:'心理学',desc:'在当下每一刻安住自己。'},
  {title:'活出生命的意义',author:'维克多·弗兰克尔',category:'心理学',desc:'意义疗法，苦难中的希望。'},
  {title:'人性的弱点',author:'卡耐基',category:'自我成长',desc:'为人处世与沟通的实用经典。'},
  {title:'卓有成效的管理者',author:'德鲁克',category:'商业',desc:'知识工作者的自我管理指南。'},
  {title:'管理的实践',author:'德鲁克',category:'商业',desc:'现代管理学奠基之作。'},
  /* 科幻 / 悬疑 补充 */
  {title:'球状闪电',author:'刘慈欣',category:'科幻',desc:'宏世界里关于闪电与量子幽灵。'},
  {title:'超新星纪元',author:'刘慈欣',category:'科幻',desc:'大人们消失后儿童执掌的世界。'},
  {title:'基地',author:'阿西莫夫',category:'科幻',desc:'银河帝国的兴衰与心理史学。'},
  {title:'东方快车谋杀案',author:'阿加莎·克里斯蒂',category:'悬疑',desc:'封闭车厢里的完美谋杀。'},
  {title:'尼罗河上的惨案',author:'阿加莎·克里斯蒂',category:'悬疑',desc:'游轮上的谋杀与波洛推理。'},
  {title:'达芬奇密码',author:'丹·布朗',category:'悬疑',desc:'宗教符号背后的惊天秘密。'},
  {title:'天使与魔鬼',author:'丹·布朗',category:'悬疑',desc:'科学与梵蒂冈的生死较量。'},
  {title:'失落的秘符',author:'丹·布朗',category:'悬疑',desc:'华盛顿符号迷宫里的阴谋。'},
  {title:'数字城堡',author:'丹·布朗',category:'悬疑',desc:'密码学与国安局的暗战。'},
  /* 传记补充 */
  {title:'曾国藩传',author:'张宏杰',category:'传记',desc:'晚清名臣的修身与功业。'},
  {title:'朱元璋传',author:'吴晗',category:'传记',desc:'从乞丐到帝王的明太祖。'},
  {title:'毛泽东传',author:'罗斯·特里尔',category:'传记',desc:'理解近现代中国的关键人物。'},
  {title:'人类群星闪耀时',author:'茨威格',category:'传记',desc:'十四个决定历史的瞬间。'},
  {title:'昨日的世界',author:'茨威格',category:'传记',desc:'欧洲黄金时代的回忆与挽歌。'},
  {title:'梵高传',author:'欧文·斯通',category:'传记',desc:'燃烧一生的天才画家。'},
  /* —— 以下为真实合著书，用于演示「同一书名多位作者，可逐个选择」—— */
  {title:'心理学与生活',authors:['菲利普·津巴多','理查德·格里格'],category:'心理学',desc:'经典心理学入门教材，津巴多与格里格合著。'},
  {title:'算法导论',authors:['托马斯·科尔曼','查尔斯·雷瑟森','罗纳德·李维斯特','克利福德·斯坦'],category:'综合',desc:'计算机经典教材，四位作者合著（CLRS）。'},
  {title:'计算机程序的构造和解释',authors:['哈罗德·艾伯森','杰拉德·萨斯曼'],category:'综合',desc:'经典计算机教材（SICP），两位作者合著。'},
  {title:'重构',authors:['马丁·福勒','肯特·贝克'],category:'综合',desc:'改善既有代码的设计，福勒与贝克等合著。'}
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
  libSel.innerHTML = '<option value="">-- 手动输入 --</option>' + BUILT_IN_LIBRARY.map(function(b,i){return '<option value="'+i+'">'+escapeHtml(b.title)+' · '+escapeHtml(libAuthors(b).join('、'))+'</option>';}).join('');
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
  const sug = $('bookAuthorSuggest');
  if(sug){ sug.style.display = 'none'; sug.innerHTML = ''; }
  modal.classList.add('show');
}

export function fillBookFromLibrary(val){
  if(!val) return;
  const idx = parseInt(val,10);
  const b = BUILT_IN_LIBRARY[idx];
  if(!b) return;
  $('bookTitle').value = b.title;
  $('bookAuthor').value = '';
  $('bookCategory').value = b.category;
  updateAuthorSuggestions();
}

/* 输入书名后，从书库匹配作者并展示可点选的候选（一本书多位作者则全部列出） */
export function updateAuthorSuggestions(){
  const sug = $('bookAuthorSuggest');
  if(!sug) return;
  const titleEl = $('bookTitle');
  const q = (titleEl && titleEl.value || '').trim();
  if(!q){
    sug.style.display = 'none';
    sug.innerHTML = '';
    return;
  }
  const matches = searchBooksByTitle(q);
  if(matches.length === 0){
    sug.style.display = 'none';
    sug.innerHTML = '';
    return;
  }
  let html = '<div class="sug-hint">📚 书库里找到这些作者，点一下就能填：</div>';
  matches.forEach(function(m){
    html += '<div class="sug-group">';
    html += '<div class="sug-title">《'+escapeHtml(m.title)+'》</div>';
    html += '<div class="sug-authors">';
    m.authors.forEach(function(a){
      html += '<button type="button" class="sug-chip" data-author="'+escapeHtml(a)+'" data-title="'+escapeHtml(m.title)+'" data-cat="'+escapeHtml(m.category)+'">'+escapeHtml(a)+'</button>';
    });
    html += '</div>';
    html += '</div>';
  });
  sug.innerHTML = html;
  sug.style.display = 'block';
  Array.prototype.forEach.call(sug.querySelectorAll('.sug-chip'), function(chip){
    chip.addEventListener('click', function(){
      pickAuthor(chip.getAttribute('data-author'), chip.getAttribute('data-title'), chip.getAttribute('data-cat'));
    });
  });
}

/* 点选作者：自动填好作者，并把书名补全为书库里的标准书名、带出分类 */
export function pickAuthor(author, title, category){
  const titleEl = $('bookTitle');
  const authorEl = $('bookAuthor');
  const catEl = $('bookCategory');
  if(titleEl) titleEl.value = title;
  if(authorEl) authorEl.value = author;
  if(catEl && category) catEl.value = category;
  const sug = $('bookAuthorSuggest');
  if(sug){ sug.style.display = 'none'; sug.innerHTML = ''; }
  showToast('已选作者：'+author);
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
