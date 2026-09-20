/* NIPPON SALE — js/features/bill-grouping.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= bill grouping helper ================= */
function renderBillGroupedRows(rows, opts={}){
  const mode = opts.mode || 'simple'; // 'simple' = single ✕ delete, 'full' = ✎ edit + × delete
  const groups = [];
  rows.forEach(s=>{
    const last = groups[groups.length-1];
    if(s.billId && last && last.billId===s.billId){ last.items.push(s); }
    else groups.push({billId:s.billId||null, items:[s]});
  });
  const rowHtml = s => {
    const delAttr = s.seed ? '' : (mode==='full' ? `data-swipedel="${s.id}"` : `data-swipedel="${s.id}"`);
    const stampHtml = `<div class="row-stamp">${saleDateTimeLabel(s)}</div>`;
    const inner = `
    <div class="list-row" ${delAttr}>
      <div class="info">
        <div class="name">${s.name} ${s.size} ${s.base}</div>
        <div class="sub">${s.employee ? ICONS.user+' '+s.employee+' \u00b7 ' : ''}${s.colorCode ? 'รหัสสี '+s.colorCode+' · ' : ''}x${s.qty}</div>
      </div>
      <div class="amt-wrap">
        <div class="amt">${fmt(s.total)}฿</div>
        ${stampHtml}
      </div>
      ${s.seed ? '' : (mode==='full'
        ? `<button class="del-btn" data-edit="${s.id}" title="แก้ไข">${ICONS.edit}</button><button class="del-btn" data-delete="${s.id}" title="ลบ">${ICONS.close}</button>`
        : `<button class="del-btn" data-del="${s.id}">${ICONS.close}</button>`)}
    </div>`;
    return s.seed ? inner : `<div class="swipe-wrap"><div class="swipe-bg">ปัดเพื่อลบ ${ICONS.close}</div>${inner}</div>`;
  };
  return groups.map(g=>{
    const rowsHtml = g.items.map(rowHtml).join('');
    if(g.items.length>1){
      const gTotal = g.items.reduce((a,s)=>a+s.total,0);
      return `<div class="bill-group"><div class="bill-ghead"><span>บิลเดียว · ${g.items.length} รายการ</span><span>${fmt(gTotal)}฿</span></div>${rowsHtml}</div>`;
    }
    return rowsHtml;
  }).join('');
}

/* swipe-to-delete: attach to any container holding .swipe-wrap > .list-row rows.
   onDelete(id) is called with the row's data-swipedel value when swiped past threshold. */
function enableSwipeToDelete(container, onDelete){
  if(!container || container._swipeBound) return;
  container._swipeBound = true;
  let active = null, startX = 0, startY = 0, dx = 0, locked = null;
  const THRESHOLD = 64;
  container.addEventListener('pointerdown', (e)=>{
    const row = e.target.closest('.swipe-wrap > .list-row');
    if(!row || e.target.closest('.del-btn')) return;
    active = row; startX = e.clientX; startY = e.clientY; dx = 0; locked = null;
    row.classList.add('dragging');
  });
  container.addEventListener('pointermove', (e)=>{
    if(!active) return;
    const mdx = e.clientX - startX, mdy = e.clientY - startY;
    if(locked===null){
      if(Math.abs(mdx) < 6 && Math.abs(mdy) < 6) return;
      locked = Math.abs(mdx) > Math.abs(mdy) ? 'x' : 'y';
      if(locked==='y'){ active.classList.remove('dragging'); active = null; return; }
    }
    if(locked !== 'x') return;
    dx = Math.min(0, mdx);
    active.style.transform = `translateX(${dx}px)`;
  });
  const finish = ()=>{
    if(!active) return;
    active.classList.remove('dragging');
    if(dx < -THRESHOLD){
      const id = active.dataset.swipedel;
      active.style.transform = `translateX(-100%)`;
      active.style.opacity = '0';
      setTimeout(()=>{ if(onDelete) onDelete(id); }, 160);
    } else {
      active.style.transform = '';
    }
    active = null; dx = 0; locked = null;
  };
  container.addEventListener('pointerup', finish);
  container.addEventListener('pointercancel', finish);
  container.addEventListener('pointerleave', (e)=>{ if(active && e.target===active) finish(); });
}

/* ================= recent list (today, entry tab) ================= */
function renderRecent(){
  const today = todayISO();
  const todays = getDaySales(today).slice().reverse();
  const box = document.getElementById('recentList');
  if(!todays.length){ box.innerHTML = '<div class="empty">ยังไม่มีรายการขายวันนี้</div>'; return; }
  box.innerHTML = renderBillGroupedRows(todays, {mode:'simple'});
  box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', ()=>deleteSaleEntry(b.dataset.del)));
  enableSwipeToDelete(box, (id)=>deleteSaleEntry(id));
}

