/* =====================================================================
   Supabase backend: data loading, writes, realtime, auth (email code + admin password)
   ===================================================================== */
const isoT=t=>t?new Date(t).toISOString():null;
const msT=t=>t?Date.parse(t):null;
const MCOLS={name:"name",email:"email",phone:"phone",role:"role",level:"level",province:"province",chapter:"chapter",skills:"skills",lang:"lang",status:"status",photo:"photo",source:"source",sheetSig:"sheet_sig"};
const ACOLS={code:"code",title:"title",emergency:"emergency",role:"role",location:"location",start:"start_date",dur:"dur",deadline:"deadline",slots:"slots",desc:"description",status:"status"};
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
    if(self&&kind==="set"){const p={};["name","phone","role","level","province","chapter","skills","lang","status","photo"].forEach(k=>{if(data[k]!==undefined)p[k]=data[k]});chk(await sb.rpc("save_my_profile",{p}));return}
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
  const bad=res.find(r=>r.error);if(bad){S.loadErr=true;S.loaded=false;console.error(bad.error);render();return}
  const [m,a,c,r,s,ad]=res.map(x=>x.data||[]);
  const me=S.session.user.id;
  S.admins=ad;S.isAdminAcct=ad.some(x=>x.user_id===me);S.isAdmin=S.isAdminAcct&&hasPasswordSession();
  const members={};let myId=null;
  m.forEach(x=>{members[x.id]={name:x.name,email:x.email||"",phone:x.phone,role:x.role,level:x.level,province:x.province,chapter:x.chapter,skills:x.skills,lang:x.lang,status:x.status,photo:x.photo,source:x.source,account:!!x.user_id,sheetSig:x.sheet_sig,createdAt:msT(x.created_at),reports:{}};if(x.user_id===me)myId=x.id});
  r.forEach(x=>{const mm=members[x.member_id];if(mm)mm.reports[x.alert_id]={summary:x.summary,metrics:x.metrics||{},cond:x.cond,issues:x.issues,recs:x.recs,seen:x.seen,at:msT(x.submitted_at)}});
  const alerts={};
  a.forEach(x=>{alerts[x.id]={code:x.code,title:x.title,emergency:x.emergency,role:x.role,location:x.location,start:x.start_date,dur:x.dur,deadline:x.deadline,slots:x.slots,desc:x.description,status:x.status,createdAt:msT(x.created_at),announce:x.announce_at?{at:msT(x.announce_at),note:x.announce_note}:null,cand:{}}});
  c.forEach(x=>{const al=alerts[x.alert_id];if(!al)return;al.cand[x.member_id]={state:x.state,self:x.self_response,respAt:x.self_response?msT(x.answered_at):null,answeredAt:x.self_response?null:msT(x.answered_at),invitedAt:msT(x.invited_at),emailAt:msT(x.email_at),waAt:msT(x.wa_at),cardNo:x.card_no||"",selectedAt:msT(x.selected_at),name:x.name||"",thumb:x.thumb||""}});
  S.members=members;S.alerts=alerts;
  const app=s.find(x=>x.key==="app"),sh=s.find(x=>x.key==="sheet");
  S.settings={app:app?app.value:{}};S.sync=sh?sh.value:null;
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
S.auth=S.auth||{mode:"member",step:"email",email:"",err:"",info:"",busy:false,cool:0};
function vSignin(){
  const A=S.auth,org=(S.settings.app&&S.settings.app.org)||"";
  const err=A.err?`<p class="err">${esc(A.err)}</p>`:"",info=A.info?`<p class="note">${esc(A.info)}</p>`:"";
  let box;
  if(A.mode==="admin")box=`<h2>Masuk sebagai admin</h2><p class="muted">Gunakan email dan password admin.</p>
     <form class="form" id="adminform" style="grid-template-columns:1fr" novalidate><div class="field"><label for="admail">Email</label><input class="input" id="admail" type="email" autocomplete="username" value="${esc(A.email)}"></div>
     <div class="field"><label for="adpw">Password</label><input class="input" id="adpw" type="password" autocomplete="current-password"></div>${err}${info}
     <button class="btn primary" type="submit" ${A.busy?"disabled":""}>${A.busy?"Memeriksa…":"Masuk"}</button></form>
     <div class="row" style="justify-content:space-between"><button class="btn sm ghost" data-act="auth-mode" data-v="member">← Masuk sebagai anggota</button><button class="btn sm ghost" data-act="pw-forgot">Lupa password?</button></div>`;
  else if(A.step==="code")box=`<h2>Masukkan kode verifikasi</h2><p class="muted">Kode dikirim ke <b>${esc(A.email)}</b>. Cek juga folder spam. Anda juga bisa langsung menekan tautan di email tersebut.</p>
     <form class="form" id="codeform" style="grid-template-columns:1fr" novalidate><div class="field"><label for="acode">Kode dari email</label><input class="input mono" id="acode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" style="font-size:1.4rem;letter-spacing:.3em;text-align:center"></div>${err}${info}
     <button class="btn primary" type="submit" ${A.busy?"disabled":""}>${A.busy?"Memeriksa…":"Verifikasi & masuk"}</button></form>
     <div class="row" style="justify-content:space-between"><button class="btn sm ghost" data-act="auth-back">Ganti email</button><button class="btn sm ghost" data-act="otp-resend" ${A.cool>Date.now()?"disabled":""}>Kirim ulang kode</button></div>`;
  else box=`<h2>Masuk atau daftar</h2><p class="muted">Masukkan <b>email aktif</b> Anda. Kami kirim kode verifikasi ke email itu. Anggota baru langsung diarahkan ke formulir pendaftaran.</p>
     <form class="form" id="emailform" style="grid-template-columns:1fr" novalidate><div class="field"><label for="aemail">Email aktif</label><input class="input" id="aemail" type="email" autocomplete="email" placeholder="nama@contoh.id" value="${esc(A.email)}"></div>${err}${info}
     <button class="btn primary" type="submit" ${A.busy?"disabled":""}>${A.busy?"Mengirim…":"Kirim kode verifikasi"}</button></form>
     <div class="row" style="justify-content:flex-end"><button class="btn sm ghost" data-act="auth-mode" data-v="admin">Masuk sebagai admin</button></div>`;
  return `<div class="regwrap"><section class="hero"><p class="eyebrow">${esc(org||"Roster Relawan & Staf WASH")}</p><h1 style="font-size:clamp(1.8rem,3.6vw,2.6rem)">Roster WASH PMI</h1><p class="lead">Daftar sekali dengan email aktif, lalu terima alert penugasan WASH, lihat pengumuman, kartu ID, dan kirim laporan pasca penugasan.</p>
    <ol class="steps" style="margin-top:22px"><li><span><b>Masukkan email aktif</b>Kode verifikasi dikirim ke email Anda.</span></li><li><span><b>Lengkapi profil &amp; foto</b>Foto dipakai untuk kartu ID penugasan.</span></li><li><span><b>Terima alert</b>Jawab bersedia atau ajukan diri dari Beranda.</span></li><li><span><b>Kartu ID &amp; laporan</b>Muncul begitu Anda terpilih.</span></li></ol></section>
    <section class="panel" id="authbox">${box}</section></div>`}
function authRender(){S.view="signin";$("#cp").innerHTML=vSignin();const f=$("#aemail")||$("#acode")||$("#adpw");if(f&&!S.auth.busy)f.focus()}
const redirectTo=()=>location.origin+location.pathname;
async function sendOtp(email){
  const A=S.auth;email=String(email||"").trim().toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email)){A.err="Format email belum benar.";authRender();return}
  A.email=email;A.busy=true;A.err="";A.info="";authRender();
  const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:redirectTo()}});
  A.busy=false;
  if(error){A.err=/rate|seconds|too many/i.test(error.message)?"Terlalu sering meminta kode. Tunggu sekitar satu menit lalu coba lagi.":"Kode gagal dikirim: "+error.message;authRender();return}
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
  startRealtime();await loadAll()}
