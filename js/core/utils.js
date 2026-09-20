/* NIPPON SALE — js/core/utils.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= utils ================= */
function fmt(n){ return Math.round(n||0).toLocaleString('th-TH'); }
function todayISO(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function monthKey(iso){ return iso.slice(0,7); }
function buddhistYear(gYear){ return gYear + 543; }
function formatMonthTH(mKey){
  const [y,m] = mKey.split('-').map(Number);
  return THAI_MONTHS[m-1] + ' ' + buddhistYear(y);
}
function formatDateTH(iso){
  const [y,m,d] = iso.split('-').map(Number);
  return d + ' ' + THAI_MONTHS[m-1] + ' ' + buddhistYear(y);
}
function saleDateTimeLabel(s){
  const [y,m,d] = String(s.date||'').split('-').map(Number);
  const dateStr = (d&&m) ? (d+'/'+m) : '';
  const ms = Number(String(s.id).split('-')[0]);
  if(!Number.isFinite(ms) || ms < 1000000000000) return dateStr;
  const dt = new Date(ms);
  const hh = String(dt.getHours()).padStart(2,'0');
  const mm = String(dt.getMinutes()).padStart(2,'0');
  return dateStr + ' · ' + hh + ':' + mm;
}
function toast(msg){
  const t = document.getElementById('toast');
  t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.classList.remove('show'), 2200);
}
function getMonthTarget(mKey){
  return (SETTINGS.targets && SETTINGS.targets[mKey]) || SETTINGS.defaultTarget || DEFAULT_TARGET;
}
function findProductRow(sku, name, size, base){
  if(sku){
    const r = PRODUCTS.find(p=>p.sku===sku);
    if(r) return r;
  }
  if(name && PRODUCT_INDEX[name]){
    const sizeKey = size || '—';
    if(PRODUCT_INDEX[name][sizeKey]){
      const baseKey = base || '—';
      return PRODUCT_INDEX[name][sizeKey][baseKey];
    }
  }
  return null;
}

