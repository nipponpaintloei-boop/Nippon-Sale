/* NIPPON SALE — js/features/gallon-incentive.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= gallon incentive (per-month product incentive rules) ================= */
function calcGallonIncentive(mKey, headcount){
  const rules = (SETTINGS.gallonIncentives && SETTINGS.gallonIncentives[mKey]) || [];
  const monthSales = getMonthSales(mKey);
  const rows = rules.map(rule=>{
    const qty = monthSales
      .filter(s=> s.name===rule.name && s.size===rule.size &&
        (rule.base==='__ALL__' ||
          (Array.isArray(rule.base) ? rule.base.includes(s.base||'') : (s.base||'')===(rule.base||''))))
      .reduce((a,s)=>a+(Number(s.qty)||0),0);
    const amount = (rule.mode==='perBundle' && rule.bundleSize>0)
      ? Math.floor(qty/rule.bundleSize) * rule.value
      : qty * rule.value;
    return {rule, qty, amount};
  });
  const subtotal = rows.reduce((a,x)=>a+x.amount,0);
  const hc = headcount>0 ? headcount : 1;
  const perPersonRaw = subtotal / hc;
  const perPersonCapped = Math.min(perPersonRaw, 5000);
  const paidTotal = perPersonCapped * hc;
  return { rows, subtotal, perPersonRaw, perPersonCapped, paidTotal, headcount: hc };
}
let gallonSectionExpanded = true;
let gallonListShowAll = false;
const GALLON_ROW_LIMIT = 4;
function renderGallonIncentive(mode, mKey, commResult){
  const section = document.getElementById('gallonIncentiveSection');
  if(mode !== 'auto' || !mKey){
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  const rules = (SETTINGS.gallonIncentives && SETTINGS.gallonIncentives[mKey]) || [];
  const list = document.getElementById('gallonRuleList');
  const g = calcGallonIncentive(mKey, commResult.headcount);

  // section-level collapse (whole list -> compact summary line)
  const collapseBtn = document.getElementById('gallonSectionCollapseBtn');
  const summaryEl = document.getElementById('gallonCollapsedSummary');
  collapseBtn.classList.toggle('open', gallonSectionExpanded);
  if(!gallonSectionExpanded && rules.length){
    list.classList.add('section-collapsed');
    summaryEl.style.display = 'flex';
    document.getElementById('gallonCollapsedCount').textContent = rules.length;
    document.getElementById('gallonCollapsedTotal').textContent = fmt(g.subtotal)+' บาท';
  } else {
    list.classList.remove('section-collapsed');
    summaryEl.style.display = 'none';
  }

  if(!rules.length){
    list.innerHTML = '<div class="empty">ยังไม่มีรายการอินเซนทีฟเดือนนี้ กด "+ เพิ่มรายการ" เพื่อเริ่มตั้งค่า</div>';
  } else {
    const showAll = gallonListShowAll || g.rows.length <= GALLON_ROW_LIMIT;
    const visibleRows = showAll ? g.rows : g.rows.slice(0, GALLON_ROW_LIMIT);
    const rowHtml = visibleRows.map(x=>{
      const baseLabel = x.rule.base==='__ALL__' ? 'ทุกเบส'
        : Array.isArray(x.rule.base) ? `เบส ${x.rule.base.join(', ')}`
        : (x.rule.base ? `เบส ${x.rule.base}` : '');
      const condLabel = x.rule.mode==='perBundle'
        ? `ทุก ${x.rule.bundleSize} หน่วย รับ ${fmt(x.rule.value)} บาท`
        : `หน่วยละ ${fmt(x.rule.value)} บาท`;
      return `
      <div class="tier-row">
        <div class="tier-body">
          <div class="amt">${x.rule.name} · ${x.rule.size}${baseLabel ? ' · '+baseLabel : ''}</div>
          <div class="gap">${condLabel} — ขายได้ ${x.qty} หน่วย</div>
        </div>
        <div class="tier-badge done">${fmt(x.amount)} บาท</div>
        <button type="button" class="gdel" data-id="${x.rule.id}" title="ลบรายการ">×</button>
      </div>`;
    }).join('');
    const toggleHtml = g.rows.length > GALLON_ROW_LIMIT
      ? `<div class="gtoggle-row ${showAll?'open':''}" id="gallonShowMoreBtn">
          <span>${showAll ? 'ย่อรายการ' : `ดูอีก ${g.rows.length - GALLON_ROW_LIMIT} รายการ`}</span>
          <svg viewBox="0 0 14 9" fill="none"><path d="M1 1l6 6 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>`
      : '';
    list.innerHTML = rowHtml + toggleHtml;
  }

  document.getElementById('gallonSubtotalVal').textContent = fmt(g.subtotal)+' บาท';

  const gateNote = document.getElementById('gallonGateNote');
  gateNote.textContent = commResult.monthGoalReached
    ? `ผ่านเกณฑ์ 80% ของเป้าหลักแล้ว (ทำได้ ${commResult.pct.toFixed(1)}%) — มีสิทธิ์รับอินเซนทีฟนี้`
    : `ยังไม่ถึง 80% ของเป้าหลัก (ทำได้ ${commResult.pct.toFixed(1)}%) — ยังไม่จ่ายอินเซนทีฟส่วนนี้`;
  gateNote.classList.toggle('warn-note', !commResult.monthGoalReached);

  const paidTotal = commResult.monthGoalReached ? g.paidTotal : 0;
  document.getElementById('gallonPaidVal').textContent = fmt(paidTotal)+' บาท';

  const capNote = document.getElementById('gallonCapNote');
  if(commResult.monthGoalReached && g.subtotal>0){
    capNote.textContent = `${fmt(g.subtotal)} ÷ ${g.headcount} คน = ${fmt(g.perPersonRaw)} บาท/คน` +
      (g.perPersonRaw>5000 ? ' (ตัดเหลือคนละ 5,000 บาท)' : '');
  } else {
    capNote.textContent = '';
  }

  document.getElementById('commGrandTotalVal').textContent = fmt(commResult.total + paidTotal)+' บาท';
}
document.getElementById('gallonSectionCollapseBtn').addEventListener('click', ()=>{
  gallonSectionExpanded = !gallonSectionExpanded;
  renderCommission();
});
document.getElementById('gallonCollapsedSummary').addEventListener('click', ()=>{
  gallonSectionExpanded = true;
  renderCommission();
});
document.getElementById('gallonRuleList').addEventListener('click', async (e)=>{
  const moreBtn = e.target.closest('#gallonShowMoreBtn');
  if(moreBtn){
    gallonListShowAll = !gallonListShowAll;
    renderCommission();
    return;
  }
  const btn = e.target.closest('.gdel');
  if(!btn) return;
  if(!(await ensurePin())) return;
  const mKey = document.getElementById('commMonthSelect').value || monthKey(todayISO());
  const list = (SETTINGS.gallonIncentives && SETTINGS.gallonIncentives[mKey]) || [];
  const idx = list.findIndex(rule=>rule.id===btn.dataset.id);
  if(idx>=0){
    const removed = list[idx];
    list.splice(idx,1);
    await saveSettings();
    await addAudit('ลบรายการอินเซนทีฟรายแกลลอน', `${removed.name||''} ${removed.size||''}`.trim());
    renderCommission();
    toast('ลบรายการแล้ว');
  }
});

/* ---- add-rule modal ---- */
let gallonRuleMode = 'perUnit';
function setGallonRuleMode(m){
  gallonRuleMode = m;
  document.getElementById('ruleModePerUnitBtn').classList.toggle('active', m==='perUnit');
  document.getElementById('ruleModePerBundleBtn').classList.toggle('active', m==='perBundle');
  document.getElementById('ruleBundleRow').style.display = m==='perBundle' ? '' : 'none';
  document.getElementById('ruleValueUnitRow').style.display = m==='perUnit' ? '' : 'none';
}
document.getElementById('ruleModePerUnitBtn').addEventListener('click', ()=>setGallonRuleMode('perUnit'));
document.getElementById('ruleModePerBundleBtn').addEventListener('click', ()=>setGallonRuleMode('perBundle'));

function populateRuleSizeOptions(){
  const name = document.getElementById('ruleNameSelect').value;
  const sizeSel = document.getElementById('ruleSizeSelect');
  if(!name || !PRODUCT_INDEX[name]){
    sizeSel.disabled = true;
    sizeSel.innerHTML = '<option>เลือกสินค้าก่อน</option>';
    sizeSel.dispatchEvent(new Event('change'));
    return;
  }
  const sizes = Object.keys(PRODUCT_INDEX[name]);
  sizeSel.disabled = false;
  sizeSel.innerHTML = sizes.map(s=>`<option value="${s}">${s}</option>`).join('');
  sizeSel.dispatchEvent(new Event('change'));
}
let ruleSelectedBases = new Set(); // holds specific base letters, or the single value '__ALL__'
let ruleAvailableBases = [];
function renderRuleBaseChips(){
  const wrap = document.getElementById('ruleBaseChips');
  const hint = document.getElementById('ruleBaseHint');
  if(!ruleAvailableBases.length){
    hint.style.display = 'none';
    wrap.innerHTML = '<div class="pass-note" style="padding:0;">สินค้า/ไซส์นี้ไม่มีเบสแยก</div>';
    return;
  }
  hint.style.display = '';
  const allActive = ruleSelectedBases.has('__ALL__');
  wrap.innerHTML = `<button type="button" class="chip ${allActive?'active':''}" data-base="__ALL__">ทุกเบส</button>` +
    ruleAvailableBases.map(b=>`<button type="button" class="chip ${(!allActive && ruleSelectedBases.has(b))?'active':''}" data-base="${b}">เบส ${b}</button>`).join('');
}
function populateRuleBaseOptions(){
  const name = document.getElementById('ruleNameSelect').value;
  const size = document.getElementById('ruleSizeSelect').value;
  ruleSelectedBases = new Set(['__ALL__']);
  if(!name || !size || !PRODUCT_INDEX[name] || !PRODUCT_INDEX[name][size]){
    ruleAvailableBases = [];
    renderRuleBaseChips();
    return;
  }
  const bases = Object.keys(PRODUCT_INDEX[name][size]);
  ruleAvailableBases = (bases.length===1 && bases[0]==='—') ? [] : bases;
  renderRuleBaseChips();
}
document.getElementById('ruleBaseChips').addEventListener('click', (e)=>{
  const btn = e.target.closest('.chip');
  if(!btn) return;
  const base = btn.dataset.base;
  if(base==='__ALL__'){
    ruleSelectedBases = new Set(['__ALL__']);
  } else {
    if(ruleSelectedBases.has('__ALL__')) ruleSelectedBases = new Set();
    if(ruleSelectedBases.has(base)) ruleSelectedBases.delete(base);
    else ruleSelectedBases.add(base);
    if(ruleSelectedBases.size===0) ruleSelectedBases = new Set(['__ALL__']);
  }
  renderRuleBaseChips();
});
document.getElementById('ruleNameSelect').addEventListener('change', populateRuleSizeOptions);
document.getElementById('ruleSizeSelect').addEventListener('change', populateRuleBaseOptions);

const ruleNameSearch = document.getElementById('ruleNameSearch');
const ruleNameSuggest = document.getElementById('ruleNameSuggest');
function pickRuleName(name){
  ruleNameSearch.value = name;
  ruleNameSuggest.style.display = 'none';
  const sel = document.getElementById('ruleNameSelect');
  sel.innerHTML = `<option value="${name.replace(/"/g,'&quot;')}">${name}</option>`;
  sel.value = name;
  sel.dispatchEvent(new Event('change'));
}
ruleNameSearch.addEventListener('input', ()=>{
  const q = ruleNameSearch.value.trim().toLowerCase();
  document.getElementById('ruleNameSelect').innerHTML = '';
  populateRuleSizeOptions();
  if(!q){ ruleNameSuggest.style.display = 'none'; return; }
  const matches = Object.keys(PRODUCT_INDEX).filter(n=>n.toLowerCase().includes(q)).sort().slice(0,20);
  if(!matches.length){ ruleNameSuggest.innerHTML = '<div class="suggest-item">ไม่พบสินค้า</div>'; ruleNameSuggest.style.display = 'block'; return; }
  ruleNameSuggest.innerHTML = matches.map(n=>{
    const sizes = Object.keys(PRODUCT_INDEX[n]);
    return `<div class="suggest-item" data-name="${n.replace(/"/g,'&quot;')}">${n}<div class="meta">${sizes.length} ขนาด</div></div>`;
  }).join('');
  ruleNameSuggest.style.display = 'block';
});
ruleNameSuggest.addEventListener('click', (e)=>{
  const item = e.target.closest('.suggest-item');
  if(!item || !item.dataset.name) return;
  pickRuleName(item.dataset.name);
});
document.addEventListener('click', (e)=>{
  if(!e.target.closest('#ruleNameSearch') && !e.target.closest('#ruleNameSuggest')) ruleNameSuggest.style.display = 'none';
});

document.getElementById('addGallonRuleBtn').addEventListener('click', ()=>{
  document.getElementById('ruleNameSelect').innerHTML = '';
  ruleNameSearch.value = '';
  ruleNameSuggest.style.display = 'none';
  populateRuleSizeOptions();
  setGallonRuleMode('perUnit');
  document.getElementById('ruleBundleSizeInput').value = '';
  document.getElementById('ruleValueBundleInput').value = '';
  document.getElementById('ruleValueUnitInput').value = '';
  document.getElementById('gallonRuleModalBg').classList.add('show');
});
document.getElementById('closeGallonRuleModalBtn').addEventListener('click', ()=>{
  document.getElementById('gallonRuleModalBg').classList.remove('show');
});
document.getElementById('saveGallonRuleBtn').addEventListener('click', async ()=>{
  const name = document.getElementById('ruleNameSelect').value;
  const size = document.getElementById('ruleSizeSelect').value;
  let base = '';
  if(ruleAvailableBases.length){
    if(ruleSelectedBases.has('__ALL__')) base = '__ALL__';
    else {
      base = ruleAvailableBases.filter(b=>ruleSelectedBases.has(b));
      if(!base.length){ toast('กรุณาเลือกเบสอย่างน้อย 1 รายการ'); return; }
      if(base.length===ruleAvailableBases.length) base = '__ALL__'; // selecting every base = "ทุกเบส"
    }
  }
  if(!name || !size){ toast('กรุณาเลือกสินค้าและไซส์'); return; }

  let bundleSize = 0, value = 0;
  if(gallonRuleMode==='perBundle'){
    bundleSize = Number(document.getElementById('ruleBundleSizeInput').value)||0;
    value = Number(document.getElementById('ruleValueBundleInput').value)||0;
    if(bundleSize < 2){ toast('กรุณาระบุจำนวนหน่วยต่อชุด (อย่างน้อย 2)'); return; }
  } else {
    value = Number(document.getElementById('ruleValueUnitInput').value)||0;
  }
  if(value <= 0){ toast('กรุณาระบุมูลค่าที่มากกว่า 0'); return; }

  const mKey = document.getElementById('commMonthSelect').value || monthKey(todayISO());
  if(!SETTINGS.gallonIncentives) SETTINGS.gallonIncentives = {};
  if(!SETTINGS.gallonIncentives[mKey]) SETTINGS.gallonIncentives[mKey] = [];
  SETTINGS.gallonIncentives[mKey].push({
    id: Date.now()+'-'+Math.random().toString(36).slice(2,7),
    name, size, base, mode: gallonRuleMode, bundleSize, value
  });
  await saveSettings();
  document.getElementById('gallonRuleModalBg').classList.remove('show');
  renderCommission();
});

document.getElementById('commMonthSelect').addEventListener('change', renderCommission);
document.getElementById('commModeSelect').addEventListener('change', renderCommission);
document.getElementById('commManualTarget').addEventListener('input', renderCommission);
document.getElementById('commManualSales').addEventListener('input', renderCommission);
document.getElementById('commHeadcount').addEventListener('input', ()=>{
  const v = Number(document.getElementById('commHeadcount').value)||1;
  SETTINGS.commHeadcount = v;
  saveSettings();
  renderCommission();
});
document.getElementById('menuCommissionBtn').addEventListener('click', ()=>{
  document.getElementById('menuDrawerBg').classList.remove('show');
  switchToView('commission');
});

