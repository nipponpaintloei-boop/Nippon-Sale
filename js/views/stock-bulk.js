/* NIPPON SALE — js/views/stock-bulk.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= bulk stock-in (receive multiple products at once) ================= */
let bulkStockCart = []; // [{idx, qty}]
const bulkStockSearch = document.getElementById('bulkStockSearch');
const bulkStockSuggest = document.getElementById('bulkStockSuggest');

document.getElementById('bulkStockInBtn').addEventListener('click', ()=>{
  bulkStockCart = [];
  bulkStockSearch.value = '';
  bulkStockSuggest.style.display = 'none';
  renderBulkStockCart();
  document.getElementById('bulkStockModalBg').classList.add('show');
});
document.getElementById('bulkStockCancelBtn').addEventListener('click', ()=>{
  document.getElementById('bulkStockModalBg').classList.remove('show');
});
document.getElementById('bulkStockModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='bulkStockModalBg') e.currentTarget.classList.remove('show');
});

bulkStockSearch.addEventListener('input', ()=>{
  const q = bulkStockSearch.value.trim().toLowerCase();
  if(!q){ bulkStockSuggest.style.display='none'; return; }
  const matches = PRODUCTS
    .map((r,idx)=>({r,idx}))
    .filter(x=>x.r.name && x.r.name.toLowerCase().includes(q) && !bulkStockCart.some(c=>c.idx===x.idx))
    .slice(0,20);
  if(!matches.length){ bulkStockSuggest.innerHTML = '<div class="suggest-item">ไม่พบสินค้า</div>'; bulkStockSuggest.style.display='block'; return; }
  bulkStockSuggest.innerHTML = matches.map(x=>`
    <div class="suggest-item" data-idx="${x.idx}">${x.r.name} ${x.r.size} ${x.r.base}<div class="meta">คงเหลือ ${x.r.remain}</div></div>
  `).join('');
  bulkStockSuggest.style.display='block';
});
bulkStockSuggest.addEventListener('click', (e)=>{
  const item = e.target.closest('.suggest-item');
  if(!item || item.dataset.idx===undefined) return;
  const idx = Number(item.dataset.idx);
  if(!bulkStockCart.some(c=>c.idx===idx)) bulkStockCart.push({idx, qty:''});
  bulkStockSearch.value = '';
  bulkStockSuggest.style.display = 'none';
  renderBulkStockCart();
});
document.addEventListener('click', (e)=>{
  if(!e.target.closest('#bulkStockModalBg .search-wrap')) bulkStockSuggest.style.display = 'none';
});

function renderBulkStockCart(){
  const box = document.getElementById('bulkStockCartList');
  if(!bulkStockCart.length){ box.innerHTML = '<div class="empty">ยังไม่ได้เพิ่มสินค้า — ค้นหาด้านบนเพื่อเพิ่มรายการ</div>'; return; }
  box.innerHTML = bulkStockCart.map((c,i)=>{
    const r = PRODUCTS[c.idx];
    if(!r) return '';
    return `
    <div class="bulk-stock-row">
      <div class="info">
        <div class="name">${r.name} ${r.size} ${r.base}</div>
        <div class="meta">คงเหลือปัจจุบัน ${r.remain}</div>
      </div>
      <input type="number" placeholder="0" data-bulkqty="${i}" value="${c.qty}">
      <button class="del-btn" data-bulkrm="${i}">${ICONS.close}</button>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-bulkqty]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      bulkStockCart[Number(inp.dataset.bulkqty)].qty = inp.value;
    });
  });
  box.querySelectorAll('[data-bulkrm]').forEach(b=>{
    b.addEventListener('click', ()=>{
      bulkStockCart.splice(Number(b.dataset.bulkrm),1);
      renderBulkStockCart();
    });
  });
}

document.getElementById('bulkStockSaveBtn').addEventListener('click', async ()=>{
  if(!(await ensurePin())) return;
  const valid = bulkStockCart.filter(c=>Number(c.qty)>0);
  if(!valid.length){ toast('กรุณาระบุจำนวนที่รับเข้าอย่างน้อย 1 รายการ'); return; }
  const auditLines = [];
  valid.forEach(c=>{
    const r = PRODUCTS[c.idx];
    if(!r) return;
    const qty = Number(c.qty)||0;
    r.inflow = (Number(r.inflow)||0) + qty;
    r.remain = (Number(r.remain)||0) + qty;
    auditLines.push(`${r.name} ${r.size} ${r.base} +${qty} ชิ้น`);
  });
  await saveProducts();
  await addAudit('รับสินค้าเข้า (หลายรายการ)', auditLines.join(' · '));
  toast(`บันทึกรับเข้าสต็อก ${valid.length} รายการแล้ว`);
  bulkStockCart = [];
  document.getElementById('bulkStockModalBg').classList.remove('show');
  renderStock(); renderDashboard();
});

