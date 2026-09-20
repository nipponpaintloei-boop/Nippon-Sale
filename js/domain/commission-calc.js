/* NIPPON SALE — js/domain/commission-calc.js (moved verbatim from index.html; load order matters, see index.html) */
/* ================= commission calculator tables ================= */
/* ตารางค่าคอมหลัก: ใช้ค่าเดียวกันทั้งช่วงเป้า 400K-600K และ 200K-400K (ตั้งใจให้เหมือนกัน) */
const COMMISSION_MAIN_TABLE = [
  {pct:80,  amt:6000},
  {pct:85,  amt:6500},
  {pct:90,  amt:7000},
  {pct:95,  amt:7500},
  {pct:100, amt:10000},
  {pct:105, amt:11000},
  {pct:110, amt:12000},
  {pct:115, amt:13000},
  {pct:120, amt:14250},
  {pct:125, amt:15500},
  {pct:130, amt:16750},
];
/* ค่าคอมพิเศษ: ใช้เฉพาะเมื่อเป้าต่อเดือนอยู่ในช่วง 200,000-400,000 บาท */
const COMMISSION_SPECIAL_TABLE = [
  {pct:80,  amt:1000},
  {pct:90,  amt:1500},
  {pct:100, amt:2000},
];
/* ค่าคอมเพิ่ม sale ต่อคน: หารยอดขายรวมร้านด้วยจำนวนพนักงาน แล้วเทียบตาราง — ต้องได้อย่างน้อย 200,000 บาท/คน จึงจะจ่าย (ต่ำกว่านั้น = 0 ตามตาราง) */
const COMMISSION_PERHEAD_TABLE = [
  {min:400000, amt:3000},
  {min:350000, amt:2500},
  {min:300000, amt:2000},
  {min:250000, amt:1500},
  {min:200000, amt:1000},
  {min:150000, amt:0},
];
function lookupTiered(table, pct){
  let amt = 0;
  for(const t of table){ if(pct >= t.pct) amt = t.amt; }
  return amt;
}
function commissionInSpecialBand(target){
  return target >= 200000 && target <= 400000;
}
function calcMainCommission(pct){
  return pct >= 80 ? lookupTiered(COMMISSION_MAIN_TABLE, pct) : 0;
}
function calcSpecialCommission(pct, target){
  if(!commissionInSpecialBand(target)) return 0;
  return pct >= 80 ? lookupTiered(COMMISSION_SPECIAL_TABLE, pct) : 0;
}
function calcPerHeadCommission(sales, headcount, pctReached){
  if(!pctReached) return 0;
  const hc = headcount>0 ? headcount : 1;
  const perPerson = sales / hc;
  for(const t of COMMISSION_PERHEAD_TABLE){ if(perPerson >= t.min) return t.amt; }
  return 0;
}
function calcCommissionBreakdown(target, sales, headcount){
  const pct = target > 0 ? (sales/target*100) : 0;
  const monthGoalReached = pct >= 80;
  const main = calcMainCommission(pct);
  const special = calcSpecialCommission(pct, target);
  const hc = headcount>0 ? headcount : 1;
  const perPersonSales = sales / hc;
  const perHead = calcPerHeadCommission(sales, hc, monthGoalReached);
  return { pct, main, special, perHead, perPersonSales, headcount: hc, monthGoalReached, total: main+special+perHead, inSpecialBand: commissionInSpecialBand(target) };
}
