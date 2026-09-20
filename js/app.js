/* NIPPON SALE — js/app.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= init ================= */
async function bootstrapApp(){
  await loadAll();
  document.getElementById('saleDate').value = todayISO();
  renderGauge();
  renderRecent();
  renderDashboard();
  renderStock();
  updateCustomerAutocomplete();
  checkGoalNotification();
  checkAutoBackup();
  updateAutoBackupToggleUI();
  subscribeRealtimeSync();
  maybeShowDailyBrief();
}
window.addEventListener('nippon-auth-ready', bootstrapApp);
(async function init(){
  const authenticated = await window.NIPPON_AUTH.init();
  if(!authenticated) return;
  await bootstrapApp();
})();
