/* NIPPON SALE — js/ui/navigation.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= tabs ================= */
function switchToView(viewName){
  const targetSection = viewName ? document.getElementById('view-'+viewName) : null;
  if(!targetSection) return; // e.g. sidebar buttons like "ตั้งค่า" that open a modal instead of a view
  document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
  const navBtn = document.querySelector(`nav.tabs button[data-view="${viewName}"]`);
  if(navBtn) navBtn.classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  targetSection.classList.add('active');
  if(viewName === 'entry'){
    if(!currentProduct) document.getElementById('saleDate').value = todayISO();
    renderRecent(); renderGauge();
  }
  if(viewName === 'dash'){ renderDashboard(); renderGauge(); }
  if(viewName === 'stock'){ renderStock(); renderProductsList(); }
  if(viewName === 'history'){ renderHistDay(); renderHistMonthOptions(); renderHistMonth(); }
  if(viewName === 'yearly') renderYearly();
  if(viewName === 'report'){
    const activeSub=document.querySelector('#view-report .subtab-row .stbtn.active');
    if(!activeSub || activeSub.dataset.mks==='day') renderMksDay(); else renderMksWeek();
  }
  if(viewName === 'commission'){ renderCommissionMonthOptions(); renderCommission(); }
  if(viewName === 'customers') renderCustomers();
}
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=> switchToView(btn.dataset.view));
});

/* ================= side menu drawer ================= */
document.getElementById('menuBtn').addEventListener('click', ()=>{
  document.getElementById('menuDrawerBg').classList.add('show');
});
document.getElementById('closeMenuBtn').addEventListener('click', ()=>{
  document.getElementById('menuDrawerBg').classList.remove('show');
});
document.getElementById('menuDrawerBg').addEventListener('click', (e)=>{
  if(e.target.id==='menuDrawerBg') e.currentTarget.classList.remove('show');
});
document.getElementById('menuReportBtn').addEventListener('click', ()=>{
  document.getElementById('menuDrawerBg').classList.remove('show');
  switchToView('report');
});
document.getElementById('menuCustomersBtn').addEventListener('click', ()=>{
  document.getElementById('menuDrawerBg').classList.remove('show');
  switchToView('customers');
});
document.getElementById('menuSettingsBtn').addEventListener('click', ()=>{
  document.getElementById('menuDrawerBg').classList.remove('show');
  updateAutoBackupToggleUI();
  document.getElementById('resetModalBg').classList.add('show');
});

/* ================= desktop sidebar: settings shortcut, logout, profile name sync ================= */
document.getElementById('sidebarSettingsBtn').addEventListener('click', ()=>{
  updateAutoBackupToggleUI();
  document.getElementById('resetModalBg').classList.add('show');
});
document.getElementById('sidebarLogoutBtn').addEventListener('click', ()=>{
  const realLogoutBtn = document.getElementById('authLogoutBtn');
  if(realLogoutBtn) realLogoutBtn.click();
});
(function syncSidebarUserName(){
  const src = document.getElementById('authUserBadge');
  const dest = document.getElementById('sidebarUserName');
  if(!src || !dest) return;
  const sync = ()=>{ dest.textContent = src.textContent; };
  sync();
  new MutationObserver(sync).observe(src, {childList:true, characterData:true, subtree:true});
})();

