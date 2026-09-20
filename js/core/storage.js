/* NIPPON SALE — js/core/storage.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= storage helpers ================= */
/*
 * Storage priority: Supabase (public.app_data table, shared across every device
 * signed in to the store account) -> localStorage (offline cache / fallback when
 * the network or Supabase call fails, so the app still works offline).
 */
const LOCAL_STORAGE_PREFIX = 'nippon-sale:';

function supaClient(){
  try{ return window.NIPPON_AUTH && window.NIPPON_AUTH.getClient && window.NIPPON_AUTH.getClient(); }
  catch(e){ return null; }
}

async function storageGet(key){
  try{
    const client = supaClient();
    if(client){
      const {data,error} = await client.from('app_data').select('value').eq('key',key).maybeSingle();
      if(!error && data && typeof data.value === 'string') return {value:data.value};
      if(error) console.warn('supabase get failed, falling back to localStorage:', error.message);
    }
  }catch(e){ console.warn('supabase get failed, falling back to localStorage:', e); }
  try{
    if(window.storage && typeof window.storage.get === 'function'){
      const s = await window.storage.get(key);
      if(s) return s;
    }
  }catch(e){ console.warn('window.storage.get failed:', e); }
  try{
    const value = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    return value === null ? null : {value};
  }catch(e){
    console.error('localStorage.get failed:', e);
    return null;
  }
}

async function storageSet(key,value){
  let saved = false;
  try{
    const client = supaClient();
    if(client){
      const {error} = await client.from('app_data').upsert({key, value}, {onConflict:'key'});
      if(!error) saved = true;
      else console.warn('supabase set failed, will still cache locally:', error.message);
    }
  }catch(e){ console.warn('supabase set failed, will still cache locally:', e); }
  try{
    if(window.storage && typeof window.storage.set === 'function'){
      await window.storage.set(key,value);
      saved = true;
    }
  }catch(e){ console.warn('window.storage.set failed, using localStorage:', e); }
  try{
    localStorage.setItem(LOCAL_STORAGE_PREFIX + key,value);
    saved = true;
  }catch(e){ console.error('localStorage.set failed:', e); }
  return saved;
}

/* ================= sales_entries: per-row storage (avoids whole-array overwrite races) =================
 * SALES used to be saved as one JSON blob under app_data key 'tint:sales'. Two devices saving at
 * nearly the same time would each overwrite the whole blob, silently dropping the other device's
 * new/edited/deleted rows. Now each sale is its own row in the sales_entries table, so concurrent
 * saves on different rows never collide. Requires running the migration SQL (see README/instructions
 * provided alongside this file) to create the sales_entries table; until that table exists, every
 * function below fails soft and the app automatically falls back to the old blob behavior.
 */
function toSalesRow(entry){
  return {
    id: String(entry.id), date: entry.date, name: entry.name, size: entry.size||'', base: entry.base||'',
    price: Number(entry.price)||0, color_code: entry.colorCode||'', tint_price: Number(entry.tintPrice)||0,
    qty: Number(entry.qty)||0, total: Number(entry.total)||0, sku: entry.sku||'', seed: !!entry.seed,
    bill_id: entry.billId||null, customer_name: entry.customerName||'', customer_phone: entry.customerPhone||''
  };
}
function fromSalesRow(row){
  return {
    id: row.id, date: row.date, name: row.name, size: row.size||'', base: row.base||'',
    price: Number(row.price)||0, colorCode: row.color_code||'', tintPrice: Number(row.tint_price)||0,
    qty: Number(row.qty)||0, total: Number(row.total)||0, sku: row.sku||'', seed: !!row.seed,
    billId: row.bill_id||null, customerName: row.customer_name||'', customerPhone: row.customer_phone||''
  };
}
async function fetchSalesTable(){
  const client = supaClient();
  if(!client) return null;
  try{
    // Supabase/PostgREST caps any unbounded select at 1000 rows by default, so a single
    // query silently truncates once the table grows past that — the missing rows are the
    // newest ones (since we order ascending by date), which looks like "recent sales vanished".
    // Page through with .range() until a page comes back short of PAGE_SIZE.
    const PAGE_SIZE = 1000;
    let all = [];
    let from = 0;
    while(true){
      const to = from + PAGE_SIZE - 1;
      const {data,error} = await client.from('sales_entries').select('*').order('date',{ascending:true}).range(from,to);
      if(error){ console.warn('fetchSalesTable failed (table may not exist yet — see migration SQL):', error.message); return all.length ? all.map(fromSalesRow) : null; }
      if(!data || !data.length) break;
      all = all.concat(data);
      if(data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
    return all.map(fromSalesRow);
  }catch(e){ console.warn('fetchSalesTable failed:', e); return null; }
}
async function upsertSalesRows(entries){
  const client = supaClient();
  if(!client || !entries.length) return false;
  try{
    const rows = entries.map(toSalesRow);
    const {error} = await client.from('sales_entries').upsert(rows, {onConflict:'id'});
    if(error){ console.warn('upsertSalesRows failed:', error.message); return false; }
    return true;
  }catch(e){ console.warn('upsertSalesRows failed:', e); return false; }
}
async function deleteSalesRow(id){
  const client = supaClient();
  if(!client) return false;
  try{
    const {error} = await client.from('sales_entries').delete().eq('id', String(id));
    if(error){ console.warn('deleteSalesRow failed:', error.message); return false; }
    return true;
  }catch(e){ console.warn('deleteSalesRow failed:', e); return false; }
}
/* Saves only the rows that actually changed. Falls back to the legacy whole-blob save
 * (old behavior) if the sales_entries table isn't reachable yet, so the app keeps working
 * even before the migration SQL has been run. */
async function saveSalesIncremental({added=[], updated=[], deletedIds=[]}={}){
  const client = supaClient();
  let usedTable=false;
  if(client){
    try{
      const toUpsert=[...added,...updated];
      let ok=true;
      if(toUpsert.length) ok = ok && await upsertSalesRows(toUpsert);
      for(const id of deletedIds){ ok = (await deleteSalesRow(id)) && ok; }
      usedTable = ok;
    }catch(e){ console.warn('saveSalesIncremental table path failed, falling back to legacy save:', e); }
  }
  try{ localStorage.setItem(LOCAL_STORAGE_PREFIX + STORE_KEYS.sales, JSON.stringify(SALES)); }catch(e){}
  if(!usedTable){
    const ok = await storageSet(STORE_KEYS.sales, JSON.stringify(SALES));
    if(!ok) toast('บันทึกยอดขายไม่สำเร็จ กรุณาอนุญาตการจัดเก็บข้อมูลของเบราว์เซอร์');
    return ok;
  }
  return true;
}
/* Used only by explicit, rare, PIN-gated bulk operations (import backup / factory reset) where
 * replacing the whole sales history really is the intent, so a full table resync is correct there. */
async function fetchAllSalesIds(){
  const client = supaClient();
  if(!client) return [];
  const PAGE_SIZE = 1000;
  let all = [], from = 0;
  while(true){
    const to = from + PAGE_SIZE - 1;
    const {data,error} = await client.from('sales_entries').select('id').range(from,to);
    if(error){ console.warn('fetchAllSalesIds failed:', error.message); return all; }
    if(!data || !data.length) break;
    all = all.concat(data);
    if(data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}
async function resyncSalesTableFull(){
  const client = supaClient();
  if(!client) return false;
  try{
    const data = await fetchAllSalesIds();
    const currentIds = new Set(SALES.map(s=>String(s.id)));
    const toDelete = (data||[]).map(r=>r.id).filter(id=>!currentIds.has(id));
    if(toDelete.length){
      const {error:delErr} = await client.from('sales_entries').delete().in('id', toDelete);
      if(delErr) console.warn('resyncSalesTableFull delete failed:', delErr.message);
    }
    if(SALES.length) await upsertSalesRows(SALES);
    return true;
  }catch(e){ console.warn('resyncSalesTableFull failed:', e); return false; }
}
let _salesRowChangeRerenderTimer = null;
function applySalesRowChange(payload){
  if(payload.eventType==='DELETE'){
    const id = payload.old && payload.old.id;
    if(!id) return;
    const idx = SALES.findIndex(s=>String(s.id)===String(id));
    if(idx>=0){ midxRemove(SALES[idx]); SALES.splice(idx,1); }
  }else{
    const entry = fromSalesRow(payload.new);
    const idx = SALES.findIndex(s=>String(s.id)===String(entry.id));
    if(idx>=0){ midxRemove(SALES[idx]); SALES[idx]=entry; } else { SALES.push(entry); }
    midxAdd(entry);
  }
  // Multiple rows often land back-to-back (e.g. someone at the other counter
  // saving a multi-item bill fires one event per line). Coalesce the persist +
  // full re-render into a single pass after the burst settles, instead of
  // redoing the whole dashboard/stock/history render for every single row.
  clearTimeout(_salesRowChangeRerenderTimer);
  _salesRowChangeRerenderTimer = setTimeout(()=>{
    try{ localStorage.setItem(LOCAL_STORAGE_PREFIX + STORE_KEYS.sales, JSON.stringify(SALES)); }catch(e){}
    renderRecent(); renderGauge(); renderDashboard(); renderStock();
    renderHistMonthOptions(); renderHistMonth(); renderHistDay();
    if(document.getElementById('view-yearly').classList.contains('active')) renderYearly();
  }, 400);
}

