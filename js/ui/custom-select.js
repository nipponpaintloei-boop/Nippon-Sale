/* NIPPON SALE — js/ui/custom-select.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= EXTRA: generic custom-select enhancer =================
   Wraps every remaining native <select> in the app with the same premium
   dropdown style/behaviour used above for the PC headcount select, while
   keeping the original <select> element (same id) alive and hidden so all
   existing code that reads/sets .value, .disabled, .innerHTML or listens
   for 'change' keeps working exactly as before. */
window.CSELECT_API = window.CSELECT_API || {};
function enhanceCSelect(selectId){
  const select = document.getElementById(selectId);
  if(!select) return;
  const wrap = select.closest('.cselect');
  if(!wrap) return;
  const trigger = wrap.querySelector('.pc-select-trigger');
  const valueEl = wrap.querySelector('.pc-select-value');
  const menu = wrap.querySelector('.pc-select-menu');

  function buildMenu(){
    menu.innerHTML = Array.from(select.options).map((opt,i)=>`
      <div class="pc-select-option${i===select.selectedIndex?' active':''}" data-idx="${i}" role="option">
        <span>${opt.textContent}</span>
        <svg class="pc-select-check" width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5L5 9.5L13 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    `).join('');
    menu.querySelectorAll('.pc-select-option').forEach(optEl=>{
      optEl.addEventListener('click', ()=>{
        const idx = Number(optEl.dataset.idx);
        if(select.selectedIndex !== idx){
          select.selectedIndex = idx;
          select.dispatchEvent(new Event('change', {bubbles:true}));
        }
        syncDisplay();
        setTimeout(closeMenu, 150);
      });
    });
  }
  function syncDisplay(){
    const opt = select.options[select.selectedIndex];
    valueEl.textContent = opt ? opt.textContent : '';
    trigger.disabled = select.disabled;
    menu.querySelectorAll('.pc-select-option').forEach(optEl=>{
      optEl.classList.toggle('active', Number(optEl.dataset.idx)===select.selectedIndex);
    });
  }
  function openMenu(){
    if(select.disabled) return;
    wrap.classList.add('open');
    trigger.setAttribute('aria-expanded','true');
  }
  function closeMenu(){
    wrap.classList.remove('open');
    trigger.setAttribute('aria-expanded','false');
  }

  trigger.addEventListener('click', (e)=>{
    e.stopPropagation();
    if(select.disabled) return;
    wrap.classList.contains('open') ? closeMenu() : openMenu();
  });
  document.addEventListener('click', (e)=>{
    if(!wrap.contains(e.target)) closeMenu();
  });

  // catch options being rebuilt (innerHTML=...) or disabled toggled elsewhere
  const obs = new MutationObserver(()=>{ buildMenu(); syncDisplay(); });
  obs.observe(select, {childList:true, subtree:true, attributes:true, attributeFilter:['disabled']});
  select.addEventListener('change', syncDisplay);

  // catch plain `select.value = ...` assignments (no DOM mutation happens for those)
  const nativeDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(select, 'value', {
    configurable:true,
    get(){ return nativeDesc.get.call(select); },
    set(v){ nativeDesc.set.call(select, v); syncDisplay(); }
  });

  buildMenu();
  syncDisplay();
  window.CSELECT_API[selectId] = {open:openMenu, close:closeMenu};
}
['sizeSelect','baseSelect','colorNoSelect','histMonth','histMonthSort','commMonthSelect','commModeSelect','targetMonthSelect','ruleSizeSelect'].forEach(enhanceCSelect);
function openCSelect(selectId){
  const api = window.CSELECT_API[selectId];
  if(api) api.open();
}

function renderCommissionMonthOptions(){
  const sel = document.getElementById('commMonthSelect');
  const mSet = new Set(Object.keys(SETTINGS.targets||{}));
  SALES.forEach(s=>mSet.add(monthKey(s.date)));
  mSet.add(monthKey(todayISO()));
  const months = Array.from(mSet).sort().reverse();
  const prevVal = sel.value;
  sel.innerHTML = months.map(m=>`<option value="${m}">${formatMonthTH(m)}</option>`).join('');
  sel.value = months.includes(prevVal) ? prevVal : (months.includes(monthKey(todayISO())) ? monthKey(todayISO()) : months[0]);
}
function renderCommission(){
  const mode = document.getElementById('commModeSelect').value;
  const manualInputs = document.getElementById('commManualInputs');
  manualInputs.style.display = mode==='manual' ? '' : 'none';

  let target, sales, mKey = null;
  if(mode==='manual'){
    target = Number(document.getElementById('commManualTarget').value)||0;
    sales = Number(document.getElementById('commManualSales').value)||0;
  } else {
    mKey = document.getElementById('commMonthSelect').value || monthKey(todayISO());
    target = getMonthTarget(mKey);
    sales = getMonthSales(mKey).reduce((a,s)=>a+s.total,0);
  }
  const headcountInput = document.getElementById('commHeadcount');
  if(!headcountInput.value) headcountInput.value = Math.min(5, Math.max(1, SETTINGS.commHeadcount || 2));
  syncPcSelectDisplay(Number(headcountInput.value)||1);
  const headcount = Number(headcountInput.value)||1;

  const r = calcCommissionBreakdown(target, sales, headcount);

  document.getElementById('commTargetVal').textContent = fmt(target);
  document.getElementById('commSalesVal').textContent = fmt(sales);
  const pctEl = document.getElementById('commPctVal');
  pctEl.textContent = r.pct.toFixed(1)+'%';
  pctEl.classList.toggle('good', r.pct>=100);
  pctEl.classList.toggle('warn', r.pct<80);
  document.getElementById('commBandVal').textContent = r.inSpecialBand ? '200,000-400,000' : (target>0 ? 'นอกช่วง 200K-400K' : '—');

  const passTarget = target * 0.8;
  const passGap = Math.max(0, passTarget - sales);
  const gateBox = document.getElementById('commPassGate');
  gateBox.classList.toggle('done', target>0 && r.monthGoalReached);
  if(target<=0){
    gateBox.innerHTML = 'ยังไม่ได้ตั้งเป้าหมายเดือนนี้ — ตั้งเป้าก่อนเพื่อดูเกณฑ์รับค่าคอม';
  } else if(r.monthGoalReached){
    gateBox.innerHTML = `ผ่านเกณฑ์รับค่าคอมแล้ว ✓ ต้องทำยอดถึง <b>฿${fmt(passTarget)}</b> (80% ของเป้า ${fmt(target)} บาท) — ตอนนี้ทำได้ <b>฿${fmt(sales)}</b> แล้ว`;
  } else {
    gateBox.innerHTML = `ต้องทำยอดให้ถึง <b>฿${fmt(passTarget)}</b> (80% ของเป้า ${fmt(target)} บาท) จึงจะเริ่มได้ค่าคอม — ตอนนี้ขาดอีก <b>฿${fmt(passGap)}</b>`;
  }

  const rows = [
    {
      label: 'ค่าคอมหลัก (ตามเป้า)',
      note: target>0 ? `ทำได้ ${r.pct.toFixed(1)}% ของเป้า ${fmt(target)} บาท` : 'ยังไม่ได้ตั้งเป้า',
      amt: r.main, reached: r.main>0
    },
    {
      label: 'ค่าคอมพิเศษ (เป้า 200K-400K)',
      note: r.inSpecialBand ? `ทำได้ ${r.pct.toFixed(1)}% ของเป้า` : 'ใช้ได้เฉพาะเป้า 200,000-400,000 บาท',
      amt: r.special, reached: r.special>0
    },
    {
      label: 'ค่าคอมเพิ่ม sale ต่อคน',
      note: !r.monthGoalReached
        ? `ยังไม่ถึง 80% ของเป้า (ได้ ${r.pct.toFixed(1)}%) — ยังไม่จ่ายค่าคอมส่วนนี้`
        : (r.perHead>0
            ? `ยอดขายรวมร้าน ${fmt(sales)} ÷ ${r.headcount} คน = ${fmt(r.perPersonSales)} บาท/คน (จ่ายต่อคน)`
            : `ยอดขายรวมร้าน ${fmt(sales)} ÷ ${r.headcount} คน = ${fmt(r.perPersonSales)} บาท/คน — ยังไม่ถึง 200,000 บาท/คน จึงไม่จ่าย`),
      amt: r.perHead, reached: r.perHead>0
    }
  ];
  document.getElementById('commBreakdown').innerHTML = rows.map(row=>`
    <div class="tier-row ${row.reached?'reached pass':''}">
      <div class="tier-body">
        <div class="amt">${row.label}</div>
        <div class="gap">${row.note}</div>
      </div>
      <div class="tier-badge ${row.reached?'done':'pend'}">${fmt(row.amt)} บาท</div>
    </div>
  `).join('');

  document.getElementById('commTotalVal').textContent = fmt(r.total)+' บาท';

  renderGallonIncentive(mode, mKey, r);
}

