"""Generate index.html + src/app.js for the Supabase web app from the artifact page (tools/artifact-source.html)."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "tools/artifact-source.html").read_text()
backend = (root / "tools/backend.part.js").read_text()

# ---------- split ----------
head_end = src.index('<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs')
markup = src[:head_end]
js = src[src.rindex("<script>\n") + len("<script>\n"):src.rindex("</script>")]

# ---------- index.html ----------
markup = markup.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
title_end = markup.index("</title>") + len("</title>")
head_extra = ('\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
              '\n<meta name="theme-color" content="#DCEBFB">\n<link rel="icon" href="/favicon.svg" type="image/svg+xml">')
style_start = markup.index("<style>")
style_end = markup.index("</style>") + len("</style>")
reset = ("<style>\n:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}\n"
         "body{margin:0}img{max-width:100%}\n</style>\n")
head = markup[:title_end] + head_extra + "\n" + markup[title_end:style_end].lstrip()
body = markup[style_end:]
html = ("<!doctype html>\n<html lang=\"id\">\n<head>\n" + head.replace("<title>", "<title>", 1) + "\n" + reset +
        "</head>\n<body>" + body + '<script type="module" src="/src/main.js"></script>\n</body>\n</html>\n')
(root / "index.html").write_text(html)

# ---------- app.js ----------
def rep(a, b, cnt=1):
    global js
    n = js.count(a)
    assert n == cnt, (a[:90], n)
    js = js.replace(a, b)

# unwrap IIFE -> module
assert js.startswith('(function(){\n"use strict";\n')
js = js[len('(function(){\n"use strict";\n'):]
js = js[:js.rstrip().rindex("})();")]

# ids are uuids now
rep('const newId=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);', 'const newId=()=>crypto.randomUUID();')
rep('const nid=newId("a").replace(/[^a-z0-9]/gi,"");', 'const nid=newId();')
rep('ops.push({kind:"set",id:"s_"+hashKey(key),', 'ops.push({kind:"set",id:newId(),')
js = js.replace("seleksi-[A-Za-z0-9]+", "seleksi-[A-Za-z0-9-]+").replace("alert-[A-Za-z0-9]+", "alert-[A-Za-z0-9-]+")

# downloads work natively in a normal website
rep('uid:null,isAdmin:true,meProfile:null,', 'uid:null,isAdmin:false,isAdminAcct:false,admins:[],session:null,meProfile:null,')
rep('downloads:null,', 'downloads:{save:async({filename,data})=>{const blob=data instanceof Blob?data:new Blob([data]);const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}},')

# write(): local apply + Supabase
rep('''  const loc=(coll==="members"||coll==="alerts"||coll==="settings")?S[coll]:null;''',
    '''  const loc=(coll==="members"||coll==="alerts"||coll==="settings")?S[coll]:null;
  const prev=loc&&loc[id]?JSON.parse(JSON.stringify(loc[id])):null;''')
rep('''  saveLocal();if(!S.suspend)render();
  if(S.mode!=="db")return;
  const ref=S.db.collection(coll).doc(id);
  return enqueue(coll+"/"+id,()=>kind==="set"?ref.set(data):kind==="update"?ref.update(data):ref.delete()).catch(e=>{if(!S.suspend)toast(errMsg(e));throw e});''',
    '''  if(!S.suspend)render();
  return enqueue(coll+"/"+id,()=>remoteWrite(kind,coll,id,data,prev)).then(()=>{if(!S.suspend)scheduleRefetch()}).catch(e=>{if(!S.suspend){toast(errMsg(e));scheduleRefetch()}throw e});''')
rep('function errMsg(e){const c=e&&e.code;', 'function errMsg(e){const c=e&&e.code;if(c==="server"&&e.message)return e.message;')
rep('if(c==="revoked"||c==="not_granted")return"Anda tidak punya akses untuk mengubah roster ini.";return S.isAdmin?"Gagal menyimpan. Periksa koneksi lalu coba lagi.":"Gagal menyimpan. Pastikan akses Anda ke halaman ini bukan hanya untuk melihat, lalu coba lagi."}',
    'if(c==="revoked"||c==="not_granted")return S.isAdminAcct&&!S.isAdmin?"Masuk Mode Admin dengan password untuk mengubah data ini.":"Anda tidak punya akses untuk mengubah data ini.";return"Gagal menyimpan. Periksa koneksi lalu coba lagi."}')

# QR via npm qrcode
rep('let qr=null;try{if(window.QRCode){const d=document.createElement("div");new QRCode(d,{text:`${c.cardNo}|${m.name}|${m.mis||""}|${a.role}|${a.location}|${a.start}/${endOf(a)}`,width:220,height:220,correctLevel:QRCode.CorrectLevel.M});qr=d.querySelector("canvas")}}catch(e){}',
    'let qr=null;try{const qc=document.createElement("canvas");await QRCode.toCanvas(qc,`${c.cardNo}|${m.name}|${m.mis||""}|${a.role}|${a.location}|${a.start}/${endOf(a)}`,{width:220,margin:1,errorCorrectionLevel:"M"});qr=qc}catch(e){}')
rep('const loadImg=src=>new Promise(r=>{const i=new Image();', 'const loadImg=src=>new Promise(r=>{const i=new Image();if(!/^data:/.test(src))i.crossOrigin="anonymous";')

# photos -> Supabase Storage
rep('''  if(self)id=S.uid;''', '''  if(self)id=S.uid;
  try{m.photo=await uploadPhoto(m.photo)}catch(e){fail(e.message);return}''')
rep('const mm=S.members[mid]||{};const thumb=await thumbOf(mm.photo);', 'const mm=S.members[mid]||{};const thumb=mm.photo||"";')
rep('if(m&&(!c.name||(!c.thumb&&m.photo)))fill[mid]={name:m.name,thumb:c.thumb||await thumbOf(m.photo)}', 'if(m&&(!c.name||(!c.thumb&&m.photo)))fill[mid]={name:m.name,thumb:c.thumb||m.photo||""}')

# Google Sheets: read a sheet shared "anyone with the link" via the gviz CSV endpoint
rep('async function gsCall(tool,input){', 'async function gsCallUnused(tool,input){')
rep('async function gsSheets(id){', 'async function gsSheets(id){return {title:"Google Sheets",sheets:[S.sheetTab||"(sheet pertama)"]}}\nasync function gsSheetsUnused(id){')
rep('async function gsGrid(id,sheet){', '''async function gsGrid(id,sheet){
  const u=`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${sheet&&sheet!=="(sheet pertama)"?"&sheet="+encodeURIComponent(sheet):""}`;
  let res,t;try{res=await fetch(u,{cache:"no-store"});t=await res.text()}catch(e){throw {code:"private"}}
  if(!res.ok||/^\\s*</.test(t))throw {code:"private"};
  const wb=XLSX.read(t,{type:"string",raw:true});const g0=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:""});
  const g=g0.map(r=>(r||[]).map(c=>String(c==null?"":c).trim()));const hi=g.findIndex(r=>r.filter(Boolean).length>=2);if(hi<0)throw {code:"empty"};return {headers:g[hi],rows:g.slice(hi+1).filter(r=>r.some(Boolean))}}
async function gsGridUnused(id,sheet){''')
rep('function gsErr(e){const c=e&&e.code;', 'function gsErr(e){const c=e&&e.code;\n  if(c==="private")return"Spreadsheet tidak bisa dibaca. Di Google Sheets, buka Bagikan → Akses umum → \\"Siapa saja yang memiliki link\\" (Pelihat), lalu coba lagi. Periksa juga nama sheet.";')
rep('''<div class="field"><label for="shurl">Link spreadsheet</label><input class="input" id="shurl" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(cfg.url||"")}"></div>''',
    '''<div class="field"><label for="shurl">Link spreadsheet</label><input class="input" id="shurl" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(cfg.url||"")}"></div>
     <div class="field"><label for="shname">Nama sheet/tab (kosongkan untuk sheet pertama)</label><input class="input" id="shname" placeholder="mis. Form Responses 1" value="${esc(cfg.sheet&&cfg.sheet!=="(sheet pertama)"?cfg.sheet:"")}"></div>''')
rep('''<span>· Baris yang dihapus dari spreadsheet tidak menghapus anggota di roster.</span></div>''',
    '''<span>· Baris yang dihapus dari spreadsheet tidak menghapus anggota di roster.</span><span>· Spreadsheet harus dibagikan "Siapa saja yang memiliki link" agar bisa dibaca. Simpan link-nya hanya di antara admin.</span></div>''')
rep('''case"sheet-read":{const url=$("#shurl").value,id=sheetIdOf(url),er=$("#sherr");''', '''case"sheet-read":{const url=$("#shurl").value,id=sheetIdOf(url),er=$("#sherr");S.sheetTab=($("#shname").value||"").trim();''')
rep('Data dibaca dengan akun Google Anda lewat konektor Google Sheets, lalu dicocokkan', 'Data dicocokkan')
rep('''case"sheet":if(!S.mcp){toast("Sinkron Google Sheets hanya tersedia saat halaman dibuka lewat claude.ai.");break}''', 'case"sheet":if(!S.isAdmin){toast("Masuk Mode Admin dulu.");break}')
rep('if(!S.mcp)return compact?"":`<p class="note">Sinkron Google Sheets tersedia saat halaman dibuka lewat claude.ai oleh admin yang sudah menghubungkan konektor Google Sheets.</p>`;', 'if(!S.mcp)return "";')

# server-side spreadsheet sync (Edge Function sheet-sync) replaces the in-browser sync
rep('function syncStatusHTML(compact){', 'function syncStatusHTMLUnused(compact){')
rep('function sheetModal(){', 'function sheetModalUnused(){')
rep('async function syncSheet(manual){', 'async function syncSheetUnused(manual){')
rep('function startAutoSync(){', 'function startAutoSync(){}\nfunction startAutoSyncUnused(){')

# mode switch: admin account without password session -> password prompt
rep('const memberView=()=>!S.isAdmin||S.viewAs==="anggota";', 'const memberView=()=>!S.isAdmin||S.viewAs==="anggota";')
rep('''$("#hright").innerHTML=(S.isAdmin?`<div class="seg"''', '''$("#hright").innerHTML=(S.isAdminAcct?`<div class="seg"''')
rep('''`<span class="hbtn who" style="cursor:default">${I.user}<span class="t">${esc(who)}</span></span>`;''',
    '''(S.session?`<span class="hbtn who" style="cursor:default">${I.user}<span class="t">${esc(who)}</span></span><button class="hbtn" data-act="logout" title="Keluar" aria-label="Keluar">${I.x}<span class="t">Keluar</span></button>`:"");''')
rep('case"mode":S.viewAs=b.dataset.v;', 'case"mode":if(b.dataset.v==="admin"&&!S.isAdmin){adminPwModal(false);break}S.viewAs=b.dataset.v;')
rep('    if(!S.uid){S.view="signin";cp.innerHTML=vSignin()}', '    if(!S.session){if(S.view==="signin"&&cp.querySelector("#authbox"))return;S.view="signin";cp.innerHTML=vSignin()}')
rep('''$("#modechip").innerHTML=S.mode==="public"?`<span class="d local"></span>Pendaftaran`:S.mode==="db"?`<span class="d"></span>Tersimpan bersama`:S.mode==="local"?`<span class="d local"></span>Mode lokal`:"Menghubungkan…";''',
    '''$("#modechip").innerHTML=S.session?(S.isAdmin&&!memberView()?`<span class="d"></span>Admin`:`<span class="d"></span>Anggota`):`<span class="d local"></span>Belum masuk`;''')
rep('''$("#modechip").title=S.mode==="local"?"Data hanya tersimpan di browser ini. Buka lewat claude.ai dan masuk akun untuk berbagi data.":"";''', '')
rep('''const me=S.members[S.uid];const who=!mv?(S.mode==="local"?"Admin (lokal)":"Admin"):((me&&me.name)||"Anggota");''',
    '''const me=S.members[S.uid];const who=(me&&me.name)||(S.session&&S.session.user.email)||"Anggota";''')

# texts that referred to claude.ai / Share
rep('<button class="btn" data-act="admins">${I.user}Cara membagikan tautan</button></div><p style="font-size:.8rem">Relawan yang membuka tautan halaman ini akan melihat formulir pendaftaran, lalu otomatis masuk ke roster.</p>',
    '<button class="btn" data-act="copytxt" data-t="${esc(location.origin+location.pathname)}">${I.copy}Salin link pendaftaran</button></div><p style="font-size:.8rem">Bagikan link aplikasi ke grup WhatsApp. Pendaftar masuk dengan kode yang dikirim ke email aktif mereka, lalu otomatis masuk ke roster.</p>')
rep('<p class="muted">Belum ada yang mendaftar. Bagikan tautan halaman ini; anggota masuk dengan akun yang memakai email aktif, lalu mengisi formulir pendaftaran.</p>',
    '<p class="muted">Belum ada yang mendaftar. Bagikan link aplikasi ini; anggota memasukkan email aktif, menerima kode verifikasi, lalu mengisi formulir pendaftaran.</p><div><button class="btn sm" data-act="copytxt" data-t="${esc(location.origin+location.pathname)}">${I.copy}Salin link pendaftaran</button></div>')
js = re.sub(r'<p class="note">Bagikan halaman ini lewat menu <b>Share</b>.*?</p>',
            '<p class="note">Bagikan link aplikasi ini ke grup WhatsApp. Pendaftar memasukkan email aktif, menerima kode verifikasi, lalu mengisi profil. Mereka hanya bisa melihat data dirinya sendiri.</p>', js, count=1)
rep('<span class="hint">Diambil dari akun yang Anda pakai untuk masuk. Alert dikirim ke email ini.</span>', '<span class="hint">Email yang sudah diverifikasi dengan kode. Alert dikirim ke email ini.</span>')

# admin management + auth actions
rep('''    case"admins":openModal("Kelola admin & pendaftaran",''', '''    case"admins":adminsModal();break;
    case"admins-old":openModal("Kelola admin & pendaftaran",''')
rep('    case"exportrep":exportReports();break;', '''    case"exportrep":exportReports();break;
    case"auth-mode":S.auth.mode=b.dataset.v;S.auth.err="";S.auth.info="";authRender();break;
    case"auth-back":S.auth.step="email";S.auth.err="";authRender();break;
    case"otp-resend":sendOtp(S.auth.email);break;
    case"pw-forgot":{const em=(($("#admail")&&$("#admail").value)||S.auth.email||"").trim();if(!em){S.auth.err="Isi email admin dulu.";authRender();break}const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:redirectTo()});S.auth.email=em;S.auth.err=error?"Gagal mengirim email: "+error.message:"";S.auth.info=error?"":"Tautan untuk mengatur ulang password sudah dikirim ke "+em+".";authRender();break}
    case"pw-new":adminPwModal(true);break;
    case"pw-enter":pwEnter();break;
    case"pw-create":pwCreate(!!b.dataset.recovery);break;
    case"admin-add":adminAdd();break;
    case"admin-rm":adminRm(b.dataset.u,b);break;
    case"logout":await sb.auth.signOut();S.viewAs="admin";toast("Anda sudah keluar");break;''')
rep('''document.addEventListener("submit",e=>{if(e.target.id==="askform"){''', '''document.addEventListener("submit",e=>{
  if(e.target.id==="waform"){e.preventDefault();memberLogin($("#aemail").value,$("#awa").value);return}
  if(e.target.id==="emailform"){e.preventDefault();sendOtp($("#aemail").value);return}
  if(e.target.id==="codeform"){e.preventDefault();verifyCode($("#acode").value);return}
  if(e.target.id==="adminform"){e.preventDefault();adminLogin($("#admail").value,$("#adpw").value);return}
  if(e.target.id==="askform"){''')
rep('''document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;''', '''document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target&&(e.target.id==="apw"||e.target.id==="npw2")){e.preventDefault();e.target.id==="apw"?pwEnter():pwCreate(false);return}if(e.key!=="Escape")return;''')

# old claude.ai vSignin -> replaced by backend version
js = re.sub(r'function vSignin\(\)\{return `<div class="regwrap">.*?</div>`\}\n', '', js, count=1, flags=re.S)

# boot: replace claude.ai init
i = js.index('(async()=>{\n  const cl=window.claude;')
js = js[:i] + "boot();\n"
js = js.replace("route();\n\nboot();", "route();\nboot();")

header = '''import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
window.XLSX = XLSX;
// Proyek Supabase Roster WASH. Kunci "anon" ini publik (memang dikirim ke browser);\n// keamanan data dijaga oleh aturan Row Level Security di supabase/schema.sql.\n// Variabel lingkungan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tetap bisa menimpanya.\nconst DEFAULT_SB_URL = "https://pzoueizgwgccacixelgi.supabase.co";\nconst DEFAULT_SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6b3VlaXpnd2djY2FjaXhlbGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwMTIxNDAsImV4cCI6MjExMDU4ODE0MH0.UjD00q9TXgoxiK6Owet5D3YJtwTts00OBaK_XL91SHg";\nconst SB_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SB_URL, SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SB_KEY;
const sb = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
'''
js = header + js
# insert backend before boot()
js = js.replace("\nboot();", "\n" + backend + "\nboot();")
(root / "src/app.js").write_text(js)
(root / "src/main.js").write_text('import "./app.js";\n')
print("ok", len(html), len(js))
