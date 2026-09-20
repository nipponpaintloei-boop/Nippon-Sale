/* NIPPON SALE — js/views/stock.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= stock view ================= */
let stockFilter = 'all';
function statusOf(remain){
  remain = Number(remain);
  if(remain < 0) return 'over';
  if(remain === 0) return 'out';
  if(remain <= 3) return 'low';
  return 'ok';
}
const statusLabel = { over:'ขายเกิน', out:'หมด', low:'ใกล้หมด', ok:'ปกติ' };
const statusClass = { over:'status-over', out:'status-out', low:'status-low', ok:'status-ok' };

document.querySelectorAll('#stockFilters .chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('#stockFilters .chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    stockFilter = chip.dataset.f;
    renderStock();
  });
});
document.getElementById('stockSearch').addEventListener('input', renderStock);
document.getElementById('stockSearchClear').addEventListener('click', ()=>{
  const input = document.getElementById('stockSearch');
  input.value = '';
  input.focus();
  renderStock();
});

document.querySelectorAll('#view-stock .subtab-row .stbtn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#view-stock .subtab-row .stbtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.stk;
    document.getElementById('stockPanel').style.display = mode==='stock' ? 'block':'none';
    document.getElementById('productsPanel').style.display = mode==='products' ? 'block':'none';
    if(mode==='products') renderProductsList();
  });
});

let stockExpandedSeries = new Set(); // series names currently expanded in the สต็อก list (persists across re-renders)

/* relevance score for a stock search match — lower is more relevant. -1 = no match. */
function stockMatchScore(r, q){
  if(!q) return 0;
  const name = (r.name||'').toLowerCase();
  const size = (r.size||'').toLowerCase();
  const base = (r.base||'').toLowerCase();
  const sku = (r.sku||'').toLowerCase();
  const combined = `${name} ${size} ${base} ${sku}`;
  if(name === q) return 0;
  if(name.startsWith(q)) return 1;
  if(sku && (sku === q || sku.startsWith(q))) return 2;
  if(size === q || base === q) return 3;
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(new RegExp('(^|[^a-z0-9ก-๙])'+esc).test(combined)) return 4;
  if(combined.includes(q)) return 5;
  return -1;
}
/* wrap matches of q inside text with <mark>, html-escaping first */
function highlightMatch(text, q){
  const safe = escapeHtml(text==null ? '' : text);
  if(!q) return safe;
  const esc = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(!esc) return safe;
  try{ return safe.replace(new RegExp('('+esc+')','ig'), '<mark class="hl">$1</mark>'); }
  catch(e){ return safe; }
}
const STOCK_DOT_PALETTE = ['#2f6fed','#1fae6c','#ef5a4c','#c98a1f','#8a5cf6','#0891b2','#d6336c','#3f7fd9'];
function brandDotColor(name){
  const fam = String(name||'').split('(')[0].split('[')[0].trim() || String(name||'');
  let hash = 0;
  for(let i=0;i<fam.length;i++) hash = (hash*31 + fam.charCodeAt(i)) >>> 0;
  return STOCK_DOT_PALETTE[hash % STOCK_DOT_PALETTE.length];
}

function renderStock(){
  const qRaw = document.getElementById('stockSearch').value.trim();
  const q = qRaw.toLowerCase();

  let base = PRODUCTS.filter(r=>r.name);
  if(stockFilter !== 'all') base = base.filter(r=>statusOf(r.remain)===stockFilter);

  let rows;
  if(q){
    rows = base
      .map(r=>({r, score:stockMatchScore(r,q)}))
      .filter(x=>x.score>=0)
      .sort((a,b)=> a.score-b.score || Number(a.r.remain)-Number(b.r.remain))
      .map(x=>x.r);
  }else{
    rows = base.slice().sort((a,b)=>Number(a.remain)-Number(b.remain));
  }

  const box = document.getElementById('stockList');
  const clearBtn = document.getElementById('stockSearchClear');
  const countEl = document.getElementById('stockResultCount');
  if(clearBtn) clearBtn.style.display = qRaw ? 'flex' : 'none';
  if(countEl){
    if(qRaw){
      countEl.style.display = 'block';
      countEl.textContent = rows.length ? `พบ ${rows.length} รายการ` : 'ไม่พบรายการที่ตรงกับคำค้นหา';
    }else{
      countEl.style.display = 'none';
    }
  }
  if(!rows.length){ box.innerHTML = '<div class="empty">ไม่พบสินค้า</div>'; return; }

  const rowHtml = (r)=>{
    const st = statusOf(r.remain);
    const idx = PRODUCTS.indexOf(r);
    const dot = brandDotColor(r.name);
    const skuMeta = r.sku ? ` · SKU ${highlightMatch(r.sku, qRaw)}` : '';
    return `
    <div class="stock-row" data-idx="${idx}">
      <span class="brand-dot" style="background:${dot}"></span>
      <div class="info">
        <div class="name">${highlightMatch(r.name, qRaw)} ${highlightMatch(r.size, qRaw)} ${highlightMatch(r.base, qRaw)}</div>
        <div class="meta">฿${fmt(r.price)}${skuMeta}</div>
      </div>
      <div class="stock-right">
        <div class="remain-num st-${st}">${r.remain}</div>
        <div class="status-tag ${statusClass[st]}">${statusLabel[st]}</div>
      </div>
    </div>`;
  };
  const worstStatus = (groupRows)=>{
    const order = ['out','over','low','ok'];
    const statuses = groupRows.map(r=>statusOf(r.remain));
    return order.find(s=>statuses.includes(s)) || 'ok';
  };
  const seenSeries = new Set();
  const html = rows.slice(0,300).map(r=>{
    const series = NAME_TO_SERIES[r.name];
    if(series){
      const groupRows = rows.filter(x=>NAME_TO_SERIES[x.name]===series);
      if(groupRows.length > 1){
        if(seenSeries.has(series)) return '';
        seenSeries.add(series);
        const nColors = new Set(groupRows.map(x=>x.name)).size;
        const totalRemain = groupRows.reduce((a,x)=>a+(Number(x.remain)||0),0);
        const st = worstStatus(groupRows);
        const open = stockExpandedSeries.has(series);
        const dot = brandDotColor(series);
        return `
        <div class="series-group${open?' open':''}" data-series="${series.replace(/"/g,'&quot;')}">
          <div class="series-group-header">
            <span class="brand-dot" style="background:${dot}"></span>
            <div class="info">
              <div class="name">${highlightMatch(series, qRaw)}</div>
              <div class="meta">${nColors} เบอร์สี</div>
            </div>
            <div class="stock-right">
              <div class="remain-num st-${st}">${totalRemain}</div>
              <div class="status-tag ${statusClass[st]}">${statusLabel[st]}</div>
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
      if(stockExpandedSeries.has(series)) stockExpandedSeries.delete(series); else stockExpandedSeries.add(series);
      group.classList.toggle('open');
    });
  });
  box.querySelectorAll('.stock-row').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); openStockModal(Number(el.dataset.idx)); });
  });
}

/* stock actions modal */
let stockModalIdx = -1;
function openStockModal(idx){
  stockModalIdx = idx;
  const r = PRODUCTS[idx];
  if(!r) return;
  document.getElementById('stockModalName').textContent = `${r.name} ${r.size} ${r.base}`;
  document.getElementById('stockModalMeta').textContent = `คงเหลือปัจจุบัน ${r.remain} ชิ้น · สต็อกตั้งต้น ${r.init} · รับเข้าแล้ว ${r.inflow} · ขายสะสม ${r.sold}`;
  document.getElementById('stockInQty').value = '';
  document.getElementById('stockFixQty').value = r.remain;
  document.querySelectorAll('#stockModalBg .subtab-row .stbtn').forEach((b,i)=>b.classList.toggle('active', i===0));
  document.getElementById('stockInPanel').style.display='block';
  document.getElementById('stockFixPanel').style.display='none';
  document.getElementById('stockModalBg').classList.add('show');
}
document.querySelectorAll('#stockModalBg .subtab-row .stbtn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#stockModalBg .subtab-row .stbtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.sm;
    document.getElementById('stockInPanel').style.display = mode==='in' ? 'block':'none';
    document.getElementById('stockFixPanel').style.display = mode==='fix' ? 'block':'none';
  });
});
document.getElementById('stockModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='stockModalBg') e.currentTarget.classList.remove('show');
});
document.getElementById('stockInSaveBtn').addEventListener('click', async ()=>{
  if(!(await ensurePin())) return;
  const r = PRODUCTS[stockModalIdx];
  if(!r) return;
  const qty = Number(document.getElementById('stockInQty').value)||0;
  if(qty <= 0){ toast('กรุณาระบุจำนวนที่รับเข้า'); return; }
  r.inflow = (Number(r.inflow)||0) + qty;
  r.remain = (Number(r.remain)||0) + qty;
  await saveProducts();
  await addAudit('รับสินค้าเข้า',`${r.name} ${r.size} ${r.base} +${qty} ชิ้น`);
  toast('บันทึกรับสินค้าเข้าแล้ว');
  document.getElementById('stockModalBg').classList.remove('show');
  renderStock(); renderDashboard();
});
document.getElementById('stockFixSaveBtn').addEventListener('click', async ()=>{
  if(!(await ensurePin())) return;
  const r = PRODUCTS[stockModalIdx];
  if(!r) return;
  const val = Number(document.getElementById('stockFixQty').value);
  if(Number.isNaN(val)||val<0){ toast('จำนวนสต็อกต้องไม่ติดลบ'); return; }
  const delta = val - (Number(r.remain)||0);
  r.init = (Number(r.init)||0) + delta;
  r.remain = val;
  await saveProducts();
  await addAudit('ปรับสต็อกตั้งต้น',`${r.name} ${r.size} ${r.base}: ${r.remain-delta} → ${val} ชิ้น`);
  toast('ปรับยอดสต็อกให้ตรงกับที่นับได้แล้ว');
  document.getElementById('stockModalBg').classList.remove('show');
  renderStock(); renderDashboard();
});


document.getElementById('stockAuditBtn').addEventListener('click',()=>{document.getElementById('auditModalTitle').textContent='ประวัติการปรับสต็อก';renderAudit();document.getElementById('auditModalBg').classList.add('show');});
document.getElementById('closeAuditBtn').addEventListener('click',()=>document.getElementById('auditModalBg').classList.remove('show'));
document.getElementById('auditModalBg').addEventListener('click',e=>{if(e.target.id==='auditModalBg')e.currentTarget.classList.remove('show');});

