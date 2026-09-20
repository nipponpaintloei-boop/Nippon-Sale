/* NIPPON SALE — js/ui/dialogs.js (moved verbatim from index.html; load order matters, see index.html) */
const PROMPT_ICONS={
  pin:'<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="10" rx="2.2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  warn:'<svg viewBox="0 0 24 24"><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.75 3h15.1a2 2 0 0 0 1.75-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4.2"/><path d="M12 17h.01"/></svg>',
};
/* Styled replacement for window.prompt(): mode 'pin' shows a masked numeric pad-style
   input, mode 'text' shows an uppercase confirm-word input (DELETE / RESET / IMPORT). */
function askPrompt({title, sub='', mode='pin', okLabel='ตกลง', danger=false, expected=null}){
  return new Promise(resolve=>{
    const bg=document.getElementById('promptBg');
    const input=document.getElementById('promptInput');
    const err=document.getElementById('promptError');
    const okBtn=document.getElementById('promptOk');
    const cancelBtn=document.getElementById('promptCancel');
    const icon=document.getElementById('promptIcon');

    document.getElementById('promptTitle').textContent=title;
    document.getElementById('promptSub').textContent=sub;
    err.textContent=''; input.value=''; input.classList.remove('error');
    okBtn.textContent=okLabel;
    okBtn.classList.toggle('danger', !!danger);
    icon.classList.toggle('danger', !!danger);
    icon.innerHTML = mode==='pin' ? PROMPT_ICONS.pin : PROMPT_ICONS.warn;

    if(mode==='pin'){
      input.type='password'; input.setAttribute('inputmode','numeric'); input.maxLength=6;
      input.classList.remove('text-mode'); input.placeholder='••••';
    }else{
      input.type='text'; input.removeAttribute('inputmode'); input.maxLength=20;
      input.classList.add('text-mode'); input.placeholder=expected||'';
    }

    bg.classList.add('show');
    setTimeout(()=>input.focus(),60);

    function cleanup(){
      bg.classList.remove('show');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKey);
      bg.removeEventListener('click', onBgClick);
    }
    function onOk(){
      const val=input.value;
      if(!val){ err.textContent = mode==='pin' ? 'กรุณาใส่ PIN' : 'กรุณากรอกข้อความยืนยัน'; input.classList.add('error'); return; }
      cleanup(); resolve(val);
    }
    function onCancel(){ cleanup(); resolve(null); }
    function onKey(e){ if(e.key==='Enter'){ e.preventDefault(); onOk(); } else if(e.key==='Escape'){ onCancel(); } }
    function onBgClick(e){ if(e.target===bg) onCancel(); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKey);
    bg.addEventListener('click', onBgClick);
  });
}
async function ensurePin(){
  if(!SETTINGS.pinhash){
    const pin=await askPrompt({title:'ตั้ง PIN ใหม่', sub:'ตั้ง PIN 4–6 หลักสำหรับการแก้ไขข้อมูลสำคัญ', mode:'pin'});
    if(!pin || !/^\d{4,6}$/.test(pin)){ toast('PIN ต้องเป็นตัวเลข 4–6 หลัก'); return false; }
    const pin2=await askPrompt({title:'ยืนยัน PIN', sub:'กรอก PIN เดิมอีกครั้งเพื่อยืนยัน', mode:'pin'});
    if(pin!==pin2){ toast('PIN ไม่ตรงกัน'); return false; }
    SETTINGS.pinhash=await hashText(pin); await saveSettings(); toast('ตั้ง PIN เรียบร้อย'); return true;
  }
  const pin=await askPrompt({title:'ยืนยันตัวตน', sub:'กรุณาใส่ PIN เพื่อดำเนินการ', mode:'pin'});
  if(!pin || await hashText(pin)!==SETTINGS.pinhash){ toast('PIN ไม่ถูกต้อง'); return false; }
  return true;
}
