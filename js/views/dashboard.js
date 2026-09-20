/* NIPPON SALE — js/views/dashboard.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= dashboard ================= */
function renderDashboard(){
  const today = todayISO();
  const mKey = monthKey(today);
  const dashMKey = DASH_MONTH || mKey; // month picked in the header selector; defaults to current month
  const todaySales = getDaySales(today);
  const monthSales = getMonthSales(mKey);
  const monthTotal = monthSales.reduce((a,s)=>a+s.total,0);
  const target = getMonthTarget(mKey);

  const overviewSales = getMonthSales(dashMKey);
  const overviewTotal = overviewSales.reduce((a,s)=>a+s.total,0);
  const overviewTarget = getMonthTarget(dashMKey);

  document.getElementById('dashToday').textContent = fmt(todaySales.reduce((a,s)=>a+s.total,0));
  document.getElementById('dashTodayQty').textContent = fmt(todaySales.reduce((a,s)=>a+s.qty,0));
  document.getElementById('dashMonth').textContent = fmt(overviewTotal);
  const pct = overviewTarget>0 ? (overviewTotal/overviewTarget*100) : 0;
  const dashPctEl = document.getElementById('dashPct');
  dashPctEl.textContent = pct.toFixed(1)+'%';
  dashPctEl.classList.toggle('good', pct>=100);
  dashPctEl.classList.toggle('warn', pct<100 && pct<80);
  document.getElementById('dashMonthLbl').textContent = formatMonthTH(mKey);
  const dashMonthLbl2 = document.getElementById('dashMonthLbl2');
  if(dashMonthLbl2) dashMonthLbl2.textContent = formatMonthTH(mKey);
  const dashMonthLbl3 = document.getElementById('dashMonthLbl3');
  if(dashMonthLbl3) dashMonthLbl3.textContent = formatMonthTH(dashMKey);
  const dashMonthLbl4 = document.getElementById('dashMonthLbl4');
  if(dashMonthLbl4) dashMonthLbl4.textContent = formatMonthTH(dashMKey);
  renderHdrMonthSelect();
  renderProductDonut(dashMKey);
  renderDashRecentSalesTable();
  renderHdrBell();

  maybeCelebrateTarget();

  // 5-tier target table
  const tierBox = document.getElementById('tierTable');
  tierBox.innerHTML = TIER_PCTS.map(p=>{
    const tierTarget = Math.round(target*p);
    const reached = monthTotal >= tierTarget;
    const gap = Math.max(0, tierTarget - monthTotal);
    const progress = tierTarget>0 ? Math.min(100, monthTotal/tierTarget*100) : 0;
    const isPassLevel = p === 0.8;
    return `
    <div class="tier-row ${reached?'reached':''} ${isPassLevel?'pass':''}">
      <div class="tier-pct">${Math.round(p*100)}%</div>
      <div class="tier-body">
        <div class="amt">฿${fmt(tierTarget)} ${isPassLevel?'· ผ่านเกณฑ์':''}</div>
        <div class="gap">${reached ? 'ถึงเป้าแล้ว' : 'ขาดอีก ฿'+fmt(gap)+' ('+progress.toFixed(0)+'%)'}</div>
      </div>
      <div class="tier-badge ${reached?'done':'pend'}">${reached?'ถึงแล้ว':progress.toFixed(0)+'%'}</div>
    </div>`;
  }).join('');

  // top sellers this month
  const agg = {};
  monthSales.forEach(s=>{
    const key = s.name+'|'+s.size+'|'+s.base;
    if(!agg[key]) agg[key] = {name:s.name, size:s.size, base:s.base, qty:0, total:0};
    agg[key].qty += s.qty; agg[key].total += s.total;
  });
  const top = Object.values(agg).sort((a,b)=>b.qty-a.qty).slice(0,5);
  const topBox = document.getElementById('topSellers');
  if(!top.length){ topBox.innerHTML = '<div class="empty">ยังไม่มีข้อมูลยอดขายเดือนนี้</div>'; }
  else{
    topBox.innerHTML = top.map((t,i)=>`
      <div class="list-row">
        <div class="rank">${i+1}</div>
        <div class="info">
          <div class="name">${t.name} ${t.size} ${t.base}</div>
          <div class="sub">ขายไป ${t.qty} ชิ้น</div>
        </div>
        <div class="amt">${fmt(t.total)}฿</div>
      </div>
    `).join('');
  }

  // product intelligence: this month vs last month qty per product line
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const lastMKey = lastMonthDate.getFullYear()+'-'+String(lastMonthDate.getMonth()+1).padStart(2,'0');
  const lastMonthSales = getMonthSales(lastMKey);
  const lastAgg = {};
  lastMonthSales.forEach(s=>{
    const key = s.name+'|'+s.size+'|'+s.base;
    lastAgg[key] = (lastAgg[key]||0) + s.qty;
  });
  const piBox = document.getElementById('productIntel');
  if(piBox){
    const changes = Object.keys(agg).map(key=>{
      const cur = agg[key]; const prevQty = lastAgg[key]||0;
      return {...cur, prevQty, diff: cur.qty - prevQty};
    });
    const rising = changes.filter(c=>c.prevQty>0 ? c.qty > c.prevQty*1.2 : c.qty>=3).sort((a,b)=>b.diff-a.diff).slice(0,3);
    const falling = changes.filter(c=>c.prevQty>0 && c.qty < c.prevQty*0.7).sort((a,b)=>a.diff-b.diff).slice(0,3);
    if(!rising.length && !falling.length){
      piBox.innerHTML = '<div class="empty">ยังไม่มีข้อมูลพอเปรียบเทียบ (ต้องมียอดเดือนก่อนหน้า)</div>';
    } else {
      let html = '';
      if(rising.length){
        html += `<div class="hint" style="margin:6px 0 2px;">${ICONS.trendUp} ยอดกำลังเพิ่มขึ้น</div>` + rising.map(c=>`
          <div class="list-row"><div class="info"><div class="name">${c.name} ${c.size} ${c.base}</div><div class="sub">เดือนก่อน ${c.prevQty} → เดือนนี้ ${c.qty}</div></div></div>`).join('');
      }
      if(falling.length){
        html += `<div class="hint" style="margin:10px 0 2px;">${ICONS.trendDown} ยอดกำลังลดลง</div>` + falling.map(c=>`
          <div class="list-row"><div class="info"><div class="name">${c.name} ${c.size} ${c.base}</div><div class="sub">เดือนก่อน ${c.prevQty} → เดือนนี้ ${c.qty}</div></div></div>`).join('');
      }
      piBox.innerHTML = html;
    }
  }

  // stock intelligence: oversold (remain<0) + low-stock-about-to-run-out (avg sold/day over last 14 days)
  const recentCutoff = new Date(); recentCutoff.setDate(recentCutoff.getDate()-14);
  const recentCutoffStr = recentCutoff.getFullYear()+'-'+String(recentCutoff.getMonth()+1).padStart(2,'0')+'-'+String(recentCutoff.getDate()).padStart(2,'0');
  const recentSold = {}; // sku|name|size|base -> qty sold in last 14 days
  getSalesSince(recentCutoffStr).forEach(s=>{
    const key = s.sku||(s.name+'|'+s.size+'|'+s.base);
    recentSold[key] = (recentSold[key]||0) + s.qty;
  });
  const oversold = PRODUCTS.filter(r=>r.name && Number(r.remain) < 0);
  const lowStock = PRODUCTS.filter(r=>{
    if(!r.name || Number(r.remain) < 0) return false;
    const key = r.sku||(r.name+'|'+r.size+'|'+r.base);
    const avgPerDay = (recentSold[key]||0) / 14;
    if(avgPerDay <= 0) return false;
    const daysLeft = Number(r.remain) / avgPerDay;
    return daysLeft <= 3;
  }).map(r=>{
    const key = r.sku||(r.name+'|'+r.size+'|'+r.base);
    const avgPerDay = (recentSold[key]||0) / 14;
    const daysLeft = avgPerDay>0 ? Number(r.remain)/avgPerDay : 999;
    return {r, avgPerDay, daysLeft, reorderQty: Math.max(1, Math.ceil(avgPerDay*14))};
  }).sort((a,b)=>a.daysLeft-b.daysLeft);
  const abox = document.getElementById('restockAlert');
  if(!oversold.length && !lowStock.length){ abox.innerHTML = '<div class="empty">สต็อกยังอยู่ในเกณฑ์ปกติ</div>'; }
  else{
    let html = oversold.slice(0,6).map(r=>`
      <div class="list-row">
        <div class="info"><div class="name">${r.name} ${r.size} ${r.base}</div><div class="sub">คงเหลือ ${r.remain}</div></div>
        <div class="status-tag status-over">ขาด ${Math.abs(r.remain)}</div>
      </div>`).join('');
    html += lowStock.slice(0,6).map(x=>`
      <div class="list-row">
        <div class="info"><div class="name">${x.r.name} ${x.r.size} ${x.r.base}</div><div class="sub">เหลือ ${x.r.remain} · ขายเฉลี่ย ${x.avgPerDay.toFixed(1)}/วัน · คาดหมดใน ${Math.max(0,Math.round(x.daysLeft))} วัน</div></div>
        <div class="status-tag status-low">แนะนำเติม ${x.reorderQty}</div>
      </div>`).join('');
    abox.innerHTML = html;
  }

  renderDailyTrend(dashMKey);
  renderRecentEdits();
  renderActionCenter();
}
function computeSalesPaceStatus(mKeyParam){
  const now = new Date();
  const mKey = mKeyParam || monthKey(todayISO());
  const isCurrentMonth = mKey === monthKey(todayISO());
  const [yy,mm] = mKey.split('-').map(Number);
  const dim = daysInMonth(yy, mm);
  const todayNum = isCurrentMonth ? now.getDate() : dim;
  const daily = [];
  for(let d=1; d<=dim; d++){
    const dateStr = mKey+'-'+String(d).padStart(2,'0');
    const total = getDaySales(dateStr).reduce((a,s)=>a+s.total,0);
    daily.push({d, total, isFuture: isCurrentMonth && d>todayNum});
  }
  const soFar = daily.filter(x=>!x.isFuture);
  const soFarTotal = soFar.reduce((a,x)=>a+x.total,0);
  const daysPassed = Math.min(todayNum, dim);
  const avgPerDay = daysPassed>0 ? soFarTotal/daysPassed : 0;
  const forecastTotal = isCurrentMonth ? Math.round(avgPerDay*dim) : soFarTotal;
  const target = getMonthTarget(mKey);
  const expectedToDate = isCurrentMonth ? Math.round(target*daysPassed/dim) : target;
  const paceGap = soFarTotal - expectedToDate;
  let status, statusCls, statusReason;
  if(!isCurrentMonth){
    if(target>0 && soFarTotal>=target){
      status=ICONS.checkCircle+' ถึงเป้าหมายเดือนนี้'; statusCls='status-ok';
      statusReason = `ทำได้ ${fmt(soFarTotal)} บาท จากเป้า ${fmt(target)} บาท`;
    } else {
      status='สรุปยอดเดือนนี้'; statusCls = (target>0 && soFarTotal>=target*0.9) ? 'status-low' : 'status-over';
      statusReason = target>0 ? `ทำได้ ${fmt(soFarTotal)} บาท (${(soFarTotal/target*100).toFixed(0)}% ของเป้า ${fmt(target)} บาท)` : `ทำได้ ${fmt(soFarTotal)} บาท`;
    }
  } else if(forecastTotal >= target){
    status=ICONS.dotGreen+' มีโอกาสถึงเป้า'; statusCls='status-ok';
    statusReason = paceGap>=0 ? `ตอนนี้เร็วกว่าจังหวะที่ควรทำ ${fmt(Math.abs(paceGap))} บาท` : `แม้จะช้ากว่าจังหวะอยู่ ${fmt(Math.abs(paceGap))} บาท แต่แนวโน้มยังพอไปถึงเป้าได้`;
  } else if(forecastTotal >= target*0.9){
    status=ICONS.dotYellow+' ต้องเร่งยอด'; statusCls='status-low';
    statusReason = `ช้ากว่าจังหวะที่ควรทำอยู่ ${fmt(Math.abs(paceGap))} บาท ต้องเพิ่มยอดเฉลี่ย/วันอีกเล็กน้อยถึงจะถึงเป้า`;
  } else {
    status=ICONS.dotRed+' มีความเสี่ยงไม่ถึงเป้า'; statusCls='status-over';
    statusReason = `ช้ากว่าจังหวะที่ควรทำอยู่ ${fmt(Math.abs(paceGap))} บาท ตามจังหวะนี้คาดจะได้แค่ ${fmt(forecastTotal)} บาท (${target>0?(forecastTotal/target*100).toFixed(0):0}% ของเป้า)`;
  }
  return {daily, mKey, dim, todayNum, soFarTotal, daysPassed, avgPerDay, forecastTotal, target, expectedToDate, paceGap, status, statusCls, statusReason, isCurrentMonth};
}
function renderDailyTrend(mKeyParam){
  const box = document.getElementById('dailyTrendBars');
  if(!box) return;
  const pace = computeSalesPaceStatus(mKeyParam);
  const lblBox = document.getElementById('dailyTrendMonthLbl');
  if(lblBox) lblBox.textContent = formatMonthTH(pace.mKey);

  const maxVal = Math.max(1, ...pace.daily.map(x=>x.total));
  box.innerHTML = pace.daily.map(x=>{
    const h = x.total>0 ? Math.max(4, Math.round(x.total/maxVal*140)) : (x.isFuture?2:3);
    const cls = x.isFuture ? 'future' : (x.total>0 ? 'has' : '');
    const showLabel = (x.d===1 || x.d===pace.dim || x.d%5===0);
    return `<div class="bar-col daily">
      <div class="bar ${cls}" style="height:${h}px;" title="วันที่ ${x.d}: ${fmt(x.total)} บาท"></div>
      <div class="mlabel">${showLabel?x.d:'&nbsp;'}</div>
    </div>`;
  }).join('');

  const fcBox = document.getElementById('dailyTrendForecast');
  if(fcBox){
    if(pace.isCurrentMonth){
      fcBox.innerHTML = `
        <span class="p-lbl">คาดการณ์ยอดขายสิ้นเดือน (ตามจังหวะเฉลี่ยที่ทำได้)</span><span class="p-val">${fmt(pace.forecastTotal)}</span><span class="p-unit">บาท</span>
        <div class="status-tag ${pace.statusCls}" style="display:inline-block; margin-top:8px;">${pace.status}</div>
        <div class="hint" style="margin-top:6px;">ควรทำได้ ณ วันนี้ ฿${fmt(pace.expectedToDate)} · ทำจริง ฿${fmt(pace.soFarTotal)}<br>${pace.statusReason}</div>`;
    } else {
      fcBox.innerHTML = `
        <span class="p-lbl">ยอดขายรวมเดือนนี้</span><span class="p-val">${fmt(pace.soFarTotal)}</span><span class="p-unit">บาท</span>
        <div class="status-tag ${pace.statusCls}" style="display:inline-block; margin-top:8px;">${pace.status}</div>
        <div class="hint" style="margin-top:6px;">${pace.statusReason}</div>`;
    }
  }
}

/* ================= product-share donut (dashboard) ================= */
function categorizeProduct(name){
  name = name || '';
  if(name.indexOf('ภายใน')>=0) return {label:'สีภายใน', color:'#2f6fed'};
  if(name.indexOf('ภายนอก')>=0) return {label:'สีภายนอก', color:'#3f7fd9'};
  if(name.indexOf('รองพื้น')>=0) return {label:'สีรองพื้น', color:'#1fae6c'};
  if(name.indexOf('สเปรย์')>=0 || name.indexOf('กระป๋อง')>=0 || name.indexOf('อะคริลิค')>=0 || name.indexOf('Wall Filler')>=0) return {label:'อุปกรณ์เสริม', color:'#e8874a'};
  if(name.indexOf('เคลือบ')>=0 || name.indexOf('แลคเกอร์')>=0 || name.indexOf('Epoxy')>=0 || name.indexOf('หลังคา')>=0 || name.indexOf('กันซึม')>=0) return {label:'สีเคลือบ/กันซึม', color:'#ef5a4c'};
  return {label:'อื่นๆ', color:'#9a7fd8'};
}
function renderProductDonut(mKey){
  const box = document.getElementById('productDonutCard');
  if(!box) return;
  const sales = getMonthSales(mKey).filter(s=>s.total>0);
  const totals = {};
  sales.forEach(s=>{
    const cat = categorizeProduct(s.name);
    if(!totals[cat.label]) totals[cat.label] = {label:cat.label, color:cat.color, amount:0};
    totals[cat.label].amount += s.total;
  });
  const arr = Object.values(totals).sort((a,b)=>b.amount-a.amount);
  const grandTotal = arr.reduce((a,x)=>a+x.amount,0);
  if(!arr.length || grandTotal<=0){
    box.innerHTML = '<div class="empty" style="padding:24px 0; text-align:center;">ยังไม่มีข้อมูลยอดขายเดือนนี้</div>';
    return;
  }
  const R = 70, C = 2*Math.PI*R;
  let offset = 0;
  const circles = arr.map(x=>{
    const frac = x.amount/grandTotal;
    const len = frac*C;
    const seg = `<circle cx="84" cy="84" r="${R}" fill="none" stroke="${x.color}" stroke-width="20" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-offset}"/>`;
    offset += len;
    return seg;
  }).join('');
  const legendHtml = arr.map(x=>{
    const pct = (x.amount/grandTotal*100).toFixed(1);
    return `<div class="dl-row"><span class="dl-sw" style="background:${x.color};"></span><span class="dl-name">${escapeHtml(x.label)}</span><span class="dl-pct">${pct}%</span><span class="dl-amt">฿${fmt(x.amount)}</span></div>`;
  }).join('');
  box.innerHTML = `
    <div class="donut-wrap">
      <svg viewBox="0 0 168 168">${circles}</svg>
      <div class="donut-center">
        <div class="dc-val">฿${fmt(grandTotal)}</div>
        <div class="dc-lbl">ยอดขายรวม</div>
      </div>
    </div>
    <div class="donut-legend">${legendHtml}</div>`;
}

/* ================= full-width recent sales table (dashboard) ================= */
function renderDashRecentSalesTable(){
  const wrap = document.getElementById('dashRecentTableWrap');
  if(!wrap) return;
  const sorted = SALES.slice().sort((a,b)=>{
    if(a.date!==b.date) return b.date.localeCompare(a.date);
    return String(b.id).localeCompare(String(a.id));
  });
  const groups = [];
  const seenBill = {};
  sorted.forEach(s=>{
    if(s.billId && seenBill[s.billId]){
      const g = seenBill[s.billId];
      g.items.push(s); g.total += s.total; g.qty += s.qty;
      return;
    }
    const g = {billId:s.billId, date:s.date, items:[s], total:s.total, qty:s.qty, customerName:s.customerName||'', firstId:s.id};
    if(s.billId) seenBill[s.billId] = g;
    groups.push(g);
  });
  const top = groups.slice(0,8);
  if(!top.length){ wrap.innerHTML = '<div class="empty" style="padding:18px;">ยังไม่มีรายการขาย</div>'; return; }
  const rowsHtml = top.map((g,i)=>{
    const names = g.items.map(x=>x.name).filter((v,idx,arr)=>arr.indexOf(v)===idx);
    const nameDisplay = escapeHtml(names.length>1 ? (names[0]+` +${names.length-1} รายการ`) : (names[0]||''));
    let dateDisplay = formatDateTH(g.date);
    const ts = Number(String(g.firstId).split('-')[0]);
    if(!g.items[0].seed && !isNaN(ts) && ts>1e12){
      const dt = new Date(ts);
      dateDisplay += ' ' + String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0');
    }
    return `<tr>
      <td>${i+1}</td>
      <td>${dateDisplay}</td>
      <td>${nameDisplay}</td>
      <td>${g.qty}</td>
      <td>฿${fmt(g.total)}</td>
      <td><span class="status-badge status-ok">${ICONS.check} สำเร็จ</span></td>
      <td><button class="table-action-btn" data-viewsale="${g.firstId}">ดูรายละเอียด</button></td>
    </tr>`;
  }).join('');
  wrap.innerHTML = `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr>
          <th>#</th><th>วันที่</th><th>สินค้า</th><th>จำนวน</th><th>ยอดขาย</th><th>สถานะ</th><th>การดำเนินการ</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
  wrap.querySelectorAll('[data-viewsale]').forEach(b=>b.addEventListener('click', ()=>editSaleEntry(b.dataset.viewsale)));
}

