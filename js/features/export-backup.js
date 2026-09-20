/* NIPPON SALE — js/features/export-backup.js (moved verbatim from index.html; load order matters, see index.html) */
async function exportExcelFile(isAuto){
  if(typeof XLSX==='undefined'){ if(!isAuto) toast('ไม่สามารถโหลดระบบ Excel ได้ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่'); return; }
  const wb=XLSX.utils.book_new();
  const salesRows=SALES.map((s,i)=>({
    'ลำดับ':i+1,'วันที่':s.date,'สินค้า':s.name,'ขนาด':s.size,'Base':s.base||'',
    'ราคาสินค้า/หน่วย':Number(s.price)||0,'รหัสสี':s.colorCode||'','ราคาแม่สี':Number(s.tintPrice)||0,
    'จำนวน':Number(s.qty)||0,'ยอดรวม':Number(s.total)||0,'SKU':s.sku||'',
    'แหล่งข้อมูล':s.seed?'Excel/ข้อมูลย้อนหลัง':'บันทึกในแอป'
  }));
  const productRows=PRODUCTS.map((p,i)=>({
    'ลำดับ':i+1,'SKU':p.sku||'','สินค้า':p.name,'ขนาด':p.size,'Base':p.base||'',
    'ราคา':Number(p.price)||0,'สต็อกเริ่มต้น':Number(p.init)||0,'รับเข้า':Number(p.inflow)||0,
    'ขายสะสม':Number(p.sold)||0,'คงเหลือ':Number(p.remain)||0
  }));
  const months=[...new Set(SALES.map(s=>monthKey(s.date)))].sort();
  const summaryRows=months.map(m=>{const rows=getMonthSales(m);const total=rows.reduce((a,s)=>a+(Number(s.total)||0),0);return {'เดือน':formatMonthTH(m),'รหัสเดือน':m,'จำนวนรายการ':rows.length,'ยอดขายรวม':total,'เป้าหมาย':getMonthTarget(m),'% เป้า':getMonthTarget(m)?total/getMonthTarget(m):0};});
  const auditRows=(SETTINGS.auditLog||[]).map((x,i)=>({'ลำดับ':i+1,'เวลา':x.time,'การทำรายการ':x.action,'รายละเอียด':x.detail}));
  const add=(data,name,widths)=>{const ws=XLSX.utils.json_to_sheet(data.length?data:[{}]); if(widths) ws['!cols']=widths.map(w=>({wch:w})); XLSX.utils.book_append_sheet(wb,ws,name);};
  add(salesRows,'ประวัติการขาย',[8,14,32,12,8,16,14,14,10,16,18,22]);
  add(productRows,'สินค้าและสต็อก',[8,18,32,12,8,14,16,12,12,12]);
  add(summaryRows,'สรุปรายเดือน',[16,12,12,16,16,12]);
  add(auditRows,'Audit Log',[8,24,22,60]);
  const meta=XLSX.utils.aoa_to_sheet([
    ['NIPPON SALE — Export'],['Exported At',new Date().toLocaleString('th-TH')],['Version',APP_VERSION],['รายการขายทั้งหมด',SALES.length],['ยอดขายรวมทั้งหมด',SALES.reduce((a,s)=>a+(Number(s.total)||0),0)]
  ]); meta['!cols']=[{wch:24},{wch:40}]; XLSX.utils.book_append_sheet(wb,meta,'ข้อมูลไฟล์');
  const fileName=`NIPPON-SALE-${todayISO()}.xlsx`;
  XLSX.writeFile(wb,fileName,{compression:true});
  await addAudit(isAuto?'สำรอง Excel อัตโนมัติ':'ส่งออก Excel',`ไฟล์ ${fileName} · ${SALES.length} รายการ`);
  toast(isAuto?'สำรองข้อมูล Excel ประจำสิ้นเดือนอัตโนมัติแล้ว — ไฟล์อยู่ใน Downloads':'ส่งออก Excel แล้ว — ไฟล์อยู่ใน Downloads');
}

function exportBackup(){
  const payload={version:APP_VERSION,exportedAt:new Date().toISOString(),products:PRODUCTS,sales:SALES,settings:SETTINGS};
  const esc=JSON.stringify(payload).replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const html=`<html><head><meta charset="utf-8"></head><body><h1>NIPPON SALE Backup</h1><p>Exported ${new Date().toLocaleString('th-TH')}</p><div id="tintBackupJson">${esc}</div></body></html>`;
  const blob=new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`NIPPON-SALE-backup-${todayISO()}.xls`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast('ส่งออกข้อมูลแล้ว');
}
// Standalone products+stock backup — same "สินค้าและสต็อก" data that lives inside the
// full Excel export, but on its own so it stays small/fast and can be shared just to
// review the live product catalog (e.g. to check what's actually saved on Supabase)
// without also pulling the entire sales history.
async function exportProductsExcel(){
  if(typeof XLSX==='undefined'){ toast('ไม่สามารถโหลดระบบ Excel ได้ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่'); return; }
  const wb=XLSX.utils.book_new();
  const productRows=PRODUCTS.map((p,i)=>({
    'ลำดับ':i+1,'SKU':p.sku||'','สินค้า':p.name,'ขนาด':p.size,'Base':p.base||'',
    'ราคา':Number(p.price)||0,'สต็อกเริ่มต้น':Number(p.init)||0,'รับเข้า':Number(p.inflow)||0,
    'ขายสะสม':Number(p.sold)||0,'คงเหลือ':Number(p.remain)||0
  }));
  const add=(data,name,widths)=>{const ws=XLSX.utils.json_to_sheet(data.length?data:[{}]); if(widths) ws['!cols']=widths.map(w=>({wch:w})); XLSX.utils.book_append_sheet(wb,ws,name);};
  add(productRows,'สินค้าและสต็อก',[8,18,32,12,8,14,16,12,12,12]);
  const meta=XLSX.utils.aoa_to_sheet([
    ['NIPPON SALE — สำรองรายการสินค้า/สต็อก'],['Exported At',new Date().toLocaleString('th-TH')],['Version',APP_VERSION],['จำนวนรายการสินค้า',PRODUCTS.length]
  ]); meta['!cols']=[{wch:24},{wch:40}]; XLSX.utils.book_append_sheet(wb,meta,'ข้อมูลไฟล์');
  const fileName=`NIPPON-SALE-สินค้า-สต็อก-${todayISO()}.xlsx`;
  XLSX.writeFile(wb,fileName,{compression:true});
  await addAudit('สำรองรายการสินค้า/สต็อก',`ไฟล์ ${fileName} · ${PRODUCTS.length} รายการ`);
  toast('สำรองรายการสินค้า/สต็อกแล้ว — ไฟล์อยู่ใน Downloads');
}
// Stock count sheet — for printing and counting physical stock against the system.
// Sorted alphabetically (not by remain, like the on-screen list) since that's easier
// to walk shelf-by-shelf with a paper printout. Leaves blank columns for the counted
// qty and any note, so the sheet can be filled in by hand while counting.
async function exportStockCountSheet(){
  if(typeof XLSX==='undefined'){ toast('ไม่สามารถโหลดระบบ Excel ได้ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่'); return; }
  const wb=XLSX.utils.book_new();
  const rows = PRODUCTS.filter(p=>p.name).slice().sort((a,b)=>
    (a.name||'').localeCompare(b.name||'','th') ||
    (a.size||'').localeCompare(b.size||'','th') ||
    (a.base||'').localeCompare(b.base||'','th')
  );
  const sheetRows = rows.map((p,i)=>({
    'ลำดับ':i+1, 'SKU':p.sku||'', 'สินค้า':p.name, 'ขนาด':p.size, 'Base':p.base||'',
    'สถานะ':statusLabel[statusOf(p.remain)], 'คงเหลือในระบบ':Number(p.remain)||0,
    'นับได้จริง':null, 'ผลต่าง':null, 'หมายเหตุ':null
  }));
  const ws=XLSX.utils.json_to_sheet(sheetRows.length?sheetRows:[{}]);
  ws['!cols']=[{wch:8},{wch:18},{wch:32},{wch:10},{wch:8},{wch:10},{wch:14},{wch:12},{wch:10},{wch:24}];
  XLSX.utils.book_append_sheet(wb,ws,'ใบนับสต็อก');
  const meta=XLSX.utils.aoa_to_sheet([
    ['NIPPON SALE — ใบนับสต็อกสำหรับปริ้น'],['พิมพ์เมื่อ',new Date().toLocaleString('th-TH')],
    ['จำนวนรายการ',rows.length],['วิธีใช้','กรอกจำนวนที่นับได้จริงในคอลัมน์ "นับได้จริง" แล้วเทียบกับ "คงเหลือในระบบ"']
  ]); meta['!cols']=[{wch:20},{wch:50}]; XLSX.utils.book_append_sheet(wb,meta,'ข้อมูลไฟล์');
  const fileName=`NIPPON-SALE-ใบนับสต็อก-${todayISO()}.xlsx`;
  XLSX.writeFile(wb,fileName,{compression:true});
  await addAudit('ส่งออกใบนับสต็อก',`ไฟล์ ${fileName} · ${rows.length} รายการ`);
  toast('ส่งออกใบนับสต็อกแล้ว — ไฟล์อยู่ใน Downloads');
}
// Simple current price list — just name/size/base/price, no stock numbers.
// Meant for quickly sharing "what do we sell and for how much" (e.g. to a customer
// or another staff member) without exposing stock/sales figures.
async function exportPriceList(){
  if(typeof XLSX==='undefined'){ toast('ไม่สามารถโหลดระบบ Excel ได้ กรุณาเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่'); return; }
  const wb=XLSX.utils.book_new();
  const rows = PRODUCTS.filter(p=>p.name).slice().sort((a,b)=>
    (a.name||'').localeCompare(b.name||'','th') ||
    (a.size||'').localeCompare(b.size||'','th') ||
    (a.base||'').localeCompare(b.base||'','th')
  );
  const sheetRows = rows.map((p,i)=>({
    'ลำดับ':i+1, 'SKU':p.sku||'', 'สินค้า':p.name, 'ขนาด':p.size, 'Base':p.base||'',
    'ราคา (บาท)':Number(p.price)||0
  }));
  const ws=XLSX.utils.json_to_sheet(sheetRows.length?sheetRows:[{}]);
  ws['!cols']=[{wch:8},{wch:18},{wch:32},{wch:10},{wch:8},{wch:12}];
  XLSX.utils.book_append_sheet(wb,ws,'ราคาสินค้า');
  const meta=XLSX.utils.aoa_to_sheet([
    ['NIPPON SALE — รายการสินค้าและราคาปัจจุบัน'],['ส่งออกเมื่อ',new Date().toLocaleString('th-TH')],
    ['จำนวนรายการ',rows.length]
  ]); meta['!cols']=[{wch:20},{wch:50}]; XLSX.utils.book_append_sheet(wb,meta,'ข้อมูลไฟล์');
  const fileName=`NIPPON-SALE-ราคาสินค้า-${todayISO()}.xlsx`;
  XLSX.writeFile(wb,fileName,{compression:true});
  await addAudit('ส่งออกรายการสินค้าและราคา',`ไฟล์ ${fileName} · ${rows.length} รายการ`);
  toast('ส่งออกรายการสินค้าและราคาแล้ว — ไฟล์อยู่ใน Downloads');
}
async function importBackupFile(file){
  const text=await file.text(); const doc=new DOMParser().parseFromString(text,'text/html'); const node=doc.getElementById('tintBackupJson');
  if(!node) throw new Error('ไม่พบข้อมูลสำรองของ NIPPON SALE');
  const data=JSON.parse(node.textContent||node.innerHTML); if(!data.products||!data.sales) throw new Error('ไฟล์สำรองไม่สมบูรณ์');
  PRODUCTS=data.products; SALES=data.sales; SETTINGS=data.settings||{targets:Object.assign({},TARGETS_SEED),defaultTarget:DEFAULT_TARGET,auditLog:[]};
  SETTINGS.auditLog=SETTINGS.auditLog||[]; await saveProducts(); await resyncSalesTableFull(); await saveSales(); await saveSettings(); buildProductIndex();
  renderRecent();renderGauge();renderDashboard();renderStock();renderProductsList();renderHistMonthOptions();renderHistMonth(); toast('นำเข้าข้อมูลสำเร็จ');
}

