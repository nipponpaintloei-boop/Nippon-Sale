/* NIPPON SALE — js/core/product-index.js (moved verbatim from index.html; load order matters, see index.html) */
/*
 * SERIES_INDEX groups product "names" that only differ by a trailing เบอร์/color
 * number (e.g. "สีน้ำมัน All in 1 S914" and "...S900", or "...(S700)" / "...(S800)")
 * into one series so the entry form can ask "เบอร์สี" as its own step instead of
 * showing every เบอร์ as a separate product in the search results.
 *
 * This is purely a UI-layer grouping built on top of PRODUCT_INDEX — the underlying
 * PRODUCTS rows and their `name` strings are NOT changed, so history, commission
 * rules, stock, and backups all keep working exactly as before untouched.
 *
 * Only names where every row has an EMPTY base are considered — products that
 * already use the A-D base system (e.g. "AirCare (กึ่งเงา)") are left alone even
 * if their name happens to end in parentheses, since they already have a working
 * เบส flow and shouldn't get a second, redundant selection step.
 */
function parseSeriesColorNo(name){
  if(!name) return null;
  let m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/); // trailing (เบอร์)
  if(m) return { series: m[1].trim(), colorNo: m[2].trim() };
  m = name.match(/^(.*?)\s*\[([^\]]+)\]\s*$/);     // trailing [เบอร์]
  if(m) return { series: m[1].trim(), colorNo: m[2].trim() };
  m = name.match(/^(สีน้ำมัน All in 1)\s+(\S+)$/); // "สีน้ำมัน All in 1 S914" style, no brackets
  if(m) return { series: m[1].trim(), colorNo: m[2].trim() };
  return null;
}
function buildProductIndex(){
  PRODUCT_INDEX = {};
  PRODUCTS.forEach(r=>{
    if(!r.name) return;
    if(!PRODUCT_INDEX[r.name]) PRODUCT_INDEX[r.name] = {};
    const sizeKey = r.size || '—';
    if(!PRODUCT_INDEX[r.name][sizeKey]) PRODUCT_INDEX[r.name][sizeKey] = {};
    const baseKey = r.base || '—';
    PRODUCT_INDEX[r.name][sizeKey][baseKey] = r;
  });

  // Build SERIES_INDEX: series -> { colorNo -> rawName }
  SERIES_INDEX = {};
  const namesAllBaseEmpty = {}; // name -> bool (every row for this name has no base)
  PRODUCTS.forEach(r=>{
    if(!r.name) return;
    if(namesAllBaseEmpty[r.name] === undefined) namesAllBaseEmpty[r.name] = true;
    if(r.base) namesAllBaseEmpty[r.name] = false;
  });
  Object.keys(PRODUCT_INDEX).forEach(name=>{
    if(!namesAllBaseEmpty[name]) return; // has a real base -> skip, keep normal เบส flow
    const parsed = parseSeriesColorNo(name);
    if(!parsed) return;
    if(!SERIES_INDEX[parsed.series]) SERIES_INDEX[parsed.series] = {};
    SERIES_INDEX[parsed.series][parsed.colorNo] = name;
  });
  // Keep every series that has at least 1 เบอร์สี recorded — even just one — so the
  // entry form always surfaces the saved เบอร์สี as its own step instead of only
  // baking it silently into the product name. (Previously this required 2+ เบอร์สี
  // per series, which hid the field entirely for most single-color products.)
  Object.keys(SERIES_INDEX).forEach(series=>{
    if(Object.keys(SERIES_INDEX[series]).length < 1) delete SERIES_INDEX[series];
  });
  NAME_TO_SERIES = {};
  Object.keys(SERIES_INDEX).forEach(series=>{
    Object.values(SERIES_INDEX[series]).forEach(n=>{ NAME_TO_SERIES[n] = series; });
  });
}

