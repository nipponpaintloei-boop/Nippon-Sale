/* NIPPON SALE — js/views/history.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= history view ================= */
document.querySelectorAll('#view-history .stbtn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#view-history .stbtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.hist;
    document.getElementById('histDayPanel').style.display = mode==='day' ? 'block':'none';
    document.getElementById('histMonthPanel').style.display = mode==='month' ? 'block':'none';
  });
});
document.getElementById('histDate').value = todayISO();
document.getElementById('histDate').addEventListener('change', renderHistDay);

function renderHistDay(){
  const date = document.getElementById('histDate').value || todayISO();
  const rows = getDaySales(date).slice().sort((a,b)=> (a.id>b.id?1:-1));
  const total = rows.reduce((a,s)=>a+s.total,0);
  document.getElementById('histDayTotal').textContent = fmt(total);
  document.getElementById('histDayCount').textContent = rows.length;
  const box = document.getElementById('histDayList');
  if(!rows.length){ box.innerHTML = '<div class="empty">ไม่มีรายการขายในวันที่เลือก</div>'; return; }
  box.innerHTML = renderBillGroupedRows(rows, {mode:'full'});
  box.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editSaleEntry(b.dataset.edit)));
  box.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteSaleEntry(b.dataset.delete)));
  enableSwipeToDelete(box, (id)=>deleteSaleEntry(id));
}

function renderHistMonthOptions(){
  const sel = document.getElementById('histMonth');
  const mSet = new Set();
  SALES.forEach(s=>mSet.add(monthKey(s.date)));
  const months = Array.from(mSet).sort().reverse();
  const prevVal = sel.value;
  sel.innerHTML = months.map(m=>`<option value="${m}">${formatMonthTH(m)}</option>`).join('');
  sel.value = months.includes(prevVal) ? prevVal : (months.includes(monthKey(todayISO())) ? monthKey(todayISO()) : months[0]);
}
document.getElementById('histMonth').addEventListener('change', renderHistMonth);

function renderHistMonth(){
  const mKey=document.getElementById('histMonth').value; if(!mKey) return;
  const q=(document.getElementById('histMonthSearch').value||'').trim().toLowerCase();
  const sort=document.getElementById('histMonthSort').value;
  let rows=getMonthSales(mKey);
  if(q) rows=rows.filter(s=>`${s.name} ${s.sku||''} ${s.colorCode||''}`.toLowerCase().includes(q));
  if(sort==='dateAsc') rows.sort((a,b)=>a.date.localeCompare(b.date));
  else if(sort==='amountDesc') rows.sort((a,b)=>b.total-a.total);
  else if(sort==='amountAsc') rows.sort((a,b)=>a.total-b.total);
  else rows.sort((a,b)=>b.date.localeCompare(a.date));
  const allMonth=getMonthSales(mKey);
  const monthTotalAmt=allMonth.reduce((a,s)=>a+s.total,0);
  document.getElementById('histMonthTotal').textContent=fmt(monthTotalAmt);
  document.getElementById('histMonthCount').textContent=allMonth.length;
  const hTarget=getMonthTarget(mKey);
  document.getElementById('histMonthTargetVal').textContent=fmt(hTarget);
  document.getElementById('histMonthTargetPct').textContent=(hTarget>0?(monthTotalAmt/hTarget*100).toFixed(1):'0')+'%';
  const box=document.getElementById('histMonthList'); if(!rows.length){box.innerHTML='<div class="empty">ไม่พบรายการตามตัวกรอง</div>';return;}
  const byDate={}; rows.forEach(s=>(byDate[s.date]??=[]).push(s));
  const dates=Object.keys(byDate).sort((a,b)=>sort==='dateAsc'?a.localeCompare(b):b.localeCompare(a));
  box.innerHTML=dates.map(d=>{const items=byDate[d],dTotal=items.reduce((a,s)=>a+s.total,0);return `<div class="day-group"><div class="dhead"><span>${formatDateTH(d)}</span><span class="dsum">${items.length} รายการ · ${fmt(dTotal)}฿</span></div><div class="card" style="padding:6px 12px;">${renderBillGroupedRows(items,{mode:'full'})}</div></div>`}).join('');
  box.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editSaleEntry(b.dataset.edit)));
  box.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteSaleEntry(b.dataset.delete)));
  enableSwipeToDelete(box, (id)=>deleteSaleEntry(id));
}
document.getElementById('histMonthSearch').addEventListener('input',renderHistMonth);
document.getElementById('histMonthSort').addEventListener('change',renderHistMonth);
document.getElementById('histMonthEditTargetBtn').addEventListener('click', ()=>{
  openTargetModal(document.getElementById('histMonth').value);
});
let editSaleId = null;
async function editSaleEntry(id){
  if(!(await ensurePin())) return;
  const s=SALES.find(x=>x.id===id); if(!s) return;
  editSaleId = id;
  document.getElementById('editSaleName').textContent = `${s.name} ${s.size}${s.base?' · '+s.base:''}`;
  document.getElementById('editSaleSource').textContent = s.seed ? 'รายการย้อนหลังจาก Excel' : 'รายการที่บันทึกในแอป';
  document.getElementById('editSaleDate').value = s.date;
  document.getElementById('editSalePrice').value = s.price||0;
  document.getElementById('editSaleQty').value = s.qty;
  document.getElementById('editSaleTint').value = s.tintPrice||0;
  document.getElementById('editSaleColor').value = s.colorCode||'';
  document.getElementById('editSaleError').textContent='';
  updateEditSaleTotal();
  document.getElementById('editSaleModalBg').classList.add('show');
}
function updateEditSaleTotal(){
  const price=Number(document.getElementById('editSalePrice').value)||0;
  const qty=Number(document.getElementById('editSaleQty').value)||0;
  const tint=Number(document.getElementById('editSaleTint').value)||0;
  document.getElementById('editSaleTotal').textContent = fmt((price+tint)*qty)+'฿';
}
['editSalePrice','editSaleQty','editSaleTint'].forEach(id=>{
  document.getElementById(id).addEventListener('input', updateEditSaleTotal);
});
document.getElementById('editSaleModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='editSaleModalBg') e.currentTarget.classList.remove('show');
});
document.getElementById('cancelEditSaleBtn').addEventListener('click', ()=>{
  document.getElementById('editSaleModalBg').classList.remove('show');
});
document.getElementById('saveEditSaleBtn').addEventListener('click', async ()=>{
  const err=document.getElementById('editSaleError');
  err.textContent='';
  const s=SALES.find(x=>x.id===editSaleId); if(!s) return;
  const date=document.getElementById('editSaleDate').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){ err.textContent='รูปแบบวันที่ไม่ถูกต้อง'; return; }
  const price=Number(document.getElementById('editSalePrice').value);
  if(!Number.isFinite(price)||price<0){ err.textContent='ราคาสินค้าไม่ถูกต้อง'; return; }
  const qty=Number(document.getElementById('editSaleQty').value);
  if(!Number.isFinite(qty)||qty<=0){ err.textContent='จำนวนไม่ถูกต้อง'; return; }
  const tint=Number(document.getElementById('editSaleTint').value);
  if(!Number.isFinite(tint)||tint<0){ err.textContent='ราคาแม่สีไม่ถูกต้อง'; return; }
  const color=document.getElementById('editSaleColor').value;

  const row=findProductRow(s.sku,s.name,s.size,s.base);
  if(row){
    row.sold=Math.max(0,(Number(row.sold)||0)-Number(s.qty));
    row.remain=(Number(row.remain)||0)+Number(s.qty);
    row.sold+=qty;
    row.remain-=qty;
  }
  const oldMKey = monthKey(s.date);
  s.date=date; s.price=price; s.qty=qty; s.tintPrice=tint; s.colorCode=color||''; s.total=(price+tint)*qty;
  if(monthKey(s.date) !== oldMKey) midxRemoveById(s.id, oldMKey);
  midxAdd(s);
  await saveSalesIncremental({updated:[s]}); await saveProducts();
  const editBackdated = Math.abs(daysBetween(date, todayISO())) > 2;
  await addAudit('แก้ไขประวัติขาย',`${s.seed?'[Excel] ':''}${s.name} ${s.size} x${qty} วันที่ ${date}`, editBackdated);
  renderHistDay(); renderHistMonth(); renderRecent(); renderGauge(); renderDashboard(); renderStock();
  document.getElementById('editSaleModalBg').classList.remove('show');
  toast('แก้ไขประวัติแล้ว');
});

async function deleteSaleEntry(id){
  if(!(await ensurePin())) return;
  const idx=SALES.findIndex(x=>x.id===id); if(idx<0) return;
  const s=SALES[idx];
  const delConfirm=await askPrompt({
    title:'ยืนยันการลบรายการ',
    sub:`${s.name} ${s.size} x${s.qty}\n${s.seed?'รายการย้อนหลังจาก Excel':'รายการที่บันทึกในแอป'}\n\nพิมพ์ DELETE เพื่อยืนยัน`,
    mode:'text', expected:'DELETE', okLabel:'ลบรายการ', danger:true
  });
  if(delConfirm!=='DELETE') return;
  const row=findProductRow(s.sku,s.name,s.size,s.base);
  if(row){
    row.sold=Math.max(0,(Number(row.sold)||0)-Number(s.qty));
    row.remain=(Number(row.remain)||0)+Number(s.qty);
  }
  SALES.splice(idx,1);
  midxRemove(s);
  await saveSalesIncremental({deletedIds:[s.id]}); await saveProducts();
  const delBackdated = Math.abs(daysBetween(s.date, todayISO())) > 2;
  await addAudit('ลบประวัติขาย',`${s.seed?'[Excel] ':''}${s.name} ${s.size} x${s.qty} วันที่ ${s.date}`, delBackdated);
  renderHistDay(); renderHistMonthOptions(); renderHistMonth(); renderRecent(); renderGauge(); renderDashboard(); renderStock();
  toast('ลบประวัติแล้ว');
}

