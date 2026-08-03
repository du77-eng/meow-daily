/* ===== ui.js — shared DOM helpers ===== */

export const $ = (id) => document.getElementById(id);

export function showToast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function(){ t.classList.remove('show') }, 2000);
}

export function closeModal(id){
  const el = document.getElementById(id);
  if(el) el.classList.remove('show');
}

export function openModal(id){
  const el = document.getElementById(id);
  if(el) el.classList.add('show');
}

export function confirmBox(msg){ return confirm(msg); }

export function promptBox(msg, def){ return prompt(msg, def); }
