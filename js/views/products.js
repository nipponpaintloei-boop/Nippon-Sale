/* NIPPON SALE — js/views/products.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= products / price management ================= */
document.getElementById('productSearch2').addEventListener('input', renderProductsList);

let productsExpandedSeries = new Set(); // series names currently expanded in the สินค้า/ราคา list
function renderProductsList(){
  const q = document.getElementById('productSearch2').value.trim().toLowerCase();
  let rows = PRODUCTS.filter(r=>r.name);
  if(q) rows = rows.filter(r=>r.name.toLowerCase().includes(q));
  rows = rows.slice().sort((a,b)=>a.name.localeCompare(b.name,'th'));
  const box = document.getElementById('productsList');
  if(!rows.length){ box.innerHTML = '<div class="empty">ไม่พบสินค้า</div>'; return; }

  const rowHtml = (r)=>{
    const idx = PRODUCTS.indexOf(r);
    return `
    <div class="prod-row">
      <div class="info">
        <div class="name">${r.name} ${r.size} ${r.base}</div>
        <div class="meta">${r.sku ? 'SKU '+r.sku+' · ' : ''}฿${fmt(r.price)}/หน่วย</div>
      </div>
      <button class="edit-btn" data-idx="${idx}">แก้ไข</button>
    </div>`;
  };
  const seenSeries = new Set();
  const html = rows.slice(0,200).map(r=>{
    const series = NAME_TO_SERIES[r.name];
    if(series){
      const groupRows = rows.filter(x=>NAME_TO_SERIES[x.name]===series);
      if(groupRows.length > 1){
        if(seenSeries.has(series)) return '';
        seenSeries.add(series);
        const nColors = new Set(groupRows.map(x=>x.name)).size;
        const open = productsExpandedSeries.has(series);
        return `
        <div class="series-group${open?' open':''}" data-series="${series.replace(/"/g,'&quot;')}">
          <div class="series-group-header">
            <div class="info">
              <div class="name">${series}</div>
              <div class="meta">${nColors} เบอร์สี · ${groupRows.length} รายการ</div>
            </div>
            <svg class="series-group-chevron" width="14" height="9" viewBox="0 0 14 9" fill="none"><path d="M1 1l6 6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="series-group-body">${groupRows.map(rowHtml).join('')}</div>
        </div>`;
      }
    }
    return rowHtml(r);
  }).join('');
  box.innerHTML = html;
  box.querySelectorAll('.series-group-header').forEach(el=>{
    el.addEventListener('click', ()=>{
      const group = el.closest('.series-group');
      const series = group.dataset.series;
      if(productsExpandedSeries.has(series)) productsExpandedSeries.delete(series); else productsExpandedSeries.add(series);
      group.classList.toggle('open');
    });
  });
  box.querySelectorAll('.edit-btn').forEach(b=>b.addEventListener('click', (e)=>{ e.stopPropagation(); openProductModal(Number(b.dataset.idx)); }));
}

function openProductModal(idx){
  document.getElementById('prodEditIdx').value = idx;
  const isNew = idx < 0;
  document.getElementById('productModalTitle').textContent = isNew ? 'เพิ่มสินค้าใหม่' : 'แก้ไขสินค้า / ราคา';
  document.getElementById('deleteProductBtn').style.display = isNew ? 'none' : 'block';
  document.getElementById('prodInitWrap').style.display = isNew ? 'block' : 'none';
  if(isNew){
    document.getElementById('prodName').value='';
    document.getElementById('prodSize').value='';
    document.getElementById('prodBase').value='';
    document.getElementById('prodSku').value='';
    document.getElementById('prodPrice').value='';
    document.getElementById('prodInit').value='0';
  } else {
    const r = PRODUCTS[idx];
    document.getElementById('prodName').value = r.name;
    document.getElementById('prodSize').value = r.size;
    document.getElementById('prodBase').value = r.base;
    document.getElementById('prodSku').value = r.sku;
    document.getElementById('prodPrice').value = r.price;
  }
  document.getElementById('productModalBg').classList.add('show');
}
document.getElementById('addProductBtn').addEventListener('click', ()=>openProductModal(-1));
document.getElementById('productModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='productModalBg') e.currentTarget.classList.remove('show');
});
document.getElementById('saveProductBtn').addEventListener('click', async ()=>{
  if(!(await ensurePin())) return;
  const idx = Number(document.getElementById('prodEditIdx').value);
  const name = document.getElementById('prodName').value.trim();
  const size = document.getElementById('prodSize').value.trim();
  const base = document.getElementById('prodBase').value.trim();
  const sku = document.getElementById('prodSku').value.trim();
  const price = Number(document.getElementById('prodPrice').value)||0;
  if(price<0){ toast('ราคาห้ามติดลบ'); return; }
  if(!name){ toast('กรุณาระบุชื่อสินค้า'); return; }
  if(idx < 0){
    const init = Number(document.getElementById('prodInit').value)||0;
    if(init<0){ toast('สต็อกตั้งต้นห้ามติดลบ'); return; }
    PRODUCTS.push({sku, name, size, base, price, init, inflow:0, sold:0, remain:init});
    toast('เพิ่มสินค้าใหม่แล้ว');
  } else {
    const r = PRODUCTS[idx];
    r.name = name; r.size = size; r.base = base; r.sku = sku; r.price = price;
    toast('อัปเดตราคา/ข้อมูลสินค้าแล้ว');
  }
  await saveProducts();
  buildProductIndex();
  document.getElementById('productModalBg').classList.remove('show');
  renderProductsList(); renderStock();
});
document.getElementById('deleteProductBtn').addEventListener('click', async ()=>{
  if(!(await ensurePin())) return;
  const idx = Number(document.getElementById('prodEditIdx').value);
  if(idx < 0) return;
  if(!confirm('ลบสินค้านี้ออกจากระบบใช่หรือไม่? (ประวัติการขายเดิมจะยังอยู่)')) return;
  PRODUCTS.splice(idx,1);
  await saveProducts();
  buildProductIndex();
  document.getElementById('productModalBg').classList.remove('show');
  toast('ลบสินค้าแล้ว');
  renderProductsList(); renderStock();
});

