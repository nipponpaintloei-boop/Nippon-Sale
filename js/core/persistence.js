/* NIPPON SALE — js/core/persistence.js (moved verbatim from index.html; load order matters, see index.html) */
async function loadAll(){
  let productsLoaded=false, salesLoaded=false, settingsLoaded=false;

  try{
    const s = await storageGet(STORE_KEYS.products);
    if(s && s.value){ PRODUCTS = JSON.parse(s.value); productsLoaded=true; }
  }catch(e){ console.error('Load products failed:', e); }
  if(!productsLoaded){
    PRODUCTS = seedProducts();
    await storageSet(STORE_KEYS.products, JSON.stringify(PRODUCTS));
  }

  try{
    const tableSales = await fetchSalesTable();
    if(tableSales && tableSales.length){
      SALES = tableSales; salesLoaded=true;
    }else if(tableSales && tableSales.length===0){
      // sales_entries table exists but is empty — one-time migration from the legacy blob, if any
      const s = await storageGet(STORE_KEYS.sales);
      if(s && s.value){
        SALES = JSON.parse(s.value); salesLoaded=true;
        if(SALES.length) await upsertSalesRows(SALES);
      }
    }
  }catch(e){ console.error('Load sales from sales_entries table failed:', e); }
  if(!salesLoaded){
    try{
      const s = await storageGet(STORE_KEYS.sales);
      if(s && s.value){ SALES = JSON.parse(s.value); salesLoaded=true; }
    }catch(e){ console.error('Load sales failed:', e); }
  }
  if(!salesLoaded){
    SALES = seedSales();
    await storageSet(STORE_KEYS.sales, JSON.stringify(SALES));
  }
  rebuildMonthIndex();

  try{
    const s = await storageGet(STORE_KEYS.settings);
    if(s && s.value){ SETTINGS = JSON.parse(s.value); settingsLoaded=true; }
  }catch(e){ console.error('Load settings failed:', e); }
  if(!settingsLoaded){
    SETTINGS = { targets: Object.assign({}, TARGETS_SEED), defaultTarget: DEFAULT_TARGET, auditLog:[], notifiedMonth:'' };
    await storageSet(STORE_KEYS.settings, JSON.stringify(SETTINGS));
  }

  SETTINGS.targets = SETTINGS.targets || {};
  SETTINGS.auditLog = SETTINGS.auditLog || [];
  SETTINGS.notifiedMonth = SETTINGS.notifiedMonth || '';
  SETTINGS.mksDayDefaults = SETTINGS.mksDayDefaults || {};
  SETTINGS.mksWeekDefaults = SETTINGS.mksWeekDefaults || {};
  SETTINGS.commHeadcount = SETTINGS.commHeadcount || (MKS_BRANDS.find(b=>b.key==='NIPPON')||{}).pc || 2;
  SETTINGS.autoBackupEnabled = SETTINGS.autoBackupEnabled || false;
  SETTINGS.autoBackupLastMonth = SETTINGS.autoBackupLastMonth || '';

  try{
    const s = await storageGet(STORE_KEYS.mksDay);
    if(s && s.value) MKS_DAY_HISTORY = JSON.parse(s.value);
  }catch(e){ console.error('Load mksDay failed:', e); }
  try{
    const s = await storageGet(STORE_KEYS.mksWeek);
    if(s && s.value) MKS_WEEK_HISTORY = JSON.parse(s.value);
  }catch(e){ console.error('Load mksWeek failed:', e); }

  try{
    const s = await storageGet(STORE_KEYS.customers);
    if(s && s.value) CUSTOMERS = JSON.parse(s.value);
  }catch(e){ console.error('Load customers failed:', e); }

  buildProductIndex();
}
async function saveCustomers(){
  const ok=await storageSet(STORE_KEYS.customers, JSON.stringify(CUSTOMERS));
  if(!ok) toast('บันทึกฐานลูกค้าไม่สำเร็จ');
  return ok;
}

async function saveMksDayHistory(){
  const ok=await storageSet(STORE_KEYS.mksDay, JSON.stringify(MKS_DAY_HISTORY));
  if(!ok) toast('บันทึกรายงานรายวันไม่สำเร็จ');
  return ok;
}
async function saveMksWeekHistory(){
  const ok=await storageSet(STORE_KEYS.mksWeek, JSON.stringify(MKS_WEEK_HISTORY));
  if(!ok) toast('บันทึกรายงานรายสัปดาห์ไม่สำเร็จ');
  return ok;
}

async function saveProducts(){
  const ok=await storageSet(STORE_KEYS.products, JSON.stringify(PRODUCTS));
  if(!ok) toast('บันทึกสต็อกไม่สำเร็จ กรุณาอนุญาตการจัดเก็บข้อมูลของเบราว์เซอร์');
  return ok;
}
async function saveSales(){
  const ok=await storageSet(STORE_KEYS.sales, JSON.stringify(SALES));
  if(!ok) toast('บันทึกยอดขายไม่สำเร็จ กรุณาอนุญาตการจัดเก็บข้อมูลของเบราว์เซอร์');
  return ok;
}
async function saveSettings(){
  const ok=await storageSet(STORE_KEYS.settings, JSON.stringify(SETTINGS));
  if(!ok) toast('บันทึกการตั้งค่าไม่สำเร็จ กรุณาอนุญาตการจัดเก็บข้อมูลของเบราว์เซอร์');
  return ok;
}
async function hashText(text){
  if(window.crypto && crypto.subtle){ const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
  let h=0; for(let i=0;i<text.length;i++) h=((h<<5)-h)+text.charCodeAt(i)|0; return String(h);
}
