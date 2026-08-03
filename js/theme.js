/* ===== theme.js — color themes ===== */
import { $, showToast } from './ui.js';
import { data, save } from './store.js';

export const THEMES = {
  pink:{name:'樱花粉',bg:'#FFF0F5',pink:'#FF85A2','pink-light':'#FFE4EC','pink-bg':'#FFF5F8','pink-dark':'#E55D7E','pink-deep':'#D43D66',border:'#FFE0EA','text-mute':'#9B8B8B','text-light':'#C0B0B0'},
  mint:{name:'薄荷绿',bg:'#F0FAF5',pink:'#5ECCA0','pink-light':'#D8F5E8','pink-bg':'#F0FAF5','pink-dark':'#3AA67E','pink-deep':'#2E8B6F',border:'#D0F0E0','text-mute':'#7A9B8F','text-light':'#A8C5BA'},
  sky:{name:'天空蓝',bg:'#F0F7FF',pink:'#5BA8F5','pink-light':'#D6EBFF','pink-bg':'#F0F7FF','pink-dark':'#3D7EC8','pink-deep':'#2C6FB0',border:'#D0E4F7','text-mute':'#7A95B0','text-light':'#A8BDD4'},
  lavender:{name:'薰衣草紫',bg:'#F6F3FF',pink:'#A78BFA','pink-light':'#EDE9FE','pink-bg':'#F6F3FF','pink-dark':'#7C5CDB','pink-deep':'#6B4FC7',border:'#E0D8F5','text-mute':'#8A82A8','text-light':'#B5AEC9'},
  cream:{name:'奶油黄',bg:'#FFFBF0',pink:'#F5B85C','pink-light':'#FFF0D6','pink-bg':'#FFFBF0','pink-dark':'#D49A3F','pink-deep':'#B57F2E',border:'#F5E8CC','text-mute':'#A89574','text-light':'#CDBFA3'},
  white:{name:'极简白',bg:'#F8F9FA',pink:'#9CA3AF','pink-light':'#F3F4F6','pink-bg':'#FFFFFF','pink-dark':'#6B7280','pink-deep':'#5B6169',border:'#E5E7EB','text-mute':'#8B939E','text-light':'#BDC4CC'}
};

export function applyTheme(name){
  const t = THEMES[name] || THEMES.pink;
  const r = document.documentElement;
  r.style.setProperty('--bg', t.bg);
  r.style.setProperty('--pink', t.pink);
  r.style.setProperty('--pink-light', t['pink-light']);
  r.style.setProperty('--pink-bg', t['pink-bg']);
  r.style.setProperty('--pink-dark', t['pink-dark']);
  r.style.setProperty('--pink-deep', t['pink-deep']);
  r.style.setProperty('--border', t.border);
  r.style.setProperty('--text-mute', t['text-mute']);
  r.style.setProperty('--text-light', t['text-light']);
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', t.pink);
}

export async function switchTheme(name){
  if(!THEMES[name]) return;
  data.theme = name;
  await save();
  applyTheme(name);
  renderThemeGrid();
  showToast('已切换到「'+THEMES[name].name+'」主题');
}

export function renderThemeGrid(){
  const grid = $('themeGrid');
  if(!grid) return;
  let html = '';
  for(const key in THEMES){
    const t = THEMES[key];
    html += '<div class="theme-item '+(data.theme===key?'active':'')+'" onclick="switchTheme(\''+key+'\')">';
    html += '<div class="theme-dot" style="background:'+t.pink+'"></div>';
    html += '<span class="theme-name">'+t.name+'</span>';
    html += '</div>';
  }
  grid.innerHTML = html;
}
