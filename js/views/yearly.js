/* NIPPON SALE — js/views/yearly.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= yearly view ================= */
function renderYearly(){
  const y = new Date().getFullYear();
  document.getElementById('yearLbl').textContent = buddhistYear(y) + ' (' + THAI_MONTHS[0] + '–' + THAI_MONTHS[11] + ')';
  const monthTotals = [];
  for(let m=1; m<=12; m++){
    const mKey = y + '-' + String(m).padStart(2,'0');
    const total = getMonthSales(mKey).reduce((a,s)=>a+s.total,0);
    monthTotals.push({mKey, m, total, has: SALES.some(s=>monthKey(s.date)===mKey)});
  }
  const yearTotal = monthTotals.reduce((a,x)=>a+x.total,0);
  const monthsWithData = monthTotals.filter(x=>x.has);
  const avg = monthsWithData.length ? yearTotal/monthsWithData.length : 0;
  document.getElementById('yearTotal').textContent = fmt(yearTotal);
  document.getElementById('yearAvg').textContent = fmt(avg);

  // MoM growth vs previous month with data
  const momBox = document.getElementById('yearMoM');
  if(momBox){
    if(monthsWithData.length>=2){
      const sortedM = monthsWithData.slice().sort((a,b)=>a.m-b.m);
      const latestM = sortedM[sortedM.length-1], prevM = sortedM[sortedM.length-2];
      if(prevM.total>0){
        const growth = (latestM.total-prevM.total)/prevM.total*100;
        momBox.textContent = (growth>=0?'▲ +':'▼ ')+Math.abs(growth).toFixed(1)+'% เทียบ '+THAI_MONTHS[prevM.m-1].slice(0,3);
        momBox.className = 'mom-badge '+(growth>=0?'up':'down');
      } else {
        momBox.textContent = 'เดือนก่อนหน้าไม่มียอด'; momBox.className='mom-badge';
      }
    } else {
      momBox.textContent = ''; momBox.className='mom-badge';
    }
  }

  const maxVal = Math.max(1, ...monthTotals.map(x=>x.total));
  let bestIdx = -1, worstIdx = -1;
  if(monthsWithData.length){
    let bestVal = -1, worstVal = Infinity;
    monthTotals.forEach((x,i)=>{
      if(!x.has) return;
      if(x.total > bestVal){ bestVal = x.total; bestIdx = i; }
      if(x.total < worstVal){ worstVal = x.total; worstIdx = i; }
    });
    if(bestIdx === worstIdx) worstIdx = -1;
  }
  const barsBox = document.getElementById('yearBars');
  barsBox.innerHTML = monthTotals.map((x,i)=>{
    const h = x.has ? Math.max(4, Math.round(x.total/maxVal*140)) : 3;
    let cls = x.has ? 'has' : 'future';
    if(i===bestIdx) cls = 'best';
    if(i===worstIdx) cls = 'worst';
    return `
    <div class="bar-col">
      <div class="bar ${cls}" style="height:${h}px;"></div>
      <div class="mlabel">${THAI_MONTHS[i].slice(0,3)}</div>
      <div class="mval">${x.has ? (x.total>=1000?Math.round(x.total/1000)+'k':x.total) : '-'}</div>
    </div>`;
  }).join('');

  const listBox = document.getElementById('yearMonthList');
  listBox.innerHTML = monthTotals.filter(x=>x.has).slice().reverse().map(x=>{
    const cnt = getMonthSales(x.mKey).length;
    let tag = '';
    const idx = monthTotals.indexOf(x);
    if(idx===bestIdx) tag = ' ●';
    if(idx===worstIdx) tag = ' ○';
    return `
    <div class="list-row">
      <div class="info">
        <div class="name">${THAI_MONTHS[x.m-1]} ${buddhistYear(y)}${tag}</div>
        <div class="sub">${cnt} รายการ</div>
      </div>
      <div class="amt">${fmt(x.total)}฿</div>
    </div>`;
  }).join('') || '<div class="empty">ยังไม่มีข้อมูล</div>';
}

