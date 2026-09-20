/* NIPPON SALE — js/features/share-summary.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= share / copy summary ================= */
document.getElementById('shareBtn').addEventListener('click', ()=>{
  const today = todayISO();
  const todays = getDaySales(today);
  if(!todays.length){ toast('ยังไม่มีรายการขายวันนี้'); return; }
  let text = `สรุปยอดขาย ${formatDateTH(today)}\n`;
  todays.forEach((s,i)=>{
    text += `${i+1}. ${s.name} ${s.size} ${s.base} x${s.qty} = ${fmt(s.total)}฿\n`;
  });
  const total = todays.reduce((a,s)=>a+s.total,0);
  text += `รวมทั้งหมด: ${fmt(total)} บาท (${todays.length} รายการ)`;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>toast('คัดลอกสรุปยอดขายวันนี้แล้ว')).catch(()=>fallbackCopy(text));
  } else fallbackCopy(text);
});
function fallbackCopy(text){
  try{
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    toast('คัดลอกสรุปยอดขายวันนี้แล้ว');
  }catch(e){ toast('ไม่สามารถคัดลอกได้'); }
}

