/* NIPPON SALE — js/features/bill-cart.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= bill cart (multi-item single bill) ================= */
let billCart = [];
let billId = null;

function buildEntryFromForm(){
  if(!currentRow) return null;
  const qty = Number(qtyInput.value)||0;
  if(qty <= 0 || !Number.isFinite(qty)) return {error:'กรุณาระบุจำนวนที่มากกว่า 0'};
  const tintVal = Number(tintPriceInput.value)||0;
  if(tintVal < 0) return {error:'ราคาแม่สีห้ามติดลบ'};
  const date = document.getElementById('saleDate').value || todayISO();
  const total = computeTotal();
  return {
    id: Date.now()+'-'+Math.random().toString(36).slice(2,7),
    date,
    name: currentProduct, size: sizeSelect.value, base: baseSelect.value === '—' ? '' : baseSelect.value,
    price: currentRow.price, colorCode: document.getElementById('colorCode').value.trim(),
    tintPrice: tintVal, qty, total, sku: currentRow.sku, seed:false,
    customerName: document.getElementById('customerName').value.trim(),
    customerPhone: document.getElementById('customerPhone').value.trim()
  };
}
function clearEntryFormFields(){
  productSearch.value=''; currentProduct=null; currentSeries=null; currentRow=null;
  resetSizeBase();
  document.getElementById('colorCode').value='';
  tintPriceInput.value=''; qtyInput.value='1';
  computeTotal();
  // customer name/phone intentionally NOT cleared here so it carries over
  // between "+ เพิ่มลงบิล" additions within the same bill
}
function clearCustomerFields(){
  document.getElementById('customerName').value='';
  document.getElementById('customerPhone').value='';
}
function ensureBillId(){
  if(!billId) billId = 'bill-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
  return billId;
}
function renderBillCart(){
  const title = document.getElementById('billCartTitle');
  const list = document.getElementById('billCartList');
  if(!billCart.length){ title.style.display='none'; list.style.display='none'; return; }
  title.style.display='flex'; list.style.display='block';
  document.getElementById('billCartCount').textContent = billCart.length;
  list.innerHTML = billCart.map((s,i)=>`
    <div class="swipe-wrap"><div class="swipe-bg">ปัดเพื่อลบ ${ICONS.close}</div>
    <div class="list-row" data-swipedel="${i}">
      <div class="info">
        <div class="name">${s.name} ${s.size} ${s.base}</div>
        <div class="sub">${s.employee ? ICONS.user+' '+s.employee+' \u00b7 ' : ''}${s.colorCode ? 'รหัสสี '+s.colorCode+' · ' : ''}x${s.qty}</div>
      </div>
      <div class="amt">${fmt(s.total)}฿</div>
      <button class="del-btn" data-billrm="${i}">${ICONS.close}</button>
    </div></div>`).join('');
  list.querySelectorAll('[data-billrm]').forEach(b=>b.addEventListener('click', ()=>{
    billCart.splice(Number(b.dataset.billrm),1);
    if(!billCart.length) billId = null;
    renderBillCart();
  }));
  enableSwipeToDelete(list, (idxStr)=>{
    billCart.splice(Number(idxStr),1);
    if(!billCart.length) billId = null;
    renderBillCart();
  });
}
document.getElementById('addToBillBtn').addEventListener('click', ()=>{
  if(!currentRow){ toast('กรุณาเลือกสินค้าก่อน'); return; }
  const entry = buildEntryFromForm();
  if(!entry){ toast('กรุณาเลือกสินค้าก่อน'); return; }
  if(entry.error){ toast(entry.error); return; }
  entry.billId = ensureBillId();
  billCart.push(entry);
  clearEntryFormFields();
  renderBillCart();
  toast(`เพิ่มลงบิลแล้ว (${billCart.length} รายการ)`);
});

document.getElementById('saveSaleBtn').addEventListener('click', async ()=>{
  const items = billCart.slice();
  if(currentRow){
    const entry = buildEntryFromForm();
    if(entry && entry.error){ toast(entry.error); return; }
    if(entry){ entry.billId = items.length ? ensureBillId() : null; items.push(entry); }
  }
  if(!items.length){ toast('กรุณาเลือกสินค้าก่อน'); return; }

  items.forEach(entry=>{
    SALES.push(entry);
    midxAdd(entry);
    const row = findProductRow(entry.sku, entry.name, entry.size, entry.base);
    if(row){ row.sold = (Number(row.sold)||0) + entry.qty; row.remain = (Number(row.remain)||0) - entry.qty; }
  });
  await saveSalesIncremental({added: items}); await saveProducts();
  await touchCustomersFromEntries(items);
  if(navigator.vibrate) navigator.vibrate(35);

  toast(items.length>1 ? `บันทึกบิล ${items.length} รายการแล้ว` : 'บันทึกยอดขายแล้ว');
  billCart = []; billId = null;
  clearEntryFormFields();
  clearCustomerFields();
  renderBillCart();
  renderRecent();
  renderGauge();
  renderDashboard();
  maybeCelebrateTarget();
});

