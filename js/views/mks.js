/* NIPPON SALE — js/views/mks.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= MKS report: daily & weekly competitor share ================= */
const THAI_MONTHS_SHORT=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const THAI_MONTHS_LONG=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
function beYear(d){ return d.getFullYear()+543; }
function fmtThaiDateLong(iso){
  if(!iso) return '';
  const d=new Date(iso+'T00:00:00');
  return `${d.getDate()} ${THAI_MONTHS_LONG[d.getMonth()]} ${beYear(d)}`;
}
function fmtThaiDateShort(iso){
  if(!iso) return '';
  const d=new Date(iso+'T00:00:00');
  return `${d.getDate()}/${d.getMonth()+1}/${String(beYear(d)).slice(-2)}`;
}
function fmtThaiRange(fromIso,toIso){
  if(!fromIso||!toIso) return '';
  const a=new Date(fromIso+'T00:00:00'), b=new Date(toIso+'T00:00:00');
  if(a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear()){
    return `${a.getDate()}-${b.getDate()}/${b.getMonth()+1}/${String(beYear(b)).slice(-2)}`;
  }
  return `${fmtThaiDateShort(fromIso)} - ${fmtThaiDateShort(toIso)}`;
}
function weekAgoISO(iso){
  const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()-6);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function isoAddDays(iso,n){
  const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function daysBetweenInclusive(fromIso,toIso){
  const a=new Date(fromIso+'T00:00:00'), b=new Date(toIso+'T00:00:00');
  return Math.round((b-a)/86400000)+1;
}
function prevPeriodRange(fromIso,toIso){
  const len=daysBetweenInclusive(fromIso,toIso);
  const prevTo=isoAddDays(fromIso,-1);
  const prevFrom=isoAddDays(prevTo,-(len-1));
  return {prevFrom,prevTo};
}

/* ---- generic debounce helper (used for MKS auto-save while typing) ---- */
function debounce(fn, delay){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); };
}

/* ---- daily ---- */
let mksDayState=null; // {date, rows:{BRAND:{pc,sales,note}}}
function newMksDayEntry(date){
  const rows={};
  MKS_BRANDS.forEach(b=>{
    const def=(SETTINGS.mksDayDefaults||{})[b.key]||{};
    rows[b.key]={ pc: def.pc!==undefined?def.pc:b.pc, sales:0, note:'' };
  });
  return {date, rows};
}
function loadMksDay(date){
  mksDayState = MKS_DAY_HISTORY[date] ? JSON.parse(JSON.stringify(MKS_DAY_HISTORY[date])) : newMksDayEntry(date);
  renderMksDayRows();
}
function computeMksDayTotal(){
  return MKS_BRANDS.reduce((a,b)=>a+(Number(mksDayState.rows[b.key].sales)||0),0);
}
function renderMksDayRows(){
  const box=document.getElementById('mksDayRows');
  box.innerHTML = MKS_BRANDS.map(b=>{
    const r=mksDayState.rows[b.key];
    return `<div class="mks-row ${b.us?'us':''}" data-brand="${b.key}">
      <div class="mtop">
        <div class="mbrand">${b.label}${b.us?'<span class="tag-us">แบรนด์เรา</span>':''}</div>
        <div class="mpct" data-pct="${b.key}">0%</div>
      </div>
      <div class="mfields">
        <label class="mf"><span class="mlbl">PC</span><input type="number" inputmode="numeric" min="0" step="1" class="m-pc" value="${r.pc}"></label>
        <label class="mf"><span class="mlbl">ยอดขาย (บาท)</span><input type="number" inputmode="decimal" min="0" step="1" class="m-sales" value="${r.sales||''}" placeholder="0"></label>
      </div>
      <label class="mf"><span class="mlbl">หมายเหตุ (ที่มาของยอด — เช่น จากหน้าร้าน / ลูกค้าประจำ)</span><input type="text" class="mnote m-note" value="${(r.note||'').replace(/"/g,'&quot;')}" placeholder="เช่น จากหน้าร้าน, ลูกค้าประจำ"></label>
    </div>`;
  }).join('');
  box.querySelectorAll('.mks-row').forEach(row=>{
    const key=row.dataset.brand;
    row.querySelector('.m-pc').addEventListener('input', e=>{ mksDayState.rows[key].pc=e.target.value; autosaveMksDay(); });
    row.querySelector('.m-sales').addEventListener('input', e=>{ mksDayState.rows[key].sales=Number(e.target.value)||0; updateMksDayPercents(); autosaveMksDay(); });
    row.querySelector('.m-note').addEventListener('input', e=>{ mksDayState.rows[key].note=e.target.value; autosaveMksDay(); });
  });
  updateMksDayPercents();
}
/* auto-save the daily entry to history a moment after the person stops typing,
   so data already typed in survives a refresh even if "save" was never tapped */
const autosaveMksDay = debounce(async ()=>{
  if(!mksDayState) return;
  const date=document.getElementById('mksDayDate').value||mksDayState.date||todayISO();
  mksDayState.date=date;
  MKS_DAY_HISTORY[date]=JSON.parse(JSON.stringify(mksDayState));
  try{ await saveMksDayHistory(); }catch(e){ console.error('autosaveMksDay failed:', e); }
}, 800);
function updateMksDayPercents(){
  const total=computeMksDayTotal();
  MKS_BRANDS.forEach(b=>{
    const sales=Number(mksDayState.rows[b.key].sales)||0;
    const pct= total>0 ? (sales/total*100) : 0;
    const el=document.querySelector(`#mksDayRows [data-pct="${b.key}"]`);
    if(el) el.textContent = pct.toFixed(1)+'%';
  });
  document.getElementById('mksDayTotalVal').textContent = fmt(total)+' บาท';
}
function renderMksDay(){
  const dateInput=document.getElementById('mksDayDate');
  if(!dateInput.value) dateInput.value=todayISO();
  loadMksDay(dateInput.value);
}
document.getElementById('mksDayDate').addEventListener('change', e=>{ loadMksDay(e.target.value||todayISO()); });
document.getElementById('mksDaySaveBtn').addEventListener('click', async ()=>{
  const date=document.getElementById('mksDayDate').value||todayISO();
  mksDayState.date=date;
  MKS_DAY_HISTORY[date]=JSON.parse(JSON.stringify(mksDayState));
  const defaults={};
  MKS_BRANDS.forEach(b=>{ defaults[b.key]={pc:mksDayState.rows[b.key].pc}; });
  SETTINGS.mksDayDefaults=defaults;
  await saveMksDayHistory(); await saveSettings();
  await addAudit('บันทึกรายงาน MKS รายวัน', fmtThaiDateLong(date));
  toast('บันทึกรายงานแล้ว');
});
document.getElementById('mksDayShareBtn').addEventListener('click', ()=>shareMksImage('day'));

/* ---- weekly ---- */
let mksWeekState=null; // {from,to, rows:{BRAND:{pcReg,pcPro,target,sales,note}}}
function newMksWeekEntry(from,to){
  const rows={};
  MKS_BRANDS.forEach(b=>{
    const def=(SETTINGS.mksWeekDefaults||{})[b.key]||{};
    rows[b.key]={
      pcReg: def.pcReg!==undefined?def.pcReg:b.pc,
      pcPro: def.pcPro!==undefined?def.pcPro:'-',
      target: def.target!==undefined?def.target:b.target,
      sales:0, note:''
    };
  });
  return {from,to,rows};
}
function mksWeekKey(from,to){ return from+'_'+to; }
function loadMksWeek(from,to){
  const key=mksWeekKey(from,to);
  mksWeekState = MKS_WEEK_HISTORY[key] ? JSON.parse(JSON.stringify(MKS_WEEK_HISTORY[key])) : newMksWeekEntry(from,to);
  renderMksWeekRows();
}
function computeMksWeekTotals(){
  const totalTarget=MKS_BRANDS.reduce((a,b)=>a+(Number(mksWeekState.rows[b.key].target)||0),0);
  const totalSales=MKS_BRANDS.reduce((a,b)=>a+(Number(mksWeekState.rows[b.key].sales)||0),0);
  return {totalTarget,totalSales};
}
function renderMksWeekRows(){
  const box=document.getElementById('mksWeekRows');
  box.innerHTML = MKS_BRANDS.map(b=>{
    const r=mksWeekState.rows[b.key];
    return `<div class="mks-row ${b.us?'us':''}" data-brand="${b.key}">
      <div class="mtop">
        <div class="mbrand">${b.label}${b.us?'<span class="tag-us">แบรนด์เรา</span>':''}</div>
        <div class="mpct" data-pct="${b.key}">0%</div>
      </div>
      <div class="mfields w3">
        <label class="mf"><span class="mlbl">PC ประจำ</span><input type="text" inputmode="numeric" class="m-pcreg" value="${r.pcReg}"></label>
        <label class="mf"><span class="mlbl">PC โปร</span><input type="text" class="m-pcpro" value="${r.pcPro}"></label>
        <label class="mf"><span class="mlbl">เป้า (บาท)</span><input type="number" inputmode="decimal" min="0" step="1" class="m-target" value="${r.target||''}" placeholder="0"></label>
      </div>
      <label class="mf"><span class="mlbl">ยอดขายช่วงนี้ (บาท)</span><input type="number" inputmode="decimal" min="0" step="1" class="m-sales" value="${r.sales||''}" placeholder="0"></label>
      <label class="mf"><span class="mlbl">หมายเหตุ (ที่มาของยอด — เช่น จากหน้าร้าน / ลูกค้าประจำ)</span><input type="text" class="mnote m-note" value="${(r.note||'').replace(/"/g,'&quot;')}" placeholder="เช่น จากหน้าร้าน, ลูกค้าประจำ"></label>
    </div>`;
  }).join('');
  box.querySelectorAll('.mks-row').forEach(row=>{
    const key=row.dataset.brand;
    row.querySelector('.m-pcreg').addEventListener('input', e=>{ mksWeekState.rows[key].pcReg=e.target.value; autosaveMksWeek(); });
    row.querySelector('.m-pcpro').addEventListener('input', e=>{ mksWeekState.rows[key].pcPro=e.target.value; autosaveMksWeek(); });
    row.querySelector('.m-target').addEventListener('input', e=>{ mksWeekState.rows[key].target=Number(e.target.value)||0; updateMksWeekPercents(); autosaveMksWeek(); });
    row.querySelector('.m-sales').addEventListener('input', e=>{ mksWeekState.rows[key].sales=Number(e.target.value)||0; updateMksWeekPercents(); autosaveMksWeek(); });
    row.querySelector('.m-note').addEventListener('input', e=>{ mksWeekState.rows[key].note=e.target.value; autosaveMksWeek(); });
  });
  updateMksWeekPercents();
}
/* auto-save the weekly entry to history a moment after the person stops typing,
   so data already typed in survives a refresh even if "save" was never tapped */
const autosaveMksWeek = debounce(async ()=>{
  if(!mksWeekState) return;
  const from=document.getElementById('mksWeekFrom').value||mksWeekState.from;
  const to=document.getElementById('mksWeekTo').value||mksWeekState.to;
  if(!from||!to) return;
  mksWeekState.from=from; mksWeekState.to=to;
  MKS_WEEK_HISTORY[mksWeekKey(from,to)]=JSON.parse(JSON.stringify(mksWeekState));
  try{ await saveMksWeekHistory(); }catch(e){ console.error('autosaveMksWeek failed:', e); }
}, 800);
function updateMksWeekPercents(){
  const {totalTarget,totalSales}=computeMksWeekTotals();
  MKS_BRANDS.forEach(b=>{
    const sales=Number(mksWeekState.rows[b.key].sales)||0;
    const pct= totalTarget>0 ? (sales/totalTarget*100) : 0;
    const el=document.querySelector(`#mksWeekRows [data-pct="${b.key}"]`);
    if(el) el.textContent = pct.toFixed(1)+'%';
  });
  document.getElementById('mksWeekTotalVal').textContent = fmt(totalSales)+' บาท';
}
function renderMksWeek(){
  const fromInput=document.getElementById('mksWeekFrom'), toInput=document.getElementById('mksWeekTo');
  if(!toInput.value) toInput.value=todayISO();
  if(!fromInput.value) fromInput.value=weekAgoISO(toInput.value);
  loadMksWeek(fromInput.value, toInput.value);
}
document.getElementById('mksWeekFrom').addEventListener('change', ()=>renderMksWeek());
document.getElementById('mksWeekTo').addEventListener('change', ()=>renderMksWeek());
document.getElementById('mksWeekSaveBtn').addEventListener('click', async ()=>{
  const from=document.getElementById('mksWeekFrom').value, to=document.getElementById('mksWeekTo').value;
  if(!from||!to){ toast('กรุณาเลือกช่วงวันที่'); return; }
  mksWeekState.from=from; mksWeekState.to=to;
  MKS_WEEK_HISTORY[mksWeekKey(from,to)]=JSON.parse(JSON.stringify(mksWeekState));
  const defaults={};
  MKS_BRANDS.forEach(b=>{ defaults[b.key]={pcReg:mksWeekState.rows[b.key].pcReg, pcPro:mksWeekState.rows[b.key].pcPro, target:mksWeekState.rows[b.key].target}; });
  SETTINGS.mksWeekDefaults=defaults;
  await saveMksWeekHistory(); await saveSettings();
  await addAudit('บันทึกรายงาน MKS รายสัปดาห์', fmtThaiRange(from,to));
  toast('บันทึกรายงานแล้ว');
});
document.getElementById('mksWeekShareBtn').addEventListener('click', ()=>shareMksImage('week'));

/* ---- dashboard subtab toggle (ภาพรวม / รายละเอียดเพิ่มเติม) ---- */
document.querySelectorAll('#view-dash > .subtab-row .stbtn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#view-dash > .subtab-row .stbtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const isOverview = btn.dataset.dashtab==='overview';
    document.getElementById('dashPanelOverview').style.display = isOverview?'':'none';
    document.getElementById('dashPanelDetails').style.display = isOverview?'none':'';
  });
});

/* ---- report subtab toggle ---- */
document.querySelectorAll('#view-report .subtab-row .stbtn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#view-report .subtab-row .stbtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const isDay=btn.dataset.mks==='day';
    document.getElementById('mksDayPanel').style.display = isDay?'':'none';
    document.getElementById('mksWeekPanel').style.display = isDay?'none':'';
    if(isDay) renderMksDay(); else renderMksWeek();
  });
});

/* ---- share as image ---- */
async function shareMksImage(type){
  const btn=document.getElementById(type==='day'?'mksDayShareBtn':'mksWeekShareBtn');
  const originalHTML=btn.innerHTML;
  btn.disabled=true; btn.style.opacity='0.7'; btn.textContent='กำลังสร้างรูปภาพ...';
  try{
    const node=buildMksCaptureNode(type);
    document.body.appendChild(node);
    const canvas=await html2canvas(node, {backgroundColor:'#ffffff', scale:3});
    document.body.removeChild(node);
    const filename = type==='day'
      ? `MKS-รายวัน-${mksDayState.date}.png`
      : `MKS-รายสัปดาห์-${mksWeekState.from}_${mksWeekState.to}.png`;
    canvas.toBlob(async (blob)=>{
      if(!blob){ toast('สร้างรูปภาพไม่สำเร็จ'); return; }
      try{
        const file=new File([blob], filename, {type:'image/png'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
          await navigator.share({files:[file], title: filename});
        }else{
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click();
          document.body.removeChild(a); URL.revokeObjectURL(url);
          toast('บันทึกรูปภาพแล้ว');
        }
      }catch(shareErr){
        if(shareErr && shareErr.name==='AbortError'){ /* user cancelled share sheet */ }
        else toast('แชร์ไม่สำเร็จ: '+shareErr.message);
      }
    }, 'image/png');
  }catch(err){
    toast('สร้างรูปภาพไม่สำเร็จ: '+err.message);
  }finally{
    btn.disabled=false; btn.style.opacity=''; btn.innerHTML=originalHTML;
  }
}
function buildMksCaptureNode(type){
  const node=document.createElement('div');
  node.className='mks-capture';
  const isDay=type==='day';
  const title = isDay ? 'รายงานยอดขายรายวัน' : 'รายงานยอดขายรายสัปดาห์';
  const dateLabel = isDay ? fmtThaiDateLong(mksDayState.date) : fmtThaiRange(mksWeekState.from, mksWeekState.to);
  const state = isDay ? mksDayState : mksWeekState;
  const {totalTarget,totalSales} = isDay
    ? {totalTarget:0, totalSales:computeMksDayTotal()}
    : computeMksWeekTotals();

  /* previous-period data for WoW / DoD comparison, when it exists in history */
  let prevRows=null;
  if(isDay){
    const prevDate=isoAddDays(mksDayState.date,-1);
    if(MKS_DAY_HISTORY[prevDate]) prevRows=MKS_DAY_HISTORY[prevDate].rows;
  }else{
    const {prevFrom,prevTo}=prevPeriodRange(mksWeekState.from, mksWeekState.to);
    const prevKey=mksWeekKey(prevFrom,prevTo);
    if(MKS_WEEK_HISTORY[prevKey]) prevRows=MKS_WEEK_HISTORY[prevKey].rows;
  }

  /* build per-brand data + rank by sales */
  const brandData = MKS_BRANDS.map(b=>{
    const r=state.rows[b.key];
    const sales=Number(r.sales)||0;
    const target=isDay?0:(Number(r.target)||0);
    const pctOfTotalTarget = isDay
      ? (totalSales>0 ? (sales/totalSales*100) : 0)
      : (totalTarget>0 ? (sales/totalTarget*100) : 0);
    const pctOwnTarget = (!isDay && target>0) ? (sales/target*100) : null;
    let wow=null;
    if(prevRows && prevRows[b.key]){
      const prevSales=Number(prevRows[b.key].sales)||0;
      if(prevSales>0) wow = (sales-prevSales)/prevSales*100;
      else if(sales>0) wow = 100;
    }
    return {b,r,sales,target,pctOfTotalTarget,pctOwnTarget,wow};
  });
  const ranked=[...brandData].sort((x,y)=>y.sales-x.sales);
  ranked.forEach((d,i)=>{ d.rank=i+1; });
  const rankMap={}; ranked.forEach(d=>{ rankMap[d.b.key]=d.rank; });

  const rowsHtml = brandData.map(d=>{
    const {b,r,sales,target,pctOfTotalTarget,pctOwnTarget,wow}=d;
    const rank=rankMap[b.key];
    const pcMeta = isDay ? `PC ${r.pc}` : `PC ${r.pcReg}${r.pcPro&&r.pcPro!=='-'?' + '+r.pcPro+' โปร':''}`;
    const noteHtml = r.note ? `<div class="cap-note">${escapeHtml(r.note)}</div>` : '';
    const wowHtml = wow===null ? '' :
      `<span class="cap-wow ${wow>0.4?'up':(wow<-0.4?'down':'flat')}">${wow>0?'▲':(wow<0?'▼':'—')}${Math.abs(wow).toFixed(0)}%</span>`;
    const targetHtml = (!isDay && target>0)
      ? `<div class="cap-target">เป้า ${fmt(target)}฿ · <span class="${pctOwnTarget>=100?'hit':''}">${pctOwnTarget>=100?'บรรลุเป้า ':'บรรลุ '}${pctOwnTarget.toFixed(1)}%</span></div>
         <div class="cap-bar-track"><div class="cap-bar-fill ${pctOwnTarget>=100?'hit':''}" style="width:${Math.min(100,pctOwnTarget)}%"></div></div>`
      : '';
    return `<div class="cap-row ${b.us?'us':''} ${rank===1?'rank1':''}">
      <div class="cap-rank">${rank}</div>
      <div class="cap-left">
        <div class="cap-brand">${b.label}${b.us?'<span class="tag-us">เรา</span>':''}</div>
        <div class="cap-meta">${pcMeta}</div>
        ${targetHtml}
        ${noteHtml}
      </div>
      <div class="cap-right">
        <div class="cap-sales">${fmt(sales)}฿ ${wowHtml}</div>
        <div class="cap-mks">MKS ${pctOfTotalTarget.toFixed(1)}%</div>
      </div>
    </div>`;
  }).join('');

  /* department-level summary for the footer */
  let summaryHtml='';
  if(!isDay){
    const achievePct = totalTarget>0 ? (totalSales/totalTarget*100) : 0;
    const days = daysBetweenInclusive(mksWeekState.from, mksWeekState.to);
    const avgPerDay = days>0 ? totalSales/days : 0;
    const overTargetCount = brandData.filter(d=>d.target>0 && d.sales>=d.target).length;
    summaryHtml = `<div class="cap-summary">
      <div class="cap-summary-row"><span class="k">ยอดรวม / เป้ารวม</span><span class="v ${achievePct>=100?'good':''}">${fmt(totalSales)} / ${fmt(totalTarget)}฿ (${achievePct.toFixed(1)}%)</span></div>
      <div class="cap-summary-row"><span class="k">เฉลี่ยต่อวัน</span><span class="v">${fmt(avgPerDay)}฿ · ${days} วัน</span></div>
      <div class="cap-summary-row"><span class="k">แบรนด์ที่บรรลุเป้า</span><span class="v ${overTargetCount>0?'good':''}">${overTargetCount}/${MKS_BRANDS.length}</span></div>
    </div>`;
  }

  /* headline: our rank + gap to the market leader */
  const us=brandData.find(d=>d.b.us);
  let leadHtml='';
  if(us){
    const ourRank=rankMap[us.b.key];
    if(ourRank===1){
      const second=ranked[1];
      leadHtml = second ? `เราเป็นอันดับ 1 นำ ${second.b.label} อยู่ ${fmt(us.sales-second.sales)}฿` : 'เราเป็นอันดับ 1';
    }else{
      const leader=ranked[0];
      leadHtml = `เราอันดับ ${ourRank} จาก ${MKS_BRANDS.length} · ตามหลัง ${leader.b.label} (อันดับ 1) อยู่ ${fmt(leader.sales-us.sales)}฿`;
    }
  }

  node.innerHTML = `
    <div class="cap-hdr">
      <div class="cap-hdr-left">
        <div class="cap-mark">NS</div>
        <div>
          <div class="cap-name">NIPPON SALE</div>
          <div class="cap-sub">Nippon Paint · Global House เลย</div>
        </div>
      </div>
      <div class="cap-hdr-right">
        <div class="cap-title">${title}</div>
        <div class="cap-date">${dateLabel}</div>
      </div>
    </div>
    <div class="cap-body">
      <div class="cap-list">${rowsHtml}</div>
      <div class="cap-side">
        <div class="cap-total">
          <span class="k">ยอดรวมทั้งแผนก</span>
          <span class="v">${fmt(totalSales)}฿</span>
        </div>
        ${summaryHtml || '<div class="cap-summary"></div>'}
        ${leadHtml?`<div class="cap-lead">${leadHtml}</div>`:''}
      </div>
    </div>
    <div class="cap-foot">${new Date().toLocaleString('th-TH')}</div>
  `;
  return node;
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }


