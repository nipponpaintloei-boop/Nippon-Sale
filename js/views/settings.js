/* NIPPON SALE — js/views/settings.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= settings / reset ================= */
document.getElementById('clearCacheBtn').addEventListener('click', async ()=>{
  const btn=document.getElementById('clearCacheBtn');
  const originalHTML=btn.innerHTML;
  btn.disabled=true; btn.style.opacity='0.7'; btn.textContent='กำลังล้างแคช...';
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    toast('ล้างแคชเรียบร้อย กำลังโหลดหน้าใหม่...');
    setTimeout(()=>{
      const url=new URL(location.href);
      url.searchParams.set('_r', Date.now());
      location.href=url.toString();
    }, 600);
  }catch(err){
    btn.disabled=false; btn.style.opacity=''; btn.innerHTML=originalHTML;
    toast('ล้างแคชไม่สำเร็จ: '+err.message);
  }
});
document.getElementById('closeSettingsBtn').addEventListener('click', ()=>{
  document.getElementById('resetModalBg').classList.remove('show');
});
document.getElementById('resetModalBg').addEventListener('click', (e)=>{
  if(e.target.id==='resetModalBg') e.currentTarget.classList.remove('show');
});
document.getElementById('confirmResetBtn').addEventListener('click', async ()=>{
  if(!(await ensurePin())) return;
  const resetConfirm=await askPrompt({
    title:'ยืนยันการรีเซ็ตข้อมูล',
    sub:'ข้อมูลทั้งหมดจะกลับไปเป็นค่าเริ่มต้นจากไฟล์ต้นฉบับ การกระทำนี้ย้อนกลับไม่ได้\n\nพิมพ์ RESET เพื่อยืนยัน',
    mode:'text', expected:'RESET', okLabel:'รีเซ็ตข้อมูล', danger:true
  });
  if(resetConfirm!=='RESET') return;
  PRODUCTS = seedProducts();
  SALES = seedSales();
  rebuildMonthIndex();
  SETTINGS = { targets: Object.assign({}, TARGETS_SEED), defaultTarget: DEFAULT_TARGET, auditLog:[], pinhash:SETTINGS.pinhash||'', notifiedMonth:'' };
  await saveProducts(); await resyncSalesTableFull(); await saveSales(); await saveSettings();
  buildProductIndex();
  document.getElementById('resetModalBg').classList.remove('show');
  toast('รีเซ็ตข้อมูลเรียบร้อย');
  renderRecent(); renderGauge(); renderDashboard(); renderStock(); renderProductsList();
});

document.getElementById('exportBtn').addEventListener('click',async()=>{if(await ensurePin())await exportExcelFile();});
document.getElementById('exportProductsBtn').addEventListener('click',async()=>{if(await ensurePin())await exportProductsExcel();});
document.getElementById('exportPriceListBtn').addEventListener('click', exportPriceList);
document.getElementById('importBtn').addEventListener('click',async()=>{if(await ensurePin())document.getElementById('importFile').click();});
document.getElementById('importFile').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{
    const importConfirm=await askPrompt({
      title:'ยืนยันการนำเข้าข้อมูล',
      sub:'ข้อมูลปัจจุบันจะถูกแทนที่ด้วยไฟล์ backup ที่เลือก\n\nพิมพ์ IMPORT เพื่อยืนยัน',
      mode:'text', expected:'IMPORT', okLabel:'นำเข้าข้อมูล', danger:true
    });
    if(importConfirm!=='IMPORT')return;
    await importBackupFile(f);
  }catch(err){toast('นำเข้าไม่สำเร็จ: '+err.message);}
  e.target.value='';
});
document.getElementById('setPinBtn').addEventListener('click',async()=>{const old=SETTINGS.pinhash;if(old && !(await ensurePin()))return;SETTINGS.pinhash='';await ensurePin();});
document.getElementById('removePinBtn').addEventListener('click',async()=>{
  if(!SETTINGS.pinhash){ toast('ยังไม่ได้ตั้ง PIN ไว้'); return; }
  if(!(await ensurePin())) return; // ต้องใส่ PIN เดิมให้ถูกก่อนถึงจะลบได้
  SETTINGS.pinhash='';
  await saveSettings();
  await addAudit('ลบ PIN ออก','ปิดการล็อกด้วย PIN สำหรับการแก้ไขข้อมูลสำคัญ');
  toast('ลบ PIN เรียบร้อย — ไม่ต้องใส่ PIN สำหรับการแก้ไขสำคัญอีกต่อไป');
});

