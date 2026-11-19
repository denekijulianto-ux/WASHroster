/* =====================================================================
   Supabase backend: data loading, writes, realtime, auth (email code + admin password)
   ===================================================================== */
const isoT=t=>t?new Date(t).toISOString():null;
const msT=t=>t?Date.parse(t):null;
const MCOLS={name:"name",email:"email",mis:"mis",phone:"phone",role:"role",level:"level",province:"province",chapter:"chapter",skills:"skills",lang:"lang",status:"status",photo:"photo",source:"source",sheetSig:"sheet_sig"};
const ACOLS={code:"code",title:"title",emergency:"emergency",role:"role",location:"location",start:"start_date",dur:"dur",deadline:"deadline",slots:"slots",desc:"description",status:"status",kind:"kind",focus:"focus"};
function memberRow(d){const o={};for(const k in MCOLS)if(d[k]!==undefined)o[MCOLS[k]]=d[k]==null?"":d[k];if(o.sheet_sig==="")o.sheet_sig=null;if(o.email!==undefined)o.email=String(o.email||"").toLowerCase()||null;return o}
function alertRow(d){const o={};for(const k in ACOLS)if(d[k]!==undefined)o[ACOLS[k]]=d[k];if(d.announce!==undefined){o.announce_at=d.announce&&d.announce.at?isoT(d.announce.at):null;o.announce_note=d.announce&&d.announce.note||""}return o}
function candRow(c){const o={};if(c.state!==undefined)o.state=c.state;if(c.self!==undefined)o.self_response=!!c.self;
  [["invitedAt","invited_at"],["answeredAt","answered_at"],["emailAt","email_at"],["waAt","wa_at"],["selectedAt","selected_at"]].forEach(([k,col])=>{if(c[k]!==undefined)o[col]=isoT(c[k])});
  if(c.answeredAt!==undefined&&c.self===undefined)o.self_response=false;
  if(c.cardNo!==undefined)o.card_no=c.cardNo||null;if(c.name!==undefined)o.name=c.name||null;if(c.thumb!==undefined)o.thumb=c.thumb||null;return o}
function toErr(e){if(!e)return {code:"unavailable",message:""};if(e.code==="42501"||/row-level security/i.test(e.message||""))return {code:"not_granted",message:e.message};
  if(e.code==="23505")return {code:"server",message:"Email atau data ini sudah terdaftar di roster."};
  return {code:"server",message:e.message||"Gagal menyimpan."}}
const chk=r=>{if(r&&r.error)throw toErr(r.error);return r?r.data:null};

function jwtClaims(){try{const t=S.session&&S.session.access_token;return JSON.parse(atob(t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")))}catch(e){return {}}}
function hasPasswordSession(){const amr=jwtClaims().amr||[];return amr.some(x=>(x&&x.method)==="password")}

async function remoteWrite(kind,coll,id,data,prev){
  if(coll==="members"){
    const self=id===S.uid||id==="me";
    if(self&&kind==="set"){const p={};["name","phone","role","level","province","chapter","skills","lang","mis","status","photo"].forEach(k=>{if(data[k]!==undefined)p[k]=data[k]});chk(await sb.rpc("save_my_profile",{p}));return}
    if(self&&data.responses){for(const [aid,r] of Object.entries(data.responses))chk(await sb.rpc("respond",{p_alert:aid,p_state:r.state}));return}
    if(self&&data.reports&&Object.values(data.reports).some(r=>r.summary!=null)){for(const [aid,r] of Object.entries(data.reports))chk(await sb.rpc("submit_report",{p_alert:aid,p:{summary:r.summary,metrics:r.metrics||{},cond:r.cond,issues:r.issues||"",recs:r.recs||""}}));return}
    if(self&&!S.isAdmin&&data.status&&Object.keys(data).length===1){chk(await sb.rpc("set_my_status",{s:data.status}));return}
    if(kind==="delete"){chk(await sb.from("members").delete().eq("id",id));return}
    if(data.reports){for(const [aid,r] of Object.entries(data.reports))if(r&&"seen" in r)chk(await sb.from("reports").update({seen:!!r.seen}).eq("alert_id",aid).eq("member_id",id))}
    const row=memberRow(data);if(!Object.keys(row).length)return;
    if(kind==="set"&&!prev)chk(await sb.from("members").insert(Object.assign({id},row)));
    else chk(await sb.from("members").update(row).eq("id",id));
    return}
  if(coll==="alerts"){
    if(kind==="delete"){chk(await sb.from("alerts").delete().eq("id",id));return}
    const row=alertRow(data);
    if(kind==="set"){
      chk(await sb.from("alerts").upsert(Object.assign({id},row)));
      const keep=Object.keys(data.cand||{});let q=sb.from("candidates").delete().eq("alert_id",id);if(keep.length)q=q.not("member_id","in",`(${keep.join(",")})`);chk(await q);
      for(const [mid,c] of Object.entries(data.cand||{}))chk(await sb.from("candidates").upsert(Object.assign({alert_id:id,member_id:mid},candRow(c))));
      return}
    if(Object.keys(row).length)chk(await sb.from("alerts").update(row).eq("id",id));
    for(const [mid,c] of Object.entries(data.cand||{})){const r=candRow(c);if(!Object.keys(r).length)continue;
      if(prev&&prev.cand&&prev.cand[mid])chk(await sb.from("candidates").update(r).eq("alert_id",id).eq("member_id",mid));
      else if(r.state)chk(await sb.from("candidates").insert(Object.assign({alert_id:id,member_id:mid},r)))}
    return}
  if(coll==="settings"||coll==="sync"){
    const key=coll==="sync"?"sheet":id;
    if(kind==="delete"){chk(await sb.from("settings").delete().eq("key",key));return}
    chk(await sb.from("settings").upsert({key,value:data,updated_at:new Date().toISOString()}));return}
}

let refetchT=null;function scheduleRefetch(){clearTimeout(refetchT);refetchT=setTimeout(loadAll,300)}
async function loadAll(){
  if(!sb||!S.session)return;
  const q=t=>sb.from(t).select("*");
  const res=await Promise.all(["members","alerts","candidates","reports","settings","admins"].map(q));
  try{sb.from("broadcasts").select("*").order("at",{ascending:false}).limit(100).then(r=>{S.broadcasts=(r&&r.data)||[]},()=>{})}catch(e){}
  const bad=res.find(r=>r.error);if(bad){S.loadErr=true;S.loaded=false;console.error(bad.error);render();return}
  const [m,a,c,r,s,ad]=res.map(x=>x.data||[]);
  const me=S.session.user.id;
  S.admins=ad;S.isAdminAcct=ad.some(x=>x.user_id===me);S.isAdmin=S.isAdminAcct&&hasPasswordSession();
  const members={};let myId=null;
  m.forEach(x=>{members[x.id]={name:x.name,email:x.email||"",phone:x.phone,role:x.role,level:x.level,province:x.province,chapter:x.chapter,skills:x.skills,lang:x.lang,mis:x.mis||"",status:x.status,photo:x.photo,source:x.source,account:!!x.user_id,hasPassword:!!x.has_password,sheetSig:x.sheet_sig,createdAt:msT(x.created_at),reports:{}};if(x.user_id===me)myId=x.id});
  r.forEach(x=>{const mm=members[x.member_id];if(mm)mm.reports[x.alert_id]={summary:x.summary,metrics:x.metrics||{},cond:x.cond,issues:x.issues,recs:x.recs,seen:x.seen,at:msT(x.submitted_at)}});
  const alerts={};
  a.forEach(x=>{alerts[x.id]={kind:x.kind||"bencana",focus:x.focus||"",code:x.code,title:x.title,emergency:x.emergency,role:x.role,location:x.location,start:x.start_date,dur:x.dur,deadline:x.deadline,slots:x.slots,desc:x.description,status:x.status,createdAt:msT(x.created_at),announce:x.announce_at?{at:msT(x.announce_at),note:x.announce_note}:null,cand:{}}});
  c.forEach(x=>{const al=alerts[x.alert_id];if(!al)return;al.cand[x.member_id]={state:x.state,self:x.self_response,respAt:x.self_response?msT(x.answered_at):null,answeredAt:x.self_response?null:msT(x.answered_at),invitedAt:msT(x.invited_at),emailAt:msT(x.email_at),waAt:msT(x.wa_at),cardNo:x.card_no||"",selectedAt:msT(x.selected_at),name:x.name||"",thumb:x.thumb||""}});
  S.members=members;S.alerts=alerts;
  const app=s.find(x=>x.key==="app"),sh=s.find(x=>x.key==="sheet");
  const ik=s.find(x=>x.key==="intake");
  S.settings={app:app?app.value:{}};S.sync=sh?sh.value:null;S.intake=ik?ik.value:null;
  const wg=s.find(x=>x.key==="wa_group");S.waGroup=wg&&wg.value&&wg.value.url||"";
  const ss=s.find(x=>x.key==="sheet_source");S.sheetSource=ss?ss.value:null;
  S.uid=myId||"me";S.mcp=S.isAdmin?{}:null;
  S.meProfile={email:(S.session.user.email||"").toLowerCase(),name:""};
  S.loaded=true;S.loadErr=false;render();
  if(S.isAdmin)startAutoSync();
}
let rtChannel=null;
function startRealtime(){if(rtChannel||!sb)return;rtChannel=sb.channel("roster-db").on("postgres_changes",{event:"*",schema:"public"},()=>scheduleRefetch()).subscribe()}
function stopRealtime(){if(rtChannel){sb.removeChannel(rtChannel);rtChannel=null}}

async function uploadPhoto(dataUrl){
  if(!dataUrl||!dataUrl.startsWith("data:"))return dataUrl||"";
  const blob=await (await fetch(dataUrl)).blob();
  const path=`${S.session.user.id}/${crypto.randomUUID()}.jpg`;
  const r=await sb.storage.from("photos").upload(path,blob,{contentType:"image/jpeg",upsert:false});
  if(r.error)throw {code:"server",message:"Foto gagal diunggah: "+r.error.message};
  return sb.storage.from("photos").getPublicUrl(path).data.publicUrl}

/* ---------- auth screens ---------- */
S.auth=S.auth||{mode:"member",step:"email",email:"",wa:"",err:"",info:"",busy:false,cool:0};
function vSignin(){return vSigninCore()+`<div class="wpb-wrap">${washpediaHTML()}</div>`}
function vSigninCore(){
  const A=S.auth;
  const err=A.err?`<p class="err">${esc(A.err)}</p>`:"",info=A.info?`<p class="note">${esc(A.info)}</p>`:"";
  const steps=n=>`<div class="auth-steps"><span class="${n===1?"on":""}">1 · Email</span><span class="${n===2?"on":""}">2 · Kode dari email</span></div>`;
  if(A.mode==="admin")A.mode="member";
  if(A.step==="code")return `<section class="panel authcard" id="authbox">${steps(2)}<div><h1 class="auth-h">Cek email Anda</h1><p class="muted">Masukkan kode yang kami kirim ke <b>${esc(A.email)}</b>. Belum ada? Cek folder spam.</p></div>
     <form class="form one" id="codeform" novalidate><input class="input codein" id="acode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="••••••" aria-label="Kode verifikasi">${err}${info}
     <button class="btn primary big" type="submit" ${A.busy?"disabled":""}>${A.busy?"Memeriksa…":"Masuk"}</button></form>
     <div class="row" style="justify-content:space-between"><button class="btn sm ghost" data-act="auth-back">← Kembali</button><button class="btn sm ghost" data-act="otp-resend" ${A.cool>Date.now()?"disabled":""}>Kirim ulang kode</button></div></section>`;
  if(A.mode==="code")return `<section class="panel authcard" id="authbox">${steps(1)}<div><h1 class="auth-h">Masuk dengan kode email</h1><p class="muted">Kami kirim kode ke email Anda.</p></div>
     <form class="form one" id="emailform" novalidate><input class="input" id="aemail" type="email" autocomplete="email" placeholder="nama@contoh.id" value="${esc(A.email)}" aria-label="Email" style="padding:12px">${err}${info}
     <button class="btn primary big" type="submit" ${A.busy?"disabled":""}>${A.busy?"Mengirim kode…":"Kirim kode"}</button></form>
     <div style="text-align:center"><button class="btn sm ghost" data-act="auth-mode" data-v="member">← Masuk dengan email &amp; WhatsApp</button></div></section>`;
  if(A.mode==="activate")return `<section class="panel authcard" id="authbox"><div><p class="eyebrow">Pertama kali masuk</p><h1 class="auth-h">Aktifkan akun</h1><p class="muted">Masukkan email dan nomor WhatsApp yang Anda isi di formulir pendaftaran. Setelah itu Anda membuat password sendiri.</p></div>
     <form class="form one" id="waform" novalidate>
       <div class="field"><label for="aemail">Email</label><input class="input" id="aemail" type="email" autocomplete="email" placeholder="nama@contoh.id" value="${esc(A.email)}" style="padding:12px"></div>
       <div class="field"><label for="awa">Nomor WhatsApp</label><input class="input" id="awa" type="tel" inputmode="tel" autocomplete="tel" placeholder="0812xxxxxxx" value="${esc(A.wa||"")}" style="padding:12px"></div>
       ${err}${info}
       <button class="btn primary big" type="submit" ${A.busy?"disabled":""}>${A.busy?"Memeriksa…":"Lanjut buat password"}</button></form>
     <div class="note" style="display:flex;flex-direction:column;gap:8px"><span><b style="color:var(--ink)">Belum terdaftar?</b> Isi formulir pendaftaran dulu, lalu kembali ke sini.</span><a class="btn" href="${esc(formUrl())}" target="_blank" rel="noopener">${I.edit}Isi formulir pendaftaran</a></div>
     <div style="text-align:center"><button class="btn sm ghost" data-act="auth-mode" data-v="member">← Sudah punya password? Masuk</button></div></section>`;
  return `<section class="panel authcard" id="authbox"><div><h1 class="auth-h">Masuk</h1><p class="muted">Untuk anggota roster dan admin WASH PMI.</p></div>
     <form class="form one" id="pwform" novalidate>
       <div class="field"><label for="lmail">Email</label><input class="input" id="lmail" type="email" autocomplete="username" placeholder="nama@contoh.id" value="${esc(A.email)}" style="padding:12px"></div>
       <div class="field"><label for="lpw">Password</label><input class="input" id="lpw" type="password" autocomplete="current-password" style="padding:12px"></div>
       ${err}${info}
       <button class="btn primary big" type="submit" ${A.busy?"disabled":""}>${A.busy?"Memeriksa…":"Masuk"}</button></form>
     <div class="note" style="display:flex;flex-direction:column;gap:8px"><span><b style="color:var(--ink)">Pertama kali masuk?</b> Sudah mengisi formulir pendaftaran tapi belum punya password.</span><button class="btn" data-act="auth-mode" data-v="activate">Aktifkan akun</button></div>
     <div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:12px"><a class="btn sm ghost" href="${esc(formUrl())}" target="_blank" rel="noopener">Belum terdaftar? Isi formulir</a><button class="btn sm ghost" data-act="pw-help">Lupa password?</button></div></section>`}
async function passwordLogin(email,pw){
  const A=S.auth;email=String(email||"").trim().toLowerCase();A.email=email;
  if(!/^\S+@\S+\.\S+$/.test(email)||!pw){A.err="Isi email dan password.";authRender();return}
  A.busy=true;A.err="";A.info="";authRender();
  const {error}=await sb.auth.signInWithPassword({email,password:pw});
  A.busy=false;
  if(error){A.err=/confirm/i.test(error.message)?"Akun ini belum aktif. Tekan Aktifkan akun di bawah.":"Email atau password salah. Kalau ini pertama kali Anda masuk, tekan Aktifkan akun.";authRender();return}
  S.viewAs="admin";try{localStorage.setItem("rosterwash.mode","admin")}catch(e){}}
function vSetPassword(){
  const m=S.members[S.uid]||{};
  return `<section class="panel authcard"><div><p class="eyebrow">Langkah terakhir</p><h1 class="auth-h">Buat password Anda</h1><p class="muted">Halo ${esc(m.name||"")}. Mulai sekarang Anda masuk dengan email dan password ini, jadi orang lain tidak bisa masuk ke akun Anda.</p></div>
    <div class="mailchip">${I.mail}<span>${esc(m.email||(S.session&&S.session.user.email)||"")}</span></div>
    <form class="form one" id="firstpw" novalidate>
      <div class="field"><label for="fpw1">Password baru (minimal 8 karakter)</label><input class="input" id="fpw1" type="password" autocomplete="new-password" style="padding:12px"></div>
      <div class="field"><label for="fpw2">Ulangi password</label><input class="input" id="fpw2" type="password" autocomplete="new-password" style="padding:12px"></div>
      <p class="err" id="fpwerr" hidden></p>
      <button class="btn primary big" type="submit">Simpan password &amp; masuk</button></form>
    <div style="text-align:center"><button class="btn sm ghost" data-act="logout">Keluar</button></div></section>`}
async function pwFirst(){
  const a=$("#fpw1").value,b2=$("#fpw2").value,er=$("#fpwerr"),fail=t=>{er.textContent=t;er.hidden=false};
  if(a.length<8)return fail("Password minimal 8 karakter.");if(a!==b2)return fail("Kedua password tidak sama.");
  const btn=$("#firstpw button[type=submit]");btn.disabled=true;btn.textContent="Menyimpan…";
  const {error}=await sb.auth.updateUser({password:a});
  if(error){btn.disabled=false;btn.textContent="Simpan password & masuk";return fail("Password gagal disimpan: "+error.message)}
  const r=await sb.rpc("mark_my_password_set");if(r.error){btn.disabled=false;btn.textContent="Simpan password & masuk";return fail("Gagal menyimpan: "+r.error.message)}
  toast("Password tersimpan. Berikutnya masuk dengan email & password.");await loadAll()}
async function memberLogin(email,wa){
  const A=S.auth;email=String(email||"").trim().toLowerCase();A.email=email;A.wa=String(wa||"").trim();
  if(!/^\S+@\S+\.\S+$/.test(email)){A.err="Format email belum benar.";authRender();return}
  if(A.wa.replace(/\D/g,"").length<9){A.err="Isi nomor WhatsApp lengkap, misalnya 081234567890.";authRender();return}
  A.busy=true;A.err="";A.info="";authRender();
  let res,data={};
  try{res=await fetch(SB_URL+"/functions/v1/member-login",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:"Bearer "+SB_KEY},body:JSON.stringify({email,phone:A.wa})});data=await res.json().catch(()=>({}))}
  catch(e){A.busy=false;A.err="Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi.";authRender();return}
  if(!res.ok||!data.token_hash){A.busy=false;
    A.err=data.error==="password_required"?"Akun ini sudah punya password. Masuk dengan email & password, atau minta admin mereset akses bila lupa."
      :data.error==="not_registered"?"Email ini belum terdaftar di roster. Isi formulir pendaftaran dulu dengan email yang sama."
      :data.error==="phone_mismatch"?"Nomor WhatsApp tidak cocok dengan data pendaftaran untuk email ini."
      :data.error==="too_many_attempts"?"Terlalu banyak percobaan yang salah. Coba lagi 15 menit lagi, atau hubungi admin roster."
      :"Gagal masuk. Coba lagi sebentar lagi.";
    authRender();return}
  const {error}=await sb.auth.verifyOtp({token_hash:data.token_hash,type:"email"});
  A.busy=false;if(error){A.err="Gagal masuk: "+error.message;authRender()}}
document.addEventListener("input",e=>{if(e.target&&e.target.id==="acode"){const d=e.target.value.replace(/\D/g,"");if(d.length===6&&!S.auth.busy)verifyCode(d)}});
function authRender(){S.view="signin";$("#cp").innerHTML=vSignin();const f=$("#aemail")||$("#acode")||$("#adpw");if(f&&!S.auth.busy)f.focus()}
const redirectTo=()=>location.origin+location.pathname;
async function sendOtp(email){
  const A=S.auth;email=String(email||"").trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email)){A.err="Format email belum benar.";authRender();return}
  A.email=email;A.busy=true;A.err="";A.info="";authRender();
  const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:redirectTo()}});
  A.busy=false;
  if(error){const msg=error.message||"";
    A.err=/email rate limit/i.test(msg)?"Server sedang tidak bisa mengirim email karena batas pengiriman per jam sudah tercapai. Coba lagi nanti, atau hubungi admin roster."
      :/seconds|security purposes/i.test(msg)?"Kode baru saja dikirim ke email ini. Tunggu sekitar satu menit sebelum meminta kode lagi, dan cek juga folder spam."
      :/rate|too many/i.test(msg)?"Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi."
      :"Kode gagal dikirim: "+msg;authRender();return}
  A.step="code";A.cool=Date.now()+60000;A.info="";authRender();setTimeout(()=>{if(S.view==="signin")authRender()},60500)}
async function verifyCode(code){
  const A=S.auth;code=String(code||"").replace(/\s/g,"");
  if(code.length<6){A.err="Masukkan kode dari email.";authRender();return}
  A.busy=true;A.err="";authRender();
  const {error}=await sb.auth.verifyOtp({email:A.email,token:code,type:"email"});
  A.busy=false;if(error){A.err="Kode salah atau sudah kedaluwarsa. Minta kode baru bila perlu.";authRender()}}
async function adminLogin(email,pw){
  const A=S.auth;email=String(email||"").trim().toLowerCase();A.email=email;
  if(!email||!pw){A.err="Isi email dan password.";authRender();return}
  A.busy=true;A.err="";authRender();
  const {data,error}=await sb.auth.signInWithPassword({email,password:pw});
  A.busy=false;if(error){A.err="Email atau password salah.";authRender();return}
  S.viewAs="admin";try{localStorage.setItem("rosterwash.mode","admin")}catch(e){}
  const {data:adm}=await sb.from("admins").select("user_id").eq("user_id",data.user.id);
  if(!adm||!adm.length)toast("Akun ini bukan admin. Anda masuk sebagai anggota.")}

/* admin account signed in with email code → needs password for Mode Admin */
function adminPwModal(createMode){
  const email=S.session.user.email||"";
  if(createMode)openModal("Buat password admin",`<p class="muted">Anda ditunjuk sebagai admin. Buat password untuk ${esc(email)}. Password ini diperlukan setiap kali masuk ke Mode Admin.</p>
    <div class="field"><label for="npw1">Password baru (minimal 8 karakter)</label><input class="input" id="npw1" type="password" autocomplete="new-password"></div>
    <div class="field"><label for="npw2">Ulangi password</label><input class="input" id="npw2" type="password" autocomplete="new-password"></div><p class="err" id="pwerr" hidden></p>`,
    `<button class="btn" data-act="close">Batal</button><button class="btn primary" data-act="pw-create">Simpan &amp; masuk Mode Admin</button>`);
  else openModal("Masuk Mode Admin",`<p class="muted">Mode Admin memerlukan password. Masukkan password admin untuk ${esc(email)}.</p>
    <div class="field"><label for="apw">Password</label><input class="input" id="apw" type="password" autocomplete="current-password"></div><p class="err" id="pwerr" hidden></p>
    <button class="btn sm ghost" data-act="pw-new" style="align-self:flex-start">Belum punya password? Buat sekarang</button>`,
    `<button class="btn" data-act="close">Batal</button><button class="btn primary" data-act="pw-enter">Masuk Mode Admin</button>`);
  setTimeout(()=>{const i=$("#apw")||$("#npw1");i&&i.focus()},30)}
async function pwEnter(){const pw=$("#apw").value,er=$("#pwerr");const {error}=await sb.auth.signInWithPassword({email:S.session.user.email,password:pw});
  if(error){er.textContent="Password salah.";er.hidden=false;return}closeModal();S.viewAs="admin";try{localStorage.setItem("rosterwash.mode","admin")}catch(e){}toast("Masuk Mode Admin")}
async function pwCreate(recovery){const a=$("#npw1").value,b2=$("#npw2").value,er=$("#pwerr");
  if(a.length<8){er.textContent="Password minimal 8 karakter.";er.hidden=false;return}if(a!==b2){er.textContent="Kedua password tidak sama.";er.hidden=false;return}
  const {error}=await sb.auth.updateUser({password:a});if(error){er.textContent="Password gagal disimpan: "+error.message;er.hidden=false;return}
  const {error:e2}=await sb.auth.signInWithPassword({email:S.session.user.email,password:a});
  closeModal();if(e2){toast("Password tersimpan. Masuk ulang dengan password untuk Mode Admin.");return}
  S.viewAs="admin";try{localStorage.setItem("rosterwash.mode","admin")}catch(e){}toast(recovery?"Password diperbarui":"Password dibuat. Anda di Mode Admin.")}

/* manage admins */
function adminsModal(){
  const me=S.session.user.id;
  openModal("Kelola admin",`<p class="muted">Admin bisa menambah/menghapus anggota, membuat alert, menyeleksi kandidat, dan melihat seluruh roster. Admin masuk ke Mode Admin dengan password.</p>
   <div class="dlist">${(S.admins||[]).map(a=>`<div class="ditem"><div class="av sm" aria-hidden="true">${esc(initials(a.email))}</div><div><div class="t">${esc(a.email)}${a.user_id===me?' <span class="pill teal">Anda</span>':""}</div><div class="s">Sejak ${stampT(msT(a.created_at))}</div></div>${(S.admins||[]).length>1?`<button class="btn sm ghost danger" data-act="admin-rm" data-u="${a.user_id}">Cabut</button>`:""}</div>`).join("")}</div>
   <div class="field"><label for="newadm">Tunjuk admin baru (email)</label><div class="row" style="flex-wrap:nowrap"><input class="input" id="newadm" type="email" placeholder="nama@contoh.id"><button class="btn primary" data-act="admin-add">Tunjuk</button></div><span class="hint">Orang tersebut harus sudah pernah masuk sekali dengan kode email. Setelah ditunjuk, ia membuat password lewat tombol Mode Admin.</span></div><p class="err" id="admerr" hidden></p>
   <div class="note">Link aplikasi untuk dibagikan: <span class="mono" style="user-select:all">${esc(redirectTo())}</span></div>`,
   `<button class="btn" data-act="copytxt" data-t="${esc(redirectTo())}">${I.copy}Salin link</button><button class="btn primary" data-act="close">Selesai</button>`)}
async function adminAdd(){const v=($("#newadm").value||"").trim(),er=$("#admerr");if(!v)return;const {error}=await sb.rpc("add_admin",{p_email:v});
  if(error){er.textContent=error.message;er.hidden=false;return}toast(v+" sekarang admin");await loadAll();adminsModal()}
async function adminRm(u,btn){if(!arm(btn,"rmadm"+u,"Tekan lagi untuk mencabut"))return;const {error}=await sb.rpc("remove_admin",{p_user:u});if(error){toast(error.message);return}
  toast("Hak admin dicabut");await loadAll();if(u===S.session.user.id){closeModal()}else adminsModal()}

/* boot */
async function boot(){
  if(!sb){S.loaded=true;$("#cp").innerHTML=`<div class="empty" style="margin-top:40px"><h3>Aplikasi belum terhubung ke Supabase</h3><p>Isi <span class="mono">VITE_SUPABASE_URL</span> dan <span class="mono">VITE_SUPABASE_ANON_KEY</span> di file .env (lihat README), lalu jalankan ulang.</p></div>`;$("#work").classList.add("solo");return}
  try{const r=await sb.rpc("app_settings");if(!r.error&&r.data)S.settings={app:r.data}}catch(e){}
  const {data}=await sb.auth.getSession();await onSession(data.session,"INITIAL");
  sb.auth.onAuthStateChange((ev,session)=>{
    if(ev==="PASSWORD_RECOVERY"){S.session=session;setTimeout(()=>{openModal("Atur password baru",`<div class="field"><label for="npw1">Password baru (minimal 8 karakter)</label><input class="input" id="npw1" type="password" autocomplete="new-password"></div><div class="field"><label for="npw2">Ulangi password</label><input class="input" id="npw2" type="password" autocomplete="new-password"></div><p class="err" id="pwerr" hidden></p>`,`<button class="btn primary" data-act="pw-create" data-recovery="1">Simpan password</button>`)},300);return}
    if(ev==="TOKEN_REFRESHED"&&S.session&&session&&S.session.user.id===session.user.id){S.session=session;return}
    setTimeout(()=>onSession(session,ev),0)});
}
async function onSession(session,ev){
  const prevUser=S.session&&S.session.user.id;S.session=session;
  if(!session){stopRealtime();S.members={};S.alerts={};S.admins=[];S.isAdmin=false;S.isAdminAcct=false;S.uid=null;S.mcp=null;S.loaded=true;S.view="";render();return}
  if(location.hash&&/access_token|error_description/.test(location.hash))history.replaceState(null,"",location.pathname);
  if(prevUser!==session.user.id){S.loaded=false;render()}
  S.auth={mode:"member",step:"email",email:"",err:"",info:"",busy:false,cool:0};
  try{await sb.rpc("claim_my_member")}catch(e){}
  startRealtime();await loadAll()}

/* ---------- Google Form integration (admin) ---------- */
function appsScriptCode(token){return `// Roster WASH PMI — kirim jawaban Google Form ke roster
// Dibuat otomatis oleh aplikasi Roster WASH. Jangan bagikan file ini: TOKEN bersifat rahasia.
const SUPABASE_URL = "${SB_URL}";
const SUPABASE_KEY = "${SB_KEY}";
const TOKEN = "${token}";

function kirimKeRoster_(answers, email) {
  const res = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/rpc/form_intake", {
    method: "post", contentType: "application/json", muteHttpExceptions: true,
    headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
    payload: JSON.stringify({ p_token: TOKEN, p_answers: answers, p_email: email || null })
  });
  if (res.getResponseCode() >= 300) throw new Error("Roster menolak (" + res.getResponseCode() + "): " + res.getContentText());
  return res.getContentText();
}

function jawabanKeObjek_(response) {
  const o = {};
  response.getItemResponses().forEach(function (r) {
    const v = r.getResponse();
    o[r.getItem().getTitle()] = Array.isArray(v) ? v.map(String) : String(v);
  });
  return o;
}

// Dijalankan otomatis setiap ada jawaban baru.
function saatFormDikirim(e) {
  kirimKeRoster_(jawabanKeObjek_(e.response), e.response.getRespondentEmail());
}

// Jalankan SEKALI untuk memasang pengiriman otomatis.
function pasangPemicu() {
  const form = FormApp.getActiveForm();
  ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === "saatFormDikirim"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("saatFormDikirim").forForm(form).onFormSubmit().create();
  console.log("Pengiriman otomatis terpasang.");
}

// Jalankan SEKALI untuk mengirim semua jawaban lama ke roster.
function kirimSemuaJawaban() {
  let ok = 0, gagal = 0;
  FormApp.getActiveForm().getResponses().forEach(function (r) {
    try { kirimKeRoster_(jawabanKeObjek_(r), r.getRespondentEmail()); ok++; }
    catch (err) { gagal++; console.log(err.message); }
  });
  console.log(ok + " jawaban terkirim, " + gagal + " gagal.");
}
`}
function gformModal(code){
  const ik=S.intake||{};
  const status=ik.token_set_at?`<span class="pill ok">Token aktif sejak ${stampT(msT(ik.token_set_at))}</span>`:`<span class="pill off">Belum dipasang</span>`;
  const last=ik.last_at?`<span class="muted" style="font-size:.84rem">${nf(ik.count||0)} jawaban diterima · terakhir ${stampT(msT(ik.last_at))} (${esc(ik.last_result||"")})</span>`:`<span class="muted" style="font-size:.84rem">Belum ada jawaban yang diterima.</span>`;
  openModal("Pendaftaran lewat Google Form",`<p class="muted">Setiap jawaban Google Form langsung masuk ke roster. Anggota lalu cukup masuk dengan kode email; akunnya otomatis tersambung ke data Form, tanpa daftar dua kali.</p>
   <div class="row" style="gap:8px">${status}</div>${last}
   <div class="field"><label for="gfurl">Link formulir pendaftaran (ditampilkan ke anggota)</label><div class="row" style="flex-wrap:nowrap"><input class="input" id="gfurl" value="${esc(formUrl())}"><button class="btn" data-act="gform-url">Simpan</button></div></div>
   ${code?`<div class="note" style="display:flex;flex-direction:column;gap:6px"><b style="color:var(--ink)">Pasang di Google Form (sekali saja)</b>
     <span>1. Di Google Form: <b>Setelan → Jawaban → Kumpulkan alamat email</b> = <b>Terverifikasi</b>.</span>
     <span>2. Buka menu <b>⋮ → Apps Script</b>, hapus isi bawaannya, tempel kode di bawah, lalu klik <b>Simpan</b>.</span>
     <span>3. Pilih fungsi <b>pasangPemicu</b> → <b>Jalankan</b> → izinkan akses akun Google Anda.</span>
     <span>4. Pilih fungsi <b>kirimSemuaJawaban</b> → <b>Jalankan</b> untuk memasukkan jawaban lama.</span></div>
     <p class="err" style="font-size:.82rem">Kode ini berisi token rahasia dan hanya ditampilkan sekarang. Salin sebelum menutup jendela ini.</p>
     <textarea class="input mono" id="gscode" style="min-height:220px;font-size:.72rem" readonly>${esc(code)}</textarea>`
   :`<p class="note">${ik.token_set_at?"Membuat kode baru akan mengganti token lama; kode Apps Script yang lama berhenti bekerja dan harus diganti dengan yang baru.":"Buat kode Apps Script untuk dipasang di Google Form Anda."}</p>`}`,
   code?`<button class="btn" data-act="gform-copy">${I.copy}Salin kode</button><button class="btn primary" data-act="close">Selesai</button>`
       :`<button class="btn" data-act="close">Tutup</button><button class="btn primary" data-act="gform-gen">${ik.token_set_at?"Buat kode baru":"Buat kode Apps Script"}</button>`,true)}
async function gformGen(){
  const bytes=crypto.getRandomValues(new Uint8Array(24));const token="rw_"+[...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
  const {error}=await sb.rpc("set_intake_token",{p_token:token});
  if(error){toast(error.message||"Gagal membuat token");return}
  await loadAll();gformModal(appsScriptCode(token))}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
  if(a==="gform"){if(!S.isAdmin){toast("Masuk Mode Admin dulu.");return}gformModal(null)}
  else if(a==="gform-gen")gformGen();
  else if(a==="gform-copy"){copy($("#gscode").value,"Kode Apps Script")}
  else if(a==="gform-url"){const v=($("#gfurl").value||"").trim();if(!/^https:\/\//.test(v)){toast("Link harus diawali https://");return}await write("set","settings","app",Object.assign({},S.settings.app||{},{formUrl:v})).catch(()=>{});toast("Link formulir disimpan")}
  else if(a==="reclaim"){b.disabled=true;b.textContent="Memeriksa…";try{await sb.rpc("claim_my_member")}catch(err){}await loadAll();if(!S.members[S.uid]||S.uid==="me")toast("Belum ditemukan. Pastikan emailnya sama, lalu coba lagi sebentar lagi.")}
});

document.addEventListener("submit",e=>{if(e.target.id==="pwform"){e.preventDefault();passwordLogin($("#lmail").value,$("#lpw").value)}else if(e.target.id==="firstpw"){e.preventDefault();pwFirst()}});
document.addEventListener("click",async e=>{const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
  if(a==="pw-help"){S.auth.err="";S.auth.info="Lupa password? Hubungi admin roster untuk mereset akses Anda. Setelah itu tekan Aktifkan akun dan buat password baru.";authRender()}
  else if(a==="reset-login"){if(!arm(b,"rl"+b.dataset.m,"Tekan lagi untuk mereset"))return;const {error}=await sb.from("members").update({has_password:false}).eq("id",b.dataset.m);if(error){toast("Gagal mereset: "+error.message);return}toast("Akses login direset. Anggota bisa mengaktifkan ulang dengan email & nomor WA.");loadAll()}
});

/* ---------- broadcast alert / announcement to all members (Edge Function "broadcast") ---------- */
async function bcCall(body){
  const {data:{session}}=await sb.auth.getSession();
  try{const r=await fetch(SB_URL+"/functions/v1/broadcast",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:"Bearer "+((session&&session.access_token)||SB_KEY)},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));return Object.assign({httpOk:r.ok,http:r.status},j)}
  catch(e){return {httpOk:false,error:"network"}}}
function bcHistory(aid){const h=(S.broadcasts||[]).filter(b=>b.alert_id===aid);if(!h.length)return"";
  return `<div class="dlist" style="font-size:.8rem">${h.slice(0,4).map(b=>`<div class="ditem"><div><div class="t" style="font-size:.82rem">${b.kind==="alert"?"Alert":"Pengumuman"} terkirim ${stampT(Date.parse(b.at))}</div><div class="s">${b.email_sent} email${b.email_error?" (ada error)":""}</div></div></div>`).join("")}</div>`}
function bcRecipients(kind,a,aud){const ms=members(),cm=a.cand||{};
  if(aud==="role")return ms.filter(m=>m.role===wantRole(a));
  if(aud==="available")return ms.filter(m=>m.status==="tersedia");
  if(aud==="candidates")return ms.filter(m=>cm[m.id]&&cm[m.id].state!=="menolak");
  if(aud==="selected")return ms.filter(m=>cm[m.id]&&cm[m.id].state==="terpilih");
  if(aud==="custom")return ms.filter(m=>bcState&&bcState.ids.has(m.id));
  return ms}
function bcAudOpts(kind,a,cur){const n=v=>bcRecipients(kind,a,v).length,o=(v,l)=>`<option value="${v}" ${cur===v?"selected":""}>${l} (${n(v)})</option>`;
  return o("all","Semua anggota roster")+(kind==="announce"?o("selected","Hanya anggota terpilih"):"")+o("candidates","Hanya kandidat alert ini")+(kind==="alert"&&wantRole(a)?o("role","Hanya profil "+esc(wantRole(a))):"")+(kind==="alert"?o("available","Hanya yang berstatus tersedia"):"")+`<option value="custom" ${cur==="custom"?"selected":""}>Pilih orang tertentu…${cur==="custom"?" ("+bcState.ids.size+")":""}</option>`}
function bcPicker(a){const st=bcState,q=(st.q||"").trim().toLowerCase(),cm=a.cand||{};
  const list=members().filter(m=>!q||[m.name,m.role,m.province,m.chapter,m.email].join(" ").toLowerCase().includes(q))
    .sort((x,y)=>((cm[y.id]&&cm[y.id].state==="terpilih")-(cm[x.id]&&cm[x.id].state==="terpilih"))||(!!cm[y.id]-!!cm[x.id])||x.name.localeCompare(y.name));
  return `<div class="field"><div class="row" style="gap:6px;flex-wrap:nowrap"><label class="search" style="flex:1">${I.search}<input id="bc-q" placeholder="Cari nama, profil, provinsi…" value="${esc(st.q||"")}" aria-label="Cari penerima"></label><button class="btn sm" data-act="bc-all">Pilih yang tampil</button><button class="btn sm ghost" data-act="bc-none">Kosongkan</button></div>
    <div class="pick" id="bc-list" style="max-height:240px">${list.map(m=>{const c=cm[m.id];return `<label><input type="checkbox" data-bcm="${m.id}" ${st.ids.has(m.id)?"checked":""}>${av(m,"sm")}<span class="grow"><b>${esc(m.name)}</b><br><small class="muted">${esc(m.role)} · ${esc(m.province||"-")}${m.email?"":" · tanpa email"}</small></span>${c?pill(CSTAT,c.state):""}</label>`}).join("")||`<p class="muted" style="padding:10px">Tidak ada anggota yang cocok.</p>`}</div>
    <span class="muted" style="font-size:.8rem">${st.ids.size} orang dipilih.</span></div>`}
function bcPersonalWA(kind,a,rec){const withWa=rec.filter(m=>m.phone);if(!withWa.length)return"";const t=bcText(kind,a);
  return `<div class="lbox"><b>${I.wa.replace("<svg",'<svg width="16" height="16" style="vertical-align:-3px;margin-right:4px"')}WhatsApp pribadi (gratis)</b><span class="muted" style="font-size:.84rem">Tekan nama untuk membuka chat dengan pesan sudah terisi, lalu kirim.</span>
    <div class="row" style="gap:6px">${withWa.slice(0,60).map(m=>`<a class="btn sm wa" target="_blank" rel="noopener" href="${esc(waHref(m.phone,t))}">${I.wa}${esc(m.name)}</a>`).join("")}</div>${withWa.length>60?`<span class="muted" style="font-size:.8rem">Hanya 60 nama pertama yang ditampilkan.</span>`:""}</div>`}
function bcText(kind,a){return kind==="announce"?annText(a):`*ALERT PENUGASAN · ROSTER WASH PMI*\nKode: ${a.code}\nOperasi: ${a.title}${a.emergency&&a.kind!=="non_bencana"?` (${a.emergency})`:""}\n${a.kind==="non_bencana"?"Jenis: "+(a.emergency||"Kegiatan non bencana")+"\n":""}Posisi dibutuhkan: ${a.role}${a.focus?" (bidang "+a.focus+")":""} · ${a.slots||1} orang\nLokasi: ${a.location}\nPeriode: ${fmtLong(a.start)} – ${fmtLong(endOf(a))} (${a.dur} hari)\nBatas konfirmasi: ${fmtLong(a.deadline)}\n${a.desc?"\n"+a.desc+"\n":""}\nBila bersedia, masuk ke aplikasi Roster WASH lalu tekan *Ajukan diri* pada alert ini sebelum batas konfirmasi.\n${redirectTo()}\n— Admin Roster WASH PMI`}
let bcState=null;
function bcSender(){try{return localStorage.getItem("rosterwash.sender")||""}catch(e){return ""}}
function gmailLinks(kind,a,rec){
  const emails=[...new Set(rec.map(m=>(m.email||"").trim().toLowerCase()).filter(e=>/^\S+@\S+\.\S+$/.test(e)))];
  const subj=kind==="announce"?`Pengumuman hasil seleksi ${a.code}: ${a.role} — ${a.title}`:`Alert penugasan ${a.code}: ${a.role} di ${a.location}`;
  const body=bcText(kind,a).replace(/\*/g,"");const out=[];
  for(let i=0;i<emails.length;i+=40){const part=emails.slice(i,i+40);
    const au=bcSender();
    out.push({from:i+1,to:i+part.length,href:"https://mail.google.com/mail/"+(au?"?authuser="+encodeURIComponent(au)+"&":"?")+"view=cm&fs=1&bcc="+encodeURIComponent(part.join(","))+"&su="+encodeURIComponent(subj)+"&body="+encodeURIComponent(body)})}
  return {emails,links:out}}
function bcRender(){
  const st=bcState,a=Object.assign({id:st.aid},S.alerts[st.aid]||{});
  const rec=bcRecipients(st.kind,a,st.aud),g=gmailLinks(st.kind,a,rec);
  const ch=st.channels,auto=!!(ch&&ch.email);
  const title=st.kind==="alert"?"Kirim alert ke anggota":"Kirim pengumuman ke anggota";
  const targeted=["candidates","selected","custom"].includes(st.aud);
  const keepScroll=($("#bc-list")||{}).scrollTop||0;
  openModal(title,(st.result?bcResultHTML(st.result):"")+`<div class="field"><label for="bc-aud">Penerima</label><select class="input" id="bc-aud">${bcAudOpts(st.kind,a,st.aud)}</select></div>
   ${st.aud==="custom"&&!st.result?bcPicker(a):""}
   ${targeted?bcPersonalWA(st.kind,a,rec):waGroupBox(st.kind,a)}`+(st.result?"":`<span class="lbl-up" style="margin-top:4px">Email</span>
   <div class="lbox"><b>${g.emails.length} alamat email</b><span class="muted" style="font-size:.84rem">Dikirim sebagai BCC, jadi alamat anggota tidak saling terlihat.</span></div>
   ${!ch?`<div class="skeleton" style="height:56px"></div>`:auto?`<div class="note" style="background:var(--ok-soft);color:var(--ok)"><b>Pengiriman otomatis aktif.</b> Tekan tombol <b>Kirim email</b>; email langsung terkirim dari server.</div>`
     :`<div class="note" style="display:flex;flex-direction:column;gap:8px"><b style="color:var(--ink)">Kirim lewat Gmail Anda</b><span>Tekan tombol di bawah. Gmail terbuka dengan penerima, judul, dan isi pesan sudah terisi, lalu tekan <b>Kirim</b> di Gmail.${g.links.length>1?` Penerima dibagi per 40 alamat, jadi ada ${g.links.length} email.`:""}</span>
       <div class="field"><label for="bc-from">Kirim dari akun Gmail (opsional)</label><input class="input" id="bc-from" type="email" placeholder="mis. roster.wash@gmail.com" value="${esc(bcSender())}"><span class="hint">Akun ini harus sudah masuk di browser Anda. Kosongkan untuk memakai akun Gmail yang sedang terbuka.</span></div>
       <div class="row" style="gap:6px">${g.links.map((l,i)=>`<a class="btn ${i===0?"primary":""}" target="_blank" rel="noopener" href="${esc(l.href)}">${I.mail}${g.links.length>1?`Gmail ${i+1} (penerima ${l.from}–${l.to})`:"Buka di Gmail"}</a>`).join("")||`<span class="muted">Tidak ada alamat email.</span>`}</div>
       <span class="muted" style="font-size:.8rem">Ingin terkirim otomatis tanpa membuka Gmail? Isi rahasia <span class="mono">GMAIL_USER</span> dan <span class="mono">GMAIL_APP_PASSWORD</span> di Supabase → Edge Functions → Secrets.</span></div>`}
   <div class="field"><label>Isi pesan</label><div class="msgbox">${esc(bcText(st.kind,a).replace(/\*/g,""))}</div></div>
   ${st.err?`<p class="err">${esc(st.err)}</p>`:""}`),
   st.result?`<button class="btn primary" data-act="close">Selesai</button>`:auto?`<button class="btn" data-act="close">Nanti saja</button><button class="btn primary" data-act="bc-send" ${st.busy||!g.emails.length?"disabled":""}>${st.busy?"Mengirim…":`Kirim email ke ${g.emails.length} orang`}</button>`:`<button class="btn" data-act="close">Tutup</button>`,true);
  const bl=$("#bc-list");if(bl)bl.scrollTop=keepScroll}
function bcResultHTML(r){
  if(!r.httpOk)return `<p class="err">${r.error==="admin_only"?"Hanya admin yang masuk dengan password yang bisa mengirim.":r.error==="no_channel"?"Pengiriman otomatis belum aktif.":r.error==="network"?"Tidak bisa terhubung ke server.":"Gagal mengirim ("+esc(r.error||r.http)+")."}</p>`;
  return r.email_error?`<p class="err">Email gagal dikirim: ${esc(r.email_error)}</p><p class="muted">Periksa rahasia GMAIL_USER dan GMAIL_APP_PASSWORD di Supabase (harus akun Gmail yang sama dengan App Password).</p>`
    :`<div class="lbox">${pill({x:["Terkirim","ok"]},"x")}<span>${r.email_sent} email terkirim ke anggota (BCC).</span></div>`}
async function broadcastModal(kind,aid){
  if(!S.isAdmin){toast("Masuk Mode Admin dulu.");return}
  bcState={kind,aid,aud:"all",ids:new Set(),q:"",email:true,wa:true,channels:null,busy:false,err:"",result:null};bcRender();
  const r=await bcCall({mode:"status"});
  if(!bcState||bcState.aid!==aid)return;
  if(!r.httpOk){bcState.err=r.error==="admin_only"?"Hanya admin yang masuk dengan password yang bisa mengirim.":"Server pengirim tidak bisa dihubungi.";bcState.channels={email:false,wa:false}}
  else bcState.channels=r.channels;
  bcRender()}
async function bcSend(){
  const st=bcState;if(!st)return;
  const aud=$("#bc-aud");if(aud)st.aud=aud.value;
  st.busy=true;st.err="";bcRender();
  if(st.aud==="custom"&&!st.ids.size){st.busy=false;st.err="Pilih minimal satu orang.";bcRender();return}
  const r=await bcCall({kind:st.kind,alert_id:st.aid,audience:st.aud,member_ids:st.aud==="custom"?[...st.ids]:undefined,email:true,wa:false,link:redirectTo()});
  st.busy=false;st.result=r;bcRender();
  try{sb.from("broadcasts").select("*").order("at",{ascending:false}).limit(100).then(x=>{S.broadcasts=(x&&x.data)||[];render()},()=>{})}catch(e){}}
document.addEventListener("change",e=>{if(e.target.id==="bc-aud"&&bcState){bcState.aud=e.target.value;bcState.result=null;bcRender()}
  else if(e.target.dataset&&e.target.dataset.bcm&&bcState){e.target.checked?bcState.ids.add(e.target.dataset.bcm):bcState.ids.delete(e.target.dataset.bcm);bcRender()}
  else if(e.target.id==="bc-from"&&bcState){const v=e.target.value.trim().toLowerCase();try{v?localStorage.setItem("rosterwash.sender",v):localStorage.removeItem("rosterwash.sender")}catch(err){}bcRender()}});
document.addEventListener("click",async e=>{const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
  if(a==="bc-open")broadcastModal(b.dataset.k,b.dataset.a);
  else if(a==="bc-send")bcSend();
  else if((a==="bc-all"||a==="bc-none")&&bcState){if(a==="bc-none")bcState.ids.clear();else document.querySelectorAll("#bc-list [data-bcm]").forEach(x=>bcState.ids.add(x.dataset.bcm));bcRender()}
  else if(a==="rsel"){e.stopPropagation();S.rsel=S.rsel||new Set();b.checked?S.rsel.add(b.dataset.m):S.rsel.delete(b.dataset.m);const l=$("#rlist");if(l)l.innerHTML=rosterTable()}
  else if(a==="rsel-all"){S.rsel=S.rsel||new Set();const ids=filteredMembers().map(m=>m.id);if(b.checked)ids.forEach(id=>S.rsel.add(id));else ids.forEach(id=>S.rsel.delete(id));const l=$("#rlist");if(l)l.innerHTML=rosterTable()}
  else if(a==="rsel-clear"){S.rsel.clear();const l=$("#rlist");if(l)l.innerHTML=rosterTable()}
  else if(a==="rsel-del"){if(!arm(b,"rdel","Tekan lagi: hapus permanen"))return;const ids=[...S.rsel];S.suspend=true;let ok=0;for(const id of ids){try{await write("delete","members",id);ok++}catch(err){}}S.suspend=false;S.rsel.clear();if(ids.includes(S.selMember))S.selMember=null;toast(ok+" anggota dihapus");await loadAll()}
},true);

/* ---------- sumber data: spreadsheet jawaban Google Form (sinkron di server tiap 5 menit) ---------- */
async function srcCall(body){
  const {data:{session}}=await sb.auth.getSession();
  try{const r=await fetch(SB_URL+"/functions/v1/sheet-sync",{method:"POST",headers:{"Content-Type":"application/json",apikey:SB_KEY,Authorization:"Bearer "+((session&&session.access_token)||SB_KEY)},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));return Object.assign({httpOk:r.ok,http:r.status},j)}
  catch(e){return {httpOk:false,error:"Tidak bisa menghubungi server. Periksa koneksi."}}}
function srcResultText(l){if(!l)return"";return `${l.new||0} baru, ${(l.updated||0)+(l.filled||0)} diperbarui, ${l.unchanged||0} tetap${l.errors?`, ${l.errors} dilewati`:""}`}
function syncStatusHTML(){
  if(!S.isAdmin)return"";
  const c=S.sheetSource,ik=S.intake||{};
  const form=ik.last_at?`<span class="muted" style="font-size:.78rem">Apps Script Google Form: ${ik.count||0} jawaban, terakhir ${stampT(Date.parse(ik.last_at))}.</span>`:"";
  if(!c||!c.url)return `<div class="lbox"><b>Sumber data</b><span class="muted">Belum terhubung. Tempel link spreadsheet jawaban Google Form; anggota baru otomatis masuk roster setiap form terisi.</span><button class="btn sm primary" data-act="sheet">${I.sheet}Hubungkan spreadsheet</button>${form}</div>`;
  const off=c.enabled===false,err=c.last_error;
  return `<div class="lbox"><div class="spread"><b>Spreadsheet jawaban Form</b>${S.srcBusy?`<span class="pill teal">Menyinkronkan…</span>`:off?`<span class="pill off">Dijeda</span>`:err?`<span class="pill red">Gagal</span>`:`<span class="pill ok">Otomatis</span>`}</div>
    ${c.last_at?`<span class="muted">Terakhir ${stampT(Date.parse(c.last_at))}${c.last_result?": "+srcResultText(c.last_result):""}</span>`:`<span class="muted">Menunggu sinkron pertama.</span>`}
    ${err?`<span class="err" style="font-size:.8rem">${esc(err)}</span>`:""}
    <div class="row" style="gap:6px"><button class="btn sm primary" data-act="sheet-sync" ${S.srcBusy?"disabled":""}>Sinkronkan sekarang</button><button class="btn sm" data-act="sheet">Pengaturan</button></div>
    <span class="muted" style="font-size:.74rem">Server memeriksa spreadsheet tiap 5 menit, walau aplikasi tidak dibuka.</span>${form}</div>`}
function sheetModal(){
  const c=S.sheetSource||{},t=S.srcTest;
  const prev=t&&t.preview&&t.preview.length?`<div style="overflow-x:auto"><table class="dt" style="font-size:.8rem"><thead><tr><th>Nama</th><th>Email</th><th>WhatsApp</th><th>Profil</th><th>Provinsi</th><th>No. MIS</th></tr></thead><tbody>${t.preview.map(p=>`<tr><td>${esc(p.name||"—")}</td><td>${esc(p.email||"—")}</td><td>${esc(p.phone||"—")}</td><td>${esc(p.role||"(bawaan)")}</td><td>${esc(p.province||"—")}</td><td>${esc(p.mis||"—")}</td></tr>`).join("")}</tbody></table></div>`:"";
  openModal("Sumber data roster",`<p class="muted">Hubungkan spreadsheet jawaban Google Form pendaftaran. Setiap jawaban baru otomatis menjadi anggota roster (dicocokkan lewat email, jadi tidak ada pendaftaran ganda).</p>
     <div class="field"><label for="srcurl">Link spreadsheet jawaban</label><input class="input" id="srcurl" placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0" value="${esc((t&&t.url)||c.url||"")}"></div>
     <p class="err" id="srcerr" ${S.srcErr?"":"hidden"}>${esc(S.srcErr||"")}</p>
     ${t&&t.ok?`<div class="note" style="display:flex;flex-direction:column;gap:6px"><b style="color:var(--ink)">Terbaca: ${t.rows} jawaban · ${t.headers.length} kolom</b>${prev}<span>Kolom dikenali dari judul pertanyaan: nama, email, WhatsApp, provinsi, markas/cabang, profil/bidang, keahlian/pelatihan, No. MIS (SIAMO).</span></div>`:""}
     <div class="note" style="display:flex;flex-direction:column;gap:5px"><b style="color:var(--ink)">Cara mendapatkan link</b>
       <span>1. Di Google Form → tab <b>Jawaban</b> → <b>Tautkan ke Spreadsheet</b>.</span>
       <span>2. Di spreadsheet: <b>Bagikan → Akses umum → Siapa saja yang memiliki link (Pelihat)</b>.</span>
       <span>3. Salin link dari bilah alamat, tempel di atas, tekan <b>Tes</b>.</span>
       <span class="muted" style="font-size:.78rem">Siapa pun yang memegang link bisa melihat isinya; bagikan link hanya kepada admin.</span></div>
     <p class="muted" style="font-size:.8rem">Ingin tanpa membagikan spreadsheet? <button class="btn sm ghost" data-act="gform">Pakai Apps Script Google Form</button></p>`,
    `${c.url?`<button class="btn ghost danger" data-act="src-off" style="margin-right:auto">Putuskan</button>`:""}<button class="btn" data-act="close">Batal</button><button class="btn" data-act="src-test" ${S.srcBusy?"disabled":""}>${S.srcBusy==="test"?"Membaca…":"Tes"}</button><button class="btn primary" data-act="src-save" ${t&&t.ok&&!S.srcBusy?"":"disabled"}>Simpan &amp; sinkronkan</button>`,true)}
async function syncSheet(manual){
  if(!S.isAdmin||S.srcBusy)return;S.srcBusy="run";render();
  const r=await srcCall({mode:"run"});S.srcBusy=false;
  if(manual)toast(r.httpOk?(r.skipped?"Belum ada spreadsheet yang dihubungkan.":"Sinkron selesai: "+srcResultText(r)):(r.error||"Sinkron gagal."));
  await loadAll()}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
  if(a==="sheet"){e.preventDefault();e.stopImmediatePropagation();if(!S.isAdmin){toast("Masuk Mode Admin dulu.");return}S.srcTest=null;S.srcErr="";sheetModal();return}
  if(a==="src-test"){e.preventDefault();e.stopImmediatePropagation();const url=($("#srcurl").value||"").trim();
    if(!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(url)){S.srcErr="Link harus link Google Spreadsheet (https://docs.google.com/spreadsheets/…).";S.srcTest=null;sheetModal();return}
    S.srcBusy="test";S.srcErr="";S.srcTest={url};sheetModal();
    const r=await srcCall({mode:"test",url});S.srcBusy=false;
    if(r.httpOk&&r.ok){S.srcTest=Object.assign({url},r);if(!r.rows)S.srcErr="Spreadsheet terbaca, tapi belum ada jawaban.";}else{S.srcTest={url};S.srcErr=r.error||"Spreadsheet tidak bisa dibaca."}
    sheetModal();return}
  if(a==="src-save"){e.preventDefault();e.stopImmediatePropagation();const t=S.srcTest;if(!t||!t.ok)return;
    const v=Object.assign({},S.sheetSource||{},{url:t.url,enabled:true,saved_at:new Date().toISOString()});
    if(!S.sheetSource||S.sheetSource.url!==t.url){delete v.last_at;delete v.last_result;delete v.last_error}
    try{await write("set","settings","sheet_source",v);S.sheetSource=v}catch(err){S.srcErr="Gagal menyimpan: "+(err.message||err);sheetModal();return}
    closeModal();syncSheet(true);return}
  if(a==="src-off"){e.preventDefault();e.stopImmediatePropagation();if(!arm(b,"srcoff","Tekan lagi untuk memutuskan"))return;closeModal();
    await write("delete","settings","sheet_source").catch(()=>{});S.sheetSource=null;toast("Spreadsheet diputus. Anggota yang sudah masuk tetap ada.");render();return}
},true);

/* ---------- grup WhatsApp Roster (gratis: admin membagikan teks ke grup dari WhatsApp sendiri) ---------- */
const waShareHref=t=>"https://wa.me/?text="+encodeURIComponent(t);
function waGroupBox(kind,a){
  const t=bcText(kind,a);
  return `<div class="lbox" id="wagbox"><b>${I.wa.replace("<svg",'<svg width="16" height="16" style="vertical-align:-3px;margin-right:4px"')}Grup WhatsApp Roster <span class="pill ok" style="margin-left:4px">Gratis</span></b>
    <span class="muted" style="font-size:.84rem">Tekan <b>Kirim ke grup WhatsApp</b>, pilih grup Roster WASH, lalu tekan kirim. Satu pesan sampai ke semua anggota grup.</span>
    <div class="row" style="gap:6px"><a class="btn wa primary" id="wagshare" target="_blank" rel="noopener" href="${esc(waShareHref(t))}">${I.wa}Kirim ke grup WhatsApp</a><button class="btn sm" data-act="wag-copy" data-k="${kind}" data-a="${a.id}">${I.copy}Salin teks</button>${S.waGroup?`<a class="btn sm ghost" target="_blank" rel="noopener" href="${esc(S.waGroup)}">Buka grup</a>`:""}</div>
    <div class="field"><label for="wagurl">Link undangan grup (opsional, tampil di beranda anggota agar bisa bergabung)</label><div class="row" style="flex-wrap:nowrap;gap:6px"><input class="input" id="wagurl" placeholder="https://chat.whatsapp.com/…" value="${esc(S.waGroup||"")}"><button class="btn sm" data-act="wag-save">Simpan</button></div></div></div>`}
function waGroupJoinHTML(){if(!S.waGroup)return"";return `<section class="card" id="m-wag"><div class="card-b row" style="justify-content:space-between;gap:10px"><div><b>Grup WhatsApp Roster WASH</b><div class="muted" style="font-size:.84rem">Alert dan pengumuman juga dikirim ke grup ini.</div></div><a class="btn wa" target="_blank" rel="noopener" href="${esc(S.waGroup)}">${I.wa}Gabung grup</a></div></section>`}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act;
  if(a==="wag-copy"){e.preventDefault();e.stopImmediatePropagation();const al=Object.assign({id:b.dataset.a},S.alerts[b.dataset.a]||{});try{await navigator.clipboard.writeText(bcText(b.dataset.k,al));toast("Teks disalin. Tempel di grup WhatsApp.")}catch(err){toast("Gagal menyalin.")}return}
  if(a==="wag-save"){e.preventDefault();e.stopImmediatePropagation();const v=($("#wagurl").value||"").trim();
    if(v&&!/^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(v)){toast("Link grup harus diawali https://chat.whatsapp.com/");return}
    try{if(v)await write("set","settings","wa_group",{url:v});else await write("delete","settings","wa_group");S.waGroup=v;toast(v?"Link grup disimpan. Anggota melihat tombol Gabung grup.":"Link grup dihapus.")}catch(err){toast("Gagal menyimpan.")}return}
},true);

document.addEventListener("input",e=>{if(e.target.id==="bc-q"&&bcState){bcState.q=e.target.value;const pos=e.target.selectionStart;bcRender();const i=$("#bc-q");if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(err){}}}});

/* ---------- WASHPEDIA: pusat informasi WASH PMI ---------- */
const WASHPEDIA_URL="https://bit.ly/WASHPEDIA2026";
const WP_ICON='<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5.5C4.5 4 7.5 4 12 6c4.5-2 7.5-2 10-.5v13c-2.5-1.5-5.5-1.5-10 .5-4.5-2-7.5-2-10-.5z"/><path d="M12 6v13.5"/><path d="M8.5 9.5c-1-.3-2-.4-3 0M8.5 12.5c-1-.3-2-.4-3 0"/></svg>';
function washpediaHTML(){
  return `<a class="wpb" id="washpedia" href="${WASHPEDIA_URL}" target="_blank" rel="noopener" aria-label="Buka WASHPEDIA, pusat informasi WASH PMI (tab baru)">
    <span class="wpb-ic">${WP_ICON}</span>
    <span class="wpb-t"><span class="wpb-k">Pusat informasi</span><b>WASHPEDIA</b><span class="wpb-s">Semua tentang WASH PMI dalam satu tempat</span></span>
    <span class="wpb-go">Buka<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a>`}
