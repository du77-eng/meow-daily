/* ===== selftest.js — 运行时自检（浏览器 + Node 双端） =====
 * 无 DOM 依赖，仅依赖 Web Crypto (globalThis.crypto.subtle) 与可选 localStorage。
 * 返回 [{name, pass, detail}]
 */
import { encryptJSON, decryptJSON } from './crypto.js';
import { MeowStorage } from './storage.js';
import { defaults } from './store.js';
import {
  parseRelay, recommendBooks, computeWaterGoal, calcBMI, restToggle
} from './util.js';

const RELAY_SAMPLE = [
  '面皮 8元',
  '肉酱米线 10元',
  '手打柠檬茶 3元',
  '1. 小喵 两份面皮 12点 3楼',
  '2. 圆圆 一份肉酱米线 一杯柠檬茶 不要辣'
].join('\n');

async function step(name, fn){
  try{
    const detail = await fn();
    return { name, pass: true, detail: detail == null ? 'OK' : String(detail) };
  }catch(e){
    return { name, pass: false, detail: String((e && e.message) || e) };
  }
}

function assert(cond, msg){
  if(!cond) throw new Error(msg || 'assertion failed');
}

export async function runSelfTest(){
  const results = [];

  /* 1. 加密往返 */
  results.push(await step('加密：对象往返', async () => {
    const src = { a: 1, b: '喵', c: [1,2,3], d: { e: true } };
    const payload = await encryptJSON(src, 'device-secret');
    const back = await decryptJSON(payload, 'device-secret');
    assert(JSON.stringify(back) === JSON.stringify(src), '往返数据不一致');
    return '对象一致';
  }));

  /* 2. 加密：密文格式 v1.salt.iv.ct */
  results.push(await step('加密：密文格式 v1.*', async () => {
    const payload = await encryptJSON({ x: 1 }, 'pw');
    const parts = String(payload).split('.');
    assert(parts.length === 4, '分段数应为 4，实际 ' + parts.length);
    assert(parts[0] === 'v1', '版本前缀应为 v1');
    assert(parts[1] && parts[2] && parts[3], 'salt/iv/ct 不得为空');
    return parts[0] + '.' + parts[1].length + '.' + parts[2].length + '.' + parts[3].length;
  }));

  /* 3. 加密：带密码往返 */
  results.push(await step('加密：带密码往返', async () => {
    const payload = await encryptJSON('__ok__', '1234||device-secret');
    const back = await decryptJSON(payload, '1234||device-secret');
    assert(back === '__ok__', '解密结果不正确');
    return '__ok__';
  }));

  /* 4. 加密：错误密码必须抛错 */
  results.push(await step('加密：错误密码抛错', async () => {
    const payload = await encryptJSON({ secret: 42 }, 'right-pw');
    let threw = false;
    try{ await decryptJSON(payload, 'wrong-pw'); }catch(e){ threw = true; }
    assert(threw, '错误密码竟然解密成功');
    return '已正确抛错';
  }));

  /* 5. 存储：往返 + 落盘为密文 */
  results.push(await step('存储：往返 + 落盘密文', async () => {
    if(!globalThis.localStorage) return '跳过（无 localStorage）';
    const KEY = '__meow_selftest__';
    const value = { hello: '喵', n: 7 };
    await MeowStorage.set(KEY, value);
    const raw = globalThis.localStorage.getItem(KEY);
    assert(raw, '未写入 localStorage');
    assert(raw.indexOf('v1.') === 0, '落盘内容不是 v1 密文');
    assert(raw.indexOf('hello') === -1, '落盘内容出现明文字段');
    const back = await MeowStorage.get(KEY);
    assert(JSON.stringify(back) === JSON.stringify(value), '读回数据不一致');
    await MeowStorage.remove(KEY);
    return '密文长度 ' + raw.length;
  }));

  /* 6. 解析：parseRelay 样例 */
  results.push(await step('解析：接龙文本', async () => {
    const r = parseRelay(RELAY_SAMPLE, null);
    assert(r && Array.isArray(r.orders), '返回结构不对');
    assert(r.menu['面皮'] === 8, '菜单未识别面皮=8');
    assert(r.orders.length === 2, '应解析出 2 条订单，实际 ' + r.orders.length);
    assert(r.orders[0].nick === '小喵', '第 1 条昵称应为 小喵，实际 ' + r.orders[0].nick);
    assert(r.orders[0].foods.length >= 1, '第 1 条未识别菜品');
    return r.orders.length + ' 单 / ' + Object.keys(r.menu).length + ' 菜';
  }));

  /* 7. 推荐：recommendBooks */
  results.push(await step('推荐：读书推荐', async () => {
    const all = [
      { title: 'A', author: 'a', category: '小说' },
      { title: 'B', author: 'b', category: '小说' },
      { title: 'C', author: 'c', category: '历史' },
      { title: 'D', author: 'd', category: '科幻' }
    ];
    const mine = [{ title: 'A', category: '小说', status: 'done' }];
    const rec = recommendBooks(all, mine);
    assert(Array.isArray(rec), '返回值应为数组');
    assert(rec.length <= 6, '最多返回 6 本');
    assert(!rec.some(b => b.title === 'A'), '不应推荐已读过的书');
    assert(rec[0] && rec[0].category === '小说', '首推应为偏好分类「小说」');
    return '推荐 ' + rec.length + ' 本，首推《' + rec[0].title + '》';
  }));

  /* 8. 计算：饮水目标 */
  results.push(await step('计算：饮水目标 60kg → 2100ml', async () => {
    const g = computeWaterGoal(60);
    assert(g === 2100, '应为 2100，实际 ' + g);
    return g + ' ml';
  }));

  /* 9. 计算：BMI */
  results.push(await step('计算：BMI 60kg/160cm ≈ 23.4', async () => {
    const b = calcBMI(60, 160);
    assert(b === 23.4, '应为 23.4，实际 ' + b);
    assert(calcBMI(60, 0) === null, '身高为 0 时应返回 null');
    return String(b);
  }));

  /* 10. 逻辑：休息打卡切换 */
  results.push(await step('逻辑：休息打卡切换', async () => {
    const s0 = { am: null, pm: null };
    const s1 = restToggle(s0, 'am');
    assert(s1 !== s0, '应返回新对象');
    assert(s0.am === null, '不得修改入参');
    assert(/^\d{2}:\d{2}:\d{2}$/.test(s1.am), 'am 应为 HH:MM:SS，实际 ' + s1.am);
    assert(s1.pm === null, 'pm 不应被改动');
    const s2 = restToggle(s1, 'am');
    assert(s2.am === null, '再次切换应撤销打卡');
    return '打卡/撤销正常';
  }));

  /* 11. 数据：默认结构键完整 */
  results.push(await step('数据：默认结构键完整', async () => {
    const d = defaults();
    const need = ['prices','dates','periods','weights','water','rest','books','height','weightUnit','theme'];
    const missing = need.filter(k => !(k in d));
    assert(missing.length === 0, '缺少字段：' + missing.join(','));
    assert(d.height === 160, 'height 默认应为 160');
    assert(d.weightUnit === 'kg', 'weightUnit 默认应为 kg');
    assert(d.theme === 'pink', 'theme 默认应为 pink');
    return need.length + ' 个键齐全';
  }));

  return results;
}
