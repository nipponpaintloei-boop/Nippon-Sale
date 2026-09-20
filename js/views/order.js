/* NIPPON SALE — js/views/order.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= order product (สั่งสินค้า) ================= */
let orderCart = []; // [{idx, qty, colorCode}]
const orderSearch = document.getElementById('orderSearch');
const orderSuggest = document.getElementById('orderSuggest');
const ORDER_BY_KEY = 'orderByName';

document.getElementById('menuOrderBtn').addEventListener('click', ()=>{
  document.getElementById('menuDrawerBg').classList.remove('show');
  orderCart = [];
  orderSearch.value = '';
  document.getElementById('orderNote').value = '';
  orderSuggest.style.display = 'none';
  try{
    document.getElementById('orderByName').value = localStorage.getItem(LOCAL_STORAGE_PREFIX+ORDER_BY_KEY) || '';
  }catch(e){ document.getElementById('orderByName').value=''; }
  renderOrderCart();
  document.getElementById('orderModalBg').classList.add('show');
});
document.getElementById('orderByName').addEventListener('change', ()=>{
  try{ localStorage.setItem(LOCAL_STORAGE_PREFIX+ORDER_BY_KEY, document.getElementById('orderByName').value.trim()); }catch(e){}
});
document.getElementById('orderCancelBtn').addEventListener('click', ()=>{
  document.getElementById('orderModalBg').classList.remove('show');
});
document.getElementById('orderModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='orderModalBg') e.currentTarget.classList.remove('show');
});
document.getElementById('orderClearBtn').addEventListener('click', ()=>{
  if(!orderCart.length) return;
  if(!confirm('ล้างรายการสั่งสินค้าทั้งหมดหรือไม่?')) return;
  orderCart = [];
  renderOrderCart();
});
document.getElementById('orderAddLowStockBtn').addEventListener('click', ()=>{
  // pull products that are out of stock or running low (สถานะ "หมด"/"ใกล้หมด" จากหน้าสต็อก) into the order cart
  const lowRows = PRODUCTS
    .map((r,idx)=>({r,idx}))
    .filter(x=>x.r.name && (statusOf(x.r.remain)==='low' || statusOf(x.r.remain)==='out'));
  if(!lowRows.length){ toast('ตอนนี้ไม่มีสินค้าใกล้หมดหรือหมดสต็อก'); return; }
  let added = 0, bumped = 0;
  lowRows.forEach(({r,idx})=>{
    const existing = orderCart.find(c=>c.idx===idx);
    if(existing){ bumped++; return; } // already in cart — leave qty as the user set it
    const remain = Number(r.remain)||0;
    const suggestedQty = Math.max(1, 3 - remain); // top up to a small buffer of 3
    orderCart.push({idx, qty:suggestedQty, colorCode:''});
    added++;
  });
  renderOrderCart();
  if(added && bumped) toast(`เพิ่มสินค้าใกล้หมด ${added} รายการ (มีอยู่แล้ว ${bumped} รายการ)`);
  else if(added) toast(`เพิ่มสินค้าใกล้หมด ${added} รายการแล้ว`);
  else toast('สินค้าใกล้หมดทั้งหมดอยู่ในรายการแล้ว');
});

orderSearch.addEventListener('input', ()=>{
  const q = orderSearch.value.trim().toLowerCase();
  if(!q){ orderSuggest.style.display='none'; return; }
  const matches = PRODUCTS
    .map((r,idx)=>({r,idx}))
    .filter(x=>x.r.name && x.r.name.toLowerCase().includes(q))
    .slice(0,20);
  if(!matches.length){ orderSuggest.innerHTML = '<div class="suggest-item">ไม่พบสินค้า</div>'; orderSuggest.style.display='block'; return; }
  orderSuggest.innerHTML = matches.map(x=>{
    const skuMeta = x.r.sku ? `บาร์โค้ด ${x.r.sku}` : 'ไม่มีบาร์โค้ด';
    return `<div class="suggest-item" data-idx="${x.idx}">${x.r.name} ${x.r.size} ${x.r.base}<div class="meta">${skuMeta}</div></div>`;
  }).join('');
  orderSuggest.style.display='block';
});
orderSuggest.addEventListener('click', (e)=>{
  const item = e.target.closest('.suggest-item');
  if(!item || item.dataset.idx===undefined) return;
  const idx = Number(item.dataset.idx);
  const existing = orderCart.find(c=>c.idx===idx);
  if(existing){ existing.qty = (Number(existing.qty)||0) + 1; }
  else { orderCart.push({idx, qty:1, colorCode:''}); }
  orderSearch.value = '';
  orderSuggest.style.display = 'none';
  renderOrderCart();
});
document.addEventListener('click', (e)=>{
  if(!e.target.closest('#orderModalBg .search-wrap')) orderSuggest.style.display = 'none';
});

function renderOrderCart(){
  const box = document.getElementById('orderCartList');
  const summary = document.getElementById('orderSummaryRow');
  if(!orderCart.length){
    box.innerHTML = '<div class="empty">ยังไม่ได้เพิ่มสินค้า — ค้นหาด้านบนเพื่อเพิ่มรายการ</div>';
    summary.style.display = 'none';
    return;
  }
  box.innerHTML = orderCart.map((c,i)=>{
    const r = PRODUCTS[c.idx];
    if(!r) return '';
    const skuHtml = r.sku
      ? `<span>${ICONS.box} ${r.sku}</span>`
      : `<span class="ord-no-sku">ไม่มีบาร์โค้ด</span>`;
    return `
    <div class="ord-row">
      <div class="ord-top">
        <div class="ord-info">
          <div class="ord-name">${escapeHtml(r.name)} ${escapeHtml(r.size||'')} ${escapeHtml(r.base||'')}</div>
          <div class="ord-meta">${skuHtml}</div>
        </div>
        <button class="del-btn" data-ordrm="${i}">${ICONS.close}</button>
      </div>
      <div class="ord-bottom">
        <input type="text" class="ord-cc" placeholder="รหัสสี (ถ้ามี)" data-ordcc="${i}" value="${escapeHtml(c.colorCode||'')}">
        <div class="ord-qty">
          <button type="button" data-ordminus="${i}">−</button>
          <input type="number" min="1" data-ordqty="${i}" value="${c.qty}">
          <button type="button" data-ordplus="${i}">+</button>
        </div>
      </div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-ordcc]').forEach(inp=>{
    inp.addEventListener('input', ()=>{ orderCart[Number(inp.dataset.ordcc)].colorCode = inp.value; });
  });
  box.querySelectorAll('[data-ordqty]').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const v = Math.max(1, Number(inp.value)||1);
      orderCart[Number(inp.dataset.ordqty)].qty = v;
      updateOrderSummary();
    });
  });
  box.querySelectorAll('[data-ordminus]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const i = Number(b.dataset.ordminus);
      orderCart[i].qty = Math.max(1, (Number(orderCart[i].qty)||1) - 1);
      renderOrderCart();
    });
  });
  box.querySelectorAll('[data-ordplus]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const i = Number(b.dataset.ordplus);
      orderCart[i].qty = (Number(orderCart[i].qty)||0) + 1;
      renderOrderCart();
    });
  });
  box.querySelectorAll('[data-ordrm]').forEach(b=>{
    b.addEventListener('click', ()=>{
      orderCart.splice(Number(b.dataset.ordrm),1);
      renderOrderCart();
    });
  });
  updateOrderSummary();
}
function updateOrderSummary(){
  const summary = document.getElementById('orderSummaryRow');
  if(!orderCart.length){ summary.style.display='none'; return; }
  const totalQty = orderCart.reduce((s,c)=>s+(Number(c.qty)||0),0);
  document.getElementById('orderSummaryVal').textContent = `${orderCart.length} ชนิด · ${totalQty} ชิ้น`;
  summary.style.display = 'flex';
}

document.getElementById('orderShareBtn').addEventListener('click', async ()=>{
  if(!orderCart.length){ toast('กรุณาเพิ่มสินค้าที่ต้องการสั่งอย่างน้อย 1 รายการ'); return; }
  await shareOrderImage();
});
document.getElementById('orderPdfBtn').addEventListener('click', async ()=>{
  if(!orderCart.length){ toast('กรุณาเพิ่มสินค้าที่ต้องการสั่งอย่างน้อย 1 รายการ'); return; }
  await shareOrderPdf();
});

const ORDER_ROWS_PER_PAGE = 10; // max order rows per A4 page before splitting into another sheet

// Renders the order cart page by page, calling onPage(canvas, pageIndex, totalPages)
// for each page as soon as it's captured, then lets that canvas go out of scope
// before starting the next page. This matters a lot on phones: holding several
// full-resolution canvases in memory at once (e.g. for a 9-page order) was
// exhausting memory on Android and silently freezing mid-export with no error.
async function renderOrderPages(btn, scale, onPage){
  const chunks = [];
  for(let i=0;i<orderCart.length;i+=ORDER_ROWS_PER_PAGE) chunks.push(orderCart.slice(i, i+ORDER_ROWS_PER_PAGE));
  const totalPages = chunks.length;
  const now = new Date();
  const grandTotalQty = orderCart.reduce((s,c)=>s+(Number(c.qty)||0),0);

  for(let p=0; p<totalPages; p++){
    btn.textContent = totalPages>1 ? `กำลังสร้างเอกสาร... (${p+1}/${totalPages})` : 'กำลังสร้างเอกสาร...';
    // yield so the "กำลังสร้าง..." text actually repaints before the heavy work below
    await new Promise(r=>setTimeout(r, 0));
    const node = buildOrderCaptureNode({
      pageItems: chunks[p],
      startIndex: p*ORDER_ROWS_PER_PAGE,
      pageNum: p+1,
      totalPages,
      now,
      grandTotalQty,
      grandTotalCount: orderCart.length
    });
    document.body.appendChild(node);
    // small delay so layout settles before snapshotting
    await new Promise(r=>setTimeout(r, 60));
    const canvas = await html2canvas(node, {backgroundColor:'#ffffff', scale, useCORS:true, imageTimeout:0, logging:false});
    document.body.removeChild(node);
    await onPage(canvas, p, totalPages);
    // let the browser breathe / release this page's canvas before rendering the next
    await new Promise(r=>setTimeout(r, 0));
  }
  return totalPages;
}

async function shareOrderImage(){
  const btn = document.getElementById('orderShareBtn');
  const originalHTML = btn.innerHTML;
  btn.disabled = true; btn.style.opacity = '0.7';
  try{
    // Each page stays a separate full-resolution PNG file (not stitched into one
    // long image) so every page keeps full sharpness and stays easy to view on its own.
    const blobs = [];
    const totalPages = await renderOrderPages(btn, 3, async (canvas, p, totalPagesInner)=>{
      const blob = await new Promise(res=>canvas.toBlob(res, 'image/png', 1.0));
      if(!blob) throw new Error(`สร้างรูปภาพไม่สำเร็จ (หน้า ${p+1})`);
      const filename = totalPagesInner>1
        ? `ใบสั่งสินค้า-${todayISO()}-หน้า${p+1}จาก${totalPagesInner}.png`
        : `ใบสั่งสินค้า-${todayISO()}.png`;
      blobs.push(new File([blob], filename, {type:'image/png'}));
    });

    try{
      if(navigator.canShare && navigator.canShare({files: blobs})){
        // native share sheet (mobile) handles multiple full-size images fine on its own
        await navigator.share({files: blobs, title: blobs[0].name});
      }else if(blobs.length === 1){
        const url = URL.createObjectURL(blobs[0]);
        const a = document.createElement('a'); a.href=url; a.download=blobs[0].name; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        toast('บันทึกรูปภาพแล้ว');
      }else{
        // Browsers silently block multiple auto-triggered downloads fired in a loop,
        // which is why saving used to fail whenever there was more than one page.
        // Bundling every full-resolution page into a single .zip means only ONE
        // download happens, so it always goes through — no quality lost.
        btn.textContent = 'กำลังบีบอัดไฟล์...';
        const zip = new JSZip();
        for(const f of blobs) zip.file(f.name, f);
        const zipBlob = await zip.generateAsync({type:'blob'});
        const zipName = `ใบสั่งสินค้า-${todayISO()}-${totalPages}หน้า.zip`;
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a'); a.href=url; a.download=zipName; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        toast(`บันทึกไฟล์ zip (${totalPages} หน้า) แล้ว`);
      }
    }catch(shareErr){
      if(shareErr && shareErr.name==='AbortError'){ /* user cancelled share sheet */ }
      else toast('แชร์ไม่สำเร็จ: '+shareErr.message);
    }
  }catch(err){
    toast('สร้างรูปภาพไม่สำเร็จ: '+err.message);
  }finally{
    btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = originalHTML;
  }
}

async function shareOrderPdf(){
  const btn = document.getElementById('orderPdfBtn');
  const originalHTML = btn.innerHTML;
  btn.disabled = true; btn.style.opacity = '0.7';
  try{
    const { jsPDF } = window.jspdf;
    // A4 portrait in mm — each page-canvas fills one page exactly.
    const pdf = new jsPDF({unit:'mm', format:'a4', orientation:'portrait'});
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Scale 2 (not 3) for the PDF specifically: a multi-page PDF embeds every page's
    // full bitmap, so on a 9+ page order the higher scale was enough to exhaust memory
    // on Android Chrome and freeze silently. Scale 2 (~192dpi) is still sharp for a
    // printed/read document, just lighter — and each page's canvas is fed straight
    // into the PDF and discarded immediately rather than kept around.
    let pageIndex = 0;
    const totalPages = await renderOrderPages(btn, 2, async (canvas)=>{
      if(pageIndex > 0) pdf.addPage('a4', 'portrait');
      pdf.addImage(canvas, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
      pageIndex++;
    });

    btn.textContent = 'กำลังบันทึกไฟล์...';
    await new Promise(r=>setTimeout(r, 0));
    const filename = totalPages>1
      ? `ใบสั่งสินค้า-${todayISO()}-${totalPages}หน้า.pdf`
      : `ใบสั่งสินค้า-${todayISO()}.pdf`;
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], filename, {type:'application/pdf'});

    try{
      if(navigator.canShare && navigator.canShare({files:[pdfFile]})){
        await navigator.share({files:[pdfFile], title: filename});
      }else{
        const url = URL.createObjectURL(pdfFile);
        const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        toast('บันทึกไฟล์ PDF แล้ว');
      }
    }catch(shareErr){
      if(shareErr && shareErr.name==='AbortError'){ /* user cancelled share sheet */ }
      else toast('แชร์ไม่สำเร็จ: '+shareErr.message);
    }
  }catch(err){
    toast('สร้าง PDF ไม่สำเร็จ: '+err.message);
  }finally{
    btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = originalHTML;
  }
}

function buildOrderCaptureNode({pageItems, startIndex, pageNum, totalPages, now, grandTotalQty, grandTotalCount}){
  const node = document.createElement('div');
  node.className = 'order-capture';
  const byName = document.getElementById('orderByName').value.trim();
  const note = document.getElementById('orderNote').value.trim();
  const isLastPage = pageNum === totalPages;
  const isMultiPage = totalPages > 1;
  const pageTotalQty = pageItems.reduce((s,c)=>s+(Number(c.qty)||0),0);
  const dateLabel = now.toLocaleDateString('th-TH', {day:'numeric', month:'long', year:'numeric'});

  const rowsHtml = pageItems.map((c,i)=>{
    const r = PRODUCTS[c.idx];
    if(!r) return '';
    const barcodeCellId = 'ordbc-'+Math.random().toString(36).slice(2,9);
    const metaSpans = [
      r.size ? `<span>${escapeHtml(r.size)}</span>` : '',
      r.base ? `<span>เบส ${escapeHtml(r.base)}</span>` : '',
      c.colorCode ? `<span>รหัสสี ${escapeHtml(c.colorCode)}</span>` : ''
    ].join('');
    return `<div class="doc-row">
      <div class="c-no">${startIndex+i+1}</div>
      <div class="c-item">
        <div class="nm">${escapeHtml(r.name)}</div>
        <div class="meta">${metaSpans}</div>
      </div>
      <div class="c-code" data-barcode-cell="${barcodeCellId}" data-sku="${escapeHtml(r.sku||'')}"></div>
      <div class="c-qty"><div class="n">${c.qty}</div><div class="u">ชิ้น</div></div>
    </div>`;
  }).join('');

  const totalBarHtml = isLastPage
    ? `<div class="doc-total-bar">
        <span class="lbl">ยอดรวมทั้งหมด</span>
        <span class="v">${grandTotalCount} ชนิด · ${grandTotalQty} ชิ้น</span>
      </div>`
    : `<div class="doc-total-bar">
        <span class="lbl">ยอดรวมหน้านี้</span>
        <span class="v">${pageItems.length} ชนิด · ${pageTotalQty} ชิ้น</span>
      </div>
      <div class="doc-continued">มีต่อหน้าถัดไป →</div>`;

  const signHtml = '';

  node.innerHTML = `
    <div class="doc-topbar"></div>
    <div class="doc-header">
      <div class="doc-brand-block">
        <div class="doc-mark">NS</div>
        <div>
          <div class="doc-brand">NIPPON SALE</div>
          <div class="doc-brand-sub">Nippon Paint · Global House เลย</div>
        </div>
      </div>
    </div>
    <div class="doc-title-row">
      <div class="doc-title">ใบสั่งสินค้า</div>
      <div class="doc-title-sub">Purchase Request${isMultiPage ? ` · หน้า ${pageNum}/${totalPages}` : ''}</div>
    </div>
    <div class="doc-meta-grid">
      <div class="doc-meta-item"><span class="k">วันที่ออกเอกสาร</span><span class="v">${dateLabel}</span></div>
      <div class="doc-meta-item"><span class="k">ผู้สั่ง</span><span class="v">${byName ? escapeHtml(byName) : '—'}</span></div>
      <div class="doc-meta-item"><span class="k">จำนวนรายการทั้งหมด</span><span class="v">${grandTotalCount} ชนิด · ${grandTotalQty} ชิ้น</span></div>
    </div>
    ${(note && pageNum===1) ? `<div class="doc-note-box"><span class="lbl">หมายเหตุ:</span><span>${escapeHtml(note)}</span></div>` : ''}
    <div class="doc-table">
      <div class="doc-table-head">
        <span class="c-no">#</span><span class="c-item">รายการสินค้า</span><span class="c-code">รหัสสินค้า</span><span class="c-qty">จำนวน</span>
      </div>
      ${rowsHtml}
    </div>
    ${totalBarHtml}
    ${signHtml}
    <div class="doc-footer">สร้างจากแอป NIPPON SALE · ${dateLabel}${isMultiPage ? ` · หน้า ${pageNum} จาก ${totalPages}` : ''}</div>
  `;

  // show just the product code (SKU) as text — no need for a real scannable barcode image
  node.querySelectorAll('[data-barcode-cell]').forEach(cell=>{
    const sku = cell.dataset.sku;
    if(!sku){
      cell.innerHTML = '<div class="no-code">ไม่มีรหัส</div>';
      return;
    }
    cell.innerHTML = `<div class="code-box"><div class="code-eyebrow">SKU</div><div class="code-val">${escapeHtml(sku)}</div></div>`;
  });

  if(!isLastPage) node.querySelector('.doc-footer').style.marginTop = 'auto';

  return node;
}

