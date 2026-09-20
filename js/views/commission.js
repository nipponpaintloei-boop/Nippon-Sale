/* NIPPON SALE — js/views/commission.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= commission calculator view ================= */
const PC_SELECT_OPTIONS = [1,2,3,4,5];
function buildPcSelectMenu(){
  const menu = document.getElementById('pcSelectMenu');
  if(!menu) return;
  menu.innerHTML = PC_SELECT_OPTIONS.map(n=>`
    <div class="pc-select-option" data-val="${n}" role="option">
      <span>${n} คน</span>
      <svg class="pc-select-check" width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5L5 9.5L13 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
  `).join('');
  menu.querySelectorAll('.pc-select-option').forEach(opt=>{
    opt.addEventListener('click', ()=>{
      const v = Number(opt.dataset.val);
      syncPcSelectDisplay(v);
      document.getElementById('commHeadcount').dispatchEvent(new Event('input', {bubbles:true}));
      setTimeout(closePcSelectMenu, 150);
    });
  });
}
function syncPcSelectDisplay(v){
  const hidden = document.getElementById('commHeadcount');
  if(hidden) hidden.value = v;
  const label = document.getElementById('pcSelectValue');
  if(label) label.textContent = v+' คน';
  document.querySelectorAll('#pcSelectMenu .pc-select-option').forEach(opt=>{
    opt.classList.toggle('active', Number(opt.dataset.val)===v);
  });
}
function openPcSelectMenu(){
  const wrap = document.getElementById('pcSelectWrap');
  if(wrap) wrap.classList.add('open');
  const trg = document.getElementById('pcSelectTrigger');
  if(trg) trg.setAttribute('aria-expanded','true');
}
function closePcSelectMenu(){
  const wrap = document.getElementById('pcSelectWrap');
  if(wrap) wrap.classList.remove('open');
  const trg = document.getElementById('pcSelectTrigger');
  if(trg) trg.setAttribute('aria-expanded','false');
}
document.getElementById('pcSelectTrigger').addEventListener('click', (e)=>{
  e.stopPropagation();
  const wrap = document.getElementById('pcSelectWrap');
  wrap.classList.contains('open') ? closePcSelectMenu() : openPcSelectMenu();
});
document.addEventListener('click', (e)=>{
  const wrap = document.getElementById('pcSelectWrap');
  if(wrap && !wrap.contains(e.target)) closePcSelectMenu();
});
buildPcSelectMenu();

