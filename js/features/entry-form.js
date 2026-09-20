/* NIPPON SALE — js/features/entry-form.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= entry form logic ================= */
function getLastUsedSaleDate(){
  try{
    const v = localStorage.getItem(LOCAL_STORAGE_PREFIX + 'lastSaleDate');
    return v || todayISO();
  }catch(e){ return todayISO(); }
}
function setLastUsedSaleDate(v){
  try{ localStorage.setItem(LOCAL_STORAGE_PREFIX + 'lastSaleDate', v || todayISO()); }catch(e){}
}
const productSearch = document.getElementById('productSearch');
const suggestBox = document.getElementById('suggestBox');
const sizeSelect = document.getElementById('sizeSelect');
const baseSelect = document.getElementById('baseSelect');
const colorNoField = document.getElementById('colorNoField');
const colorNoSelect = document.getElementById('colorNoSelect');
const priceChip = document.getElementById('priceChip');
const priceVal = document.getElementById('priceVal');
let currentProduct = null; // resolved raw product name (matches PRODUCT_INDEX key)
let currentSeries = null;  // series name when the product needs a เบอร์สี step first (see SERIES_INDEX)
let currentRow = null;     // selected product row object

document.getElementById('saleDate').value = getLastUsedSaleDate();
document.getElementById('saleDate').addEventListener('change', ()=>{
  setLastUsedSaleDate(document.getElementById('saleDate').value);
});

function hasMeaningfulEntryData(){
  if(!currentRow) return false;
  const tint = (tintPriceInput.value||'').trim();
  const cc = (document.getElementById('colorCode').value||'').trim();
  const qty = (qtyInput.value||'').trim();
  return !!tint || !!cc || (qty && qty !== '1');
}

// Search list mixes: (a) series that need a เบอร์สี step (one entry per series,
// not per เบอร์), and (b) plain product names that don't need that extra step.
function getSearchList(){
  const usedNames = new Set();
  const list = [];
  Object.keys(SERIES_INDEX).forEach(series=>{
    Object.values(SERIES_INDEX[series]).forEach(n=>usedNames.add(n));
    list.push({label:series, isSeries:true});
  });
  Object.keys(PRODUCT_INDEX).forEach(n=>{
    if(usedNames.has(n)) return; // already represented via its series above
    list.push({label:n, isSeries:false});
  });
  return list;
}

productSearch.addEventListener('input', ()=>{
  const q = productSearch.value.trim();
  const currentLabel = currentSeries || currentProduct;
  if(currentLabel && q.toLowerCase() !== currentLabel.toLowerCase() && hasMeaningfulEntryData()){
    const ok = confirm('คุณกรอกรายละเอียด (รหัสสี/ราคาแม่สี/จำนวน) ของสินค้านี้ไว้ยังไม่ได้บันทึกหรือเพิ่มลงบิล ต้องการเปลี่ยนสินค้าและล้างข้อมูลนี้หรือไม่?');
    if(!ok){ productSearch.value = currentLabel; return; }
  }
  const ql = q.toLowerCase();
  currentSeries = null; currentProduct = null; currentRow = null;
  resetSizeBase();
  if(!ql){ suggestBox.style.display='none'; return; }
  const all = getSearchList().filter(it=>{
    if(it.label.toLowerCase().includes(ql)) return true;
    if(it.isSeries) return Object.keys(SERIES_INDEX[it.label]).some(c=>c.toLowerCase().includes(ql));
    return false;
  }).slice(0,20);
  if(!all.length){ suggestBox.innerHTML = '<div class="suggest-item">ไม่พบสินค้า</div>'; suggestBox.style.display='block'; return; }
  suggestBox.innerHTML = all.map(it=>{
    const label = it.label.replace(/"/g,'&quot;');
    if(it.isSeries){
      const n = Object.keys(SERIES_INDEX[it.label]).length;
      return `<div class="suggest-item" data-series="${label}">${it.label}<div class="meta">${n} เบอร์สี</div></div>`;
    }
    const sizes = Object.keys(PRODUCT_INDEX[it.label]);
    return `<div class="suggest-item" data-name="${label}">${it.label}<div class="meta">${sizes.length} ขนาด</div></div>`;
  }).join('');
  suggestBox.style.display='block';
});

suggestBox.addEventListener('click', (e)=>{
  const item = e.target.closest('.suggest-item');
  if(!item || (!item.dataset.name && !item.dataset.series)) return;
  const target = item.dataset.series || item.dataset.name;
  const currentLabel = currentSeries || currentProduct;
  if(currentLabel && target !== currentLabel && hasMeaningfulEntryData()){
    const ok = confirm('คุณกรอกรายละเอียด (รหัสสี/ราคาแม่สี/จำนวน) ของสินค้านี้ไว้ยังไม่ได้บันทึกหรือเพิ่มลงบิล ต้องการเปลี่ยนสินค้าและล้างข้อมูลนี้หรือไม่?');
    if(!ok) return;
  }
  if(item.dataset.series) selectSeries(item.dataset.series);
  else selectProduct(item.dataset.name);
});

// Step 1a (products with a เบอร์สี, e.g. "สีน้ำมัน All in 1"): pick the series first,
// show the เบอร์สี dropdown, then resolve into the real product name below.
function selectSeries(series){
  currentSeries = series;
  currentProduct = null; currentRow = null;
  productSearch.value = series;
  suggestBox.style.display = 'none';
  const colorNos = Object.keys(SERIES_INDEX[series]);
  colorNoField.style.display = '';
  colorNoSelect.disabled = false;
  colorNoSelect.innerHTML = colorNos.map(c=>`<option value="${c.replace(/"/g,'&quot;')}">${c}</option>`).join('');
  colorNoSelect.value = colorNos[0];
  handleColorNoChange(false);
}
function handleColorNoChange(autoFocusQty){
  if(!currentSeries) return;
  const rawName = SERIES_INDEX[currentSeries][colorNoSelect.value];
  if(!rawName) return;
  resolveProductName(rawName, autoFocusQty);
}
colorNoSelect.addEventListener('change', ()=>handleColorNoChange(false));

// Step 1b (products without a เบอร์สี step): pick straight from the search list.
function selectProduct(name){
  currentSeries = null;
  productSearch.value = name;
  suggestBox.style.display = 'none';
  colorNoField.style.display = 'none';
  colorNoSelect.disabled = true;
  colorNoSelect.innerHTML = '<option>—</option>';
  resolveProductName(name, false);
}

// Shared tail end of both flows above: once the real product `name` (the same
// string PRODUCT_INDEX/PRODUCTS have always used) is known, populate ขนาด as before.
function resolveProductName(name, autoFocusQty){
  currentProduct = name;
  const sizes = Object.keys(PRODUCT_INDEX[name]);
  sizeSelect.disabled = false;
  sizeSelect.innerHTML = sizes.map(s=>`<option value="${s}">${s}</option>`).join('');
  // The browser auto-selects the first <option> without firing 'change', so always
  // resolve the default size ourselves and let it cascade into base/price/total —
  // no need to reopen the size menu afterwards (that was fighting with the base
  // menu opening from inside handleSizeChange and undoing it, which is why nothing
  // seemed to update until the size field was tapped a second time).
  sizeSelect.value = sizes[0];
  handleSizeChange(autoFocusQty);
}

function handleSizeChange(autoFocusQty){
  if(!currentProduct) return;
  const size = sizeSelect.value;
  const bases = Object.keys(PRODUCT_INDEX[currentProduct][size]);
  if(bases.length === 1 && bases[0] === '—'){
    // no real base choice for this product/size: skip past this step
    baseSelect.disabled = true;
    baseSelect.innerHTML = '<option>—</option>';
    handleBaseChange(autoFocusQty);
  } else {
    // same auto-select-without-'change' issue as size — resolve the default first
    // base right away so price/total populate immediately. The user can still tap
    // the base field to pick a different base; that fires a real 'change' event.
    baseSelect.disabled = false;
    baseSelect.innerHTML = bases.map(b=>`<option value="${b}">${b}</option>`).join('');
    baseSelect.value = bases[0];
    handleBaseChange(autoFocusQty);
  }
}
// user manually reselecting size afterwards: resolve base/price as usual, but don't
// yank focus to qty again — they're still mid-flow choosing size/base themselves
sizeSelect.addEventListener('change', ()=>handleSizeChange(false));

function handleBaseChange(autoFocusQty){
  if(!currentProduct) return;
  const size = sizeSelect.value;
  const base = baseSelect.value;
  currentRow = PRODUCT_INDEX[currentProduct][size][base];
  if(currentRow){
    priceVal.textContent = fmt(currentRow.price);
    priceChip.style.display = 'inline-flex';
    updateStockHint();
    // autofocus flow: once product -> size -> base fully resolve for the FIRST time,
    // jump to qty for fast entry. Skip this when the user is manually re-picking
    // size/base afterward — jumping focus away mid-adjustment is just annoying.
    if(autoFocusQty){
      qtyInput.focus();
      qtyInput.select();
    }
  }
  computeTotal();
}
// user manually reselecting base afterwards: don't auto-jump to qty either
baseSelect.addEventListener('change', ()=>handleBaseChange(false));

function updateStockHint(){
  const hint = document.getElementById('stockHint');
  if(!currentRow){ hint.style.display = 'none'; return; }
  const remain = Number(currentRow.remain)||0;
  hint.style.display = 'inline-block';
  hint.classList.remove('low','out');
  if(remain <= 0){
    hint.innerHTML = `${ICONS.warning} สินค้านี้หมดสต็อกแล้ว (คงเหลือ ${remain})`;
    hint.classList.add('out');
  } else if(remain <= 3){
    hint.innerHTML = `${ICONS.warning} คงเหลือ ${remain} ชิ้น — ใกล้หมด`;
    hint.classList.add('low');
  } else {
    hint.textContent = `คงเหลือ ${remain} ชิ้น`;
  }
}

function resetSizeBase(){
  sizeSelect.disabled = true; sizeSelect.innerHTML = '<option>เลือกสินค้าก่อน</option>';
  baseSelect.disabled = true; baseSelect.innerHTML = '<option>—</option>';
  colorNoField.style.display = 'none';
  colorNoSelect.disabled = true; colorNoSelect.innerHTML = '<option>—</option>';
  priceChip.style.display = 'none';
  document.getElementById('stockHint').style.display = 'none';
  computeTotal();
}

document.addEventListener('click', (e)=>{
  if(!e.target.closest('.search-wrap')) suggestBox.style.display = 'none';
});

const tintPriceInput = document.getElementById('tintPrice');
const qtyInput = document.getElementById('qty');
[tintPriceInput, qtyInput].forEach(el=>el.addEventListener('input', computeTotal));

document.getElementById('qtyMinusBtn').addEventListener('click', ()=>{
  const v = Math.max(1, (Number(qtyInput.value)||1) - 1);
  qtyInput.value = v;
  computeTotal();
});
document.getElementById('qtyPlusBtn').addEventListener('click', ()=>{
  const v = (Number(qtyInput.value)||0) + 1;
  qtyInput.value = v;
  computeTotal();
});

function computeTotal(){
  const unit = currentRow ? Number(currentRow.price)||0 : 0;
  const tint = Number(tintPriceInput.value)||0;
  const qty = Number(qtyInput.value)||0;
  const total = (unit+tint)*qty;
  document.getElementById('totalVal').textContent = fmt(total) + ' บาท';
  return total;
}

