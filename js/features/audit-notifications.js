/* NIPPON SALE — js/features/audit-notifications.js (moved verbatim from index.html; load order matters, see index.html) */
async function addAudit(action,detail,flagged){
  SETTINGS.auditLog=SETTINGS.auditLog||[]; SETTINGS.auditLog.unshift({time:new Date().toISOString(),action,detail,flagged:!!flagged});
  SETTINGS.auditLog=SETTINGS.auditLog.slice(0,300); await saveSettings();
}
function renderAudit(){
  const box=document.getElementById('auditList'); const logs=(SETTINGS.auditLog||[]).filter(x=>!stockModalIdx||!x.detail || x.detail.indexOf((PRODUCTS[stockModalIdx]||{}).name||'')>=0).slice(0,100);
  box.innerHTML=logs.length?logs.map(x=>`<div class="audit-row">${x.flagged?'<span class="warn-badge">ย้อนหลัง</span>':''}<b>${x.action}</b> — ${x.detail}<div class="meta">${new Date(x.time).toLocaleString('th-TH')}</div></div>`).join(''):'<div class="empty">ยังไม่มีประวัติ</div>';
}
function daysBetween(d1,d2){ return Math.round((new Date(d2)-new Date(d1))/86400000); }
function fmtEditTime(iso){
  const d=new Date(iso), now=new Date();
  if(d.toDateString()===now.toDateString()) return d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit'});
}
const RECENT_EDIT_ACTIONS = ['แก้ไขประวัติขาย','ลบประวัติขาย','แก้ไขเป้าหมาย'];
function renderRecentEdits(){
  const box = document.getElementById('recentEditsCard');
  if(!box) return;
  const logs = (SETTINGS.auditLog||[]).filter(x=>RECENT_EDIT_ACTIONS.includes(x.action)).slice(0,5);
  if(!logs.length){ box.innerHTML = '<div class="empty">ยังไม่มีการแก้ไขล่าสุด</div>'; return; }
  box.innerHTML = logs.map(x=>`
    <div class="list-row">
      <div class="info">
        <div class="name">${x.flagged?'<span class="warn-badge">ย้อนหลัง</span>':''}${x.action}</div>
        <div class="sub">${x.detail}</div>
      </div>
      <div class="time-tag">${fmtEditTime(x.time)}</div>
    </div>
  `).join('');
}
document.getElementById('recentEditsMoreBtn').addEventListener('click', ()=>{
  stockModalIdx = -1;
  document.getElementById('auditModalTitle').textContent = 'ประวัติการทำรายการทั้งหมด';
  renderAudit();
  document.getElementById('auditModalBg').classList.add('show');
});
function daysInMonth(y,m){ return new Date(y,m,0).getDate(); }
async function checkGoalNotification(){
  const now=new Date(), mKey=monthKey(todayISO()), last=daysInMonth(now.getFullYear(),now.getMonth()+1), day=now.getDate();
  if(day<last-4 || SETTINGS.notifiedMonth===mKey) return;
  const total=getMonthSales(mKey).reduce((a,s)=>a+s.total,0), target=getMonthTarget(mKey), pct=target?total/target:0;
  if(pct>=0.8) return;
  const msg=`ใกล้สิ้นเดือนแล้ว: ยอดขาย ${Math.round(pct*100)}% ยังไม่ถึงเป้า 80%`; toast(msg);
  if('Notification' in window){ try{ if(Notification.permission==='default') await Notification.requestPermission(); if(Notification.permission==='granted') new Notification('NIPPON SALE — แจ้งเตือนเป้ายอดขาย',{body:msg}); }catch(e){} }
  SETTINGS.notifiedMonth=mKey; await saveSettings();
}
async function checkAutoBackup(){
  if(!SETTINGS.autoBackupEnabled) return;
  const now=new Date(), mKey=monthKey(todayISO());
  const dim=daysInMonth(now.getFullYear(), now.getMonth()+1);
  if(now.getDate() < dim-1) return;
  if(SETTINGS.autoBackupLastMonth===mKey) return;
  try{ await exportExcelFile(true); }catch(e){ console.error('Auto backup failed:', e); return; }
  SETTINGS.autoBackupLastMonth=mKey; await saveSettings();
}
function updateAutoBackupToggleUI(){
  const btn=document.getElementById('autoBackupToggleBtn');
  if(!btn) return;
  const on=!!SETTINGS.autoBackupEnabled;
  btn.textContent = 'สำรอง Excel อัตโนมัติทุกสิ้นเดือน: '+(on?'เปิด':'ปิด');
  btn.classList.toggle('btn-teal', on);
  btn.classList.toggle('btn-ghost', !on);
}
document.getElementById('autoBackupToggleBtn').addEventListener('click', async ()=>{
  SETTINGS.autoBackupEnabled = !SETTINGS.autoBackupEnabled;
  await saveSettings();
  updateAutoBackupToggleUI();
  await addAudit('ตั้งค่าสำรองข้อมูลอัตโนมัติ', SETTINGS.autoBackupEnabled?'เปิดใช้งานสำรอง Excel ทุกสิ้นเดือน':'ปิดใช้งานสำรอง Excel ทุกสิ้นเดือน');
  toast(SETTINGS.autoBackupEnabled?'เปิดสำรองข้อมูลอัตโนมัติแล้ว':'ปิดสำรองข้อมูลอัตโนมัติแล้ว');
});
