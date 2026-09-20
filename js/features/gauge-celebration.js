/* NIPPON SALE — js/features/gauge-celebration.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= gauge ================= */
function renderGauge(){
  const today = todayISO();
  const mKey = monthKey(today);
  const monthTotal = getMonthSales(mKey).reduce((a,s)=>a+s.total,0);
  const target = getMonthTarget(mKey);
  const pct = target > 0 ? Math.min(1, monthTotal/target) : 0;
  document.getElementById('monthTotal').textContent = fmt(monthTotal);
  document.getElementById('targetVal').textContent = fmt(target);
  document.getElementById('canPct').textContent = Math.round(pct*100)+'%';
  const wallTop = 6, wallBottom = 98;
  const maxH = wallBottom - wallTop; // 92
  const h = maxH*pct;
  const paintTop = wallBottom - h;
  const fillEl = document.getElementById('canFill');
  fillEl.setAttribute('height', h);
  fillEl.setAttribute('y', paintTop);
  const rollerHead = document.getElementById('rollerHead');
  if(rollerHead) rollerHead.setAttribute('transform', `translate(0,${paintTop})`);
  const waveWrap = document.getElementById('canWaveWrap');
  if(waveWrap){
    const spacing = 12;
    let lines = '';
    for(let y = wallBottom - spacing; y > paintTop; y -= spacing){
      lines += `<path d="M8 ${y} h60" stroke="rgba(0,0,0,0.10)" stroke-width="1.5"/>`;
    }
    waveWrap.innerHTML = lines;
  }

  // days context
  const now = new Date();
  const dim = daysInMonth(now.getFullYear(), now.getMonth()+1);
  const dailyTarget = target>0 ? target/dim : 0;
  const todayTotal = getDaySales(today).reduce((a,s)=>a+s.total,0);
  const reached = target>0 && monthTotal>=target;
  const gap = Math.max(0, target - monthTotal);
  const daysLeft = Math.max(1, dim - now.getDate() + 1); // includes today
  const pace = gap>0 ? gap/daysLeft : 0;

  // highlighted: ยอดที่ขาดอีกกว่าจะถึงเป้าเดือนนี้
  const gapEl = document.getElementById('monthGapLine');
  const gapValEl = document.getElementById('monthGapVal');
  if(gapEl){
    gapEl.classList.toggle('done', reached);
    if(reached){ gapEl.innerHTML = ICONS.party+' ถึงเป้าหมายเดือนนี้แล้ว!'; }
    else { gapEl.innerHTML = `ขาดอีก <b>${fmt(gap)}</b> บาท ถึงเป้า`; }
  }

  // prominent days-left-in-month countdown badge
  const dlBadge = document.getElementById('daysLeftBadge');
  if(dlBadge){
    document.getElementById('daysLeftNum').textContent = daysLeft;
    dlBadge.classList.remove('warn','urgent','done');
    if(reached){ dlBadge.classList.add('done'); }
    else if(daysLeft <= 3){ dlBadge.classList.add('urgent'); }
    else if(daysLeft <= 7){ dlBadge.classList.add('warn'); }
  }

  // highlighted: ยอดที่ต้องทำเฉลี่ยต่อวัน (จากวันที่เหลือในเดือน) เพื่อให้ถึงเป้า
  const paceEl = document.getElementById('paceLine');
  if(paceEl){
    if(reached){
      paceEl.style.display = 'none';
    } else {
      paceEl.style.display = '';
      paceEl.innerHTML = `<span class="p-lbl">ต้องทำเฉลี่ยต่อวัน เพื่อให้ถึงเป้า</span><span class="p-val">${fmt(Math.round(pace))}</span><span class="p-unit">บาท/วัน</span>`;
      paceEl.classList.toggle('urgent', dailyTarget>0 && pace > dailyTarget*1.25);
    }
  }

  // today's target chip
  const chip = document.getElementById('todayTargetChip');
  if(chip){
    chip.textContent = `เป้าวันนี้ ${fmt(todayTotal)}/${fmt(dailyTarget)}`;
    chip.classList.toggle('hit', dailyTarget>0 && todayTotal>=dailyTarget);
  }
}

/* ================= target celebration (confetti) ================= */
function maybeCelebrateTarget(){
  const mKey = monthKey(todayISO());
  const monthTotal = getMonthSales(mKey).reduce((a,s)=>a+s.total,0);
  const target = getMonthTarget(mKey);
  if(target>0 && monthTotal>=target && SETTINGS.celebratedMonth!==mKey){
    launchConfetti();
    SETTINGS.celebratedMonth = mKey;
    saveSettings();
  }
}
function launchConfetti(){
  const colors=['#c7995a','#6b9c93','#b5654e','#84a069','#eeebe3'];
  const container=document.createElement('div');
  container.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden;';
  document.body.appendChild(container);
  const count=60;
  for(let i=0;i<count;i++){
    const el=document.createElement('div');
    el.className='confetti-piece';
    const size=6+Math.random()*6;
    el.style.cssText=`top:-20px; left:${Math.random()*100}%; width:${size}px; height:${size*1.4}px; background:${colors[Math.floor(Math.random()*colors.length)]}; opacity:${(0.7+Math.random()*0.3).toFixed(2)}; border-radius:2px;`;
    const dur=1800+Math.random()*1400, delay=Math.random()*300, drift=(Math.random()*140-70);
    if(el.animate){
      el.animate([
        {transform:'translate(0,0) rotate(0deg)', opacity:1},
        {transform:`translate(${drift}px, 100vh) rotate(${360+Math.random()*360}deg)`, opacity:0}
      ], {duration:dur, delay, easing:'cubic-bezier(.2,.6,.4,1)', fill:'forwards'});
    }
    container.appendChild(el);
  }
  toast(ICONS.party+' ถึงเป้าหมาย 100% แล้ว!');
  setTimeout(()=>container.remove(), 3800);
}

document.getElementById('editTargetBtn').addEventListener('click', ()=>openTargetModal());
function openTargetModal(presetMonth){
  const sel = document.getElementById('targetMonthSelect');
  const mSet = new Set(Object.keys(SETTINGS.targets||{}));
  SALES.forEach(s=>mSet.add(monthKey(s.date)));
  mSet.add(monthKey(todayISO()));
  if(presetMonth) mSet.add(presetMonth);
  const months = Array.from(mSet).sort();
  sel.innerHTML = months.map(m=>`<option value="${m}">${formatMonthTH(m)}</option>`).join('');
  sel.value = (presetMonth && months.includes(presetMonth)) ? presetMonth : monthKey(todayISO());
  document.getElementById('targetInput').value = getMonthTarget(sel.value);
  document.getElementById('targetModalBg').classList.add('show');
}
document.getElementById('targetMonthSelect').addEventListener('change', (e)=>{
  document.getElementById('targetInput').value = getMonthTarget(e.target.value);
});
document.getElementById('saveTargetBtn').addEventListener('click', async ()=>{
  if(!(await ensurePin())) return;
  const mKey = document.getElementById('targetMonthSelect').value;
  const v = Number(document.getElementById('targetInput').value);
  if(v > 0){
    if(!SETTINGS.targets) SETTINGS.targets = {};
    const oldTarget = getMonthTarget(mKey);
    SETTINGS.targets[mKey] = v;
    SETTINGS.defaultTarget = v;
    await saveSettings();
    const targetBackdated = mKey !== monthKey(todayISO());
    await addAudit('แก้ไขเป้าหมาย', `${formatMonthTH(mKey)}: ${fmt(oldTarget)} → ${fmt(v)} บาท`, targetBackdated);
    renderGauge(); renderDashboard(); renderHistMonth();
    toast('บันทึกเป้าหมายแล้ว');
  }
  document.getElementById('targetModalBg').classList.remove('show');
});
document.getElementById('targetModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='targetModalBg') e.currentTarget.classList.remove('show');
});

