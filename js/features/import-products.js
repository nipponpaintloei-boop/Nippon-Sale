/* NIPPON SALE — js/features/import-products.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= IMPORT NEW PRODUCT LIST (.xlsx) ================= */
let IMPORT_STATE = null; // {mode:'merge'|'replace', rows:[{rowNum,name,size,base,sku,price,error}], fileName}

function findImportColKey(headers, candidates){
  const norm = h => String(h||'').trim().toLowerCase();
  for(const cand of candidates){ const hit = headers.find(h=>norm(h)===norm(cand)); if(hit) return hit; }
  for(const cand of candidates){ const hit = headers.find(h=>norm(h).includes(norm(cand))); if(hit) return hit; }
  return null;
}
function findExistingProductMatch(r){
  if(r.sku){ const bySku = PRODUCTS.find(p=>p.sku && p.sku===r.sku); if(bySku) return bySku; }
  return PRODUCTS.find(p=>p.name===r.name && (p.size||'')===(r.size||'') && (p.base||'')===(r.base||''));
}
async function handleImportProductsFile(file){
  if(typeof XLSX==='undefined'){ toast('ไม่สามารถโหลดระบบ Excel ได้ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่'); return; }
  try{
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, {type:'array'});
    let sheetName = wb.SheetNames[0], bestLen = -1;
    wb.SheetNames.forEach(n=>{
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], {header:1});
      if(rows.length > bestLen){ bestLen = rows.length; sheetName = n; }
    });
    const json = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {defval:''});
    if(!json.length){ toast('ไม่พบข้อมูลในไฟล์ที่เลือก'); return; }
    const headers = Object.keys(json[0]);
    const col = {
      name: findImportColKey(headers, ['สินค้า','ชื่อสินค้า','product_name','name']),
      film: findImportColKey(headers, ['ฟิล์มสี','ฟิล์ม','sheen','finish']),
      size: findImportColKey(headers, ['ขนาด','size','pack_size']),
      base: findImportColKey(headers, ['เบส','base']),
      colorNo: findImportColKey(headers, ['เบอร์สี','เบอร์','colorno','color_no','color']),
      price: findImportColKey(headers, ['ราคา (บาท)','ราคา','price','unit_price']),
      sku: findImportColKey(headers, ['sku','รหัส','product_id','barcode']),
    };
    if(!col.name || !col.price){ toast('ไม่พบคอลัมน์ "ชื่อสินค้า" หรือ "ราคา" ในไฟล์ กรุณาตรวจสอบหัวตาราง'); return; }
    const rows = json.map((r,i)=>{
      let name = String(r[col.name]||'').trim();
      const size = col.size ? String(r[col.size]||'').trim() : '';
      const base = col.base ? String(r[col.base]||'').trim() : '';
      const sku = col.sku ? String(r[col.sku]||'').trim() : '';
      // Some price lists split variant info into its own column instead of embedding
      // it in the product name — a "ฟิล์มสี" (sheen/finish, e.g. กึ่งเงา/ด้าน) column,
      // a "เบอร์สี" (color code, e.g. S900/S914) column, or both at once. The app
      // itself only tracks these via trailing "(...)" segments in the name (see
      // parseSeriesColorNo / SERIES_INDEX below), so fold them in here in that
      // order — ฟิล์มสี first, then เบอร์สี — otherwise rows that only differ by
      // one of these would collide on name+size+base and silently overwrite each
      // other on import (and disappear from Products/Stock/sales-entry alike,
      // since all three read from the same PRODUCT_INDEX/SERIES_INDEX).
      const film = col.film ? String(r[col.film]||'').trim() : '';
      if(film) name = `${name} (${film})`;
      const colorNo = col.colorNo ? String(r[col.colorNo]||'').trim() : '';
      if(colorNo && !base) name = `${name} (${colorNo})`;
      const priceRaw = r[col.price];
      const price = Number(String(priceRaw).replace(/,/g,'').trim());
      let error = '';
      if(!name) error = 'ไม่มีชื่อสินค้า';
      else if(priceRaw===''||priceRaw===undefined||priceRaw===null) error = 'ไม่มีราคา';
      else if(isNaN(price)||price<0) error = 'ราคาไม่ถูกต้อง';
      return {rowNum:i+2, name, size, base, sku, price:isNaN(price)?0:price, error};
    });
    IMPORT_STATE = {mode:'merge', rows, fileName:file.name};
    openImportPreview();
  }catch(err){ toast('อ่านไฟล์ไม่สำเร็จ: '+err.message); }
}
function computeImportPlan(){
  const valid = IMPORT_STATE.rows.filter(r=>!r.error);
  const errors = IMPORT_STATE.rows.filter(r=>r.error);
  let toAdd=0, toUpdate=0;
  if(IMPORT_STATE.mode==='replace'){ toAdd = valid.length; }
  else{ valid.forEach(r=>{ if(findExistingProductMatch(r)) toUpdate++; else toAdd++; }); }
  return {valid, errors, toAdd, toUpdate};
}
function renderImportPreview(){
  const plan = computeImportPlan();
  const existingCount = PRODUCTS.filter(p=>p.name).length;
  document.getElementById('importSummary').innerHTML = `
    <div class="stat-card"><div class="lbl">แถวทั้งหมดในไฟล์</div><div class="val">${IMPORT_STATE.rows.length}</div></div>
    <div class="stat-card"><div class="lbl">ข้อมูลผิดพลาด (ข้าม)</div><div class="val ${plan.errors.length?'warn':''}">${plan.errors.length}</div></div>
    <div class="stat-card"><div class="lbl">${IMPORT_STATE.mode==='replace'?'สินค้าใหม่ทั้งหมด':'จะเพิ่มใหม่'}</div><div class="val good">${plan.toAdd}</div></div>
    <div class="stat-card"><div class="lbl">${IMPORT_STATE.mode==='replace'?'สินค้าเดิมที่จะถูกลบ':'จะอัปเดตราคา/ข้อมูล'}</div><div class="val ${IMPORT_STATE.mode==='replace'?'warn':''}">${IMPORT_STATE.mode==='replace'?existingCount:plan.toUpdate}</div></div>
  `;
  document.getElementById('importModeHint').textContent = IMPORT_STATE.mode==='replace'
    ? 'สินค้าเดิมทั้งหมดจะถูกลบออกจากระบบ แล้วแทนที่ด้วยรายการใหม่จากไฟล์นี้ (ประวัติการขายเดิมจะยังอยู่ในระบบ)'
    : 'สินค้าที่ตรงกับของเดิม (โดย SKU หรือ ชื่อ+ขนาด+เบส) จะถูกอัปเดตราคา/ข้อมูล ส่วนที่ไม่พบจะถูกเพิ่มใหม่ สินค้าเดิมที่ไม่มีในไฟล์นี้จะไม่ถูกลบ';
  const errBox = document.getElementById('importErrorBox');
  if(plan.errors.length){
    errBox.style.display='block';
    errBox.innerHTML = `<div class="hint" style="color:var(--clay);margin-bottom:6px;">แถวที่มีปัญหา (จะถูกข้าม):</div>` +
      plan.errors.slice(0,20).map(e=>`<div class="hint">แถว ${e.rowNum}: ${escapeHtml(e.name||'(ไม่มีชื่อ)')} — ${e.error}</div>`).join('') +
      (plan.errors.length>20 ? `<div class="hint">...และอีก ${plan.errors.length-20} แถว</div>` : '');
  } else { errBox.style.display='none'; errBox.innerHTML=''; }
  const list = plan.valid.slice(0,300).map(r=>{
    const match = IMPORT_STATE.mode==='merge' ? findExistingProductMatch(r) : null;
    const tag = match ? '<span style="font-size:10px;color:var(--accent);margin-left:6px;">อัปเดต</span>' : '<span style="font-size:10px;color:var(--moss);margin-left:6px;">ใหม่</span>';
    return `<div class="audit-row"><b>${escapeHtml(r.name)}</b>${r.size?' '+escapeHtml(r.size):''}${r.base?' · เบส '+escapeHtml(r.base):''}${tag}<div class="meta">฿${fmt(r.price)}${r.sku?' · SKU '+escapeHtml(r.sku):''}</div></div>`;
  }).join('');
  document.getElementById('importPreviewList').innerHTML = list || '<div class="empty">ไม่มีรายการที่นำเข้าได้</div>';
}
function openImportPreview(){
  document.querySelectorAll('#importModeChips [data-imode]').forEach(el=>el.classList.toggle('active', el.dataset.imode===IMPORT_STATE.mode));
  renderImportPreview();
  document.getElementById('importProductsModalBg').classList.add('show');
}
function closeImportPreview(){
  document.getElementById('importProductsModalBg').classList.remove('show');
  IMPORT_STATE = null;
  document.getElementById('importProductsFile').value = '';
}
document.getElementById('importProductsBtn').addEventListener('click', ()=>{ document.getElementById('importProductsFile').click(); });
document.getElementById('importProductsFile').addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return;
  await handleImportProductsFile(f);
});
document.querySelectorAll('#importModeChips [data-imode]').forEach(el=>{
  el.addEventListener('click', ()=>{
    if(!IMPORT_STATE) return;
    IMPORT_STATE.mode = el.dataset.imode;
    document.querySelectorAll('#importModeChips [data-imode]').forEach(x=>x.classList.toggle('active', x===el));
    renderImportPreview();
  });
});
document.getElementById('importProductsCancelBtn').addEventListener('click', closeImportPreview);
document.getElementById('importProductsModalBg').addEventListener('click', (e)=>{ if(e.target.id==='importProductsModalBg') closeImportPreview(); });
document.getElementById('importProductsConfirmBtn').addEventListener('click', async ()=>{
  if(!IMPORT_STATE) return;
  if(!(await ensurePin())) return;
  const plan = computeImportPlan();
  if(!plan.valid.length){ toast('ไม่มีรายการที่นำเข้าได้'); return; }
  const existingCount = PRODUCTS.filter(p=>p.name).length;
  const confirmWord = await askPrompt({
    title: IMPORT_STATE.mode==='replace' ? 'ยืนยันการแทนที่สินค้าทั้งหมด' : 'ยืนยันการนำเข้ารายการสินค้า',
    sub: IMPORT_STATE.mode==='replace'
      ? `สินค้าเดิม ${existingCount} รายการจะถูกลบ และแทนที่ด้วย ${plan.toAdd} รายการใหม่\n\nพิมพ์ IMPORT เพื่อยืนยัน`
      : `จะเพิ่มใหม่ ${plan.toAdd} รายการ และอัปเดต ${plan.toUpdate} รายการ\n\nพิมพ์ IMPORT เพื่อยืนยัน`,
    mode:'text', expected:'IMPORT', okLabel:'นำเข้าข้อมูล', danger: IMPORT_STATE.mode==='replace'
  });
  if(confirmWord!=='IMPORT') return;
  if(IMPORT_STATE.mode==='replace'){
    PRODUCTS = plan.valid.map(r=>({sku:r.sku, name:r.name, size:r.size, base:r.base, price:r.price, init:0, inflow:0, sold:0, remain:0}));
  } else {
    plan.valid.forEach(r=>{
      const match = findExistingProductMatch(r);
      if(match){ match.name=r.name; match.size=r.size; match.base=r.base; match.price=r.price; if(r.sku) match.sku=r.sku; }
      else PRODUCTS.push({sku:r.sku, name:r.name, size:r.size, base:r.base, price:r.price, init:0, inflow:0, sold:0, remain:0});
    });
  }
  await saveProducts();
  buildProductIndex();
  await addAudit(IMPORT_STATE.mode==='replace' ? 'แทนที่รายการสินค้าทั้งหมด' : 'นำเข้า/อัปเดตรายการสินค้า', `ไฟล์ ${IMPORT_STATE.fileName} · เพิ่มใหม่ ${plan.toAdd} · อัปเดต ${plan.toUpdate}`);
  document.getElementById('importProductsModalBg').classList.remove('show');
  renderProductsList(); renderStock(); renderGauge(); renderDashboard();
  toast('นำเข้ารายการสินค้าเรียบร้อยแล้ว');
  IMPORT_STATE = null;
  document.getElementById('importProductsFile').value = '';
});

