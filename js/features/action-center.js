/* NIPPON SALE — js/features/action-center.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= action center (Phase 4) ================= */
function computeActionItems(){
  const items = [];
  const today = todayISO();
  const mKey = monthKey(today);

  // sales pace
  const pace = computeSalesPaceStatus();
  if(pace.statusCls === 'status-over'){
    items.push({priority:1, icon:ICONS.trendDown, view:'dash', title:'ยอดขายเสี่ยงไม่ถึงเป้าเดือนนี้', detail:pace.statusReason});
  } else if(pace.statusCls === 'status-low'){
    items.push({priority:2, icon:ICONS.clock, view:'dash', title:'ต้องเร่งยอดขายให้ทันเป้า', detail:pace.statusReason});
  }

  // stock intelligence
  const recentCutoff = new Date(); recentCutoff.setDate(recentCutoff.getDate()-14);
  const recentCutoffStr = recentCutoff.getFullYear()+'-'+String(recentCutoff.getMonth()+1).padStart(2,'0')+'-'+String(recentCutoff.getDate()).padStart(2,'0');
  const recentSold = {};
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
    return (Number(r.remain) / avgPerDay) <= 3;
  });
  if(oversold.length) items.push({priority:1, icon:ICONS.box, view:'stock', title:`สินค้าติดลบสต็อก ${oversold.length} รายการ`, detail:oversold.slice(0,3).map(r=>r.name+' '+r.size+' '+r.base).join(', ')});
  if(lowStock.length) items.push({priority:2, icon:ICONS.box, view:'stock', title:`สต็อกใกล้หมด ${lowStock.length} รายการ`, detail:'คาดหมดภายใน 3 วัน ควรเติมด่วน'});

  // customer follow-up
  const custList = aggregateCustomers();
  const overdueCust = custList.filter(c=>c.followStatus==='overdue');
  const dueCust = custList.filter(c=>c.followStatus==='due');
  if(overdueCust.length) items.push({priority:1, icon:ICONS.user, view:'customers', title:`ลูกค้าหายไปนาน ${overdueCust.length} คน`, detail:overdueCust.slice(0,3).map(c=>c.name||'(ไม่ระบุชื่อ)').join(', ')});
  if(dueCust.length) items.push({priority:2, icon:ICONS.user, view:'customers', title:`ลูกค้าใกล้ถึงรอบซื้อ ${dueCust.length} คน`, detail:dueCust.slice(0,3).map(c=>c.name||'(ไม่ระบุชื่อ)').join(', ')});

  // commission pass-threshold proximity
  const monthSales = getMonthSales(mKey);
  const monthTotal = monthSales.reduce((a,s)=>a+s.total,0);
  const target = getMonthTarget(mKey);
  const passTarget = Math.round(target*0.8);
  if(target>0 && monthTotal < passTarget){
    const gap = passTarget - monthTotal;
    items.push({priority: gap <= passTarget*0.1 ? 1 : 3, icon:ICONS.money, view:'dash', title:'ยังไม่ถึงเกณฑ์ 80% รับค่าคอม', detail:`ขาดอีก ฿${fmt(gap)} ถึงจะเริ่มได้ค่าคอมมิชชั่นเดือนนี้`});
  }

  items.sort((a,b)=>a.priority-b.priority);
  return items;
}
const ACTION_PRIORITY_LABEL = {1:'เร่งด่วน', 2:'ควรดู', 3:'แจ้งเตือน'};
const ACTION_PRIORITY_CLS = {1:'status-over', 2:'status-low', 3:'status-ok'};
function actionItemHtml(it){
  return `<div class="list-row" data-gotoview="${it.view}" style="cursor:pointer;">
    <div class="info">
      <div class="name">${it.icon} ${escapeHtml(it.title)}</div>
      <div class="sub">${escapeHtml(it.detail||'')}</div>
    </div>
    <div class="status-tag ${ACTION_PRIORITY_CLS[it.priority]}">${ACTION_PRIORITY_LABEL[it.priority]}</div>
  </div>`;
}
function renderActionCenter(){
  const items = computeActionItems();
  const todayBox = document.getElementById('actionTodayCard');
  if(todayBox){
    todayBox.innerHTML = items.length ? items.map(actionItemHtml).join('') : `<div class="empty">${ICONS.party} วันนี้ไม่มีอะไรต้องเร่งจัดการ</div>`;
    todayBox.querySelectorAll('[data-gotoview]').forEach(el=>el.addEventListener('click', ()=>switchToView(el.dataset.gotoview)));
  }
}

/* ---- Daily Brief: shown once per day on open, summarizing today's picture ---- */
async function maybeShowDailyBrief(){
  const today = todayISO();
  if(SETTINGS.lastDailyBriefDate === today) return;
  const items = computeActionItems();
  const mKey = monthKey(today);
  const monthSales = getMonthSales(mKey);
  const monthTotal = monthSales.reduce((a,s)=>a+s.total,0);
  const target = getMonthTarget(mKey);
  const pct = target>0 ? (monthTotal/target*100) : 0;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yStr = yesterday.getFullYear()+'-'+String(yesterday.getMonth()+1).padStart(2,'0')+'-'+String(yesterday.getDate()).padStart(2,'0');
  const yTotal = getDaySales(yStr).reduce((a,s)=>a+s.total,0);

  document.getElementById('briefDate').textContent = formatDateTH(today);
  document.getElementById('briefYesterday').textContent = fmt(yTotal)+'฿';
  document.getElementById('briefMonthPct').textContent = pct.toFixed(1)+'%';
  const listBox = document.getElementById('briefActionList');
  const top = items.slice(0,4);
  listBox.innerHTML = top.length ? top.map(actionItemHtml).join('') : `<div class="empty">${ICONS.party} วันนี้ไม่มีอะไรต้องเร่งจัดการ</div>`;
  listBox.querySelectorAll('[data-gotoview]').forEach(el=>el.addEventListener('click', ()=>{
    document.getElementById('dailyBriefModalBg').classList.remove('show');
    switchToView(el.dataset.gotoview);
  }));
  document.getElementById('dailyBriefModalBg').classList.add('show');
  SETTINGS.lastDailyBriefDate = today;
  await storageSet(STORE_KEYS.settings, JSON.stringify(SETTINGS));
}
document.getElementById('closeDailyBriefBtn').addEventListener('click', ()=>{
  document.getElementById('dailyBriefModalBg').classList.remove('show');
});
document.getElementById('dailyBriefModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='dailyBriefModalBg') e.currentTarget.classList.remove('show');
});

/* ---- Weekly Review: on-demand summary comparing this week vs last week ---- */
function isoWeekRange(dateStr){
  // Monday-start week containing dateStr; returns {from, to} ISO date strings
  const d = new Date(dateStr+'T00:00:00');
  const dow = (d.getDay()+6)%7; // 0=Mon..6=Sun
  const monday = new Date(d); monday.setDate(d.getDate()-dow);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  const toISO = dt => dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  return {from:toISO(monday), to:toISO(sunday)};
}
function renderWeeklyReview(){
  const today = todayISO();
  const thisWeek = isoWeekRange(today);
  const lastWeekAnchor = new Date(today+'T00:00:00'); lastWeekAnchor.setDate(lastWeekAnchor.getDate()-7);
  const lastWeek = isoWeekRange(lastWeekAnchor.getFullYear()+'-'+String(lastWeekAnchor.getMonth()+1).padStart(2,'0')+'-'+String(lastWeekAnchor.getDate()).padStart(2,'0'));

  const thisWeekSales = getSalesInRange(thisWeek.from, thisWeek.to);
  const lastWeekSales = getSalesInRange(lastWeek.from, lastWeek.to);
  const thisTotal = thisWeekSales.reduce((a,s)=>a+s.total,0);
  const lastTotal = lastWeekSales.reduce((a,s)=>a+s.total,0);
  const changePct = lastTotal>0 ? ((thisTotal-lastTotal)/lastTotal*100) : (thisTotal>0?100:0);

  document.getElementById('weeklyRangeLbl').textContent = fmtThaiRange(thisWeek.from, thisWeek.to);
  document.getElementById('weeklyThisTotal').textContent = fmt(thisTotal)+'฿';
  document.getElementById('weeklyLastTotal').textContent = fmt(lastTotal)+'฿';
  const chEl = document.getElementById('weeklyChangePct');
  chEl.textContent = (changePct>=0?'+':'')+changePct.toFixed(1)+'%';
  chEl.className = 'val '+(changePct>=0?'good':'warn');

  const byDay = {};
  thisWeekSales.forEach(s=>{ byDay[s.date] = (byDay[s.date]||0)+s.total; });
  const bestDay = Object.entries(byDay).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('weeklyBestDay').textContent = bestDay ? (formatDateTH(bestDay[0])+' · ฿'+fmt(bestDay[1])) : 'ยังไม่มียอดขายสัปดาห์นี้';

  const agg = {};
  thisWeekSales.forEach(s=>{
    const key = s.name+'|'+s.size+'|'+s.base;
    if(!agg[key]) agg[key] = {name:s.name, size:s.size, base:s.base, qty:0};
    agg[key].qty += s.qty;
  });
  const topProduct = Object.values(agg).sort((a,b)=>b.qty-a.qty)[0];
  document.getElementById('weeklyTopProduct').textContent = topProduct ? `${topProduct.name} ${topProduct.size} ${topProduct.base} · ${topProduct.qty} ชิ้น` : 'ยังไม่มีข้อมูล';

  const custList = aggregateCustomers();
  const newCustThisWeek = custList.filter(c=>c.billsList.length && c.billsList[0].date>=thisWeek.from).length;
  const followBacklog = custList.filter(c=>c.followStatus==='due'||c.followStatus==='overdue').length;
  document.getElementById('weeklyNewCust').textContent = newCustThisWeek+' คน';
  document.getElementById('weeklyFollowBacklog').textContent = followBacklog+' คน';

  document.getElementById('weeklyReviewModalBg').classList.add('show');
}
document.getElementById('menuWeeklyReviewBtn').addEventListener('click', ()=>{
  document.getElementById('menuDrawerBg').classList.remove('show');
  renderWeeklyReview();
});
document.getElementById('closeWeeklyReviewBtn').addEventListener('click', ()=>{
  document.getElementById('weeklyReviewModalBg').classList.remove('show');
});
document.getElementById('weeklyReviewModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='weeklyReviewModalBg') e.currentTarget.classList.remove('show');
});

