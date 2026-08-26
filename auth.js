/* NIPPON SALE — Supabase username/password authentication */
(() => {
  const cfg = window.NIPPON_SUPABASE_CONFIG || {};
  const validConfig = /^https:\/\/[^\s]+\.supabase\.co(?:\/.*)?$/.test(cfg.url || '') &&
                      !!cfg.anonKey && !String(cfg.anonKey).startsWith('YOUR_');

  let client = null;
  let session = null;

  const usernameToEmail = (username) => `${String(username).trim().toLowerCase()}@nippon-sale.local`;

  async function resolveEmail(username){
    // Prefer the secure profile mapping when configured; fall back to the deterministic
    // internal address so existing accounts created with username@nippon-sale.local work too.
    try {
      const {data,error}=await client.rpc('resolve_login_email',{p_username:username});
      if(!error && data) return data;
    } catch(e) {}
    return usernameToEmail(username);
  }
  const validUsername = (username) => /^[a-z0-9][a-z0-9._-]{2,31}$/i.test(String(username || '').trim());

  function getEl(id){ return document.getElementById(id); }
  function show(id){ getEl(id)?.classList.add('show'); }
  function hide(id){ getEl(id)?.classList.remove('show'); }
  function setStatus(text, kind=''){ const el=getEl('authStatus'); if(el){el.textContent=text;el.className='auth-status '+kind;} }
  function setBusy(busy){
    const btn=getEl('authSubmitBtn');
    if(btn){ btn.disabled=busy; btn.textContent=busy?'กำลังเข้าสู่ระบบ…':'เข้าสู่ระบบ'; }
    ['authUsername','authPassword'].forEach(id=>{const e=getEl(id);if(e)e.disabled=busy;});
  }

  function renderUser(){
    const user = session?.user;
    const username = user?.email?.split('@')[0] || 'ผู้ใช้';
    const badge=getEl('authUserBadge'); if(badge) badge.textContent=username;
    const settingsUser=getEl('settingsUserName'); if(settingsUser) settingsUser.textContent=username;
  }

  function showSetupError(){
    setStatus('ยังไม่ได้ตั้งค่า Supabase — กรุณาใส่ URL และ Anon/Publishable Key ใน supabase-config.js', 'error');
    const b=getEl('authSubmitBtn'); if(b)b.disabled=true;
  }

  async function init(){
    if(!validConfig){ showSetupError(); show('authGate'); return false; }
    if(!window.supabase?.createClient){ setStatus('โหลดระบบ Login ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต', 'error'); show('authGate'); return false; }
    client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    client.auth.onAuthStateChange((event,newSession)=>{
      session=newSession;
      if(event==='SIGNED_OUT'){ show('authGate'); }
      if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED'){ renderUser(); }
    });
    const {data,error}=await client.auth.getSession();
    if(error){ setStatus('ตรวจสอบ Session ไม่สำเร็จ: '+error.message,'error'); show('authGate'); return false; }
    session=data.session;
    if(session){ hide('authGate'); renderUser(); return true; }
    show('authGate');
    setTimeout(()=>getEl('authUsername')?.focus(),50);
    return false;
  }

  async function signIn(){
    const username=getEl('authUsername')?.value.trim().toLowerCase() || '';
    const password=getEl('authPassword')?.value || '';
    if(!validUsername(username)){ setStatus('Username ต้องมี 3–32 ตัว และใช้ A-Z, 0-9, จุด, ขีด หรือ _ เท่านั้น','error'); return false; }
    if(password.length < 6){ setStatus('Password ต้องมีอย่างน้อย 6 ตัวอักษร','error'); return false; }
    setBusy(true); setStatus('กำลังตรวจสอบ…');
    const email=await resolveEmail(username);
    const {data,error}=await client.auth.signInWithPassword({email,password});
    setBusy(false);
    if(error){ setStatus('Username หรือ Password ไม่ถูกต้อง','error'); return false; }
    session=data.session; renderUser(); hide('authGate'); setStatus('');
    getEl('authPassword').value='';
    window.dispatchEvent(new CustomEvent('nippon-auth-ready',{detail:{user:session.user,username}}));
    return true;
  }

  async function signOut(){
    if(!client) return;
    await client.auth.signOut();
    session=null;
    show('authGate');
    getEl('authPassword').value='';
    setStatus('ออกจากระบบแล้ว');
    setTimeout(()=>getEl('authUsername')?.focus(),50);
    window.dispatchEvent(new Event('nippon-auth-signed-out'));
  }

  function getUser(){ return session?.user || null; }
  function getUsername(){ return session?.user?.email?.split('@')[0] || ''; }
  function getClient(){ return client; }

  window.NIPPON_AUTH={init,signIn,signOut,getUser,getUsername,usernameToEmail,validUsername,getClient};
  window.addEventListener('load',()=>{
    getEl('authSubmitBtn')?.addEventListener('click',signIn);
    getEl('authLogoutBtn')?.addEventListener('click',async()=>{ await signOut(); });
    getEl('authPassword')?.addEventListener('keydown',e=>{if(e.key==='Enter')signIn();});
    getEl('authUsername')?.addEventListener('keydown',e=>{if(e.key==='Enter')getEl('authPassword')?.focus();});
    getEl('authCloseSetupBtn')?.addEventListener('click',()=>hide('authSetupModal'));
  });
})();
