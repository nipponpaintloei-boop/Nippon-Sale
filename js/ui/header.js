/* NIPPON SALE — js/ui/header.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= header: month selector, search, notification bell ================= */
function renderHdrMonthSelect(){
  const sel = document.getElementById('hdrMonthSelect');
  if(!sel) return;
  const mSet = new Set();
  SALES.forEach(s=>mSet.add(monthKey(s.date)));
  mSet.add(monthKey(todayISO()));
  const months = Array.from(mSet).sort().reverse();
  if(sel.dataset.built !== String(months.length)+months[0]){
    sel.innerHTML = months.map(m=>`<option value="${m}">${formatMonthTH(m)}</option>`).join('');
    sel.dataset.built = String(months.length)+months[0];
  }
  sel.value = months.includes(DASH_MONTH) ? DASH_MONTH : months[0];
}
document.addEventListener('DOMContentLoaded', ()=>{
  const sel = document.getElementById('hdrMonthSelect');
  if(sel){
    sel.addEventListener('change', ()=>{
      DASH_MONTH = sel.value;
      renderDashboard();
    });
  }
});

function hdrSearchResultRow(s){
  const meta = [formatDateTH(s.date), s.customerName||'ไม่ระบุลูกค้า', '฿'+fmt(s.total)].join(' · ');
  return `<div class="hdr-search-result" data-searchid="${s.id}">
    <div class="r-name">${escapeHtml(s.name)}${s.size?(' · '+escapeHtml(s.size)):''}</div>
    <div class="r-meta">${escapeHtml(meta)}</div>
  </div>`;
}
document.addEventListener('DOMContentLoaded', ()=>{
  const input = document.getElementById('hdrSearchInput');
  const results = document.getElementById('hdrSearchResults');
  if(!input || !results) return;
  input.addEventListener('input', ()=>{
    const q = input.value.trim().toLowerCase();
    if(q.length < 2){ results.classList.remove('show'); results.innerHTML=''; return; }
    const matches = SALES.filter(s=>
      (s.name||'').toLowerCase().includes(q) ||
      (s.customerName||'').toLowerCase().includes(q) ||
      (s.customerPhone||'').toLowerCase().includes(q) ||
      (s.billId||'').toLowerCase().includes(q)
    ).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
    results.innerHTML = matches.length
      ? matches.map(hdrSearchResultRow).join('')
      : '<div class="hdr-search-empty">ไม่พบรายการที่ตรงกัน</div>';
    results.classList.add('show');
    results.querySelectorAll('[data-searchid]').forEach(el=>{
      el.addEventListener('click', ()=>{
        results.classList.remove('show');
        input.value='';
        editSaleEntry(el.dataset.searchid);
      });
    });
  });
  document.addEventListener('click', (e)=>{
    if(!e.target.closest('#hdrSearchWrap')) results.classList.remove('show');
  });
});

function renderHdrBell(){
  const btn = document.getElementById('bellBtn');
  const pop = document.getElementById('bellPop');
  if(!btn || !pop) return;
  const items = computeActionItems();
  btn.classList.toggle('has-alerts', items.length>0);
  pop.innerHTML = `<div class="bp-title">รายการที่ต้องติดตาม</div>` +
    (items.length ? items.map(actionItemHtml).join('') : '<div class="bp-empty">${ICONS.party} ไม่มีรายการแจ้งเตือนตอนนี้</div>');
  pop.querySelectorAll('[data-gotoview]').forEach(el=>el.addEventListener('click', ()=>{
    pop.classList.remove('show');
    switchToView(el.dataset.gotoview);
  }));
}
document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('bellBtn');
  const pop = document.getElementById('bellPop');
  if(!btn || !pop) return;
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    pop.classList.toggle('show');
  });
  document.addEventListener('click', (e)=>{
    if(!e.target.closest('#bellPop') && !e.target.closest('#bellBtn')) pop.classList.remove('show');
  });
});

