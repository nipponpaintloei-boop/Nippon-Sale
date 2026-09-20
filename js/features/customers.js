/* NIPPON SALE — js/features/customers.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= customer base ================= */
function customerKey(name, phone){
  const p = (phone||'').trim();
  const n = (name||'').trim();
  if(p) return 'p:'+p;
  if(n) return 'n:'+n.toLowerCase();
  return null;
}
async function touchCustomersFromEntries(entries){
  let changed = false;
  entries.forEach(e=>{
    const key = customerKey(e.customerName, e.customerPhone);
    if(!key) return;
    const existing = CUSTOMERS[key];
    if(!existing){
      CUSTOMERS[key] = {name:e.customerName||'', phone:e.customerPhone||'', favorite:false, color:null};
      changed = true;
    }else{
      if(e.customerName && existing.name !== e.customerName){ existing.name = e.customerName; changed = true; }
      if(e.customerPhone && existing.phone !== e.customerPhone){ existing.phone = e.customerPhone; changed = true; }
    }
  });
  if(changed) await saveCustomers();
  updateCustomerAutocomplete();
}
function updateCustomerAutocomplete(){
  const nameList = document.getElementById('customerNameList');
  const phoneList = document.getElementById('customerPhoneList');
  if(!nameList || !phoneList) return;
  const names = new Set(), phones = new Set();
  Object.values(CUSTOMERS).forEach(c=>{
    if(c.name) names.add(c.name);
    if(c.phone) phones.add(c.phone);
  });
  nameList.innerHTML = Array.from(names).map(n=>`<option value="${escapeHtml(n)}">`).join('');
  phoneList.innerHTML = Array.from(phones).map(p=>`<option value="${escapeHtml(p)}">`).join('');
}
document.getElementById('customerName').addEventListener('change', ()=>{
  const val = document.getElementById('customerName').value.trim();
  const phoneInput = document.getElementById('customerPhone');
  if(phoneInput.value.trim() || !val) return;
  const match = Object.values(CUSTOMERS).find(c=>c.name && c.name===val && c.phone);
  if(match) phoneInput.value = match.phone;
});
document.getElementById('customerPhone').addEventListener('change', ()=>{
  const val = document.getElementById('customerPhone').value.trim();
  const nameInput = document.getElementById('customerName');
  if(nameInput.value.trim() || !val) return;
  const match = Object.values(CUSTOMERS).find(c=>c.phone && c.phone===val && c.name);
  if(match) nameInput.value = match.name;
});

const CUST_COLOR_PALETTE = [
  {key:'ochre', val:'#f0b23c'}, {key:'teal', val:'#5f8fd8'},
  {key:'clay', val:'#d35b4e'}, {key:'moss', val:'#7cbf72'}
];
function aggregateCustomers(){
  const map = {};
  SALES.forEach(s=>{
    const key = customerKey(s.customerName, s.customerPhone);
    if(!key) return;
    if(!map[key]) map[key] = {key, name:s.customerName||'', phone:s.customerPhone||'', total:0, count:0, lastDate:s.date, bills:{}, products:{}};
    const rec = map[key];
    rec.total += Number(s.total)||0;
    rec.count += 1;
    if(s.date > rec.lastDate) rec.lastDate = s.date;
    if(s.customerName) rec.name = s.customerName;
    if(s.customerPhone) rec.phone = s.customerPhone;
    const bKey = s.billId || s.id;
    if(!rec.bills[bKey]) rec.bills[bKey] = {billKey:bKey, date:s.date, total:0, items:[]};
    rec.bills[bKey].total += Number(s.total)||0;
    rec.bills[bKey].items.push({name:s.name, size:s.size, base:s.base, qty:s.qty, total:s.total});
    if(s.date > rec.bills[bKey].date) rec.bills[bKey].date = s.date;
    rec.products[s.name] = (rec.products[s.name]||0) + (Number(s.qty)||0);
  });
  Object.keys(map).forEach(key=>{
    const rec = map[key];
    const meta = CUSTOMERS[key] || {};
    rec.favorite = !!meta.favorite;
    rec.color = meta.color || null;

    const billsList = Object.values(rec.bills).sort((a,b)=> a.date<b.date?-1:(a.date>b.date?1:0));
    rec.billsList = billsList;
    rec.billCount = billsList.length;
    rec.topProducts = Object.entries(rec.products).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,qty])=>({name,qty}));
    rec.boughtNames = Object.keys(rec.products);
    delete rec.bills; delete rec.products;

    // follow-up: average days between distinct purchase dates → expected purchase cycle
    const uniqDates = Array.from(new Set(billsList.map(b=>b.date))).sort();
    let avgCycleDays = null;
    if(uniqDates.length >= 2){
      let gapSum = 0;
      for(let i=1;i<uniqDates.length;i++){ gapSum += daysBetween(uniqDates[i-1], uniqDates[i]); }
      avgCycleDays = Math.round(gapSum/(uniqDates.length-1));
    }
    rec.avgCycleDays = avgCycleDays;
    rec.daysSinceLast = daysBetween(rec.lastDate, todayISO());
    if(avgCycleDays===null || avgCycleDays<=0) rec.followStatus = 'new';
    else if(rec.daysSinceLast >= avgCycleDays*1.4) rec.followStatus = 'overdue';
    else if(rec.daysSinceLast >= avgCycleDays*0.9) rec.followStatus = 'due';
    else rec.followStatus = 'ok';
  });
  return Object.values(map);
}
function computeOverallProductPopularity(){
  const agg = {};
  SALES.forEach(s=>{ agg[s.name] = (agg[s.name]||0) + (Number(s.qty)||0); });
  return Object.entries(agg).sort((a,b)=>b[1]-a[1]).map(([name,qty])=>({name,qty}));
}
function computeOpportunities(rec, limit=5){
  const bought = new Set(rec.boughtNames||[]);
  return computeOverallProductPopularity().filter(p=>!bought.has(p.name)).slice(0, limit);
}
const FOLLOW_BADGE = {
  overdue: {label:'หายไปนาน', cls:'follow-overdue', icon:ICONS.dotRed},
  due:     {label:'ใกล้ถึงรอบซื้อ', cls:'follow-due', icon:ICONS.dotYellow},
  ok:      {label:'', cls:'', icon:''},
  new:     {label:'', cls:'', icon:''}
};
function custRowHtml(c){
  const colorsHtml = c.favorite ? `<div class="cust-colors">${CUST_COLOR_PALETTE.map(p=>
    `<button type="button" class="cust-dot ${c.color===p.key?'active':''}" data-custkey="${escapeHtml(c.key)}" data-color="${p.key}" style="background:${p.val};"></button>`
  ).join('')}</div>` : '';
  const dotIndicator = c.favorite && c.color ? `<span class="swatch" style="background:${(CUST_COLOR_PALETTE.find(p=>p.key===c.color)||{}).val||'transparent'}; display:inline-block; margin-right:5px;"></span>` : '';
  const badge = FOLLOW_BADGE[c.followStatus] || FOLLOW_BADGE.ok;
  const badgeHtml = badge.label ? `<span class="follow-badge ${badge.cls}">${badge.icon} ${badge.label}</span>` : '';
  return `<div class="cust-row">
    <div class="cust-top">
      <button type="button" class="cust-star ${c.favorite?'on':''}" data-favkey="${escapeHtml(c.key)}" title="ลูกค้าประจำ">${c.favorite?ICONS.starFilled:ICONS.starOutline}</button>
      <div class="cust-info" data-detailkey="${escapeHtml(c.key)}">
        <div class="name">${dotIndicator}${escapeHtml(c.name||'(ไม่ระบุชื่อ)')}</div>
        <div class="sub">${c.phone?escapeHtml(c.phone):'ไม่มีเบอร์โทร'} · ซื้อล่าสุด ${formatDateTH(c.lastDate)}</div>
        ${badgeHtml}
      </div>
      <div class="cust-stats" data-detailkey="${escapeHtml(c.key)}">
        <div class="amt">${fmt(c.total)}฿</div>
        <div class="cnt">${c.count} รายการ</div>
      </div>
    </div>
    ${colorsHtml}
  </div>`;
}
function renderCustomers(){
  const list = aggregateCustomers();
  document.getElementById('custTotalCount').textContent = list.length;
  document.getElementById('custFavCount').textContent = list.filter(c=>c.favorite).length;
  const dueList = list.filter(c=>c.followStatus==='due'||c.followStatus==='overdue')
    .sort((a,b)=>{
      if(a.followStatus!==b.followStatus) return a.followStatus==='overdue'?-1:1;
      return b.daysSinceLast-a.daysSinceLast;
    });
  document.getElementById('custFollowCount').textContent = dueList.length;
  const followBox = document.getElementById('custFollowList');
  followBox.innerHTML = dueList.length
    ? dueList.slice(0,10).map(custRowHtml).join('')
    : '<div class="empty">ยังไม่มีลูกค้าที่ถึงรอบหรือหายไปนาน</div>';
  followBox.querySelectorAll('[data-detailkey]').forEach(el=>el.addEventListener('click', ()=>openCustomerDetail(el.dataset.detailkey)));
  followBox.querySelectorAll('[data-favkey]').forEach(btn=>btn.addEventListener('click', (e)=>{ e.stopPropagation(); toggleCustomerFavorite(btn.dataset.favkey); }));

  const q = (document.getElementById('custSearch').value||'').trim().toLowerCase();
  const filtered = (q ? list.filter(c=>(c.name||'').toLowerCase().includes(q) || (c.phone||'').includes(q)) : list)
    .sort((a,b)=>{ if(a.favorite!==b.favorite) return a.favorite?-1:1; return b.total-a.total; });
  const container = document.getElementById('custList');
  if(!filtered.length){ container.innerHTML = '<div class="empty">ยังไม่มีข้อมูลลูกค้า — กรอกชื่อ/เบอร์ตอนบันทึกยอดขายเพื่อเริ่มเก็บฐานลูกค้า</div>'; return; }
  container.innerHTML = filtered.map(custRowHtml).join('');
  container.querySelectorAll('[data-favkey]').forEach(btn=>btn.addEventListener('click', (e)=>{ e.stopPropagation(); toggleCustomerFavorite(btn.dataset.favkey); }));
  container.querySelectorAll('[data-custkey]').forEach(btn=>btn.addEventListener('click', (e)=>{ e.stopPropagation(); setCustomerColor(btn.dataset.custkey, btn.dataset.color); }));
  container.querySelectorAll('[data-detailkey]').forEach(el=>el.addEventListener('click', ()=>openCustomerDetail(el.dataset.detailkey)));
}
function openCustomerDetail(key){
  const rec = aggregateCustomers().find(c=>c.key===key);
  if(!rec) return;
  const oppos = computeOpportunities(rec, 5);
  document.getElementById('custDetailName').textContent = rec.name || '(ไม่ระบุชื่อ)';
  document.getElementById('custDetailPhone').textContent = rec.phone ? rec.phone : 'ไม่มีเบอร์โทร';
  document.getElementById('custDetailTotal').textContent = fmt(rec.total)+'฿';
  document.getElementById('custDetailBills').textContent = rec.billCount+' บิล';
  document.getElementById('custDetailLast').textContent = formatDateTH(rec.lastDate);
  document.getElementById('custDetailCycle').textContent = rec.avgCycleDays ? ('ทุก ~'+rec.avgCycleDays+' วัน') : 'ข้อมูลยังไม่พอ';
  const badge = FOLLOW_BADGE[rec.followStatus] || FOLLOW_BADGE.ok;
  const statusEl = document.getElementById('custDetailStatus');
  statusEl.innerHTML = badge.label ? (badge.icon+' '+badge.label+' · ห่างจากซื้อล่าสุด '+rec.daysSinceLast+' วัน') : ('ยังอยู่ในรอบปกติ · ห่างจากซื้อล่าสุด '+rec.daysSinceLast+' วัน');
  statusEl.className = 'hint '+(badge.cls||'');

  const topBox = document.getElementById('custDetailTopProducts');
  topBox.innerHTML = rec.topProducts.length
    ? rec.topProducts.map(p=>`<div class="list-row"><div class="info"><div class="name">${escapeHtml(p.name)}</div></div><div class="amt">${p.qty} ชิ้น</div></div>`).join('')
    : '<div class="empty">ยังไม่มีข้อมูล</div>';

  const oppoBox = document.getElementById('custDetailOpportunities');
  oppoBox.innerHTML = oppos.length
    ? oppos.map(p=>`<div class="list-row"><div class="info"><div class="name">${escapeHtml(p.name)}</div><div class="sub">ยังไม่เคยซื้อ · ร้านขายได้ ${p.qty} ชิ้น</div></div></div>`).join('')
    : '<div class="empty">ลูกค้าซื้อครบเกือบทุกสินค้ายอดนิยมแล้ว</div>';

  const billsBox = document.getElementById('custDetailBillsList');
  const recentBills = rec.billsList.slice(-10).reverse();
  billsBox.innerHTML = recentBills.length
    ? recentBills.map(b=>`<div class="list-row">
        <div class="info">
          <div class="name">${formatDateTH(b.date)}</div>
          <div class="sub">${b.items.map(it=>escapeHtml(it.name)+' x'+it.qty).join(', ')}</div>
        </div>
        <div class="amt">${fmt(b.total)}฿</div>
      </div>`).join('')
    : '<div class="empty">ยังไม่มีประวัติการซื้อ</div>';

  document.getElementById('custDetailModalBg').classList.add('show');
}
document.getElementById('closeCustDetailBtn').addEventListener('click', ()=>{
  document.getElementById('custDetailModalBg').classList.remove('show');
});
document.getElementById('custDetailModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='custDetailModalBg') e.currentTarget.classList.remove('show');
});
async function toggleCustomerFavorite(key){
  if(!CUSTOMERS[key]){
    const rec = aggregateCustomers().find(c=>c.key===key);
    CUSTOMERS[key] = {name:(rec&&rec.name)||'', phone:(rec&&rec.phone)||'', favorite:false, color:null};
  }
  CUSTOMERS[key].favorite = !CUSTOMERS[key].favorite;
  if(!CUSTOMERS[key].favorite) CUSTOMERS[key].color = null;
  await saveCustomers();
  renderCustomers();
}
async function setCustomerColor(key, color){
  if(!CUSTOMERS[key]) return;
  CUSTOMERS[key].color = CUSTOMERS[key].color===color ? null : color;
  await saveCustomers();
  renderCustomers();
}
document.getElementById('custSearch').addEventListener('input', renderCustomers);

async function exportCustomersExcel(){
  if(typeof XLSX==='undefined'){ toast('ไม่สามารถโหลดระบบ Excel ได้ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่'); return; }
  const list = aggregateCustomers().sort((a,b)=>{ if(a.favorite!==b.favorite) return a.favorite?-1:1; return b.total-a.total; });
  if(!list.length){ toast('ยังไม่มีข้อมูลลูกค้าให้ส่งออก'); return; }
  const colorLabel = {ochre:'เหลือง', teal:'ฟ้า', clay:'แดง', moss:'เขียว'};
  const rows = list.map((c,i)=>({
    'ลำดับ':i+1, 'ชื่อลูกค้า':c.name||'', 'เบอร์โทร':c.phone||'',
    'ลูกค้าประจำ':c.favorite?'ใช่':'', 'สี':c.color?(colorLabel[c.color]||c.color):'',
    'จำนวนบิล':c.count, 'ยอดซื้อสะสม':c.total, 'ซื้อล่าสุด':c.lastDate
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{wch:8},{wch:28},{wch:16},{wch:12},{wch:10},{wch:12},{wch:16},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws, 'ฐานลูกค้า');
  const fileName = `NIPPON-SALE-ฐานลูกค้า-${todayISO()}.xlsx`;
  XLSX.writeFile(wb, fileName, {compression:true});
  await addAudit('ส่งออกฐานลูกค้า', `ไฟล์ ${fileName} · ${rows.length} ราย`);
  toast('ส่งออกฐานลูกค้าแล้ว — ไฟล์อยู่ใน Downloads');
}
document.getElementById('exportCustomersBtn').addEventListener('click', exportCustomersExcel);
document.getElementById('exportStockCountBtn').addEventListener('click', exportStockCountSheet);

async function deleteSaleEntry(id){
  const idx = SALES.findIndex(s=>s.id===id);
  if(idx < 0) return;
  const entry = SALES[idx];
  if(entry.seed){ toast('รายการย้อนหลังจากไฟล์เดิมไม่สามารถลบได้'); return; }
  if(!confirm('ลบรายการนี้ใช่หรือไม่?')) return;
  const row = findProductRow(entry.sku, entry.name, entry.size, entry.base);
  if(row){
    row.sold = Math.max(0, (Number(row.sold)||0) - entry.qty);
    row.remain = (Number(row.remain)||0) + entry.qty;
  }
  SALES.splice(idx,1);
  midxRemove(entry);
  await saveSales(); await saveProducts();
  toast('ลบรายการแล้ว');
  renderRecent(); renderGauge(); renderDashboard();
}

