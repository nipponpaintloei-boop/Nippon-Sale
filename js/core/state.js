/* NIPPON SALE — js/core/state.js (moved verbatim from index.html; load order matters, see index.html) */
const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const STORE_KEYS = { products:'tint:products', sales:'tint:sales', settings:'tint:settings', mksDay:'tint:mksDay', mksWeek:'tint:mksWeek', customers:'tint:customers' };
const APP_VERSION = 'NIPPON-SALE-SECURE-2.1-PERSISTENT';

let PRODUCTS = [];      // live, mutable — {sku,name,size,base,price,init,inflow,sold,remain}
let SALES = [];         // full sales log (seed history + app-entered), each {id,date,name,size,base,price,colorCode,tintPrice,qty,total,sku,seed}

/* ================= month index cache =================
   Every dashboard/report render used to do SALES.filter(...) over the FULL
   history (every sale ever entered) just to pull out one month or one day's
   worth of rows — that scan only gets slower as more history piles up.
   MONTH_INDEX buckets sales by month (mKey -> Map(id -> saleRow)) so look-ups
   for "this month" / "today" are bounded by that month's size instead of the
   whole history. Kept in sync incrementally at every SALES mutation point;
   rebuildMonthIndex() is the fallback used after any full reload/replace. */
let MONTH_INDEX = {};
function midxBucket(mKey){
  let b = MONTH_INDEX[mKey];
  if(!b){ b = MONTH_INDEX[mKey] = new Map(); }
  return b;
}
function midxAdd(s){
  if(!s || !s.date) return;
  midxBucket(monthKey(s.date)).set(String(s.id), s);
}
function midxRemove(s){
  if(!s || !s.date) return;
  const b = MONTH_INDEX[monthKey(s.date)];
  if(b) b.delete(String(s.id));
}
function midxRemoveById(id, mKey){
  const b = MONTH_INDEX[mKey];
  if(b) b.delete(String(id));
}
function rebuildMonthIndex(){
  MONTH_INDEX = {};
  SALES.forEach(midxAdd);
}
function getMonthSales(mKey){
  const b = MONTH_INDEX[mKey];
  return b ? Array.from(b.values()) : [];
}
function getDaySales(dateStr){
  return getMonthSales(monthKey(dateStr)).filter(s=>s.date===dateStr);
}
// Bounded range helpers: a 14-day or 1-week lookback never spans more than the
// current month plus the previous one, so gather just those buckets instead
// of scanning every month ever recorded.
function getSalesSince(cutoffDateStr){
  const mkeys = new Set([monthKey(todayISO()), monthKey(cutoffDateStr)]);
  let out = [];
  mkeys.forEach(mk=>out.push(...getMonthSales(mk)));
  return out.filter(s=>s.date >= cutoffDateStr);
}
function getSalesInRange(fromStr, toStr){
  const mkeys = new Set([monthKey(fromStr), monthKey(toStr)]);
  let out = [];
  mkeys.forEach(mk=>out.push(...getMonthSales(mk)));
  return out.filter(s=>s.date>=fromStr && s.date<=toStr);
}
let DASH_MONTH = monthKey(todayISO()); // month currently browsed in the dashboard header month-selector
let SETTINGS = { targets:{}, defaultTarget: DEFAULT_TARGET };
const MKS_BRANDS = [
  {key:'NIPPON', label:'NIPPON', us:true, pc:2, target:380000},
  {key:'TOA', label:'TOA', pc:2, target:1150000},
  {key:'BEGER', label:'BEGER', pc:2, target:550000},
  {key:'JOTUN', label:'JOTUN', pc:1, target:170000},
  {key:'CAPTAIN', label:'CAPTAIN', pc:2, target:380000},
  {key:'DELTA', label:'DELTA', pc:2, target:330000},
  {key:'DULUX', label:'DULUX', pc:1, target:220000},
  {key:'JBP', label:'JBP', pc:2, target:350000},
];
let MKS_DAY_HISTORY = {};   // { 'YYYY-MM-DD': { date, rows:{BRAND:{pc,sales,note}} } }
let MKS_WEEK_HISTORY = {};  // { 'from_to': { from, to, rows:{BRAND:{pcReg,pcPro,target,sales,note}} } }
let PRODUCT_INDEX = {}; // name -> {size -> {base -> row}}
let SERIES_INDEX = {};  // series -> {colorNo -> rawName}  (see buildProductIndex)
let NAME_TO_SERIES = {}; // rawName -> series (reverse lookup of SERIES_INDEX, for list grouping)
let CUSTOMERS = {}; // key (phone or name) -> {name, phone, favorite:bool, color:string|null}

function seedProducts(){
  return PRODUCTS_SEED.map(r => ({sku:r[0],name:r[1],size:r[2],base:r[3],price:r[4],init:r[5],inflow:r[6],sold:r[7],remain:r[8]}));
}
function seedSales(){
  return SALES_SEED.map((r,i) => ({
    id:'seed-'+i, date:r[0], name:r[1], size:r[2], base:r[3], price:r[4],
    colorCode:r[5], tintPrice:r[6], qty:r[7], total:r[8], sku:r[9], seed:true
  }));
}

