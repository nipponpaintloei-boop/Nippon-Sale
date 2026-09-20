/* NIPPON SALE — js/core/realtime-sync.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= realtime sync across devices ================= */
let realtimeChannel = null;
function subscribeRealtimeSync(){
  const client = supaClient();
  if(!client || realtimeChannel) return;
  realtimeChannel = client
    .channel('app_data-sync')
    .on('postgres_changes', {event:'*', schema:'public', table:'app_data'}, payload=>{
      const key = (payload.new && payload.new.key) || (payload.old && payload.old.key);
      // 'tint:sales' is now a legacy/offline-cache snapshot only — live sales updates
      // are delivered per-row via the sales_entries subscription below, so skip a
      // full reload here to avoid clobbering rows this device already merged in.
      if(key && key!==STORE_KEYS.sales) reloadKeyAndRerender(key);
    })
    .on('postgres_changes', {event:'*', schema:'public', table:'sales_entries'}, payload=>{
      applySalesRowChange(payload);
    })
    .subscribe();
}
async function reloadKeyAndRerender(key){
  const s = await storageGet(key);
  if(!s || typeof s.value !== 'string') return;
  try{
    if(key===STORE_KEYS.products){ PRODUCTS = JSON.parse(s.value); buildProductIndex(); }
    else if(key===STORE_KEYS.sales){ SALES = JSON.parse(s.value); rebuildMonthIndex(); }
    else if(key===STORE_KEYS.settings){
      SETTINGS = JSON.parse(s.value);
    }
    else if(key===STORE_KEYS.mksDay){ MKS_DAY_HISTORY = JSON.parse(s.value); }
    else if(key===STORE_KEYS.mksWeek){ MKS_WEEK_HISTORY = JSON.parse(s.value); }
    else if(key===STORE_KEYS.customers){ CUSTOMERS = JSON.parse(s.value); }
    else return;
  }catch(e){ console.warn('reloadKeyAndRerender parse failed:', e); return; }

  renderRecent(); renderGauge(); renderDashboard(); renderStock(); renderProductsList();
  renderHistMonthOptions(); renderHistMonth(); renderHistDay();
  if(document.getElementById('view-yearly').classList.contains('active')) renderYearly();
  if(document.getElementById('view-report').classList.contains('active')){
    const activeSub=document.querySelector('#view-report .subtab-row .stbtn.active');
    if(!activeSub || activeSub.dataset.mks==='day') renderMksDay(); else renderMksWeek();
  }
  if(document.getElementById('view-customers').classList.contains('active')) renderCustomers();
}

