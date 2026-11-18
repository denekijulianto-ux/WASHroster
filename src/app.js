import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
window.XLSX = XLSX;
const SB_URL = import.meta.env.VITE_SUPABASE_URL, SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sb = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const ROLES=["Koordinator WASH","Suplai Air Bersih","Sanitasi & Limbah","Promosi Kebersihan","Kualitas Air","Pengendalian Vektor","Operator Unit Pengolahan Air"];
const LEVELS=["Relawan (KSR/TSR)","Staf PMI","Team Leader"];
const EMERG=["Banjir","Gempa Bumi","Tsunami","Erupsi Gunung Api","Tanah Longsor","Kekeringan","Kebakaran","Wabah Penyakit","Pengungsian"];
const PROV=["Aceh","Sumatera Utara","Sumatera Barat","Riau","Kepulauan Riau","Jambi","Bengkulu","Sumatera Selatan","Kepulauan Bangka Belitung","Lampung","Banten","DKI Jakarta","Jawa Barat","Jawa Tengah","DI Yogyakarta","Jawa Timur","Bali","Nusa Tenggara Barat","Nusa Tenggara Timur","Kalimantan Barat","Kalimantan Tengah","Kalimantan Selatan","Kalimantan Timur","Kalimantan Utara","Sulawesi Utara","Gorontalo","Sulawesi Tengah","Sulawesi Barat","Sulawesi Selatan","Sulawesi Tenggara","Maluku","Maluku Utara","Papua","Papua Barat","Papua Barat Daya","Papua Tengah","Papua Pegunungan","Papua Selatan"];
const MSTAT={tersedia:["Tersedia","ok"],ditugaskan:["Bertugas","red"],tidak:["Tidak tersedia","off"]};
const CSTAT={diundang:["Diundang","water"],mengajukan:["Mengajukan diri","warn"],bersedia:["Bersedia","ok"],menolak:["Menolak","off"],terpilih:["Terpilih","red"]};
const ASTAT={terbuka:["Terbuka","red"],terisi:["Terisi","ok"],ditutup:["Ditutup","off"]};

const I={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/></svg>',
  id:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><circle cx="12" cy="10" r="2.6"/><path d="M8.5 17a3.5 3.5 0 0 1 7 0"/><path d="M10 5.5h4"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2A9.7 9.7 0 0 0 3.6 16.8L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.2-.2-.4-.3Z"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  search:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  x:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4m-4.5 4.5L12 4l4.5 4.5M5 20h14"/></svg>',
  sheet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/></svg>',
  dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5M5 20h14"/></svg>'
};

const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const newId=()=>crypto.randomUUID();
const S={mode:"pending",db:null,members:{},alerts:{},loaded:false,loadErr:false,route:"beranda",
  f:{q:"",role:"",status:"",prov:""},af:"aktif",inv:{q:"",roleOnly:true,availOnly:true,sel:new Set()},downloads:{save:async({filename,data})=>{const blob=data instanceof Blob?data:new Blob([data]);const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000)}},
  uid:null,isAdmin:false,isAdminAcct:false,admins:[],session:null,meProfile:null,suspend:false,imp:null,view:"",
  settings:{},viewAs:(()=>{try{return localStorage.getItem("rosterwash.mode")||"admin"}catch(e){return"admin"}})(),selRep:null,rf:"semua",sync:null,syncLocal:null,syncing:false,syncErr:"",mcp:null,sheetDraft:null,selMember:null,selAlert:null,selCard:null,kg:"semua",fe:"",sample:null,chat:[],chatBusy:false};
S.f.src="";S.af="terbuka";

/* ---------- dates & formatting ---------- */
const D=s=>new Date(s+"T00:00:00");
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const addDays=(s,n)=>{const d=D(s);d.setDate(d.getDate()+n);return iso(d)};
const fmt=s=>s?D(s).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}):"-";
const fmtLong=s=>s?D(s).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"-";
const today=()=>iso(new Date());
const daysBetween=(a,b)=>Math.round((D(b)-D(a))/864e5);
const endOf=a=>addDays(a.start,Math.max(1,+a.dur||1)-1);
const stampT=t=>t?new Date(t).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"";
const initials=n=>String(n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
function waNum(p){let d=String(p||"").replace(/\D/g,"");if(!d)return"";if(d[0]==="0")d="62"+d.slice(1);else if(d[0]==="8")d="62"+d;return d}
function av(m,cls){cls=cls||"";return m&&m.photo?`<img class="av ${cls}" src="${esc(m.photo)}" alt="">`:`<div class="av ${cls}" aria-hidden="true">${esc(initials(m&&m.name))}</div>`}
const pill=(map,k)=>{const v=map[k]||[k,"off"];return `<span class="pill ${v[1]}">${esc(v[0])}</span>`};
const sampleTag=o=>o&&o.sample?' <span class="pill sample">Contoh</span>':"";

/* ---------- storage ---------- */
const LS="rosterwash.v1";
function loadLocal(){try{const d=JSON.parse(localStorage.getItem(LS)||"{}");S.members=d.members||{};S.alerts=d.alerts||{};S.settings=d.settings||{}}catch(e){}}
function saveLocal(){if(S.mode!=="local")return;try{localStorage.setItem(LS,JSON.stringify({members:S.members,alerts:S.alerts,settings:S.settings}))}catch(e){}}
const queues={};
function enqueue(k,fn){const p=(queues[k]||Promise.resolve()).then(fn,fn);queues[k]=p.catch(()=>{});return p}
function deepMerge(a,b){const o=Object.assign({},a||{});for(const k in b){const v=b[k],c=o[k];if(v&&typeof v==="object"&&!Array.isArray(v)&&c&&typeof c==="object"&&!Array.isArray(c))o[k]=deepMerge(c,v);else o[k]=v}return o}
function errMsg(e){const c=e&&e.code;if(c==="server"&&e.message)return e.message;if(c==="quota_exceeded")return"Penyimpanan penuh. Hapus data lama lalu coba lagi.";if(c==="invalid_argument")return"Data terlalu besar atau tidak valid. Coba foto yang lebih kecil.";if(c==="revoked"||c==="not_granted")return S.isAdminAcct&&!S.isAdmin?"Masuk Mode Admin dengan password untuk mengubah data ini.":"Anda tidak punya akses untuk mengubah data ini.";return"Gagal menyimpan. Periksa koneksi lalu coba lagi."}
async function write(kind,coll,id,data){
  const loc=(coll==="members"||coll==="alerts"||coll==="settings")?S[coll]:null;
  const prev=loc&&loc[id]?JSON.parse(JSON.stringify(loc[id])):null;
  if(loc){if(kind==="set")loc[id]=data;else if(kind==="update")loc[id]=deepMerge(loc[id],data);else delete loc[id]}
  if(!S.suspend)render();
  return enqueue(coll+"/"+id,()=>remoteWrite(kind,coll,id,data,prev)).then(()=>{if(!S.suspend)scheduleRefetch()}).catch(e=>{if(!S.suspend){toast(errMsg(e));scheduleRefetch()}throw e});
}

/* ---------- derived ---------- */
const members=()=>Object.entries(S.members).map(([id,m])=>Object.assign({id},m));
const alerts=()=>Object.entries(S.alerts).map(([id,a])=>Object.assign({id},a)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
/* candidate list = admin entries (a.cand) merged with each member's own response (members/{id}.responses) */
function cands(a){const out={},cm=a.cand||{};
  Object.keys(cm).forEach(mid=>{out[mid]=Object.assign({mid},cm[mid])});
  Object.entries(S.members).forEach(([mid,m])=>{const r=m.responses&&m.responses[a.id];if(!r)return;const c=out[mid];
    if(!c){out[mid]={mid,state:r.state==="bersedia"?"mengajukan":r.state,self:true,respAt:r.at};return}
    if(c.state==="terpilih")return;if(!c.answeredAt||(r.at||0)>c.answeredAt){c.state=r.state;c.respAt=r.at;c.self=true}});
  return Object.values(out)}
const isYes=s=>s==="bersedia"||s==="mengajukan"||s==="terpilih";
function assignments(){const out=[];alerts().forEach(a=>cands(a).forEach(c=>{if(c.state==="terpilih"&&S.members[c.mid])out.push({a,c,m:Object.assign({id:c.mid},S.members[c.mid])})}));
  return out.sort((x,y)=>(x.a.start||"").localeCompare(y.a.start||""))}
function phase(a){const t=today(),e=endOf(a);if(t<a.start)return"akan";if(t>e)return"selesai";return"aktif"}

/* ---------- messages ---------- */
function inviteText(a,m){
  return `*ALERT PENUGASAN · ROSTER WASH PMI*\nKode: ${a.code}\nOperasi: ${a.title}\nPosisi: ${a.role}\nLokasi: ${a.location}\nMulai: ${fmtLong(a.start)} (${a.dur} hari, s/d ${fmtLong(endOf(a))})\nBatas konfirmasi: ${fmtLong(a.deadline)}\n\nHalo ${(m&&m.name||"").split(" ")[0]||"Rekan"}, profil Anda sesuai untuk penugasan ini.${a.desc?"\n\n"+a.desc:""}\n\nMohon balas *BERSEDIA* atau *TIDAK* sebelum batas konfirmasi.\n— Koordinator Roster WASH PMI`}
function selectText(a,m,c){
  return `*PEMBERITAHUAN PENUGASAN · ROSTER WASH PMI*\n\nSelamat ${m.name}, Anda terpilih untuk penugasan berikut:\nNo. Kartu: ${c.cardNo}\nOperasi: ${a.title}\nPosisi: ${a.role}\nLokasi: ${a.location}\nPeriode: ${fmtLong(a.start)} – ${fmtLong(endOf(a))} (${a.dur} hari)\n\nKartu ID penugasan terlampir. Simpan dan tunjukkan kartu ini saat tiba di posko.\n— Koordinator Roster WASH PMI`}
const plain=t=>t.replace(/\*/g,"");
const mailHref=(to,subj,body,bcc)=>"mailto:"+(to?encodeURIComponent(to):"")+"?"+(bcc?"bcc="+encodeURIComponent(bcc)+"&":"")+"subject="+encodeURIComponent(subj)+"&body="+encodeURIComponent(plain(body));
const waHref=(num,text)=>"https://wa.me/"+waNum(num)+"?text="+encodeURIComponent(text);

/* ---------- UI helpers ---------- */
let toastT;function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,2800)}
async function copy(text,label){try{await navigator.clipboard.writeText(text);toast((label||"Teks")+" disalin")}catch(e){openModal("Salin manual",`<p class="muted">Pilih teks di bawah lalu salin.</p><textarea class="input" id="manualcopy" style="min-height:220px">${esc(text)}</textarea>`);setTimeout(()=>{const t=$("#manualcopy");t&&t.select()},50)}}
function openModal(title,body,foot,wide){const m=$("#modal");m.innerHTML=`<div class="sheet ${wide?"wide":""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><h2>${esc(title)}</h2><button class="btn ghost sm" data-act="close" aria-label="Tutup">${I.x}</button></div><div class="sheet-body">${body}</div>${foot?`<div class="sheet-foot">${foot}</div>`:""}</div>`;m.hidden=false;document.body.style.overflow="hidden"}
function closeModal(){const m=$("#modal");m.hidden=true;m.innerHTML="";document.body.style.overflow=""}

/* ---------- render (workspace shell) ---------- */
Object.assign(I,{
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  flask:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 18l-5-9V3"/></svg>'
});
const LOGO_SRC=[...document.querySelectorAll(".logos img")].map(i=>i.src);
const RCODE={"Koordinator WASH":"KOR","Suplai Air Bersih":"SAB","Sanitasi & Limbah":"SAN","Promosi Kebersihan":"PKB","Kualitas Air":"KUA","Pengendalian Vektor":"VEK","Operator Unit Pengolahan Air":"UPA"};
const TABS=[["beranda","Beranda",I.home],["roster","Anggota Roster",I.users],["alert","Alert Penugasan",I.bell],["seleksi","Seleksi Kandidat",I.check],["kartu","Kartu ID",I.id],["laporan","Laporan",I.chart]];
const tabOf=r=>r.startsWith("seleksi")?"seleksi":TABS.some(t=>t[0]===r)?r:"beranda";
const memberView=()=>!S.isAdmin||S.viewAs==="anggota";
const srcOf=m=>m.account?"daftar":m.source==="sheet"?"sheet":m.source==="impor"?"impor":"manual";
const SRC={daftar:["Daftar mandiri","teal"],sheet:["Google Sheets","teal"],impor:["Impor file","off"],manual:["Input admin","off"]};
function pendingList(){const out=[];alerts().filter(a=>a.status==="terbuka").forEach(a=>cands(a).forEach(c=>{if((c.state==="bersedia"||c.state==="mengajukan")&&c.self)out.push({a,c})}));return out}

function header(){
  const org=(S.settings.app&&S.settings.app.org)||"Roster WASH";
  $("#orgname").textContent=org;
  $("#modechip").innerHTML=S.session?(S.isAdmin&&!memberView()?`<span class="d"></span>Admin`:`<span class="d"></span>Anggota`):`<span class="d local"></span>Belum masuk`;
  
  const mv=memberView(),pend=!mv?pendingList().length:0;
  const me=S.members[S.uid];const who=(me&&me.name)||(S.session&&S.session.user.email)||"Anggota";
  $("#hright").innerHTML=(S.isAdminAcct?`<div class="seg" role="group" aria-label="Mode tampilan"><button class="${mv?"":"on"}" data-act="mode" data-v="admin">Mode Admin</button><button class="${mv?"on":""}" data-act="mode" data-v="anggota">Mode Anggota</button></div>`:"")+
    (!mv?`<button class="hbtn" data-act="bell" title="Jawaban anggota menunggu keputusan" aria-label="Notifikasi">${I.bell}${pend?`<span class="badge">${pend}</span>`:""}</button><button class="hbtn" data-act="admins">${I.users}<span class="t">Kelola admin</span></button><button class="hbtn" data-act="org-edit" title="Nama markas" aria-label="Nama markas">${I.edit}</button>`:"")+
    (S.session?`<span class="hbtn who" style="cursor:default">${I.user}<span class="t">${esc(who)}</span></span><button class="hbtn" data-act="logout" title="Keluar" aria-label="Keluar">${I.x}<span class="t">Keluar</span></button>`:"");
  $("#fab").hidden=!S.sample||mv;
}
function toolbar(){
  if(memberView()){$("#tbar").hidden=true;return}
  $("#tbar").hidden=false;
  const hasSample=members().some(m=>m.sample)||alerts().some(a=>a.sample);
  const xl=S.downloads&&window.XLSX;
  $("#tbar").innerHTML=`<button class="hbtn" data-act="new-member">${I.plus}Tambah anggota</button><button class="hbtn" data-act="new-alert">${I.bell}Buat alert</button><span class="sep"></span>
   <button class="hbtn" data-act="sheet">${I.sheet}Google Sheets</button><button class="hbtn" data-act="import">${I.up}Impor Excel / CSV</button>${xl?`<button class="hbtn" data-act="export">${I.dl}Ekspor .xlsx</button><button class="hbtn" data-act="template">${I.sheet}Template</button>`:""}${hasSample?`<span class="sep"></span><button class="hbtn" data-act="unseed">${I.x}Hapus data contoh</button>`:""}`;
}
const BN={beranda:"Beranda",roster:"Anggota",alert:"Alert",seleksi:"Seleksi",kartu:"Kartu",laporan:"Laporan"};
function tabsBar(){
  const bn=$("#bnav");
  if(memberView()){const hasAnn=announced().length;bn.innerHTML=[["m-top","Beranda",I.home],hasAnn?["m-ann","Info",I.info]:null,["m-alert","Alert",I.bell],["m-dep","Tugas",I.pin],["m-card","Kartu",I.id],["m-rep","Laporan",I.chart]].filter(Boolean).map(([id,l,ic])=>`<button data-act="jump" data-v="${id}">${ic}<span>${l}</span></button>`).join("")}
  else{const t=tabOf(S.route),bdg={alert:alerts().filter(a=>a.status==="terbuka").length,seleksi:pendingList().length,laporan:allReports().filter(x=>!x.r.seen).length};bn.innerHTML=TABS.map(([k,,ic])=>`<a class="${t===k?"on":""}" href="#${k==="seleksi"&&S.selAlert?"seleksi-"+S.selAlert:k}">${ic}<span>${BN[k]}</span>${bdg[k]?`<i>${bdg[k]}</i>`:""}</a>`).join("")}
  if(memberView()){$("#tabs").innerHTML=`<a class="tab on" href="#beranda"><span class="n">1</span>${I.home}<span class="t">Beranda Anggota</span></a>`;return}
  const t=tabOf(S.route),open=alerts().filter(a=>a.status==="terbuka").length,pend=pendingList().length,rep=allReports().filter(x=>!x.r.seen).length;
  const badge={alert:open,seleksi:pend,laporan:rep};
  $("#tabs").innerHTML=TABS.map(([k,l,ic],i)=>`<a class="tab ${t===k?"on":""}" href="#${k==="seleksi"&&S.selAlert?"seleksi-"+S.selAlert:k}"><span class="n">${i+1}</span>${ic}<span class="t">${l}</span>${badge[k]?`<span class="b">${badge[k]}</span>`:""}</a>`).join("");
}
function render(){
  const ae=document.activeElement,fid=ae&&ae.id,ss=ae&&ae.selectionStart;
  header();toolbar();tabsBar();
  const work=$("#work"),lp=$("#lp"),cp=$("#cp"),rp=$("#rp");
  if(!S.loaded){work.classList.add("solo");cp.innerHTML=S.loadErr?`<div class="empty"><h3>Roster belum bisa dimuat</h3><p>Koneksi ke penyimpanan terlalu lama. Muat ulang halaman untuk mencoba lagi.</p></div>`:`<div class="skeleton" style="height:200px"></div><div class="skeleton"></div>`;return}
  if(memberView()){
    work.classList.add("solo");lp.innerHTML="";rp.innerHTML="";
    if(!S.session){if(S.view==="signin"&&cp.querySelector("#authbox"))return;S.view="signin";cp.innerHTML=vSignin()}
    else if(!S.members[S.uid]){if(S.view==="register"&&cp.querySelector("#mform"))return;S.view="register";cp.innerHTML=vRegister()}
    else{S.view="portal";if(S.annSeen==null){try{S.annSeen=+localStorage.getItem("rosterwash.annSeen")||0}catch(e){S.annSeen=0}}cp.innerHTML=vMemberHome();const latest=announced()[0];if(latest){try{localStorage.setItem("rosterwash.annSeen",String(latest.announce.at))}catch(e){}}}
  }else{
    S.view="";const t=tabOf(S.route);
    if(t==="beranda"){work.classList.add("solo");lp.innerHTML="";rp.innerHTML="";cp.innerHTML=vAdminHome()}
    else{work.classList.remove("solo");const v=(VIEWS[t]||VIEWS.roster)();lp.innerHTML=v.l;cp.innerHTML=`<button class="btn sm mob-only" data-act="lptoggle" style="align-self:flex-start">${I.search}Filter &amp; alat</button>`+v.c;rp.innerHTML=v.r;if(t==="kartu")paintCardPreview()}
  }
  if(fid){const el=document.getElementById(fid);if(el&&el!==document.activeElement&&!$("#modal").contains(el)&&!$("#drawer").contains(el)){el.focus();try{if(ss!=null)el.setSelectionRange(ss,ss)}catch(e){}}}
}

/* ---------- shared: deployments & reports ---------- */
function deployments(){const out=[];alerts().forEach(a=>Object.entries(a.cand||{}).forEach(([mid,c])=>{if(c.state==="terpilih")out.push({a,c:Object.assign({mid},c),m:S.members[mid]?Object.assign({id:mid},S.members[mid]):null})}));return out.sort((x,y)=>(x.a.start||"").localeCompare(y.a.start||""))}
function allReports(){const out=[];members().forEach(m=>Object.entries(m.reports||{}).forEach(([aid,r])=>{out.push({m,aid,a:S.alerts[aid]?Object.assign({id:aid},S.alerts[aid]):null,r})}));return out.sort((x,y)=>(y.r.at||0)-(x.r.at||0))}
const COND={baik:["Baik","ok"],lelah:["Lelah, perlu istirahat","warn"],dukungan:["Perlu dukungan kesehatan/psikososial","red"]};
const METRICS=[["water","Air bersih didistribusikan","liter"],["people","Penerima manfaat","jiwa"],["sanit","Fasilitas sanitasi dibangun/diperbaiki","unit"],["hp","Sesi promosi kebersihan","sesi"],["wq","Sampel uji kualitas air","sampel"]];
const nf=n=>Number(n).toLocaleString("id-ID");
function depList(items,opt){opt=opt||{};
  if(!items.length)return `<p class="muted">${opt.empty||"Belum ada penugasan berlangsung."}</p>`;
  return `<div class="dlist">${items.map(({a,c,m})=>{const ph=phase(a),day=daysBetween(a.start,today())+1,done=ph==="aktif"?Math.min(100,day/a.dur*100):0,nm=(m&&m.name)||c.name||"Anggota roster",mine=c.mid===S.uid;
    const pic=m?av(m,"sm"):c.thumb?`<img class="av sm" src="${esc(c.thumb)}" alt="">`:`<div class="av sm" aria-hidden="true">${esc(initials(nm))}</div>`;
    return `<div class="ditem">${pic}<div><div class="t">${esc(nm)}${mine?' <span class="pill teal">Anda</span>':""}</div><div class="s">${esc(a.role)} · ${esc(a.location)}</div><div class="s">${ph==="aktif"?`Hari ke-${day} dari ${a.dur}`:`Berangkat ${fmt(a.start)}`} · s/d ${fmt(endOf(a))}</div><div class="prog"><i style="width:${done}%"></i></div></div>${opt.card&&(m||mine)?`<button class="btn sm" data-act="card" data-a="${a.id}" data-m="${c.mid}">${I.id}Kartu</button>`:""}</div>`}).join("")}</div>`}

/* ---------- announcements of selected members ---------- */
function annText(a){const sel=Object.values(a.cand||{}).filter(c=>c.state==="terpilih");const note=a.announce&&a.announce.note;
  return `*PENGUMUMAN HASIL SELEKSI · ROSTER WASH PMI*\n${a.code} · ${a.role} — ${a.title}\nLokasi: ${a.location}\nPeriode: ${fmtLong(a.start)} – ${fmtLong(endOf(a))} (${a.dur} hari)\n\nAnggota terpilih:\n${sel.map((c,i)=>`${i+1}. ${c.name||"Anggota roster"}${c.cardNo?" ("+c.cardNo+")":""}`).join("\n")||"-"}${note?"\n\n"+note:""}\n\nKartu ID penugasan dapat dilihat di Beranda Anggota.\n— Admin Roster WASH`}
function announced(){return alerts().filter(a=>a.announce&&a.announce.at).sort((x,y)=>y.announce.at-x.announce.at)}
function annCard(a,opt){opt=opt||{};const sel=Object.entries(a.cand||{}).filter(([,c])=>c.state==="terpilih");const mine=!!(S.uid&&a.cand&&a.cand[S.uid]&&a.cand[S.uid].state==="terpilih");const isNew=opt.member&&a.announce.at>(S.annSeen||0);
  return `<article class="ann ${mine&&opt.member?"mine":""}"><div class="spread"><span class="lbl-up">Pengumuman hasil seleksi · ${stampT(a.announce.at)}</span>${isNew?'<span class="pill teal">Baru</span>':""}</div>
   <h3>${esc(a.role)} — ${esc(a.title)}</h3><div class="meta"><span class="mono">${esc(a.code)}</span><span>${I.pin}${esc(a.location)}</span><span>${I.cal}${fmt(a.start)} – ${fmt(endOf(a))}</span><span>${I.clock}${a.dur} hari</span></div>
   ${mine&&opt.member?`<p class="ann-yes">Selamat, Anda terpilih untuk penugasan ini. Kartu ID Anda ada di bagian Kartu ID saya.</p>`:""}
   ${a.announce.note?`<p style="white-space:pre-line">${esc(a.announce.note)}</p>`:""}
   <div class="annlist">${sel.map(([mid,c])=>{const m=S.members[mid];const nm=(m&&m.name)||c.name||"Anggota roster";const pic=m&&m.photo?`<img class="av sm" src="${esc(m.photo)}" alt="">`:c.thumb?`<img class="av sm" src="${esc(c.thumb)}" alt="">`:`<div class="av sm" aria-hidden="true">${esc(initials(nm))}</div>`;return `<span class="annp">${pic}<span><b>${esc(nm)}</b>${mid===S.uid?' <span class="pill teal">Anda</span>':""}<small class="mono">${esc(c.cardNo||"")}</small></span></span>`}).join("")}</div>
   ${opt.admin?`<div class="row" style="gap:6px"><a class="btn sm" href="#seleksi-${a.id}">Kelola</a><a class="btn sm wa" target="_blank" rel="noopener" href="${esc("https://wa.me/?text="+encodeURIComponent(annText(a)))}">${I.wa}Bagikan ke grup WA</a></div>`:""}</article>`}
function annAdminBox(a){
  const sel=cands(a).filter(c=>c.state==="terpilih");
  if(!sel.length)return `<div class="isec"><span class="lbl-up">Pengumuman hasil seleksi</span><p class="muted">Pilih anggota dulu. Setelah itu umumkan hasilnya ke semua anggota roster.</p></div>`;
  const an=a.announce&&a.announce.at?a.announce:null;
  return `<div class="isec"><span class="lbl-up">Pengumuman hasil seleksi</span>
   ${an?`<span class="pill ok">Diumumkan ${stampT(an.at)}</span>`:`<span class="muted" style="font-size:.84rem">${sel.length} anggota terpilih belum diumumkan.</span>`}
   <div class="field"><label for="annnote">Catatan untuk anggota (opsional)</label><textarea class="input" id="annnote" style="min-height:70px" placeholder="mis. Briefing di Markas PMI Provinsi, 22 Nov pukul 08.00">${esc(an&&an.note||"")}</textarea></div>
   <div class="row" style="gap:6px"><button class="btn primary sm" data-act="announce" data-a="${a.id}">${an?"Perbarui pengumuman":"Umumkan ke anggota"}</button>${an?`<a class="btn sm wa" target="_blank" rel="noopener" href="${esc("https://wa.me/?text="+encodeURIComponent(annText(a)))}">${I.wa}Grup WA</a><button class="btn sm ghost" data-act="copyann" data-a="${a.id}">${I.copy}Salin</button><button class="btn sm ghost danger" data-act="unannounce" data-a="${a.id}">Tarik</button>`:""}</div>
   <p class="note">Pengumuman tampil di Beranda semua anggota roster, lengkap dengan nama anggota terpilih.</p></div>`}

/* ---------- admin home ---------- */
function vAdminHome(){
  const ms=members(),as=alerts(),open=as.filter(a=>a.status==="terbuka"),live=deployments().filter(x=>phase(x.a)!=="selesai"),pend=pendingList(),reps=allReports();
  const acc=ms.filter(m=>m.account),wk=acc.filter(m=>(m.createdAt||0)>Date.now()-7*864e5).length;
  return `<div class="chead"><div><p class="eyebrow">Mode admin</p><h1>Beranda</h1><p>Pendaftaran, alert, seleksi kandidat, dan penugasan berlangsung dalam satu halaman.</p></div><div class="row"><button class="btn" data-act="new-member">${I.plus}Tambah anggota</button><button class="btn primary" data-act="new-alert">${I.bell}Buat alert</button></div></div>
  <div class="stiles five"><div class="stile"><b>${ms.length}</b><span>Anggota roster</span></div><div class="stile"><b>${ms.filter(m=>m.status==="tersedia").length}</b><span>Siap diberangkatkan</span></div><div class="stile"><b>${live.length}</b><span>Penugasan berlangsung</span></div><div class="stile alert"><b>${open.length}</b><span>Alert terbuka</span></div><div class="stile"><b>${reps.length}</b><span>Laporan masuk</span></div></div>
  <div class="grid2">
    <section class="card" id="sec-daftar"><div class="card-h"><h2>Pendaftaran &amp; login</h2><button class="btn sm" data-act="admins">${I.users}Kelola admin</button></div><div class="card-b">
      <div class="row" style="gap:28px"><div><b class="mono" style="font-size:1.45rem">${acc.length}</b><div class="muted" style="font-size:.8rem">daftar dengan email aktif</div></div><div><b class="mono" style="font-size:1.45rem">${wk}</b><div class="muted" style="font-size:.8rem">7 hari terakhir</div></div><div><b class="mono" style="font-size:1.45rem">${ms.filter(m=>m.source==="sheet").length}</b><div class="muted" style="font-size:.8rem">dari Google Sheets</div></div></div>
      ${acc.length?`<div class="dlist">${acc.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5).map(m=>`<div class="ditem" data-act="selm" data-m="${m.id}" style="cursor:pointer">${av(m,"sm")}<div><div class="t">${esc(m.name)}</div><div class="s">${esc(m.email||"")} · ${m.createdAt?stampT(m.createdAt):""}</div></div>${pill(MSTAT,m.status)}</div>`).join("")}</div>`:`<p class="muted">Belum ada yang mendaftar. Bagikan link aplikasi ini; anggota memasukkan email aktif, menerima kode verifikasi, lalu mengisi formulir pendaftaran.</p><div><button class="btn sm" data-act="copytxt" data-t="${esc(location.origin+location.pathname)}">${I.copy}Salin link pendaftaran</button></div>`}
      ${dupNotice()}${S.mcp?syncStatusHTML():""}</div></section>
    <section class="card"><div class="card-h"><h2>Alert terbuka</h2><a class="btn sm" href="#alert">Semua alert</a></div><div class="card-b">${open.length?`<div class="alerts">${open.slice(0,4).map(a=>alertCard(a)).join("")}</div>`:`<p class="muted">Tidak ada alert terbuka.</p><div><button class="btn primary sm" data-act="new-alert">${I.plus}Buat alert</button></div>`}</div></section>
  </div>
  <div class="grid2">
    <section class="card"><div class="card-h"><h2>Seleksi kandidat</h2><span class="pill teal">${pend.length} menunggu keputusan</span></div><div class="card-b">${pend.length?`<div class="dlist">${pend.slice(0,8).map(({a,c})=>{const m=S.members[c.mid];if(!m)return"";const mm=Object.assign({id:c.mid},m);return `<div class="ditem">${av(mm,"sm")}<div><div class="t">${esc(m.name)}</div><div class="s">${pill(CSTAT,c.state)} ${esc(a.code)} · ${esc(a.role)}</div></div><div class="row" style="gap:6px;flex-wrap:nowrap"><a class="btn sm" href="#seleksi-${a.id}">Detail</a><button class="btn sm primary" data-act="select" data-a="${a.id}" data-m="${c.mid}" ${m.status==="ditugaskan"?"disabled":""}>Pilih</button></div></div>`}).join("")}</div>`:`<p class="muted">Tidak ada jawaban anggota yang menunggu keputusan.</p>`}${open.length?`<div><a class="btn sm" href="#seleksi">Buka seleksi kandidat</a></div>`:""}</div></section>
    <section class="card"><div class="card-h"><h2>Penugasan berlangsung</h2><a class="btn sm" href="#kartu">Kartu ID</a></div><div class="card-b">${depList(live,{card:true})}</div></section>
  </div>
  <div class="grid2"><section class="card"><div class="card-h"><h2>Pengumuman terpilih</h2><a class="btn sm" href="#seleksi">Seleksi</a></div><div class="card-b">${announced().length?announced().slice(0,3).map(a=>annCard(a,{admin:true})).join(""):`<p class="muted">Belum ada pengumuman. Setelah memilih anggota di Seleksi Kandidat, tekan Umumkan ke anggota.</p>`}</div></section>
  <section class="card"><div class="card-h"><h2>Laporan pasca penugasan terbaru</h2><a class="btn sm" href="#laporan">Semua laporan</a></div><div class="card-b">${reps.length?`<div class="dlist">${reps.slice(0,5).map(x=>`<div class="ditem" data-act="selr" data-m="${x.m.id}" data-a="${x.aid}" style="cursor:pointer">${av(x.m,"sm")}<div><div class="t">${esc(x.m.name)}</div><div class="s">${esc(x.a?x.a.code+" · "+x.a.title:x.aid)} · ${stampT(x.r.at)}</div></div>${pill(COND,x.r.cond||"baik")}</div>`).join("")}</div>`:`<p class="muted">Belum ada laporan. Anggota mengisi laporan dari Beranda Anggota setelah penugasan dimulai.</p>`}</div></section></div>`;
}

/* ---------- member home ---------- */
function vMemberHome(){
  const m=Object.assign({id:S.uid},S.members[S.uid]),t=today();
  const mine=[],open=[];alerts().forEach(a=>{const c=cands(a).find(c=>c.mid===S.uid);if(c)mine.push({a,c});else if(a.status==="terbuka"&&a.deadline>=t)open.push(a)});
  open.sort((x,y)=>(y.role===m.role)-(x.role===m.role));
  const inv=mine.filter(x=>x.c.state!=="terpilih"&&x.a.status==="terbuka"),myAsg=mine.filter(x=>x.c.state==="terpilih");
  const live=deployments().filter(x=>phase(x.a)!=="selesai");
  const meta=a=>`<div class="meta"><span class="mono">${esc(a.code)}</span><span>${I.pin}${esc(a.location)}</span><span>${I.cal}${fmt(a.start)}</span><span>${I.clock}${a.dur} hari</span><span>Konfirmasi s/d ${fmt(a.deadline)}</span></div>`;
  const resp=(a,c)=>{const s=c.state,btn=(v,l,cls)=>`<button class="btn sm ${cls||""}" data-act="respond" data-v="${v}" data-a="${a.id}">${l}</button>`;
    if(s==="diundang")return btn("bersedia","Saya bersedia","primary")+btn("menolak","Tidak bisa");
    if(s==="menolak")return `<span class="pill off">Anda menolak</span>`+btn("bersedia","Ubah: bersedia");
    return `<span class="pill ok">Menunggu keputusan admin</span>`+btn("menolak","Batalkan","ghost")};
  const reps=m.reports||{};
  const anns=announced();
  return `<section class="hero mhero" id="m-top"><div class="phead">${av(m,"lg")}<div><p class="eyebrow">Beranda anggota · sudah masuk</p><h1 style="font-size:clamp(1.6rem,3.2vw,2.3rem)">${esc(m.name)}</h1>
    <p class="lead" style="margin:0">${esc(m.role)} · ${esc(m.level||"")}${m.chapter?" · "+esc(m.chapter):""}</p>
    <p class="lead" style="margin:0;font-size:.86rem">${I.mail.replace("<svg",'<svg width="14" height="14" style="vertical-align:-2px"')} ${esc(m.email||"-")}${m.phone?" · WA +"+waNum(m.phone):""}</p>
    <div class="row" style="gap:8px">${pill(MSTAT,m.status)}<button class="btn sm" data-act="edit-self">${I.edit}Ubah profil</button>${m.status==="tersedia"?`<button class="btn sm" data-act="avail" data-v="tidak">Tandai tidak tersedia</button>`:m.status==="tidak"?`<button class="btn sm" data-act="avail" data-v="tersedia">Tandai tersedia</button>`:""}</div></div></div></section>
  ${anns.length?`<section class="card" id="m-ann"><div class="card-h"><h2>Pengumuman anggota terpilih</h2>${anns.filter(a=>a.announce.at>(S.annSeen||0)).length?`<span class="pill teal">${anns.filter(a=>a.announce.at>(S.annSeen||0)).length} baru</span>`:""}</div><div class="card-b">${anns.slice(0,6).map(a=>annCard(a,{member:true})).join("")}</div></section>`:""}
  <div class="grid2">
    <section class="card" id="m-alert"><div class="card-h"><h2>Alert tersedia</h2><span class="pill teal">${inv.length+open.length}</span></div><div class="card-b">
      ${inv.length?`<span class="lbl-up">Undangan untuk Anda</span><div class="alerts">${inv.map(({a,c})=>`<div class="pcard match"><div style="min-width:0;display:flex;flex-direction:column;gap:5px"><div class="row" style="gap:8px">${pill(CSTAT,c.state)}<span class="pill teal">${esc(a.emergency||"")}</span></div><h3>${esc(a.role)} — ${esc(a.title)}</h3>${meta(a)}${a.desc?`<p class="muted" style="font-size:.86rem;white-space:pre-line">${esc(a.desc)}</p>`:""}</div><div class="acts">${resp(a,c)}</div></div>`).join("")}</div>`:""}
      ${open.length?`<span class="lbl-up">Alert terbuka</span><div class="alerts">${open.map(a=>`<div class="pcard ${a.role===m.role?"match":""}"><div style="min-width:0;display:flex;flex-direction:column;gap:5px"><div class="row" style="gap:8px">${a.role===m.role?'<span class="pill red">Sesuai profil Anda</span>':""}<span class="pill teal">${esc(a.emergency||"")}</span></div><h3>${esc(a.role)} — ${esc(a.title)}</h3>${meta(a)}</div><div class="acts"><button class="btn sm primary" data-act="respond" data-v="bersedia" data-a="${a.id}" ${m.status==="ditugaskan"?"disabled":""}>Ajukan diri</button></div></div>`).join("")}</div>`:""}
      ${!inv.length&&!open.length?`<p class="muted">Belum ada alert. Anda akan dihubungi lewat WhatsApp dan email saat ada penugasan yang sesuai.</p>`:""}</div></section>
    <section class="card" id="m-dep"><div class="card-h"><h2>Penugasan berlangsung</h2><span class="pill teal">${live.length}</span></div><div class="card-b">${depList(live,{card:true,empty:"Tidak ada penugasan yang sedang berjalan."})}</div></section>
  </div>
  <div class="grid2">
    <section class="card" id="m-card"><div class="card-h"><h2>Kartu ID saya</h2></div><div class="card-b">${myAsg.length?`<div class="cards">${myAsg.map(({a,c})=>`<button class="tile" data-act="card" data-a="${a.id}" data-m="${S.uid}"><div class="band"><span>${phase(a)==="selesai"?"Selesai":phase(a)==="aktif"?"Bertugas":"Akan berangkat"}</span><span class="mono">${esc(c.cardNo)}</span></div><div class="body"><b>${esc(a.title)}</b><dl class="kv"><dt>Posisi</dt><dd>${esc(a.role)}</dd><dt>Lokasi</dt><dd>${esc(a.location)}</dd><dt>Periode</dt><dd>${fmt(a.start)} – ${fmt(endOf(a))}</dd></dl></div></button>`).join("")}</div>`:`<p class="muted">Kartu ID muncul di sini begitu Anda terpilih dalam sebuah penugasan.</p>`}</div></section>
    <section class="card" id="m-rep"><div class="card-h"><h2>Laporan pasca penugasan</h2></div><div class="card-b">${myAsg.length?`<div class="dlist">${myAsg.map(({a})=>{const r=reps[a.id],ph=phase(a);return `<div class="ditem"><div><div class="t">${esc(a.code)} · ${esc(a.title)}</div><div class="s">${r?"Terkirim "+stampT(r.at):ph==="akan"?"Bisa diisi setelah penugasan dimulai":ph==="selesai"?"Penugasan selesai, laporan belum dikirim":"Penugasan berjalan"}</div></div>${r?pill({x:["Terkirim","ok"]},"x"):ph==="selesai"?pill({x:["Belum dikirim","red"]},"x"):""}${ph!=="akan"?`<button class="btn sm ${r?"":"primary"}" data-act="report" data-a="${a.id}">${r?"Ubah laporan":"Tulis laporan"}</button>`:""}</div>`}).join("")}</div>`:`<p class="muted">Setelah bertugas, isi laporan singkat di sini: kegiatan, capaian, kendala, rekomendasi, dan kondisi Anda.</p>`}</div></section>
  </div>`;
}
function reportForm(aid){
  const a=S.alerts[aid],me=S.members[S.uid];if(!a||!me)return;const r=(me.reports||{})[aid]||{};const mt=r.metrics||{};
  openModal("Laporan pasca penugasan",`<p class="muted">${esc(a.code)} · ${esc(a.role)} — ${esc(a.title)} · ${fmt(a.start)} – ${fmt(endOf(a))}</p>
   <form class="form" id="rform" novalidate>
    <div class="field full"><label for="rsum">Ringkasan kegiatan</label><textarea class="input" id="rsum" placeholder="Apa yang Anda kerjakan selama penugasan, di mana, bersama siapa…">${esc(r.summary||"")}</textarea></div>
    ${METRICS.map(([k,l,u])=>`<div class="field"><label for="rm-${k}">${l} (${u})</label><input class="input" id="rm-${k}" type="number" min="0" inputmode="numeric" value="${mt[k]!=null?esc(mt[k]):""}"></div>`).join("")}
    <div class="field"><label for="rcond">Kondisi Anda setelah penugasan</label><select class="input" id="rcond">${Object.entries(COND).map(([k,v])=>`<option value="${k}" ${(r.cond||"baik")===k?"selected":""}>${v[0]}</option>`).join("")}</select></div>
    <div class="field full"><label for="rissue">Kendala di lapangan</label><textarea class="input" id="rissue" style="min-height:70px">${esc(r.issues||"")}</textarea></div>
    <div class="field full"><label for="rrec">Rekomendasi</label><textarea class="input" id="rrec" style="min-height:70px">${esc(r.recs||"")}</textarea></div>
    <p class="err field full" id="rerr" hidden></p></form>`,
   `<button class="btn" data-act="close">Batal</button><button class="btn primary" data-act="report-save" data-a="${aid}">Kirim laporan</button>`,true)}
async function saveReport(aid){
  const v=k=>($("#"+k).value||"").trim();const sum=v("rsum"),er=$("#rerr");
  if(sum.length<10){er.textContent="Tulis ringkasan kegiatan minimal satu kalimat.";er.hidden=false;return}
  const metrics={};METRICS.forEach(([k])=>{const x=v("rm-"+k);if(x!=="")metrics[k]=Math.max(0,Number(x)||0)});
  const rep={summary:sum,metrics,cond:v("rcond"),issues:v("rissue"),recs:v("rrec"),at:Date.now(),seen:false};
  closeModal();await write("update","members",S.uid,{reports:{[aid]:rep}}).then(()=>toast("Laporan terkirim ke admin")).catch(()=>{})}

/* ---------- admin: reports tab ---------- */
function vReportTab(){
  const reps=allReports(),f=S.rf||"semua",list=reps.filter(x=>f==="semua"||(f==="dukungan"?x.r.cond!=="baik":!x.r.seen));
  const missing=deployments().filter(x=>phase(x.a)==="selesai"&&!(x.m&&x.m.reports&&x.m.reports[x.a.id]));
  const tot={};METRICS.forEach(([k])=>tot[k]=reps.reduce((s,x)=>s+(Number((x.r.metrics||{})[k])||0),0));
  const lrow=(v,label,n,code,c)=>`<button class="lrow ${f===v?"on":""}" data-act="rf" data-v="${v}"><span class="code ${c}">${code}</span><span>${label}</span><span class="c">${n}</span></button>`;
  const l=`<div class="lsec"><span class="lbl-up">Saring</span>${lrow("semua","Semua laporan",reps.length,"ALL","teal")}${lrow("baru","Belum dibaca",reps.filter(x=>!x.r.seen).length,"NEW","")}${lrow("dukungan","Perlu perhatian",reps.filter(x=>x.r.cond&&x.r.cond!=="baik").length,"SOS","red")}</div>
   <div class="lsec"><span class="lbl-up">Ekspor</span><div class="tools">${S.downloads&&window.XLSX?`<button class="tool primary" data-act="exportrep" style="grid-column:1/-1">${I.dl}Laporan .xlsx</button><button class="tool" data-act="exportasg" style="grid-column:1/-1">${I.sheet}Penugasan .xlsx</button><button class="tool" data-act="export" style="grid-column:1/-1">${I.users}Roster .xlsx</button>`:`<p class="note" style="grid-column:1/-1">Ekspor Excel tersedia saat halaman dibuka di claude.ai.</p>`}</div></div>`;
  const c=`<div class="chead"><div><h1>Laporan pasca penugasan</h1><p>${reps.length} laporan masuk · ${missing.length} penugasan selesai belum dilaporkan</p></div></div>
   <div class="stiles five">${METRICS.map(([k,lb,u])=>`<div class="stile"><b>${nf(tot[k])}</b><span>${lb} (${u})</span></div>`).join("")}</div>
   ${list.length?`<div class="card"><div class="tablewrap"><table class="dt"><thead><tr><th>Anggota</th><th>Penugasan</th><th>Dikirim</th><th>Kondisi</th><th>Status</th></tr></thead><tbody>${list.map(x=>`<tr class="click ${S.selRep===x.m.id+"|"+x.aid?"sel":""}" data-act="selr" data-m="${x.m.id}" data-a="${x.aid}"><td><div class="who">${av(x.m,"sm")}<div><b>${esc(x.m.name)}</b><small>${esc(x.m.role)}</small></div></div></td><td>${x.a?`${esc(x.a.code)}<span class="stamp">${esc(x.a.title)}</span>`:esc(x.aid)}</td><td>${stampT(x.r.at)}</td><td>${pill(COND,x.r.cond||"baik")}</td><td>${x.r.seen?pill({x:["Dibaca","off"]},"x"):pill({x:["Baru","teal"]},"x")}</td></tr>`).join("")}</tbody></table></div></div>`:`<div class="empty"><h3>Belum ada laporan</h3><p>Anggota yang terpilih mengisi laporan dari Beranda Anggota setelah penugasan dimulai.</p></div>`}
   ${missing.length?`<div class="card"><div class="card-h"><h2>Belum melapor</h2></div><div class="card-b">${depList(missing)}</div></div>`:""}`;
  let r=ihint("Pilih laporan untuk membaca isinya.");
  const k=S.selRep;if(k){const [mid,aid]=k.split("|");const x=reps.find(x=>x.m.id===mid&&x.aid===aid);if(x){const mt=x.r.metrics||{};
    r=`<div class="isec"><div class="row" style="gap:10px">${av(x.m)}<div><h2>${esc(x.m.name)}</h2><p class="muted" style="font-size:.84rem">${esc(x.a?x.a.code+" · "+x.a.role:"")}</p></div></div>${pill(COND,x.r.cond||"baik")}<span class="muted" style="font-size:.8rem">Dikirim ${stampT(x.r.at)}</span></div>
     <div class="isec"><span class="lbl-up">Ringkasan kegiatan</span><p style="white-space:pre-line">${esc(x.r.summary)}</p></div>
     <div class="isec"><span class="lbl-up">Capaian</span><dl class="kv">${METRICS.map(([k2,lb,u])=>`<dt>${lb}</dt><dd>${mt[k2]!=null?nf(mt[k2])+" "+u:"-"}</dd>`).join("")}</dl></div>
     <div class="isec"><span class="lbl-up">Kendala</span><p style="white-space:pre-line">${esc(x.r.issues||"-")}</p><span class="lbl-up">Rekomendasi</span><p style="white-space:pre-line">${esc(x.r.recs||"-")}</p></div>
     <div class="isec">${x.r.seen?`<span class="muted">Sudah ditandai dibaca.</span>`:`<button class="btn primary sm" data-act="repseen" data-m="${mid}" data-a="${aid}">Tandai sudah dibaca</button>`}</div>`}}
  return {l,c,r}}
function exportReports(){saveXlsx(`laporan-wash-${today()}.xlsx`,[["Laporan",allReports().map(x=>{const o={"Nama":x.m.name,"Kode alert":x.a?x.a.code:x.aid,"Operasi":x.a?x.a.title:"","Posisi":x.a?x.a.role:"","Dikirim":new Date(x.r.at).toISOString().slice(0,16).replace("T"," "),"Kondisi":(COND[x.r.cond]||["-"])[0],"Ringkasan":x.r.summary};METRICS.forEach(([k,l,u])=>o[`${l} (${u})`]=(x.r.metrics||{})[k]??"");o["Kendala"]=x.r.issues||"";o["Rekomendasi"]=x.r.recs||"";return o})]])}
function thumbOf(src){return new Promise(res=>{if(!src)return res("");const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=72;c.height=90;const x=c.getContext("2d"),s=Math.max(72/img.width,90/img.height);x.drawImage(img,(72-img.width*s)/2,(90-img.height*s)/2,img.width*s,img.height*s);res(c.toDataURL("image/jpeg",.7))};img.onerror=()=>res("");img.src=src})}
const ihint=t=>`<div class="ihint">${I.info}<span>${t}</span></div>`;
function vEmptyStart(){return `<div class="empty"><h3>Roster masih kosong</h3><p>Roster terisi otomatis saat relawan dan staf mendaftar sendiri lewat tautan halaman ini. Anda juga bisa mengimpor dari Excel/CSV bila perlu.</p><div class="row" style="justify-content:center">${S.mcp?`<button class="btn primary" data-act="sheet">${I.sheet}Hubungkan Google Sheets</button>`:""}<button class="btn ${S.mcp?"":"primary"}" data-act="import">${I.up}Impor Excel / CSV</button><button class="btn" data-act="new-member">${I.plus}Tambah manual</button><button class="btn" data-act="copytxt" data-t="${esc(location.origin+location.pathname)}">${I.copy}Salin link pendaftaran</button></div><p style="font-size:.8rem">Bagikan link aplikasi ke grup WhatsApp. Pendaftar masuk dengan kode yang dikirim ke email aktif mereka, lalu otomatis masuk ke roster.</p></div>`}

/* ---- tab 1: roster ---- */
function filteredMembers(){const f=S.f,q=f.q.trim().toLowerCase();return members().filter(m=>(!f.role||m.role===f.role)&&(!f.status||m.status===f.status)&&(!f.prov||m.province===f.prov)&&(!f.src||srcOf(m)===f.src)&&(!q||[m.name,m.role,m.province,m.chapter,m.skills,m.email,m.phone].join(" ").toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name))}
function rosterTable(){
  const list=filteredMembers();
  if(!list.length)return members().length?`<div class="empty"><h3>Tidak ada yang cocok</h3><p>Ubah kata kunci atau filter di panel kiri.</p></div>`:vEmptyStart();
  return `<div class="card"><div class="tablewrap"><table class="dt"><thead><tr><th>Anggota</th><th>Profil</th><th>Provinsi / Markas</th><th>Kontak</th><th>Status</th><th>Sumber</th></tr></thead><tbody>${list.map(m=>`<tr class="click ${S.selMember===m.id?"sel":""}" data-act="selm" data-m="${m.id}"><td><div class="who">${av(m,"sm")}<div><b>${esc(m.name)}${sampleTag(m)}</b><small>${esc(m.level||"")}</small></div></div></td><td style="white-space:nowrap"><span class="row" style="gap:7px;flex-wrap:nowrap"><span class="code">${RCODE[m.role]||"WSH"}</span>${esc(m.role)}</span></td><td>${esc(m.province||"-")}<span class="stamp">${esc(m.chapter||"")}</span></td><td class="mono" style="font-size:.78rem">${m.phone?"+"+waNum(m.phone):""}${m.email?`<span class="stamp">${esc(m.email)}</span>`:""}</td><td>${pill(MSTAT,m.status)}</td><td>${pill(SRC,srcOf(m))}</td></tr>`).join("")}</tbody></table></div></div>`}
function memberInspector(){
  const id=S.selMember,m=id&&S.members[id]&&Object.assign({id},S.members[id]);
  if(!m)return ihint("Pilih anggota di tabel untuk melihat detail, kontak, dan riwayat penugasannya.")+regSummary();
  const hist=[];alerts().forEach(a=>{const c=cands(a).find(c=>c.mid===id);if(c)hist.push({a,c})});
  return `<div class="isec"><div class="row" style="align-items:flex-start;gap:14px;flex-wrap:nowrap">${av(m,"lg")}<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><div class="row" style="gap:6px">${pill(MSTAT,m.status)}${pill(SRC,srcOf(m))}${sampleTag(m)}</div><h2>${esc(m.name)}</h2><p class="muted" style="font-size:.86rem">${esc(m.role)}<br>${esc(m.level||"")}</p></div></div>
   <div class="row" style="gap:6px"><button class="btn sm" data-act="edit-member" data-m="${id}">${I.edit}Ubah</button><button class="btn sm ghost danger" data-act="del-member" data-m="${id}">Hapus</button></div></div>
   <div class="isec"><span class="lbl-up">Kontak</span>${m.phone?`<div class="copyline"><span style="width:16px;color:#128C4A;display:inline-flex">${I.wa}</span><code>+${waNum(m.phone)}</code><button class="btn sm ghost" data-act="copytxt" data-t="+${waNum(m.phone)}">${I.copy}</button></div>`:""}${m.email?`<div class="copyline"><span style="width:16px;display:inline-flex">${I.mail}</span><code>${esc(m.email)}</code><button class="btn sm ghost" data-act="copytxt" data-t="${esc(m.email)}">${I.copy}</button></div>`:""}${!m.phone&&!m.email?`<p class="muted">Belum ada kontak.</p>`:""}</div>
   <div class="isec"><span class="lbl-up">Profil</span><dl class="kv"><dt>Provinsi</dt><dd>${esc(m.province||"-")}</dd><dt>Markas PMI</dt><dd>${esc(m.chapter||"-")}</dd><dt>Keahlian</dt><dd>${esc(m.skills||"-")}</dd><dt>Bahasa</dt><dd>${esc(m.lang||"-")}</dd><dt>Terdaftar</dt><dd>${m.createdAt?stampT(m.createdAt):"-"}</dd></dl></div>
   <div class="isec"><span class="lbl-up">Riwayat alert (${hist.length})</span>${hist.length?`<div class="dlist">${hist.map(({a,c})=>`<div class="ditem"><div><div class="t">${esc(a.title)}</div><div class="s mono">${esc(a.code)} · ${fmt(a.start)} · ${a.dur} hari</div></div>${pill(CSTAT,c.state)}${c.state==="terpilih"?`<button class="btn sm" data-act="card" data-a="${a.id}" data-m="${id}">Kartu</button>`:""}</div>`).join("")}</div>`:`<p class="muted">Belum pernah diundang.</p>`}</div>`}
function regSummary(){
  const acc=members().filter(m=>m.account),wk=acc.filter(m=>(m.createdAt||0)>Date.now()-7*864e5).length;
  return `<div class="isec"><span class="lbl-up">Pendaftaran mandiri</span><div class="row" style="gap:26px"><div><b class="mono" style="font-size:1.5rem">${acc.length}</b><div class="muted" style="font-size:.8rem">mendaftar sendiri</div></div><div><b class="mono" style="font-size:1.5rem">${wk}</b><div class="muted" style="font-size:.8rem">7 hari terakhir</div></div></div>
   <p class="note">Bagikan link aplikasi ini ke grup WhatsApp. Pendaftar memasukkan email aktif, menerima kode verifikasi, lalu mengisi profil. Mereka hanya bisa melihat data dirinya sendiri.</p>${dupNotice()}</div>
   <div class="isec"><span class="lbl-up">Pendaftar terbaru</span>${acc.length?`<div class="dlist">${acc.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,6).map(m=>`<div class="ditem" data-act="selm" data-m="${m.id}" style="cursor:pointer">${av(m,"sm")}<div><div class="t">${esc(m.name)}</div><div class="s">${esc(m.role)} · ${m.createdAt?stampT(m.createdAt):""}</div></div></div>`).join("")}</div>`:`<p class="muted">Belum ada yang mendaftar sendiri.</p>`}</div>`}
function vRosterTab(){
  const ms=members(),cnt=f=>ms.filter(f).length,provs=[...new Set(ms.map(m=>m.province).filter(Boolean))].sort();
  const lrow=(act,v,on,code,label,n)=>`<button class="lrow ${on?"on":""}" data-act="${act}" data-v="${esc(v)}">${code}<span>${label}</span><span class="c">${n}</span></button>`;
  const l=`<div class="lsec"><span class="lbl-up">Alat</span><div class="tools"><button class="tool primary" data-act="new-member">${I.plus}Anggota baru</button><button class="tool" data-act="import">${I.up}Impor file</button>${S.downloads&&window.XLSX?`<button class="tool" data-act="export">${I.dl}Ekspor .xlsx</button><button class="tool" data-act="template">${I.sheet}Template</button>`:""}</div></div>
   <div class="lsec"><span class="lbl-up">Sinkron spreadsheet</span>${syncStatusHTML()}</div>
   <div class="lsec"><span class="lbl-up">Cari</span><label class="search">${I.search}<input id="q" placeholder="Nama, keahlian, provinsi…" value="${esc(S.f.q)}" aria-label="Cari anggota"></label></div>
   <div class="lsec"><span class="lbl-up">Profil WASH</span>${lrow("frole","",!S.f.role,`<span class="code teal">ALL</span>`,"Semua profil",ms.length)}${ROLES.map(r=>lrow("frole",r,S.f.role===r,`<span class="code">${RCODE[r]}</span>`,esc(r),cnt(m=>m.role===r))).join("")}</div>
   <div class="lsec"><span class="lbl-up">Status</span>${lrow("fstat","",!S.f.status,`<span class="code teal">ALL</span>`,"Semua status",ms.length)}${Object.entries(MSTAT).map(([k,v])=>lrow("fstat",k,S.f.status===k,`<span class="code ${v[1]}">${k.slice(0,3).toUpperCase()}</span>`,v[0],cnt(m=>m.status===k))).join("")}</div>
   <div class="lsec"><span class="lbl-up">Sumber data</span>${lrow("fsrc","",!S.f.src,`<span class="code teal">ALL</span>`,"Semua sumber",ms.length)}${Object.entries(SRC).map(([k,v])=>lrow("fsrc",k,S.f.src===k,`<span class="code ${k==="daftar"?"teal":"off"}">${k.slice(0,3).toUpperCase()}</span>`,v[0],cnt(m=>srcOf(m)===k))).join("")}</div>
   <div class="lsec"><span class="lbl-up">Provinsi</span><select class="input" id="fprov" aria-label="Provinsi"><option value="">Semua provinsi</option>${provs.map(p=>`<option ${S.f.prov===p?"selected":""}>${esc(p)}</option>`).join("")}</select></div>`;
  const c=`<div class="chead"><div><h1>Roster relawan &amp; staf WASH</h1><p>${ms.length} anggota · ${cnt(m=>m.status==="tersedia")} tersedia · ${cnt(m=>m.status==="ditugaskan")} bertugas · ${cnt(m=>m.account)} mendaftar sendiri</p></div></div>
   ${ms.length?`<span class="hint">Klik baris anggota untuk melihat detail di panel kanan. Filter ada di panel kiri.</span>`:""}${dupNotice()}<div id="rlist">${rosterTable()}</div>`;
  return {l,c,r:memberInspector()}}

/* ---- tab 2: alerts ---- */
function alertCard(a,sel){
  const cs=cands(a),inv=cs.length,yes=cs.filter(c=>isYes(c.state)).length,chosen=cs.filter(c=>c.state==="terpilih").length;
  const left=daysBetween(today(),a.deadline);
  const dl=a.status!=="terbuka"?"":left<0?`<span class="deadline" style="color:var(--muted)">Batas konfirmasi lewat</span>`:`<span class="deadline" style="color:${left<=2?"var(--red)":"var(--warn)"}">${left===0?"Batas konfirmasi hari ini":"Sisa "+left+" hari konfirmasi"}</span>`;
  return `<button class="acard ${a.status==="ditutup"?"closed":a.status==="terisi"?"filled":""} ${sel?"sel":""}" data-act="sela" data-a="${a.id}"><div style="min-width:0;display:flex;flex-direction:column;gap:5px"><div class="row" style="gap:8px"><span class="code-t">${esc(a.code)}</span>${pill(ASTAT,a.status)}${sampleTag(a)}<span class="pill teal">${esc(a.emergency||"")}</span></div><h3>${esc(a.role)} — ${esc(a.title)}</h3><div class="meta"><span>${I.pin}${esc(a.location)}</span><span>${I.cal}${fmt(a.start)}</span><span>${I.clock}${a.dur} hari</span></div>${dl}</div>
    <div class="funnel"><div><b>${inv}</b><span>Kandidat</span></div><div><b>${yes}</b><span>Bersedia</span></div><div><b style="color:var(--red)">${chosen}/${a.slots||1}</b><span>Terpilih</span></div></div></button>`}
function alertInspector(a){
  if(!a)return ihint("Pilih alert di daftar untuk melihat ringkasan, lalu buka seleksi kandidat.");
  const cs=cands(a),n=s=>cs.filter(c=>c.state===s).length;
  return `<div class="isec"><div class="row" style="gap:8px"><span class="mono muted">${esc(a.code)}</span>${pill(ASTAT,a.status)}</div><h2>${esc(a.role)} — ${esc(a.title)}</h2>
    <a class="btn primary" href="#seleksi-${a.id}">${I.check}Buka seleksi kandidat</a>
    <div class="row" style="gap:6px"><button class="btn sm" data-act="edit-alert" data-a="${a.id}">${I.edit}Ubah</button>${a.status==="terbuka"?`<button class="btn sm" data-act="astatus" data-v="ditutup" data-a="${a.id}">Tutup alert</button>`:`<button class="btn sm" data-act="astatus" data-v="terbuka" data-a="${a.id}">Buka kembali</button>`}<button class="btn sm ghost danger" data-act="del-alert" data-a="${a.id}">Hapus</button></div></div>
   <div class="isec"><span class="lbl-up">Penugasan</span><dl class="kv"><dt>Jenis bencana</dt><dd>${esc(a.emergency||"-")}</dd><dt>Lokasi</dt><dd>${esc(a.location)}</dd><dt>Mulai</dt><dd>${fmtLong(a.start)}</dd><dt>Selesai</dt><dd>${fmtLong(endOf(a))}</dd><dt>Durasi</dt><dd>${a.dur} hari</dd><dt>Batas konfirmasi</dt><dd>${fmtLong(a.deadline)}</dd><dt>Kebutuhan</dt><dd>${a.slots||1} orang</dd></dl>${a.desc?`<p class="muted" style="font-size:.86rem;white-space:pre-line">${esc(a.desc)}</p>`:""}</div>
   <div class="isec"><span class="lbl-up">Kandidat</span><dl class="kv"><dt>Diundang</dt><dd>${n("diundang")}</dd><dt>Mengajukan diri</dt><dd>${n("mengajukan")}</dd><dt>Bersedia</dt><dd>${n("bersedia")}</dd><dt>Menolak</dt><dd>${n("menolak")}</dd><dt>Terpilih</dt><dd>${n("terpilih")} / ${a.slots||1}</dd></dl></div>`}
function vAlertTab(){
  const as=alerts(),cnt=k=>as.filter(a=>k==="semua"||a.status===k).length,f=S.af;
  const list=as.filter(a=>f==="semua"||a.status===f).filter(a=>!S.fe||a.emergency===S.fe);
  const lrow=(act,v,on,code,label,n)=>`<button class="lrow ${on?"on":""}" data-act="${act}" data-v="${esc(v)}">${code}<span>${label}</span><span class="c">${n}</span></button>`;
  const ems=[...new Set(as.map(a=>a.emergency).filter(Boolean))];
  const l=`<div class="lsec"><span class="lbl-up">Alat</span><div class="tools"><button class="tool primary" data-act="new-alert" style="grid-column:1/-1">${I.plus}Buat alert penugasan</button></div></div>
   <div class="lsec"><span class="lbl-up">Status alert</span>${[["terbuka","Terbuka","red"],["terisi","Terisi","ok"],["ditutup","Ditutup","off"],["semua","Semua","teal"]].map(([k,l2,c])=>lrow("af",k,f===k,`<span class="code ${c}">${k.slice(0,3).toUpperCase()}</span>`,l2,cnt(k))).join("")}</div>
   ${ems.length?`<div class="lsec"><span class="lbl-up">Jenis bencana</span>${lrow("fe","",!S.fe,`<span class="code teal">ALL</span>`,"Semua jenis",as.length)}${ems.map(e=>lrow("fe",e,S.fe===e,`<span class="code">${esc(e.slice(0,3).toUpperCase())}</span>`,esc(e),as.filter(a=>a.emergency===e).length)).join("")}</div>`:""}`;
  const sel=S.selAlert&&S.alerts[S.selAlert]?Object.assign({id:S.selAlert},S.alerts[S.selAlert]):null;
  const c=`<div class="chead"><div><h1>Alert penugasan</h1><p>Setiap alert berisi posisi, lokasi, tanggal mulai, dan durasi. Undang anggota dan pilih yang berangkat di tahap 3.</p></div><button class="btn primary" data-act="new-alert">${I.plus}Buat alert</button></div>
   ${list.length?`<div class="alerts">${list.map(a=>alertCard(a,sel&&sel.id===a.id)).join("")}</div>`:as.length?`<p class="muted">Tidak ada alert di kategori ini.</p>`:`<div class="empty"><h3>Belum ada alert</h3><p>Buat alert saat ada kebutuhan personel WASH di lokasi bencana. Setelah itu undang anggota roster lewat email dan WhatsApp.</p><button class="btn primary" data-act="new-alert">${I.plus}Buat alert pertama</button></div>`}`;
  return {l,c,r:alertInspector(sel)}}

/* ---- tab 3: selection ---- */
function inviteList(a){
  const inv=S.inv,q=inv.q.trim().toLowerCase(),taken=new Set(cands(a).map(c=>c.mid));
  const pool=members().filter(m=>!taken.has(m.id)).filter(m=>(!inv.roleOnly||m.role===a.role)&&(!inv.availOnly||m.status==="tersedia")&&(!q||(m.name+" "+m.province+" "+m.skills).toLowerCase().includes(q))).sort((x,y)=>(y.role===a.role)-(x.role===a.role)||x.name.localeCompare(y.name));
  if(!pool.length)return `<p class="muted" style="padding:12px">Tidak ada anggota yang cocok dengan filter ini.</p>`;
  return pool.map(m=>`<label><input type="checkbox" data-sel="${m.id}" ${inv.sel.has(m.id)?"checked":""}>${av(m,"sm")}<span class="grow"><b>${esc(m.name)}</b>${sampleTag(m)}<br><small class="muted">${esc(m.role)} · ${esc(m.province||"-")}</small></span>${m.role===a.role?'<span class="match">Profil cocok</span>':""}${pill(MSTAT,m.status)}</label>`).join("")}
function selCenter(a){
  const cs=cands(a).map(c=>Object.assign(c,{m:S.members[c.mid]&&Object.assign({id:c.mid},S.members[c.mid])})).filter(c=>c.m);
  const order={terpilih:0,bersedia:1,mengajukan:2,diundang:3,menolak:4};cs.sort((x,y)=>order[x.state]-order[y.state]);
  const chosen=cs.filter(c=>c.state==="terpilih").length;
  const rows=cs.map(c=>{const m=c.m,txt=c.state==="terpilih"?selectText(a,m,c):inviteText(a,m),subj=(c.state==="terpilih"?"Penugasan terkonfirmasi: ":"Alert penugasan WASH: ")+a.code+" "+a.role;
    return `<tr><td><div class="who">${av(m,"sm")}<div><b>${esc(m.name)}</b><small>${esc(m.role)} · ${esc(m.province||"-")}</small></div></div></td><td>${pill(CSTAT,c.state)}${c.self&&c.respAt?`<span class="stamp">Dijawab sendiri ${stampT(c.respAt)}</span>`:""}</td>
    <td><div class="row" style="gap:6px;flex-wrap:nowrap">${m.email?`<a class="btn sm" target="_blank" rel="noopener" href="${esc(mailHref(m.email,subj,txt))}" data-act="sent" data-ch="email" data-a="${a.id}" data-m="${m.id}">${I.mail}Email</a>`:""}${m.phone?`<a class="btn sm wa" target="_blank" rel="noopener" href="${esc(waHref(m.phone,txt))}" data-act="sent" data-ch="wa" data-a="${a.id}" data-m="${m.id}">${I.wa}WA</a>`:""}<button class="btn sm ghost" data-act="copymsg" data-a="${a.id}" data-m="${m.id}" title="Salin pesan" aria-label="Salin pesan">${I.copy}</button></div>${c.emailAt?`<span class="stamp">Draf email dibuka ${stampT(c.emailAt)}</span>`:""}${c.waAt?`<span class="stamp">Chat WhatsApp dibuka ${stampT(c.waAt)}</span>`:""}</td>
    <td><div class="row" style="gap:6px;justify-content:flex-end;flex-wrap:nowrap">${c.state==="terpilih"?`<button class="btn sm primary" data-act="card" data-a="${a.id}" data-m="${m.id}">${I.id}Kartu ID</button><button class="btn sm ghost" data-act="unselect" data-a="${a.id}" data-m="${m.id}">Batalkan</button>`:
      `${c.state!=="bersedia"?`<button class="btn sm" data-act="cstate" data-v="bersedia" data-a="${a.id}" data-m="${m.id}">Bersedia</button>`:""}${c.state!=="menolak"?`<button class="btn sm" data-act="cstate" data-v="menolak" data-a="${a.id}" data-m="${m.id}">Menolak</button>`:""}<button class="btn sm alert" data-act="select" data-a="${a.id}" data-m="${m.id}" ${c.state==="menolak"||m.status==="ditugaskan"?"disabled":""} title="${m.status==="ditugaskan"?"Sedang bertugas di penugasan lain":"Pilih dan terbitkan kartu"}">Pilih</button>`}${(a.cand||{})[m.id]?`<button class="btn sm ghost danger" data-act="uncand" data-a="${a.id}" data-m="${m.id}" title="Keluarkan dari daftar" aria-label="Keluarkan">${I.x}</button>`:""}</div></td></tr>`}).join("");
  return `<div class="dhead"><div class="row" style="gap:8px"><span class="mono muted">${esc(a.code)}</span>${pill(ASTAT,a.status)}${sampleTag(a)}<span class="pill teal">${esc(a.emergency||"")}</span></div><h1>${esc(a.role)} — ${esc(a.title)}</h1></div>
  <dl class="facts"><div><dt>Lokasi</dt><dd>${esc(a.location)}</dd></div><div><dt>Periode</dt><dd>${fmt(a.start)} – ${fmt(endOf(a))}</dd></div><div><dt>Durasi</dt><dd>${a.dur} hari</dd></div><div><dt>Batas konfirmasi</dt><dd>${fmt(a.deadline)}</dd></div></dl>
  <div class="card"><div class="card-h"><div><h2>Kandidat <span class="mono muted" style="font-size:.95rem">${chosen}/${a.slots||1} terpilih</span></h2><p class="muted" style="font-size:.84rem;margin-top:2px">Tombol Email dan WA membuka pesan yang sudah terisi. Pesan terkirim setelah Anda menekan kirim di aplikasi tersebut.</p></div></div>
    ${cs.length?`<div class="tablewrap"><table class="dt"><thead><tr><th>Anggota</th><th>Status</th><th>Kirim alert</th><th style="text-align:right">Keputusan</th></tr></thead><tbody>${rows}</tbody></table></div>`:`<div class="card-b"><p class="muted">Belum ada kandidat. Undang anggota di bawah, atau tunggu relawan mengajukan diri dari portal mereka.</p></div>`}</div>
  ${a.status==="terbuka"?`<div class="card"><div class="card-h"><div><h2>Undang anggota roster</h2><p class="muted" style="font-size:.84rem;margin-top:2px">Centang anggota lalu masukkan ke daftar kandidat. Setelah itu kirim alert lewat Email atau WA di tabel atas.</p></div></div><div class="card-b">
    <div class="toolbar"><label class="search">${I.search}<input id="invq" placeholder="Cari anggota…" value="${esc(S.inv.q)}" aria-label="Cari anggota untuk diundang"></label><label class="toggle"><input type="checkbox" id="invrole" ${S.inv.roleOnly?"checked":""}>Hanya profil ${esc(a.role)}</label><label class="toggle"><input type="checkbox" id="invavail" ${S.inv.availOnly?"checked":""}>Hanya yang tersedia</label></div>
    <div class="pick" id="pick">${inviteList(a)}</div>
    <div class="spread"><span class="muted" id="selcount">${S.inv.sel.size} dipilih</span><button class="btn primary" data-act="invite" data-a="${a.id}" ${S.inv.sel.size?"":"disabled"} id="invbtn">Masukkan ke daftar kandidat</button></div></div></div>`:""}`}
function selInspector(a){
  if(!a)return ihint("Pilih alert di panel kiri untuk mulai menyeleksi kandidat.");
  const emails=cands(a).filter(c=>c.state!=="menolak"&&S.members[c.mid]&&S.members[c.mid].email).map(c=>S.members[c.mid].email);
  return annAdminBox(a)+`<div class="isec"><span class="lbl-up">Kirim massal</span>${emails.length?`<a class="btn" target="_blank" rel="noopener" href="${esc(mailHref("","Alert penugasan WASH: "+a.code+" "+a.role,inviteText(a,null),emails.join(",")))}">${I.mail}Email semua kandidat (BCC, ${emails.length})</a><button class="btn sm ghost" data-act="copyemails" data-a="${a.id}">${I.copy}Salin daftar email</button>`:`<p class="muted">Belum ada kandidat dengan email.</p>`}<p class="note">WhatsApp tidak bisa dikirim massal dari halaman ini. Gunakan tombol WA per orang di tabel kandidat.</p></div>
   <div class="isec"><div class="spread"><span class="lbl-up">Teks alert</span><button class="btn sm ghost" data-act="copyalert" data-a="${a.id}">${I.copy}Salin</button></div><div class="msgbox">${esc(inviteText(a,null))}</div></div>
   <div class="isec"><div class="row" style="gap:6px"><button class="btn sm" data-act="edit-alert" data-a="${a.id}">${I.edit}Ubah alert</button>${a.status==="terbuka"?`<button class="btn sm" data-act="astatus" data-v="ditutup" data-a="${a.id}">Tutup alert</button>`:`<button class="btn sm" data-act="astatus" data-v="terbuka" data-a="${a.id}">Buka kembali</button>`}</div></div>`}
function vSelTab(){
  const as=alerts();let id=S.route.startsWith("seleksi-")?S.route.slice(8):S.selAlert;
  if(!id||!S.alerts[id]){const first=as.find(a=>a.status==="terbuka")||as[0];id=first&&first.id}
  if(id)S.selAlert=id;
  const a=id&&S.alerts[id]?Object.assign({id},S.alerts[id]):null;
  const l=`<div class="lsec"><span class="lbl-up">Pilih alert</span>${as.length?as.map(x=>{const cs=cands(x),p=cs.filter(c=>c.self&&(c.state==="bersedia"||c.state==="mengajukan")).length;return `<a class="lrow ${a&&a.id===x.id?"on":""}" href="#seleksi-${x.id}" style="text-decoration:none;align-items:flex-start"><span class="code ${x.status==="terbuka"?"red":x.status==="terisi"?"ok":"off"}">${RCODE[x.role]||"WSH"}</span><span style="min-width:0"><span style="display:block;font-weight:600">${esc(x.title)}</span><span class="muted" style="font-size:.76rem">${esc(x.code)} · ${cs.filter(c=>c.state==="terpilih").length}/${x.slots||1} terpilih</span></span>${p?`<span class="c" style="color:var(--warn);font-weight:700">${p} baru</span>`:""}</a>`}).join(""):`<p class="muted" style="padding:0 4px">Belum ada alert.</p>`}</div>
   <div class="lsec"><div class="tools"><button class="tool" data-act="new-alert" style="grid-column:1/-1">${I.plus}Buat alert</button></div></div>`;
  const c=a?selCenter(a):`<div class="empty"><h3>Belum ada alert untuk diseleksi</h3><p>Buat alert di tahap 2 terlebih dulu.</p><a class="btn primary" href="#alert">Ke Alert Penugasan</a></div>`;
  return {l,c,r:selInspector(a)}}

/* ---- tab 4: cards ---- */
function vCardTab(){
  const all=assignments(),g=S.kg||"semua",groups=[["aktif","Sedang bertugas"],["akan","Akan berangkat"],["selesai","Selesai"]];
  const list=all.filter(x=>g==="semua"||phase(x.a)===g);
  const l=`<div class="lsec"><span class="lbl-up">Kelompok</span>${[["semua","Semua kartu"],...groups].map(([k,lb])=>`<button class="lrow ${g===k?"on":""}" data-act="kg" data-v="${k}"><span class="code ${k==="aktif"?"red":k==="akan"?"warn":k==="selesai"?"off":"teal"}">${k.slice(0,3).toUpperCase()}</span><span>${lb}</span><span class="c">${k==="semua"?all.length:all.filter(x=>phase(x.a)===k).length}</span></button>`).join("")}</div>
   <div class="lsec"><p class="note">Kartu terbit otomatis saat anggota dipilih di tahap 3. Isinya foto, nama, posisi, lokasi, periode, durasi, dan kode QR.</p></div>`;
  const key=S.selCard;let sel=null;if(key){const [aid,mid]=key.split("|");sel=all.find(x=>x.a.id===aid&&x.m.id===mid)||null}
  const c=`<div class="chead"><div><h1>Kartu ID penugasan</h1><p>${all.length} kartu terbit</p></div></div>
   ${list.length?`<div class="cards">${list.map(({a,c,m})=>`<button class="tile ${key===a.id+"|"+m.id?"sel":""}" data-act="selc" data-a="${a.id}" data-m="${m.id}"><div class="band"><span>${phase(a)==="aktif"?"Bertugas":phase(a)==="akan"?"Akan berangkat":"Selesai"}</span><span class="mono">${esc(c.cardNo)}</span></div><div class="body"><div class="who">${av(m)}<div><b>${esc(m.name)}</b><small>${esc(a.role)}</small></div></div><dl class="kv"><dt>Lokasi</dt><dd>${esc(a.location)}</dd><dt>Periode</dt><dd>${fmt(a.start)} – ${fmt(endOf(a))}</dd><dt>Durasi</dt><dd>${a.dur} hari</dd></dl></div></button>`).join("")}</div>`:`<div class="empty"><h3>Belum ada kartu</h3><p>Pilih kandidat di tahap Seleksi Kandidat. Kartu langsung muncul di sini.</p><a class="btn primary" href="#seleksi">Ke Seleksi Kandidat</a></div>`}`;
  let r=ihint("Pilih kartu untuk melihat pratinjau, mengunduh PNG, dan mengirimnya.");
  if(sel){const {a,c:cd,m}=sel,txt=selectText(a,m,cd),subj="Penugasan terkonfirmasi: "+a.code+" "+a.role;
    r=`<div class="isec"><div id="inspcard"><div class="skeleton" style="height:420px;max-width:300px;margin:0 auto"></div></div></div>
     <div class="isec"><dl class="kv"><dt>No. kartu</dt><dd class="mono">${esc(cd.cardNo)}</dd><dt>Nama</dt><dd>${esc(m.name)}</dd><dt>Operasi</dt><dd>${esc(a.title)}</dd></dl>
     ${S.downloads?`<button class="btn primary" data-act="dlcard2" data-a="${a.id}" data-m="${m.id}">${I.dl}Unduh kartu (PNG)</button>`:`<p class="note">Tekan lama atau klik kanan gambar kartu untuk menyimpannya.</p>`}
     <div class="row" style="gap:6px">${m.phone?`<a class="btn wa" target="_blank" rel="noopener" href="${esc(waHref(m.phone,txt))}" data-act="sent" data-ch="wa" data-a="${a.id}" data-m="${m.id}">${I.wa}Kirim via WA</a>`:""}${m.email?`<a class="btn" target="_blank" rel="noopener" href="${esc(mailHref(m.email,subj,txt))}" data-act="sent" data-ch="email" data-a="${a.id}" data-m="${m.id}">${I.mail}Kirim via email</a>`:""}</div>
     <p class="note">Unduh kartu dulu, lalu lampirkan gambarnya di chat WhatsApp atau email yang terbuka.</p></div>`}
  return {l,c,r}}
async function cardURL(a,m,c){const k=a.id+"|"+m.id,sig=[m.photo&&m.photo.length,m.name,a.role,a.location,a.title,a.start,a.dur,c.cardNo].join("~");S.cardCache=S.cardCache||{};const hit=S.cardCache[k];if(hit&&hit.sig===sig)return hit;const cv=await drawCard(a,m,c);const v={sig,url:cv.toDataURL("image/png"),cv};S.cardCache[k]=v;return v}
async function paintCardPreview(){const k=S.selCard;if(!k)return;const [aid,mid]=k.split("|");const a=S.alerts[aid],m=S.members[mid];const c=a&&(a.cand||{})[mid];if(!a||!m||!c)return;
  const v=await cardURL(Object.assign({id:aid},a),Object.assign({id:mid},m),c);const box=$("#inspcard");if(box&&S.selCard===k)box.innerHTML=`<img class="cardimg" src="${v.url}" alt="Kartu penugasan ${esc(m.name)}">`}

/* ---- tab 5: summary ---- */
function vSumTab(){
  const ms=members(),as=alerts(),asg=assignments(),live=asg.filter(x=>phase(x.a)!=="selesai"),open=as.filter(a=>a.status==="terbuka");
  const l=`<div class="lsec"><span class="lbl-up">Laporan</span><div class="tools">${S.downloads&&window.XLSX?`<button class="tool primary" data-act="export" style="grid-column:1/-1">${I.dl}Ekspor roster .xlsx</button><button class="tool" data-act="exportasg" style="grid-column:1/-1">${I.sheet}Ekspor penugasan .xlsx</button>`:`<p class="note" style="grid-column:1/-1">Ekspor Excel tersedia saat halaman dibuka di claude.ai.</p>`}</div></div>
   <div class="lsec"><span class="lbl-up">Data</span>${dupNotice()||`<p class="muted" style="padding:0 4px;font-size:.84rem">Tidak ada data ganda.</p>`}</div>`;
  let comp="";if(ms.length){const max=Math.max(...ROLES.map(r=>ms.filter(m=>m.role===r).length),1);
    comp=`<div class="card"><div class="card-h"><h2>Kekuatan roster per profil</h2><div class="legend"><span><i style="background:var(--teal)"></i>Tersedia</span><span><i style="background:var(--red)"></i>Bertugas</span><span><i style="background:var(--line)"></i>Tidak tersedia</span></div></div><div class="card-b"><div class="bars">${ROLES.map(r=>{const g=ms.filter(m=>m.role===r),a=g.filter(m=>m.status==="tersedia").length,d=g.filter(m=>m.status==="ditugaskan").length;return `<div class="bar"><span>${esc(r)}</span><div class="track" role="img" aria-label="${a} tersedia, ${d} bertugas dari ${g.length}"><i class="a" style="width:${a/max*100}%"></i><i class="d" style="width:${d/max*100}%"></i><i style="width:${(g.length-a-d)/max*100}%;background:var(--line)"></i></div><span class="n mono">${a}/${g.length}</span></div>`}).join("")}</div></div></div>`}
  const c=`<div class="chead"><div><h1>Ringkasan &amp; laporan</h1><p>Kondisi roster dan penugasan per ${fmtLong(today())}.</p></div></div>
   <div class="stiles"><div class="stile"><b>${ms.length}</b><span>Anggota roster</span></div><div class="stile"><b>${ms.filter(m=>m.status==="tersedia").length}</b><span>Siap diberangkatkan</span></div><div class="stile"><b>${ms.filter(m=>m.status==="ditugaskan").length}</b><span>Sedang bertugas</span></div><div class="stile alert"><b>${open.length}</b><span>Alert terbuka</span></div></div>
   ${!ms.length&&!as.length?vEmptyStart():`<div class="grid2"><div class="card"><div class="card-h"><h2>Di lapangan</h2><a class="btn sm" href="#kartu">Semua kartu</a></div><div class="card-b">${live.length?`<div class="dlist">${live.slice(0,8).map(({a,c,m})=>{const ph=phase(a),done=ph==="aktif"?Math.min(100,(daysBetween(a.start,today())+1)/a.dur*100):0;return `<div class="ditem">${av(m,"sm")}<div><div class="t">${esc(m.name)}</div><div class="s">${esc(a.role)} · ${esc(a.location)} · ${ph==="aktif"?"hari ke-"+(daysBetween(a.start,today())+1)+" dari "+a.dur:"mulai "+fmt(a.start)}</div><div class="prog"><i style="width:${done}%"></i></div></div></div>`}).join("")}</div>`:`<p class="muted">Belum ada personel yang ditugaskan.</p>`}</div></div>
   <div class="card"><div class="card-h"><h2>Alert terbuka</h2><a class="btn sm" href="#alert">Semua alert</a></div><div class="card-b">${open.length?`<div class="dlist">${open.map(a=>{const cs=cands(a);return `<a class="ditem" href="#seleksi-${a.id}" style="text-decoration:none;color:inherit"><span class="code red">${RCODE[a.role]||"WSH"}</span><div><div class="t">${esc(a.title)}</div><div class="s">${esc(a.code)} · ${cs.filter(c=>isYes(c.state)).length} bersedia · ${cs.filter(c=>c.state==="terpilih").length}/${a.slots||1} terpilih</div></div></a>`}).join("")}</div>`:`<p class="muted">Tidak ada alert terbuka.</p>`}</div></div></div>${comp}`}`;
  const ev=[];ms.forEach(m=>{if(m.account&&m.createdAt)ev.push([m.createdAt,`<b>${esc(m.name)}</b> mendaftar sendiri sebagai ${esc(m.role)}`,"teal","REG"]);Object.entries(m.responses||{}).forEach(([aid,r])=>{const a=S.alerts[aid];if(a&&r.at)ev.push([r.at,`<b>${esc(m.name)}</b> ${r.state==="bersedia"?"bersedia untuk":"menolak"} ${esc(a.code)}`,r.state==="bersedia"?"ok":"off","RSP"])})});
  as.forEach(a=>{if(a.createdAt>1e12)ev.push([a.createdAt,`Alert <b>${esc(a.code)}</b> diterbitkan: ${esc(a.role)}, ${esc(a.location)}`,"red","ALT"]);Object.entries(a.cand||{}).forEach(([mid,c])=>{if(c.state==="terpilih"&&c.selectedAt&&S.members[mid])ev.push([c.selectedAt,`<b>${esc(S.members[mid].name)}</b> terpilih untuk ${esc(a.code)}`,"red","SEL"])})});
  ev.sort((x,y)=>y[0]-x[0]);
  const r=`<div class="ihint">${I.info}<span>Aktivitas terbaru dari pendaftaran, jawaban relawan, dan seleksi.</span></div>${ev.length?`<div class="feed">${ev.slice(0,30).map(([t,h,c,code])=>`<div><span class="code ${c}">${code}</span><span>${h}<time>${stampT(t)}</time></span></div>`).join("")}</div>`:`<p class="muted" style="padding:16px 18px">Belum ada aktivitas.</p>`}`;
  return {l,c,r}}
function exportAssignments(){saveXlsx(`penugasan-wash-${today()}.xlsx`,[["Penugasan",assignments().map(({a,c,m})=>({"No. kartu":c.cardNo,"Nama":m.name,"Posisi":a.role,"Operasi":a.title,"Kode alert":a.code,"Jenis bencana":a.emergency||"","Lokasi":a.location,"Mulai":a.start,"Selesai":endOf(a),"Durasi (hari)":a.dur,"Nomor WhatsApp":m.phone||"","Email":m.email||""}))]])}
const VIEWS={roster:vRosterTab,alert:vAlertTab,seleksi:vSelTab,kartu:vCardTab,laporan:vReportTab};

/* ---------- Google Sheets sync (admins only, runs as the viewing admin via the Google Sheets connector) ---------- */
const GS="Google Sheets";
const sheetIdOf=u=>{u=String(u||"").trim();const m=u.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);if(m)return m[1];return /^[a-zA-Z0-9_-]{30,}$/.test(u)?u:""};
const qSheet=t=>"'"+String(t).replace(/'/g,"''")+"'";
function hashKey(s){let h1=0x811c9dc5,h2=0x1505;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,16777619)>>>0;h2=((h2<<5)+h2+c)>>>0}return h1.toString(36)+h2.toString(36)}
function gsErr(e){const c=e&&e.code;
  if(c==="private")return"Spreadsheet tidak bisa dibaca. Di Google Sheets, buka Bagikan → Akses umum → \"Siapa saja yang memiliki link\" (Pelihat), lalu coba lagi. Periksa juga nama sheet.";
  if(c==="server_not_connected")return"Konektor Google Sheets belum terhubung di akun Anda. Tambahkan lewat claude.ai → Settings → Connectors.";
  if(c==="needs_reauth")return"Sambungan Google Sheets kedaluwarsa. Sambungkan ulang di claude.ai → Settings → Connectors.";
  if(c==="selection_required")return"Ada lebih dari satu konektor Google Sheets. Pilih salah satu di jendela yang muncul, lalu coba lagi.";
  if(c==="not_in_manifest")return"Google Sheets belum diizinkan untuk halaman ini. Izinkan lewat menu izin halaman, lalu tekan Sinkronkan sekarang.";
  if(c==="approval_required"||c==="consent_required")return"Perlu persetujuan Anda untuk membaca spreadsheet. Tekan Sinkronkan sekarang lalu pilih Izinkan.";
  if(c==="blocked_by_policy")return"Organisasi Anda memblokir Google Sheets untuk halaman ini.";
  if(c==="tool_error")return"Spreadsheet tidak bisa dibaca. Pastikan link benar, nama sheet masih ada, dan akun Google Anda punya akses ke file itu.";
  if(c==="server_unavailable"||c==="rate_limited")return"Google Sheets sedang tidak bisa dihubungi. Coba lagi beberapa menit lagi.";
  if(c==="not_granted"||c==="capability_disabled"||c==="capability_removed")return"Konektor tidak tersedia di tampilan ini. Buka halaman lewat claude.ai.";
  if(c==="empty")return"Sheet kosong atau tidak ada baris judul kolom.";
  return"Gagal membaca spreadsheet. Coba lagi.";}
async function gsCallUnused(tool,input){const r=await S.mcp.callTool(GS,tool,input,{cache:false});const p=r&&r.payload;return p&&typeof p==="object"&&p.content&&typeof p.content==="object"?Object.assign({},p.content,p):p||{}}
async function gsSheets(id){return {title:"Google Sheets",sheets:[S.sheetTab||"(sheet pertama)"]}}
async function gsSheetsUnused(id){const p=await gsCall("get_spreadsheet",{spreadsheetId:id,fields:["properties.title","sheets.properties.title"]});return {title:(p.properties&&p.properties.title)||"",sheets:(p.sheets||[]).map(s=>s.properties&&s.properties.title).filter(Boolean)}}
async function gsGrid(id,sheet){
  const u=`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv${sheet&&sheet!=="(sheet pertama)"?"&sheet="+encodeURIComponent(sheet):""}`;
  let res,t;try{res=await fetch(u,{cache:"no-store"});t=await res.text()}catch(e){throw {code:"private"}}
  if(!res.ok||/^\s*</.test(t))throw {code:"private"};
  const wb=XLSX.read(t,{type:"string",raw:true});const g0=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:""});
  const g=g0.map(r=>(r||[]).map(c=>String(c==null?"":c).trim()));const hi=g.findIndex(r=>r.filter(Boolean).length>=2);if(hi<0)throw {code:"empty"};return {headers:g[hi],rows:g.slice(hi+1).filter(r=>r.some(Boolean))}}
async function gsGridUnused(id,sheet){const p=await gsCall("get_values",{spreadsheetId:id,range:qSheet(sheet)});const g=(p.values||[]).map(r=>(r||[]).map(c=>String(c==null?"":c).trim()));const hi=g.findIndex(r=>r.filter(Boolean).length>=2);if(hi<0)throw {code:"empty"};return {headers:g[hi],rows:g.slice(hi+1).filter(r=>r.some(Boolean))}}
function idxFromCfg(headers,map){const idx={};FIELDS.forEach(([k])=>{const h=map&&map[k];if(h){const i=headers.findIndex(x=>normH(x)===normH(h));if(i>=0)idx[k]=i}});return Object.keys(idx).length?idx:autoMap(headers)}
function sheetPlan(headers,rows,idx,defRole){
  const byE={},byP={};members().forEach(m=>{if(m.email)byE[m.email.toLowerCase()]=m.id;const p=waNum(m.phone);if(p)byP[p]=m.id});
  const seen=new Set(),ops=[];let skip=0,same=0;
  rows.forEach(r=>{const g=k=>idx[k]!=null?String(r[idx[k]]||"").trim():"";
    const rec={name:g("name"),phone:g("phone"),email:g("email").toLowerCase(),role:mapRole(g("role"))||defRole||ROLES[1],level:mapLevel(g("level"))||LEVELS[0],province:g("province"),chapter:g("chapter"),skills:g("skills"),lang:g("lang")};
    const st=mapStatus(g("status"));
    if(!rec.name||(!rec.phone&&!rec.email)||(rec.email&&!/^\S+@\S+\.\S+$/.test(rec.email))){skip++;return}
    const key=rec.email||waNum(rec.phone);if(seen.has(key)){skip++;return}seen.add(key);
    const sig=hashKey(JSON.stringify([rec,st]));
    const ex=(rec.email&&byE[rec.email])||(waNum(rec.phone)&&byP[waNum(rec.phone)]);
    if(ex){const m=S.members[ex];if(m.sheetSig===sig){same++;return}
      let data;if(m.account){data={};Object.keys(rec).forEach(k=>{if(!m[k]&&rec[k])data[k]=rec[k]})}else{data=Object.assign({},rec);if(st&&m.status!=="ditugaskan")data.status=st}
      data.sheetSig=sig;ops.push({kind:"update",id:ex,data})}
    else ops.push({kind:"set",id:newId(),data:Object.assign({},rec,{status:st||"tersedia",photo:"",source:"sheet",sheetSig:sig,createdAt:Date.now()})})});
  return {ops,skip,same,add:ops.filter(o=>o.kind==="set").length,upd:ops.filter(o=>o.kind==="update").length,total:rows.length}}
async function applyOps(ops,onStep){let ok=0,fail=0,i=0;S.suspend=true;
  const worker=async()=>{while(i<ops.length){const o=ops[i++];let done=false;for(let t=0;t<3&&!done;t++){try{await write(o.kind,"members",o.id,o.data);done=true}catch(e){if(!e||!(e.code==="resource_exhausted"||e.code==="unavailable"))break;await new Promise(z=>setTimeout(z,1200*(t+1)))}}done?ok++:fail++;onStep&&onStep(ok+fail,ops.length)}};
  try{await Promise.all([worker(),worker(),worker()])}finally{S.suspend=false;render()}return {ok,fail}}
async function syncSheet(manual){
  const cfg=S.sync;if(!cfg||!cfg.id||!cfg.sheet||!S.mcp||S.syncing)return;
  S.syncing=true;S.syncErr="";render();
  try{const {headers,rows}=await gsGrid(cfg.id,cfg.sheet);
    const plan=sheetPlan(headers,rows,idxFromCfg(headers,cfg.map),cfg.defRole);
    const res=plan.ops.length?await applyOps(plan.ops):{ok:0,fail:0};
    S.syncLocal={at:Date.now(),add:plan.add,upd:plan.upd,skip:plan.skip,same:plan.same,fail:res.fail,total:plan.total};
    if(manual||plan.ops.length)await write("set","sync","sheet",Object.assign({},cfg,{last:S.syncLocal})).catch(()=>{});
    if(manual)toast(plan.ops.length?`Sinkron selesai: ${plan.add} baru, ${plan.upd} diperbarui`:"Sinkron selesai: tidak ada perubahan")}
  catch(e){S.syncErr=gsErr(e);if(manual)toast(S.syncErr)}
  finally{S.syncing=false;render()}}
function syncStatusHTML(compact){
  if(!S.mcp)return "";
  const cfg=S.sync;if(!cfg||!cfg.id)return `<div class="lbox"><b>Google Sheets</b><span class="muted">Belum terhubung. Tarik data roster otomatis dari link spreadsheet.</span><button class="btn sm primary" data-act="sheet">${I.sheet}Hubungkan spreadsheet</button></div>`;
  const l=S.syncLocal||cfg.last;
  return `<div class="lbox"><div class="spread"><b>Google Sheets</b>${S.syncing?`<span class="pill teal">Menyinkronkan…</span>`:S.syncErr?`<span class="pill red">Gagal</span>`:`<span class="pill ok">Terhubung</span>`}</div>
    <span class="muted" style="overflow-wrap:anywhere">${esc(cfg.title||"Spreadsheet")} · ${esc(cfg.sheet)}</span>
    ${l?`<span class="muted">Terakhir ${stampT(l.at)}: ${l.add} baru, ${l.upd} diperbarui, ${l.skip} dilewati</span>`:""}
    ${S.syncErr?`<span class="err" style="font-size:.8rem">${esc(S.syncErr)}</span>`:""}
    <div class="row" style="gap:6px"><button class="btn sm primary" data-act="sheet-sync" ${S.syncing?"disabled":""}>Sinkronkan sekarang</button><button class="btn sm" data-act="sheet">Pengaturan</button></div>
    <span class="muted" style="font-size:.74rem">Otomatis tiap 10 menit selama halaman ini dibuka admin.</span></div>`}
function sheetModal(){
  const d=S.sheetDraft,cfg=S.sync||{};
  if(!d){openModal("Sinkron dari Google Sheets",`<p class="muted">Tempel link Google Sheets berisi data roster. Data dicocokkan ke roster berdasarkan email atau nomor WhatsApp.</p>
     <div class="field"><label for="shurl">Link spreadsheet</label><input class="input" id="shurl" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(cfg.url||"")}"></div>
     <div class="field"><label for="shname">Nama sheet/tab (kosongkan untuk sheet pertama)</label><input class="input" id="shname" placeholder="mis. Form Responses 1" value="${esc(cfg.sheet&&cfg.sheet!=="(sheet pertama)"?cfg.sheet:"")}"></div>
     <p class="err" id="sherr" hidden></p>
     <div class="note" style="display:flex;flex-direction:column;gap:5px"><span>· Baris pertama yang berisi judul kolom dipakai sebagai header (misalnya dari Google Form).</span><span>· Data yang diisi relawan sendiri tidak ditimpa; hanya kolom yang masih kosong yang dilengkapi.</span><span>· Baris yang dihapus dari spreadsheet tidak menghapus anggota di roster.</span><span>· Spreadsheet harus dibagikan "Siapa saja yang memiliki link" agar bisa dibaca. Simpan link-nya hanya di antara admin.</span></div>`,
     `${cfg.id?`<button class="btn ghost danger" data-act="sheet-off" style="margin-right:auto">Putuskan sinkron</button>`:""}<button class="btn" data-act="close">Batal</button><button class="btn primary" data-act="sheet-read" id="shread">Baca spreadsheet</button>`,true);return}
  const plan=d.headers?sheetPlan(d.headers,d.rows,d.idx,d.defRole):null;
  openModal("Atur sinkron Google Sheets",`<div class="form"><div class="field"><label>Spreadsheet</label><input class="input" value="${esc(d.title||d.id)}" disabled></div>
     <div class="field"><label for="shsheet">Sheet</label><select class="input" id="shsheet">${d.sheets.map(s=>`<option ${s===d.sheet?"selected":""}>${esc(s)}</option>`).join("")}</select></div></div>
     ${d.headers?`<div><h3 style="margin-bottom:8px">Pencocokan kolom</h3><div class="mapgrid">${FIELDS.map(([k,l])=>`<div class="field"><label for="smap-${k}">${l}</label><select class="input" id="smap-${k}" data-smap="${k}"><option value="">— tidak ada —</option>${d.headers.map((h,i)=>`<option value="${i}" ${d.idx[k]===i?"selected":""}>${esc(h||"Kolom "+(i+1))}</option>`).join("")}</select></div>`).join("")}</div></div>
     <div class="field"><label for="shdef">Profil bila kosong atau tidak dikenali</label><select class="input" id="shdef">${ROLES.map(r=>`<option ${d.defRole===r?"selected":""}>${esc(r)}</option>`).join("")}</select></div>
     <div class="sumrow" id="shplan"><span class="pill ok">${plan.add} baru</span><span class="pill teal">${plan.upd} diperbarui</span><span class="pill off">${plan.skip} dilewati</span><span class="muted" style="font-size:.82rem;align-self:center">${plan.same} sudah sama · ${plan.total} baris</span></div>`:`<div class="skeleton" style="height:120px"></div>`}
     <p class="err" id="sherr" hidden></p>`,
    `<button class="btn" data-act="sheet-back" style="margin-right:auto">Ganti link</button><button class="btn" data-act="close">Batal</button><button class="btn primary" data-act="sheet-save" ${d.headers?"":"disabled"}>Simpan &amp; sinkronkan</button>`,true)}
async function sheetLoadGrid(){const d=S.sheetDraft;try{const {headers,rows}=await gsGrid(d.id,d.sheet);d.headers=headers;d.rows=rows;const same=S.sync&&S.sync.id===d.id&&S.sync.sheet===d.sheet;d.idx=same?idxFromCfg(headers,S.sync.map):autoMap(headers);sheetModal()}catch(e){d.headers=null;sheetModal();const er=$("#sherr");if(er){er.textContent=gsErr(e);er.hidden=false}}}
function refreshSheetPlan(){const d=S.sheetDraft;const el=$("#shplan");if(!d||!el)return;const p=sheetPlan(d.headers,d.rows,d.idx,d.defRole);el.innerHTML=`<span class="pill ok">${p.add} baru</span><span class="pill teal">${p.upd} diperbarui</span><span class="pill off">${p.skip} dilewati</span><span class="muted" style="font-size:.82rem;align-self:center">${p.same} sudah sama · ${p.total} baris</span>`}
let syncTimer=null;
function startAutoSync(){if(syncTimer||!S.isAdmin||!S.mcp)return;syncTimer=setInterval(()=>{if(document.visibilityState==="visible")syncSheet(false)},600000);if(S.sync&&S.sync.id)syncSheet(false)}

/* ---- asisten ---- */
function renderChat(){
  const d=$("#drawer");const msgs=S.chat||[];
  d.innerHTML=`<div class="drawer-h"><b>Asisten Roster</b><button class="btn ghost sm" data-act="chat-close" aria-label="Tutup">${I.x}</button></div>
   <div class="msgs" id="msgs">${msgs.length?msgs.map(m=>`<div class="msg ${m.role==="user"?"u":"a"}">${esc(m.content||"…")}</div>`).join(""):`<p class="muted" style="font-size:.86rem">Tanya apa saja tentang roster dan alert. Asisten membaca data roster yang ada di halaman ini (tanpa nomor HP dan email).</p><div class="sugs">${["Siapa saja yang tersedia untuk Sanitasi & Limbah?","Ringkas status semua alert terbuka.","Buatkan ringkasan tugas (ToR) untuk Promosi Kebersihan di posko banjir 14 hari.","Profil WASH mana yang paling kurang orang?"].map(s=>`<button data-act="sug">${esc(s)}</button>`).join("")}</div>`}</div>
   <form class="ask" id="askform"><input class="input" id="askq" placeholder="Tulis pertanyaan…" autocomplete="off" aria-label="Pertanyaan"><button class="btn primary" type="submit" ${S.chatBusy?"disabled":""}>Kirim</button></form>`;
  const box=$("#msgs");box.scrollTop=box.scrollHeight}
function rosterContext(){return JSON.stringify({hari_ini:today(),anggota:members().slice(0,400).map(m=>({nama:m.name,profil:m.role,kategori:m.level,provinsi:m.province,markas:m.chapter,keahlian:m.skills,bahasa:m.lang,status:(MSTAT[m.status]||[m.status])[0],sumber:SRC[srcOf(m)][0]})),alert:alerts().map(a=>({kode:a.code,operasi:a.title,jenis:a.emergency,posisi:a.role,lokasi:a.location,mulai:a.start,durasi_hari:a.dur,batas_konfirmasi:a.deadline,status:a.status,kebutuhan:a.slots,kandidat:cands(a).map(c=>({nama:(S.members[c.mid]||{}).name,status:c.state}))}))})}
async function ask(q){
  if(!S.sample||S.chatBusy||!q.trim())return;
  S.chat=S.chat||[];S.chat.push({role:"user",content:q});const ans={role:"assistant",content:""};S.chat.push(ans);S.chatBusy=true;renderChat();
  const sys="Anda Asisten Roster WASH Palang Merah Indonesia. Bantu koordinator mengelola roster relawan/staf WASH, alert penugasan, dan seleksi. Jawab dalam bahasa Indonesia yang ringkas dan praktis. Gunakan teks biasa; untuk daftar pakai tanda '-' di awal baris, tanpa judul markdown atau tabel. Gunakan hanya data berikut; jika data tidak cukup, katakan apa yang kurang. Data roster saat ini (JSON):\n"+rosterContext();
  const hist=S.chat.slice(0,-1).map((m,i)=>({role:m.role,content:i===0?sys+"\n\nPertanyaan: "+m.content:m.content}));
  try{const r=await S.sample(hist,{cache:false,onText:({text})=>{ans.content=text;const b=$("#msgs");if(b&&b.lastElementChild){b.lastElementChild.textContent=text;b.scrollTop=b.scrollHeight}}});ans.content=r.text||ans.content}
  catch(e){ans.content=e&&e.code==="rate_limited"?"Terlalu banyak pertanyaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.":e&&e.code==="not_granted"?"Asisten tidak diizinkan di halaman ini.":"Asisten tidak bisa menjawab sekarang. Coba lagi nanti.";if(e&&e.code==="not_granted"){S.sample=null;header()}}
  S.chatBusy=false;renderChat()}

/* ---------- forms ---------- */
function memberFields(m,self){
  const stats=Object.entries(MSTAT).filter(([k])=>!self||k!=="ditugaskan"||m.status==="ditugaskan");
  return `<form class="form" id="mform" novalidate>
    <div class="field full"><label>Foto profil</label><div class="photo-in"><div id="mphoto">${av(m,"lg")}</div><div style="display:flex;flex-direction:column;gap:6px;min-width:0"><input type="file" id="mfile" accept="image/*"><span class="hint">Foto wajah tampak depan. Otomatis dipotong 4:5 untuk kartu ID.</span></div></div></div>
    <div class="field full"><label for="mname">Nama lengkap</label><input class="input" id="mname" value="${esc(m.name||"")}" autocomplete="name" required></div>
    <div class="field"><label for="mrole">Profil WASH</label><select class="input" id="mrole">${ROLES.map(r=>`<option ${m.role===r?"selected":""}>${esc(r)}</option>`).join("")}</select></div>
    <div class="field"><label for="mlevel">Kategori</label><select class="input" id="mlevel">${LEVELS.map(r=>`<option ${m.level===r?"selected":""}>${esc(r)}</option>`).join("")}</select></div>
    <div class="field"><label for="mphone">Nomor WhatsApp</label><input class="input" id="mphone" inputmode="tel" autocomplete="tel" placeholder="0812xxxxxxx" value="${esc(m.phone||"")}"></div>
    <div class="field"><label for="memail">Email aktif</label><input class="input" id="memail" type="email" autocomplete="email" placeholder="nama@contoh.id" value="${esc(self&&lockMail()?lockMail():m.email||"")}" ${self&&lockMail()?"readonly":""}>${self&&lockMail()?`<span class="hint">Email yang sudah diverifikasi dengan kode. Alert dikirim ke email ini.</span>`:""}</div>
    <div class="field"><label for="mprov">Provinsi asal</label><input class="input" id="mprov" list="provlist" value="${esc(m.province||"")}"><datalist id="provlist">${PROV.map(p=>`<option value="${p}">`).join("")}</datalist></div>
    <div class="field"><label for="mchap">Markas PMI</label><input class="input" id="mchap" placeholder="PMI Kota/Kabupaten…" value="${esc(m.chapter||"")}"></div>
    <div class="field full"><label for="mskills">Keahlian &amp; sertifikasi</label><input class="input" id="mskills" placeholder="mis. PHAST, operator WTU, uji kualitas air" value="${esc(m.skills||"")}"></div>
    <div class="field"><label for="mstat">Status ketersediaan</label><select class="input" id="mstat">${stats.map(([k,v])=>`<option value="${k}" ${m.status===k?"selected":""}>${v[0]}</option>`).join("")}</select></div>
    <div class="field"><label for="mlang">Bahasa</label><input class="input" id="mlang" placeholder="Indonesia, Inggris…" value="${esc(m.lang||"")}"></div>
    <p class="err field full" id="merr" hidden></p></form>`}
function memberForm(m,self){
  m=m||{status:"tersedia",role:ROLES[0],level:LEVELS[0]};
  openModal(self?"Ubah profil saya":m.id?"Ubah anggota":"Tambah anggota roster",memberFields(m,self),
    `${m.id&&!self?`<button class="btn ghost danger" data-act="del-member" data-m="${m.id}" style="margin-right:auto">Hapus anggota</button>`:""}<button class="btn" data-act="close">Batal</button><button class="btn primary" data-act="save-member" data-m="${self?"":m.id||""}" ${self?'data-self="1"':""}>Simpan</button>`);
  S.pendingPhoto=m.photo||"";
}
function resizePhoto(file){return new Promise((res,rej)=>{const r=new FileReader();r.onerror=rej;r.onload=()=>{const img=new Image();img.onerror=rej;img.onload=()=>{const W=360,H=450,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d"),s=Math.max(W/img.width,H/img.height),w=img.width*s,h=img.height*s;x.fillStyle="#fff";x.fillRect(0,0,W,H);x.drawImage(img,(W-w)/2,(H-h)/2,w,h);res(c.toDataURL("image/jpeg",.82))};img.src=r.result};r.readAsDataURL(file)})}
const lockMail=()=>(S.meProfile&&S.meProfile.email||"").toLowerCase();
async function saveMember(id,self){
  const v=k=>($("#"+k).value||"").trim();
  const m={name:v("mname"),role:v("mrole"),level:v("mlevel"),phone:v("mphone"),email:v("memail").toLowerCase(),province:v("mprov"),chapter:v("mchap"),skills:v("mskills"),status:v("mstat"),lang:v("mlang"),photo:S.pendingPhoto||""};
  const err=$("#merr"),fail=t=>{err.textContent=t;err.hidden=false};
  if(!m.name)return fail("Isi nama lengkap.");
  if(self&&lockMail())m.email=lockMail();
  if(self&&!m.email)return fail("Isi email aktif Anda agar alert penugasan bisa dikirim.");
  if(!m.phone&&!m.email)return fail("Isi minimal satu kontak: nomor WhatsApp atau email, agar alert bisa dikirim.");
  if(m.email&&!/^\S+@\S+\.\S+$/.test(m.email))return fail("Format email belum benar.");
  if(m.phone&&waNum(m.phone).length<10)return fail("Nomor WhatsApp terlalu pendek.");
  const reg=$("#mconsent");if(reg&&!reg.checked)return fail("Centang persetujuan penggunaan data untuk melanjutkan.");
  if(self)id=S.uid;
  try{m.photo=await uploadPhoto(m.photo)}catch(e){fail(e.message);return}
  const old=id&&S.members[id];const nid=id||newId("m");
  const doc=Object.assign({},old||{},m,{updatedAt:Date.now()});if(!old)doc.createdAt=Date.now();
  if(self){doc.account=true;if(!old)doc.source="daftar"}else if(!old)doc.source="manual";
  if(!$("#modal").hidden)closeModal();
  try{await write("set","members",nid,doc);toast(self?(old?"Profil Anda diperbarui":"Pendaftaran berhasil. Selamat bergabung di Roster WASH."):old?"Data anggota diperbarui":"Anggota ditambahkan ke roster")}catch(e){if(self&&!old){delete S.members[nid];S.view="";render()}}
}

/* ---------- self-registration & volunteer portal ---------- */
function vRegister(){
  const p=S.meProfile||{};const m={status:"tersedia",role:ROLES[1],level:LEVELS[0],name:p.name||"",email:p.email||""};
  S.pendingPhoto=S.pendingPhoto||"";
  return `<div class="regwrap"><section class="hero" style="padding-bottom:30px"><p class="eyebrow">Pendaftaran relawan & staf</p><h1 style="font-size:clamp(1.8rem,3.6vw,2.6rem)">Gabung Roster WASH PMI</h1><p class="lead">Isi profil sekali. Koordinator akan mengirim alert penugasan ke WhatsApp dan email Anda saat ada operasi tanggap darurat yang sesuai.</p>
    <ol class="steps" style="margin-top:22px"><li><span><b>Isi profil &amp; foto</b>Foto dipakai untuk kartu ID penugasan.</span></li><li><span><b>Terima alert</b>Lewat WhatsApp, email, dan portal ini.</span></li><li><span><b>Jawab bersedia atau tidak</b>Atau ajukan diri pada alert yang terbuka.</span></li><li><span><b>Lihat kartu ID</b>Kartu muncul di portal begitu Anda terpilih.</span></li></ol></section>
  <section class="panel"><h2>Data diri</h2>${memberFields(m,true).replace('<p class="err field full" id="merr" hidden></p>',`<label class="consent" style="grid-column:1/-1"><input type="checkbox" id="mconsent"><span>Saya setuju data ini dipakai PMI untuk keperluan roster dan penugasan WASH, dan hanya dapat dilihat oleh koordinator roster.</span></label><p class="err field full" id="merr" hidden></p>`)}
    <div class="row" style="justify-content:flex-end"><button class="btn primary" data-act="save-member" data-self="1">Daftar ke roster</button></div></section></div>`}
function vPortal(){
  const m=Object.assign({id:S.uid},S.members[S.uid]),t=today();
  const mine=[],open=[];alerts().forEach(a=>{const c=cands(a).find(c=>c.mid===S.uid);if(c)mine.push({a,c});else if(a.status==="terbuka"&&a.deadline>=t)open.push(a)});
  open.sort((x,y)=>(y.role===m.role)-(x.role===m.role));
  const cards=mine.filter(x=>x.c.state==="terpilih"),inv=mine.filter(x=>x.c.state!=="terpilih"&&x.a.status==="terbuka");
  const meta=a=>`<div class="meta"><span class="mono">${esc(a.code)}</span><span>${I.pin}${esc(a.location)}</span><span>${I.cal}${fmt(a.start)}</span><span>${I.clock}${a.dur} hari</span><span>Konfirmasi s/d ${fmt(a.deadline)}</span></div>`;
  const resp=(a,c)=>{const s=c.state;const btn=(v,l,cls)=>`<button class="btn sm ${cls||""}" data-act="respond" data-v="${v}" data-a="${a.id}">${l}</button>`;
    if(s==="diundang")return btn("bersedia","Saya bersedia","water")+btn("menolak","Tidak bisa");
    if(s==="menolak")return `<span class="pill off">Anda menolak</span>`+btn("bersedia","Ubah: bersedia");
    return `<span class="pill ok">Menunggu keputusan koordinator</span>`+btn("menolak","Batalkan","ghost danger")};
  return `<section class="hero" style="padding-bottom:26px"><div class="phead">${av(m,"lg")}<div><p class="eyebrow">Portal relawan · Roster WASH</p><h1 style="font-size:clamp(1.7rem,3.4vw,2.5rem)">${esc(m.name)}</h1><p class="lead" style="margin:0">${esc(m.role)} · ${esc(m.level||"")}${m.province?" · "+esc(m.province):""}</p>
    <div class="row" style="gap:8px">${pill(MSTAT,m.status)}<button class="btn sm" data-act="edit-self">Ubah profil</button>${m.status==="tersedia"?`<button class="btn sm" data-act="avail" data-v="tidak">Tandai tidak tersedia</button>`:m.status==="tidak"?`<button class="btn sm" data-act="avail" data-v="tersedia">Tandai tersedia</button>`:""}</div></div></div></section>
  ${cards.length?`<section style="display:flex;flex-direction:column;gap:12px"><h2>Kartu penugasan saya</h2><div class="cards">${cards.map(({a,c})=>`<article class="tile"><div class="band"><span>${phase(a)==="selesai"?"Selesai":phase(a)==="aktif"?"Sedang bertugas":"Akan berangkat"}</span><span class="mono">${esc(c.cardNo)}</span></div><div class="body"><b>${esc(a.title)}</b><dl class="kv" style="margin:0"><dt>Posisi</dt><dd>${esc(a.role)}</dd><dt>Lokasi</dt><dd>${esc(a.location)}</dd><dt>Periode</dt><dd>${fmt(a.start)} – ${fmt(endOf(a))}</dd></dl><button class="btn sm primary" style="margin-top:auto" data-act="card" data-a="${a.id}" data-m="${S.uid}">${I.id}Lihat kartu ID</button></div></article>`).join("")}</div></section>`:""}
  <section class="panel"><div class="section-head"><div><h2>Undangan &amp; pengajuan saya</h2><p>Jawab sebelum batas konfirmasi. Koordinator melihat jawaban Anda langsung.</p></div></div>
    ${inv.length?`<div class="alerts">${inv.map(({a,c})=>`<div class="pcard"><div style="min-width:0;display:flex;flex-direction:column;gap:6px"><div class="row" style="gap:8px">${pill(CSTAT,c.state)}<span class="pill water">${esc(a.emergency||"")}</span></div><h3>${esc(a.role)} — ${esc(a.title)}</h3>${meta(a)}${a.desc?`<p class="muted" style="font-size:.88rem;white-space:pre-line">${esc(a.desc)}</p>`:""}</div><div class="acts">${resp(a,c)}</div></div>`).join("")}</div>`:`<p class="muted">Belum ada undangan. Anda akan dihubungi lewat WhatsApp atau email saat ada penugasan yang sesuai.</p>`}</section>
  <section class="panel"><div class="section-head"><div><h2>Alert terbuka</h2><p>Ajukan diri bila Anda bisa berangkat. Koordinator tetap yang memutuskan.</p></div></div>
    ${open.length?`<div class="alerts">${open.map(a=>`<div class="pcard ${a.role===m.role?"match":""}"><div style="min-width:0;display:flex;flex-direction:column;gap:6px"><div class="row" style="gap:8px">${a.role===m.role?'<span class="pill red">Sesuai profil Anda</span>':""}<span class="pill water">${esc(a.emergency||"")}</span></div><h3>${esc(a.role)} — ${esc(a.title)}</h3>${meta(a)}</div><div class="acts"><button class="btn sm primary" data-act="respond" data-v="bersedia" data-a="${a.id}" ${m.status==="ditugaskan"?"disabled":""}>Ajukan diri</button></div></div>`).join("")}</div>`:`<p class="muted">Tidak ada alert terbuka saat ini.</p>`}</section>`;
}
function vRegPanel(){
  const acc=members().filter(m=>m.account),wk=acc.filter(m=>(m.createdAt||0)>Date.now()-7*864e5).length;
  return `<section class="panel"><div class="section-head"><div><h2>Pendaftaran mandiri</h2><p>Relawan dan staf mendaftar sendiri lewat halaman ini dan langsung masuk roster.</p></div><div class="row"><button class="btn sm" data-act="import">${I.up}Impor Excel/CSV</button><a class="btn sm" href="#roster">Lihat roster</a></div></div>
    <div class="row" style="gap:28px"><div><b class="mono" style="font-size:1.6rem">${acc.length}</b><div class="muted" style="font-size:.8rem">mendaftar sendiri</div></div><div><b class="mono" style="font-size:1.6rem">${wk}</b><div class="muted" style="font-size:.8rem">dalam 7 hari terakhir</div></div></div>
    <p class="note">Cara mengundang pendaftar: bagikan halaman ini lewat menu <b>Share</b> dengan akses yang boleh mengisi (bukan hanya melihat). Saat membuka tautan dan masuk ke akun claude.ai, mereka melihat formulir pendaftaran dan portal relawan, bukan dasbor admin. Mereka hanya bisa melihat data dirinya sendiri.</p>${dupNotice()}</section>`}

/* ---------- duplicates between imported/manual rows and self-registered accounts ---------- */
function dupPairs(){const acc=members().filter(m=>m.account),oth=members().filter(m=>!m.account);const out=[];
  acc.forEach(a=>{const o=oth.find(o=>(a.email&&o.email&&a.email.toLowerCase()===o.email.toLowerCase())||(waNum(a.phone)&&waNum(a.phone)===waNum(o.phone)));if(o)out.push([a,o])});return out}
function dupNotice(){const d=dupPairs();if(!d.length)return"";return `<div class="note spread"><span><b>${d.length} pendaftar</b> punya email atau nomor WA yang sama dengan data impor/manual: ${d.slice(0,3).map(([a])=>esc(a.name)).join(", ")}${d.length>3?"…":""}. Gabungkan agar tidak dobel.</span><button class="btn sm" data-act="merge">Gabungkan</button></div>`}
async function mergeAll(){
  const pairs=dupPairs();
  for(const [a,o] of pairs){const fill={};["name","phone","email","role","level","province","chapter","skills","lang","photo"].forEach(k=>{if(!a[k]&&o[k])fill[k]=o[k]});if(o.status==="ditugaskan")fill.status="ditugaskan";
    try{if(Object.keys(fill).length)await write("update","members",a.id,fill);
      for(const al of alerts()){if(al.cand&&al.cand[o.id]){const doc=JSON.parse(JSON.stringify(S.alerts[al.id]));doc.cand[a.id]=Object.assign({},doc.cand[o.id],doc.cand[a.id]||{});delete doc.cand[o.id];await write("set","alerts",al.id,doc)}}
      await write("delete","members",o.id)}catch(e){}}
  toast(pairs.length+" data digabungkan");
}

/* ---------- import from Excel / CSV / Google Sheets ---------- */
const FIELDS=[["name","Nama lengkap",["nama","nama lengkap","name","full name","nama relawan","nama anggota"]],["phone","Nomor WhatsApp",["wa","whatsapp","no wa","nomor wa","nomor whatsapp","no hp","hp","nomor hp","no telp","telepon","telp","phone","handphone","no handphone"]],["email","Email",["email","e mail","surel","alamat email"]],["role","Profil WASH",["profil","profil wash","profile","posisi","role","spesialisasi","keahlian utama","bidang"]],["level","Kategori",["kategori","level","jenis anggota","category","jenis"]],["province","Provinsi",["provinsi","province","prov"]],["chapter","Markas PMI",["markas","markas pmi","cabang","chapter","unit","asal pmi"]],["skills","Keahlian",["keahlian","sertifikasi","skills","kompetensi","keterampilan","pelatihan"]],["lang","Bahasa",["bahasa","language"]],["status","Status",["status","ketersediaan","availability"]]];
const normH=s=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
function autoMap(hs){const map={},used=new Set();
  FIELDS.forEach(([k,,syn])=>{const i=hs.findIndex((h,i)=>!used.has(i)&&syn.includes(normH(h)));if(i>=0){map[k]=i;used.add(i)}});
  FIELDS.forEach(([k,,syn])=>{if(map[k]!=null)return;let best=-1,bl=0;hs.forEach((h,i)=>{if(used.has(i))return;const n=normH(h);syn.forEach(s=>{if(s.length>2&&n.includes(s)&&s.length>bl){best=i;bl=s.length}})});if(best>=0){map[k]=best;used.add(best)}});return map}
const RK=[[0,["koordinator","coordinator","koord"]],[6,["pengolahan","wtu","ipa","treatment","operator"]],[4,["kualitas","quality","laborat"]],[5,["vektor","vector","fogging"]],[3,["promosi","hygiene","higiene","kebersihan","phast","promkes"]],[2,["sanitasi","sanitation","limbah","jamban","sampah"]],[1,["air bersih","suplai","supply","water","distribusi","air"]]];
function mapRole(s){const n=String(s||"").toLowerCase().trim();if(!n)return"";const ex=ROLES.find(r=>r.toLowerCase()===n);if(ex)return ex;for(const [i,ks] of RK)if(ks.some(k=>n.includes(k)))return ROLES[i];return""}
function mapLevel(s){const n=String(s||"").toLowerCase();if(!n)return"";if(/leader|\btl\b|ketua/.test(n))return LEVELS[2];if(/staf|staff|pegawai/.test(n))return LEVELS[1];return LEVELS[0]}
function mapStatus(s){const n=String(s||"").toLowerCase();if(!n)return"";if(/tidak|cuti|unavail|non/.test(n))return"tidak";if(/tugas|deploy/.test(n))return"ditugaskan";return"tersedia"}
function splitCSV(l,d){const out=[];let cur="",q=false;for(let i=0;i<l.length;i++){const ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"')q=true;else if(ch===d){out.push(cur);cur=""}else cur+=ch}out.push(cur);return out.map(s=>s.trim())}
function parseDelim(t){const lines=t.replace(/\r/g,"").split("\n").filter(l=>l.trim());if(!lines.length)return[];const h=lines[0];const d=h.includes("\t")?"\t":(h.split(";").length>h.split(",").length?";":",");return lines.map(l=>splitCSV(l,d))}
async function readSheet(f){const n=f.name.toLowerCase();
  if(window.XLSX){const wb=XLSX.read(await f.arrayBuffer(),{type:"array"});const ws=wb.Sheets[wb.SheetNames[0]];return XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:""})}
  if(/\.(csv|tsv|txt)$/.test(n))return parseDelim(await f.text());
  throw new Error("noxlsx")}
function loadGrid(grid,src){
  grid=(grid||[]).map(r=>r.map(c=>String(c==null?"":c).trim()));
  const hi=grid.findIndex(r=>r.filter(Boolean).length>=2);
  if(hi<0||grid.length<hi+2){toast("Tidak ada baris data. Pastikan baris pertama berisi judul kolom.");return}
  const headers=grid[hi],rows=grid.slice(hi+1).filter(r=>r.some(Boolean));
  S.imp={src,headers,rows,map:autoMap(headers),defRole:ROLES[1],dup:"update"};renderImport();
}
function impRecords(){
  const {rows,map,defRole,dup}=S.imp,byE={},byP={};
  members().forEach(m=>{if(m.email)byE[m.email.toLowerCase()]=m.id;const p=waNum(m.phone);if(p)byP[p]=m.id});
  const seen=new Set();
  return rows.map((r,i)=>{const g=k=>map[k]!=null&&map[k]!==""?String(r[map[k]]||"").trim():"";
    const rawRole=g("role");
    const rec={name:g("name"),phone:g("phone"),email:g("email").toLowerCase(),role:mapRole(rawRole),level:mapLevel(g("level")),province:g("province"),chapter:g("chapter"),skills:g("skills"),lang:g("lang"),status:mapStatus(g("status")),row:i+2,st:"baru",note:""};
    if(!rec.name){rec.st="lewati";rec.note="Nama kosong"}
    else if(!rec.phone&&!rec.email){rec.st="lewati";rec.note="Tidak ada WA atau email"}
    else if(rec.email&&!/^\S+@\S+\.\S+$/.test(rec.email)){rec.st="lewati";rec.note="Email tidak valid"}
    if(rec.st!=="lewati"){const key=rec.email||waNum(rec.phone);if(seen.has(key)){rec.st="lewati";rec.note="Duplikat di file"}seen.add(key)}
    if(rec.st!=="lewati"){const ex=(rec.email&&byE[rec.email])||(waNum(rec.phone)&&byP[waNum(rec.phone)]);if(ex){rec.existing=ex;rec.st=dup==="update"?"perbarui":"lewati";rec.note=dup==="update"?"Sudah ada · diperbarui":"Sudah ada di roster"}}
    if(rec.st!=="lewati"&&!rec.role){rec.note=(rec.note?rec.note+" · ":"")+(rawRole?`Profil "${rawRole}" tidak dikenali → ${defRole}`:`Profil kosong → ${defRole}`)}
    return rec})}
function impStep1(){
  return `<div class="drop" id="drop"><span style="width:28px;color:var(--water);display:inline-flex">${I.sheet}</span><b>Pilih file roster</b><span class="muted" style="font-size:.85rem">Excel (.xlsx, .xls), OpenDocument (.ods), atau CSV. Hanya sheet pertama yang dibaca. Bisa juga tarik-lepas file ke sini.</span><input type="file" id="impfile" accept=".xlsx,.xls,.ods,.csv,.tsv,.txt"></div>
  <div class="or">atau tempel dari Google Sheets / Excel</div>
  <div class="field"><label for="imppaste">Salin seluruh tabel termasuk baris judul, lalu tempel di sini</label><textarea class="input" id="imppaste" style="min-height:110px;font-family:var(--f-mono);font-size:.8rem" placeholder="Nama&#9;Nomor WhatsApp&#9;Email&#9;Profil WASH&#9;Provinsi"></textarea><div class="row" style="justify-content:flex-end"><button class="btn sm" data-act="imppaste">Gunakan data tempelan</button></div></div>
  <div class="note" style="display:flex;flex-direction:column;gap:8px"><span>Kolom yang dikenali otomatis (judul tidak harus persis sama, bisa disesuaikan di langkah berikutnya):</span><div class="cols">${FIELDS.map(f=>`<code>${f[1]}</code>`).join("")}</div><span>Wajib: nama, dan nomor WhatsApp atau email. Profil WASH dicocokkan dengan kata kunci, misalnya "PHAST" menjadi Promosi Kebersihan.</span>${S.downloads&&window.XLSX?`<div><button class="btn sm" data-act="template">${I.dl}Unduh template Excel</button></div>`:""}</div>`}
function impPreviewHTML(){
  const recs=impRecords(),n=k=>recs.filter(r=>r.st===k).length,{headers,map}=S.imp;
  return `<div class="sumrow"><span class="pill ok">${n("baru")} baru</span><span class="pill water">${n("perbarui")} diperbarui</span><span class="pill off">${n("lewati")} dilewati</span><span class="muted" style="font-size:.82rem;align-self:center">dari ${recs.length} baris · ${esc(S.imp.src)}</span></div>
  <div class="tablewrap imp" style="margin:0;padding:0;max-height:360px;overflow:auto;border:1px solid var(--line);border-radius:12px"><table><thead><tr><th>Baris</th><th>Nama</th><th>WhatsApp</th><th>Email</th><th>Profil</th><th>Provinsi</th><th>Hasil</th></tr></thead><tbody>${recs.slice(0,200).map(r=>`<tr class="${r.st==="lewati"?"skip":""}"><td class="mono">${r.row}</td><td>${esc(r.name)||"—"}</td><td class="mono">${esc(r.phone)}</td><td>${esc(r.email)}</td><td>${esc(r.role||S.imp.defRole)}</td><td>${esc(r.province)}</td><td>${pill({baru:["Baru","ok"],perbarui:["Perbarui","water"],lewati:["Lewati","off"]},r.st)}${r.note?`<div class="nt">${esc(r.note)}</div>`:""}</td></tr>`).join("")}</tbody></table></div>${recs.length>200?`<p class="muted" style="font-size:.8rem">Menampilkan 200 baris pertama dari ${recs.length}.</p>`:""}`}
function renderImport(){
  if(!S.imp){openModal("Impor data roster",impStep1(),`<button class="btn" data-act="close">Tutup</button>`,true);return}
  if(S.imp.running!=null){openModal("Mengimpor roster…",`<div class="bigprog"><i id="impbar" style="width:0%"></i></div><p class="muted" id="imptxt">Menyiapkan…</p>`,"",true);return}
  const {headers,map}=S.imp,recs=impRecords(),go=recs.filter(r=>r.st!=="lewati").length;
  openModal("Periksa sebelum impor",`<div><h3 style="margin-bottom:8px">Pencocokan kolom</h3><div class="mapgrid">${FIELDS.map(([k,l])=>`<div class="field"><label for="map-${k}">${l}</label><select class="input" id="map-${k}" data-map="${k}"><option value="">— tidak ada —</option>${headers.map((h,i)=>`<option value="${i}" ${map[k]===i?"selected":""}>${esc(h||"Kolom "+(i+1))}</option>`).join("")}</select></div>`).join("")}</div></div>
    <div class="form"><div class="field"><label for="impdef">Profil bila kosong atau tidak dikenali</label><select class="input" id="impdef">${ROLES.map(r=>`<option ${S.imp.defRole===r?"selected":""}>${esc(r)}</option>`).join("")}</select></div>
    <div class="field"><label for="impdup">Jika email/WA sudah ada di roster</label><select class="input" id="impdup"><option value="update" ${S.imp.dup==="update"?"selected":""}>Perbarui data yang ada</option><option value="skip" ${S.imp.dup==="skip"?"selected":""}>Lewati, jangan ubah</option></select></div></div>
    <div id="imppreview">${impPreviewHTML()}</div>`,
    `<button class="btn" data-act="impreset" style="margin-right:auto">Ganti file</button><button class="btn" data-act="close">Batal</button><button class="btn primary" data-act="imprun" id="imprun" ${go?"":"disabled"}>Impor ${go} anggota</button>`,true);
}
function refreshImp(){const p=$("#imppreview");if(p)p.innerHTML=impPreviewHTML();const go=impRecords().filter(r=>r.st!=="lewati").length,b=$("#imprun");if(b){b.textContent=`Impor ${go} anggota`;b.disabled=!go}}
async function runImport(){
  const recs=impRecords().filter(r=>r.st!=="lewati"),def=S.imp.defRole;let done=0,ok=0,fail=0,quota=false;
  S.imp.running=0;renderImport();S.suspend=true;
  const keys=["name","phone","email","role","level","province","chapter","skills","lang","status"];
  const one=async r=>{let kind,id,data;
    if(r.existing){id=r.existing;kind="update";data={updatedAt:Date.now()};keys.forEach(k=>{if(r[k])data[k]=r[k]});if((S.members[id]||{}).status==="ditugaskan")delete data.status}
    else{id=newId("m");kind="set";data={name:r.name,phone:r.phone,email:r.email,role:r.role||def,level:r.level||LEVELS[0],province:r.province,chapter:r.chapter,skills:r.skills,lang:r.lang,status:r.status||"tersedia",photo:"",source:"impor",createdAt:Date.now()}}
    for(let t=0;t<3;t++){try{await write(kind,"members",id,data);ok++;return}catch(e){if(e&&e.code==="quota_exceeded"){quota=true;break}if(!e||!(e.code==="resource_exhausted"||e.code==="unavailable"))break;await new Promise(z=>setTimeout(z,1200*(t+1)))}}
    fail++};
  let idx=0;const worker=async()=>{while(idx<recs.length&&!quota){const r=recs[idx++];await one(r);done++;const bar=$("#impbar"),tx=$("#imptxt");if(bar)bar.style.width=(done/recs.length*100)+"%";if(tx)tx.textContent=`${done} dari ${recs.length} diproses`}};
  await Promise.all([worker(),worker(),worker()]);
  S.suspend=false;S.imp=null;render();
  openModal("Impor selesai",`<p><b>${ok}</b> anggota tersimpan ke roster.${fail?` <b>${fail}</b> baris gagal disimpan.`:""}</p>${quota?`<p class="err">Penyimpanan roster penuh. Hapus data yang tidak dipakai lalu impor sisanya.</p>`:fail?`<p class="muted">Baris yang gagal bisa diimpor ulang. Data yang sudah masuk akan dikenali dan diperbarui, tidak dobel.</p>`:""}`,`<a class="btn primary" href="#roster" data-act="close">Lihat roster</a>`);
}
async function saveXlsx(name,sheets){
  if(!S.downloads||!window.XLSX)return toast("Unduhan tidak tersedia di tampilan ini.");
  const wb=XLSX.utils.book_new();sheets.forEach(([n,rows])=>XLSX.utils.book_append_sheet(wb,Array.isArray(rows[0])?XLSX.utils.aoa_to_sheet(rows):XLSX.utils.json_to_sheet(rows),n));
  const out=XLSX.write(wb,{bookType:"xlsx",type:"array"});
  try{await S.downloads.save({filename:name,data:new Uint8Array(out)});toast("File disimpan")}catch(e){if(e&&e.code!=="declined")toast("File tidak bisa diunduh di tampilan ini.")}}
function exportRoster(){saveXlsx(`roster-wash-${today()}.xlsx`,[["Roster",members().sort((a,b)=>a.name.localeCompare(b.name)).map(m=>({"Nama lengkap":m.name,"Nomor WhatsApp":m.phone||"","Email":m.email||"","Profil WASH":m.role,"Kategori":m.level||"","Provinsi":m.province||"","Markas PMI":m.chapter||"","Keahlian":m.skills||"","Bahasa":m.lang||"","Status":(MSTAT[m.status]||[m.status])[0],"Sumber":SRC[srcOf(m)][0]}))]])}
function templateXlsx(){saveXlsx("template-roster-wash.xlsx",[["Roster",[FIELDS.map(f=>f[1]),["Nama Relawan Contoh","081234567890","relawan@contoh.id","Promosi Kebersihan","Relawan (KSR/TSR)","Jawa Tengah","PMI Kota Semarang","PHAST, CHAST","Indonesia","Tersedia"]]],["Pilihan",[["Profil WASH","Kategori","Status"],...ROLES.map((r,i)=>[r,LEVELS[i]||"",["Tersedia","Tidak tersedia"][i]||""])]]])}

function alertForm(a){
  const t=today();a=a||{role:ROLES[0],emergency:EMERG[0],start:addDays(t,3),dur:14,deadline:addDays(t,1),slots:1};
  openModal(a.id?"Ubah alert":"Buat alert penugasan",`<form class="form" id="aform" novalidate>
    <div class="field full"><label for="atitle">Nama operasi</label><input class="input" id="atitle" placeholder="mis. Tanggap Darurat Banjir Demak" value="${esc(a.title||"")}"></div>
    <div class="field"><label for="aemerg">Jenis bencana</label><select class="input" id="aemerg">${EMERG.map(r=>`<option ${a.emergency===r?"selected":""}>${r}</option>`).join("")}</select></div>
    <div class="field"><label for="arole">Posisi yang dibutuhkan</label><select class="input" id="arole">${ROLES.map(r=>`<option ${a.role===r?"selected":""}>${esc(r)}</option>`).join("")}</select></div>
    <div class="field full"><label for="aloc">Lokasi penugasan</label><input class="input" id="aloc" placeholder="Kecamatan, Kabupaten, Provinsi" value="${esc(a.location||"")}"></div>
    <div class="field"><label for="astart">Tanggal mulai</label><input class="input" id="astart" type="date" value="${esc(a.start)}"></div>
    <div class="field"><label for="adur">Durasi (hari)</label><input class="input" id="adur" type="number" min="1" max="365" value="${esc(a.dur)}"></div>
    <div class="field"><label for="adead">Batas konfirmasi</label><input class="input" id="adead" type="date" value="${esc(a.deadline)}"></div>
    <div class="field"><label for="aslots">Jumlah personel</label><input class="input" id="aslots" type="number" min="1" max="50" value="${esc(a.slots||1)}"></div>
    <div class="field full"><label for="adesc">Ringkasan tugas (ToR)</label><textarea class="input" id="adesc" placeholder="Tugas utama, persyaratan, logistik yang disediakan…">${esc(a.desc||"")}</textarea><span class="hint">Ringkasan ini ikut dalam pesan email dan WhatsApp.</span></div>
    <p class="err field full" id="aerr" hidden></p></form>`,
    `<button class="btn" data-act="close">Batal</button><button class="btn primary" data-act="save-alert" data-a="${a.id||""}">${a.id?"Simpan":"Terbitkan alert"}</button>`);
}
async function saveAlert(id){
  const v=k=>($("#"+k).value||"").trim();
  const f={title:v("atitle"),emergency:v("aemerg"),role:v("arole"),location:v("aloc"),start:v("astart"),dur:Math.max(1,parseInt(v("adur"))||1),deadline:v("adead"),slots:Math.max(1,parseInt(v("aslots"))||1),desc:v("adesc")};
  const err=$("#aerr");
  if(!f.title||!f.location||!f.start||!f.deadline){err.textContent="Isi nama operasi, lokasi, tanggal mulai, dan batas konfirmasi.";err.hidden=false;return}
  if(f.deadline>f.start){err.textContent="Batas konfirmasi harus sebelum atau sama dengan tanggal mulai.";err.hidden=false;return}
  closeModal();
  if(id){await write("update","alerts",id,f).catch(()=>{});toast("Alert diperbarui");return}
  const yr=f.start.slice(0,4),n=alerts().filter(a=>(a.code||"").includes("-"+yr+"-")).length+1;
  const nid=newId();
  const doc=Object.assign(f,{code:`WASH-${yr}-${String(n).padStart(3,"0")}`,status:"terbuka",cand:{},createdAt:Date.now()});
  try{await write("set","alerts",nid,doc);S.inv.sel.clear();location.hash="alert-"+nid;toast("Alert terbit. Sekarang undang anggota roster.")}catch(e){}
}

function memberDetail(id){S.selMember=id;if(tabOf(S.route)!=="roster")location.hash="roster";else render();toInsp()}
function toInsp(){if(matchMedia("(max-width:760px)").matches)setTimeout(()=>{const r=$("#rp");if(r)r.scrollIntoView({block:"start"})},60)}

/* ---------- ID card (canvas) ---------- */
function rr(x,X,Y,W,H,R){x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath()}
function fit(x,t,w){t=String(t||"");if(x.measureText(t).width<=w)return t;while(t.length>1&&x.measureText(t+"…").width>w)t=t.slice(0,-1);return t+"…"}
function wrap2(x,t,w){const words=String(t||"").split(/\s+/);let l1="";let i=0;for(;i<words.length;i++){const tr=(l1?l1+" ":"")+words[i];if(x.measureText(tr).width>w&&l1)break;l1=tr}const rest=words.slice(i).join(" ");return rest?[l1,fit(x,rest,w)]:[l1]}
const loadImg=src=>new Promise(r=>{const i=new Image();if(!/^data:/.test(src))i.crossOrigin="anonymous";i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});
async function drawCard(a,m,c){
  try{await Promise.all(["800 40px Archivo","700 20px 'Public Sans'","600 20px 'IBM Plex Mono'"].map(f=>document.fonts.load(f)))}catch(e){}
  const W=640,H=1010,cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
  const RED="#2563B0",INK="#0F2A4A",MUT="#52708F",WATER="#1D4F91";
  x.save();rr(x,0,0,W,H,34);x.clip();
  x.fillStyle="#FFFFFF";x.fillRect(0,0,W,H);
  x.fillStyle=RED;x.fillRect(0,72,W,190);
  x.strokeStyle="rgba(255,255,255,.16)";x.lineWidth=3;for(let k=0;k<3;k++){x.beginPath();for(let px=0;px<=W;px+=8){const py=190+k*24+Math.sin(px/52+k)*10;px?x.lineTo(px,py):x.moveTo(px,py)}x.stroke()}
  {const lg=await Promise.all(LOGO_SRC.map(loadImg));const hh=46,gap=26;const ws=lg.map(i=>i?i.width*hh/i.height:0);let lx=(W-ws.reduce((s,w)=>s+w,0)-gap*(lg.length-1))/2;lg.forEach((i,k)=>{if(i)x.drawImage(i,lx,13,ws[k],hh);lx+=ws[k]+gap})}
  x.fillStyle="#fff";
  x.font="700 17px 'Public Sans',sans-serif";x.fillText("ROSTER WASH · PMI",40,104);
  x.font="800 34px Archivo,sans-serif";x.fillText("KARTU PENUGASAN",40,140);
  x.font="600 17px 'IBM Plex Mono',monospace";x.textAlign="right";x.fillStyle="rgba(255,255,255,.85)";x.fillText(a.code||"",W-40,104);x.textAlign="left";
  const PW=220,PH=272,PX=(W-PW)/2,PY=168;
  x.fillStyle="#fff";rr(x,PX-8,PY-8,PW+16,PH+16,26);x.fill();
  x.save();rr(x,PX,PY,PW,PH,20);x.clip();
  const img=m.photo?await loadImg(m.photo):null;
  if(img){const s=Math.max(PW/img.width,PH/img.height);x.drawImage(img,PX+(PW-img.width*s)/2,PY+(PH-img.height*s)/2,img.width*s,img.height*s)}
  else{x.fillStyle="#E2EEFC";x.fillRect(PX,PY,PW,PH);x.fillStyle=WATER;x.font="800 96px Archivo,sans-serif";x.textAlign="center";x.fillText(initials(m.name),W/2,PY+PH/2+34);x.textAlign="left"}
  x.restore();
  x.textAlign="center";x.fillStyle=INK;x.font="800 38px Archivo,sans-serif";
  const nl=wrap2(x,m.name,W-80);let y=PY+PH+58;nl.forEach(l=>{x.fillText(l,W/2,y);y+=42});
  x.font="700 21px 'Public Sans',sans-serif";const rl=a.role.toUpperCase(),rw=x.measureText(rl).width+44;
  x.fillStyle="#E2EEFC";rr(x,(W-rw)/2,y-18,rw,42,21);x.fill();x.fillStyle=WATER;x.fillText(rl,W/2,y+10);x.textAlign="left";
  y+=58;
  const rows=[["LOKASI",a.location],["OPERASI",a.title],["PERIODE",fmt(a.start)+" – "+fmt(endOf(a))],["DURASI",a.dur+" hari"]];
  x.strokeStyle="#D4E4F6";x.lineWidth=2;
  rows.forEach(([k,v],i)=>{const ry=y+i*58;x.fillStyle=MUT;x.font="700 15px 'Public Sans',sans-serif";x.fillText(k,48,ry+22);x.fillStyle=INK;x.font="600 22px 'Public Sans',sans-serif";x.fillText(fit(x,v,W-48-180),180,ry+23);if(i)x.beginPath(),x.moveTo(48,ry-8),x.lineTo(W-48,ry-8),x.stroke()});
  const fy=H-150;x.fillStyle="#EEF5FC";x.fillRect(0,fy,W,150);
  let qr=null;try{const qc=document.createElement("canvas");await QRCode.toCanvas(qc,`${c.cardNo}|${m.name}|${a.role}|${a.location}|${a.start}/${endOf(a)}`,{width:220,margin:1,errorCorrectionLevel:"M"});qr=qc}catch(e){}
  if(qr){x.fillStyle="#fff";rr(x,40,fy+18,114,114,10);x.fill();x.drawImage(qr,47,fy+25,100,100)}
  const tx=qr?178:48;x.fillStyle=MUT;x.font="700 14px 'Public Sans',sans-serif";x.fillText("NO. KARTU",tx,fy+44);
  x.fillStyle=INK;x.font="600 26px 'IBM Plex Mono',monospace";x.fillText(c.cardNo||"",tx,fy+76);
  x.fillStyle=MUT;x.font="600 16px 'Public Sans',sans-serif";x.fillText("Berlaku s/d "+fmtLong(endOf(a)),tx,fy+108);
  x.fillStyle=RED;x.fillRect(0,H-12,W,12);
  x.restore();
  return cv;
}
async function showCard(aid,mid){
  const a=Object.assign({id:aid},S.alerts[aid]),m=Object.assign({id:mid},S.members[mid]),c=(a.cand||{})[mid];if(!c||!S.members[mid])return;
  const txt=selectText(a,m,c),subj="Penugasan terkonfirmasi: "+a.code+" "+a.role;
  openModal("Kartu ID penugasan",`<div class="cardview"><div id="cardimg"><div class="skeleton" style="width:300px;height:473px"></div></div>
    <div style="display:flex;flex-direction:column;gap:14px;min-width:0"><div><p class="eyebrow">No. kartu</p><p class="mono" style="font-size:1.2rem;font-weight:600">${esc(c.cardNo)}</p></div>
    <div><h3>${esc(m.name)}</h3><p class="muted">${esc(a.role)} · ${esc(a.location)}<br>${fmtLong(a.start)} – ${fmtLong(endOf(a))} (${a.dur} hari)</p></div>
    <div style="display:flex;flex-direction:column;gap:8px"><button class="btn primary" data-act="dlcard" data-a="${aid}" data-m="${mid}" id="dlbtn">${I.dl}Unduh kartu (PNG)</button>
    <div class="row" style="gap:8px" ${memberView()?"hidden":""}>${m.phone?`<a class="btn wa" target="_blank" rel="noopener" href="${esc(waHref(m.phone,txt))}" data-act="sent" data-ch="wa" data-a="${aid}" data-m="${mid}">${I.wa}Kirim via WhatsApp</a>`:""}${m.email?`<a class="btn" target="_blank" rel="noopener" href="${esc(mailHref(m.email,subj,txt))}" data-act="sent" data-ch="email" data-a="${aid}" data-m="${mid}">${I.mail}Kirim via email</a>`:""}</div></div>
    <p class="note" ${memberView()?"hidden":""}>Unduh kartu dulu, lalu lampirkan gambarnya di chat WhatsApp atau email yang terbuka. Pesan dan tautan tidak bisa membawa lampiran secara otomatis.</p>
    ${m.phone&&!memberView()?`<div class="copyline"><code>+${waNum(m.phone)}</code><button class="btn sm ghost" data-act="copytxt" data-t="+${waNum(m.phone)}">${I.copy}Salin nomor</button></div>`:""}</div></div>`,"",true);
  const cv=await drawCard(a,m,c);S.lastCard={cv,name:`kartu-${c.cardNo}.png`};
  const box=$("#cardimg");if(box){box.innerHTML=`<img src="${cv.toDataURL("image/png")}" alt="Kartu penugasan ${esc(m.name)}">`}
  if(!S.downloads||memberView()){const b=$("#dlbtn");if(b){b.outerHTML=`<p class="note">Tekan lama atau klik kanan gambar kartu untuk menyimpannya.</p>`}}
}

/* ---------- actions ---------- */
async function seed(){
  const t=today(),P=(n,r,l,pv,ch,ph,em,st,sk)=>({name:n,role:r,level:l,province:pv,chapter:ch,phone:ph,email:em,status:st,skills:sk,lang:"Indonesia",photo:"",sample:true,createdAt:Date.now()});
  const ms={
    mx1:P("Rani Kusumawati",ROLES[0],LEVELS[2],"Jawa Tengah","PMI Kota Semarang","081200000001","rani@contoh.id","tersedia","Koordinasi klaster WASH, Sphere"),
    mx2:P("Dimas Prasetyo",ROLES[1],LEVELS[0],"Jawa Barat","PMI Kab. Bandung","081200000002","dimas@contoh.id","tersedia","Distribusi air truk tangki, bladder tank"),
    mx3:P("Siti Nurhaliza",ROLES[3],LEVELS[0],"DI Yogyakarta","PMI Kab. Sleman","081200000003","siti@contoh.id","tersedia","PHAST, CHAST, MHM"),
    mx4:P("Yohanes Mere",ROLES[6],LEVELS[1],"Nusa Tenggara Timur","PMI Kab. Sikka","081200000004","yohanes@contoh.id","tersedia","Operator WTU, pompa"),
    mx5:P("Andi Makkasau",ROLES[2],LEVELS[0],"Sulawesi Selatan","PMI Kota Makassar","081200000005","andi@contoh.id","tersedia","Jamban darurat, pengelolaan sampah"),
    mx6:P("Putu Ayu Lestari",ROLES[4],LEVELS[1],"Bali","PMI Kab. Gianyar","081200000006","putu@contoh.id","tersedia","Uji klorin residu, Delagua"),
    mx7:P("Fajar Ramadhan",ROLES[1],LEVELS[0],"Aceh","PMI Kota Banda Aceh","081200000007","fajar@contoh.id","tidak","Instalasi tandon, perpipaan"),
    mx8:P("Maria Wenda",ROLES[5],LEVELS[0],"Papua","PMI Kota Jayapura","081200000008","maria@contoh.id","tersedia","Fogging, abatisasi")};
  const yr=t.slice(0,4);
  const al={
    ax1:{title:"Tanggap Darurat Banjir Demak",emergency:"Banjir",role:ROLES[1],location:"Kec. Karanganyar, Demak, Jawa Tengah",start:addDays(t,-5),dur:21,deadline:addDays(t,-7),slots:1,desc:"Mengoperasikan distribusi air bersih untuk 4 titik pengungsian.",code:`WASH-${yr}-901`,status:"terisi",createdAt:Date.now()-2e5,sample:true,
      cand:{mx2:{state:"terpilih",cardNo:`WASH-${yr}-901-01`,selectedAt:Date.now()-1e5},mx7:{state:"menolak"}}},
    ax2:{title:"Respons Gempa Sulawesi Tengah",emergency:"Gempa Bumi",role:ROLES[3],location:"Kab. Sigi, Sulawesi Tengah",start:addDays(t,6),dur:30,deadline:addDays(t,2),slots:2,desc:"Promosi kebersihan di 6 posko pengungsian, termasuk distribusi hygiene kit.",code:`WASH-${yr}-902`,status:"terbuka",createdAt:Date.now()-1e5,sample:true,
      cand:{mx3:{state:"bersedia"}}}};
  ms.mx2.status="ditugaskan";
  for(const [k,v] of Object.entries(ms))await write("set","members",k,v).catch(()=>{});
  for(const [k,v] of Object.entries(al))await write("set","alerts",k,v).catch(()=>{});
  toast("Data contoh dimuat");
}
async function unseed(){for(const m of members())if(m.sample)await write("delete","members",m.id).catch(()=>{});for(const a of alerts())if(a.sample)await write("delete","alerts",a.id).catch(()=>{});toast("Data contoh dihapus")}

const armed={};
function arm(btn,key,label){if(armed[key]&&Date.now()-armed[key]<4000){delete armed[key];return true}armed[key]=Date.now();btn.dataset.orig=btn.innerHTML;btn.textContent=label;setTimeout(()=>{if(btn.isConnected&&btn.dataset.orig)btn.innerHTML=btn.dataset.orig},4000);return false}

document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-act]");
  if(!b){if(e.target.id==="modal")closeModal();return}
  const act=b.dataset.act,aid=b.dataset.a,mid=b.dataset.m,a=aid&&S.alerts[aid];
  switch(act){
    case"close":closeModal();break;
    case"new-member":memberForm();break;
    case"edit-member":memberForm(Object.assign({id:mid},S.members[mid]));break;
    case"member":case"selm":memberDetail(mid);break;
    case"sela":S.selAlert=aid;if(tabOf(S.route)!=="alert")location.hash="alert";else render();toInsp();break;
    case"mode":if(b.dataset.v==="admin"&&!S.isAdmin){adminPwModal(false);break}S.viewAs=b.dataset.v;try{localStorage.setItem("rosterwash.mode",S.viewAs)}catch(e){}window.scrollTo(0,0);render();break;
    case"report":reportForm(aid);break;
    case"report-save":saveReport(aid);break;
    case"selr":S.selRep=mid+"|"+aid;if(tabOf(S.route)!=="laporan")location.hash="laporan";else render();toInsp();break;
    case"rf":S.rf=b.dataset.v;render();break;
    case"repseen":await write("update","members",mid,{reports:{[aid]:{seen:true}}}).catch(()=>{});break;
    case"exportrep":exportReports();break;
    case"auth-mode":S.auth.mode=b.dataset.v;S.auth.err="";S.auth.info="";authRender();break;
    case"auth-back":S.auth.step="email";S.auth.err="";authRender();break;
    case"otp-resend":sendOtp(S.auth.email);break;
    case"pw-forgot":{const em=(($("#admail")&&$("#admail").value)||S.auth.email||"").trim();if(!em){S.auth.err="Isi email admin dulu.";authRender();break}const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:redirectTo()});S.auth.email=em;S.auth.err=error?"Gagal mengirim email: "+error.message:"";S.auth.info=error?"":"Tautan untuk mengatur ulang password sudah dikirim ke "+em+".";authRender();break}
    case"pw-new":adminPwModal(true);break;
    case"pw-enter":pwEnter();break;
    case"pw-create":pwCreate(!!b.dataset.recovery);break;
    case"admin-add":adminAdd();break;
    case"admin-rm":adminRm(b.dataset.u,b);break;
    case"logout":await sb.auth.signOut();S.viewAs="admin";toast("Anda sudah keluar");break;
    case"announce":{const note=($("#annnote")&&$("#annnote").value||"").trim().slice(0,1000);const fill={};for(const [mid,c] of Object.entries(a.cand||{})){if(c.state!=="terpilih")continue;const m=S.members[mid];if(m&&(!c.name||(!c.thumb&&m.photo)))fill[mid]={name:m.name,thumb:c.thumb||m.photo||""}}
      await write("update","alerts",aid,{announce:{at:Date.now(),note},cand:fill}).then(()=>toast("Pengumuman tampil di Beranda semua anggota")).catch(()=>{});break}
    case"unannounce":if(arm(b,"ua"+aid,"Tekan lagi untuk menarik")){await write("update","alerts",aid,{announce:null}).then(()=>toast("Pengumuman ditarik")).catch(()=>{})}break;
    case"copyann":copy(annText(a),"Teks pengumuman");break;
    case"jump":{const el=document.getElementById(b.dataset.v);if(el)el.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});break}
    case"lptoggle":$("#work").classList.toggle("lpopen");break;
    case"selc":S.selCard=aid+"|"+mid;render();toInsp();break;
    case"fstat":S.f.status=b.dataset.v;render();break;
    case"fsrc":S.f.src=b.dataset.v;render();break;
    case"fe":S.fe=b.dataset.v;render();break;
    case"kg":S.kg=b.dataset.v;render();break;
    case"bell":{const p=pendingList();if(p.length){location.hash="seleksi-"+p[0].a.id;toast(p.length+" jawaban relawan menunggu keputusan")}else toast("Tidak ada jawaban baru yang menunggu keputusan.");break}
    case"org-edit":openModal("Nama markas / unit",`<div class="field"><label for="orgin">Ditampilkan di bilah atas, mis. "PMI Markas Kab Sikka"</label><input class="input" id="orgin" value="${esc((S.settings.app&&S.settings.app.org)||"")}"></div>`,`<button class="btn" data-act="close">Batal</button><button class="btn primary" data-act="org-save">Simpan</button>`);break;
    case"org-save":{const v=($("#orgin").value||"").trim().slice(0,80);closeModal();await write("set","settings","app",Object.assign({},S.settings.app||{},{org:v})).catch(()=>{});break}
    case"exportasg":exportAssignments();break;
    case"sheet":if(!S.isAdmin){toast("Masuk Mode Admin dulu.");break}S.sheetDraft=null;sheetModal();break;
    case"sheet-back":S.sheetDraft=null;sheetModal();break;
    case"sheet-read":{const url=$("#shurl").value,id=sheetIdOf(url),er=$("#sherr");S.sheetTab=($("#shname").value||"").trim();if(!id){er.textContent="Link tidak dikenali. Salin link dari bilah alamat Google Sheets (berisi /spreadsheets/d/…).";er.hidden=false;break}
      b.disabled=true;b.textContent="Membaca…";try{const info=await gsSheets(id);if(!info.sheets.length)throw {code:"empty"};const keep=S.sync&&S.sync.id===id&&info.sheets.includes(S.sync.sheet)?S.sync.sheet:info.sheets[0];
        S.sheetDraft={id,url:url.trim(),title:info.title,sheets:info.sheets,sheet:keep,defRole:(S.sync&&S.sync.defRole)||ROLES[1]};sheetModal();sheetLoadGrid()}catch(e){b.disabled=false;b.textContent="Baca spreadsheet";er.textContent=gsErr(e);er.hidden=false}break}
    case"sheet-save":{const d=S.sheetDraft;if(!d||!d.headers)break;const map={};FIELDS.forEach(([k])=>{if(d.idx[k]!=null)map[k]=d.headers[d.idx[k]]});
      if(map.name==null){const er=$("#sherr");er.textContent="Pilih kolom untuk Nama lengkap.";er.hidden=false;break}
      const cfg={id:d.id,url:d.url,title:d.title,sheet:d.sheet,map,defRole:d.defRole,updatedAt:Date.now()};closeModal();S.sync=cfg;S.sheetDraft=null;
      await write("set","sync","sheet",cfg).catch(()=>{});syncSheet(true);startAutoSync();break}
    case"sheet-sync":syncSheet(true);break;
    case"sheet-off":if(arm(b,"so","Tekan lagi untuk memutuskan")){closeModal();S.sync=null;S.syncLocal=null;await write("delete","sync","sheet").catch(()=>{});toast("Sinkron Google Sheets diputus. Data yang sudah masuk tetap ada.")}break;
    case"admins":adminsModal();break;
    case"admins-old":openModal("Kelola admin & pendaftaran",`<p>Peran di aplikasi ini mengikuti akses berbagi halaman di claude.ai:</p>
      <dl class="kv" style="grid-template-columns:120px minmax(0,1fr)"><dt>Admin</dt><dd style="font-weight:400"><b>Pemilik</b> halaman (Anda) dan siapa pun yang Anda beri akses <b>bisa mengedit</b>. Admin melihat seluruh roster, membuat alert, menyeleksi, mengimpor, dan mengekspor.</dd><dt>Relawan</dt><dd style="font-weight:400">Orang yang diberi akses <b>bisa menggunakan / mengisi</b> (bukan hanya melihat). Mereka hanya melihat formulir pendaftaran dan portal relawan berisi data diri sendiri. Tidak ada tombol impor, ekspor, atau unduh file.</dd></dl>
      <div class="note" style="display:flex;flex-direction:column;gap:6px"><b style="color:var(--ink)">Menunjuk admin baru</b><span>1. Buka menu <b>Share</b> di kanan atas halaman ini.</span><span>2. Tambahkan email orang tersebut, lalu pilih akses yang bisa mengedit.</span><span>3. Saat ia membuka tautan, ia langsung melihat dasbor admin ini. Untuk mencabut, turunkan aksesnya di menu yang sama.</span></div>
      <div class="note" style="display:flex;flex-direction:column;gap:6px"><b style="color:var(--ink)">Membuka pendaftaran untuk relawan</b><span>Di menu <b>Share</b>, bagikan ke organisasi atau email relawan dengan akses yang bisa mengisi, lalu sebarkan tautannya lewat grup WhatsApp. Relawan perlu masuk dengan akun claude.ai.</span></div>
      <p class="muted" style="font-size:.82rem">Halaman ini tidak bisa mengubah akses berbagi sendiri. Pengaturan akses hanya ada di menu Share.</p>`,`<button class="btn primary" data-act="close">Mengerti</button>`);break;
    case"copyalert":copy(inviteText(a,null),"Teks alert");break;
    case"dlcard2":{const am=S.alerts[aid],mm=S.members[mid];if(!am||!mm||!S.downloads)break;const c=(am.cand||{})[mid];const v=await cardURL(Object.assign({id:aid},am),Object.assign({id:mid},mm),c);v.cv.toBlob(async blob=>{try{await S.downloads.save({filename:`kartu-${c.cardNo}.png`,data:blob});toast("Kartu disimpan")}catch(err){if(err&&err.code!=="declined")toast("Kartu tidak bisa diunduh di sini.")}},"image/png");break}
    case"asisten":$("#drawer").hidden=false;renderChat();setTimeout(()=>{const q=$("#askq");q&&q.focus()},30);break;
    case"chat-close":$("#drawer").hidden=true;break;
    case"sug":ask(b.textContent);break;
    case"save-member":saveMember(mid,!!b.dataset.self);break;
    case"edit-self":memberForm(Object.assign({id:S.uid},S.members[S.uid]),true);break;
    case"avail":await write("update","members",S.uid,{status:b.dataset.v}).catch(()=>{});break;
    case"respond":await write("update","members",S.uid,{responses:{[aid]:{state:b.dataset.v,at:Date.now()}}}).then(()=>toast(b.dataset.v==="bersedia"?"Jawaban terkirim ke koordinator":"Jawaban dicatat")).catch(()=>{});break;
    case"import":S.imp=null;renderImport();break;
    case"impreset":S.imp=null;renderImport();break;
    case"imppaste":{const t=($("#imppaste").value||"");if(!t.trim()){toast("Tempel tabel dulu.");break}loadGrid(parseDelim(t),"data tempelan");break}
    case"imprun":runImport();break;
    case"template":templateXlsx();break;
    case"export":exportRoster();break;
    case"merge":if(arm(b,"mg","Tekan lagi untuk menggabungkan"))mergeAll();break;
    case"del-member":if(arm(b,"dm"+mid,"Tekan lagi untuk menghapus")){closeModal();if(S.selMember===mid)S.selMember=null;await write("delete","members",mid).catch(()=>{});toast("Anggota dihapus")}break;
    case"new-alert":alertForm();break;
    case"edit-alert":alertForm(Object.assign({id:aid},a));break;
    case"save-alert":saveAlert(aid);break;
    case"del-alert":if(arm(b,"da"+aid,"Tekan lagi untuk menghapus")){
      for(const c of cands(a))if(c.state==="terpilih"&&S.members[c.mid]&&S.members[c.mid].status==="ditugaskan")await write("update","members",c.mid,{status:"tersedia"}).catch(()=>{});
      if(S.selAlert===aid)S.selAlert=null;location.hash="alert";await write("delete","alerts",aid).catch(()=>{});toast("Alert dihapus")}break;
    case"astatus":await write("update","alerts",aid,{status:b.dataset.v}).catch(()=>{});break;
    case"frole":S.f.role=b.dataset.v;render();break;
    case"af":S.af=b.dataset.v;render();break;
    case"seed":seed();break;
    case"unseed":if(arm(b,"us","Tekan lagi untuk menghapus"))unseed();break;
    case"invite":{const add={};S.inv.sel.forEach(id=>add[id]={state:"diundang",invitedAt:Date.now()});const n=S.inv.sel.size;S.inv.sel.clear();await write("update","alerts",aid,{cand:add}).catch(()=>{});toast(n+" anggota masuk daftar kandidat. Kirim alert lewat tombol Email/WhatsApp.");break}
    case"sent":{const k=b.dataset.ch==="wa"?"waAt":"emailAt";write("update","alerts",aid,{cand:{[mid]:{[k]:Date.now()}}}).catch(()=>{});break}
    case"copymsg":{const m=S.members[mid],c=a.cand[mid];copy(c.state==="terpilih"?selectText(a,m,c):inviteText(a,m),"Pesan");break}
    case"copytxt":copy(b.dataset.t,"Teks");break;
    case"copyemails":copy(cands(a).filter(c=>c.state!=="menolak"&&S.members[c.mid]&&S.members[c.mid].email).map(c=>S.members[c.mid].email).join(", "),"Daftar email");break;
    case"cstate":await write("update","alerts",aid,{cand:{[mid]:{state:b.dataset.v,answeredAt:Date.now()}}}).catch(()=>{});break;
    case"select":{
      const sel=cands(a).filter(c=>c.state==="terpilih");
      const nums=sel.map(c=>parseInt(String(c.cardNo||"").split("-").pop())||0);const no=`${a.code}-${String(Math.max(0,...nums)+1).padStart(2,"0")}`;
      const full=sel.length+1>=(a.slots||1);
      const mm=S.members[mid]||{};const thumb=mm.photo||"";
      await write("update","alerts",aid,Object.assign({cand:{[mid]:{state:"terpilih",cardNo:no,selectedAt:Date.now(),name:mm.name||"",thumb}}},full?{status:"terisi"}:{})).catch(()=>{});
      await write("update","members",mid,{status:"ditugaskan"}).catch(()=>{});
      toast("Terpilih. Kartu ID diterbitkan.");S.selCard=aid+"|"+mid;showCard(aid,mid);break}
    case"unselect":await write("update","alerts",aid,Object.assign({cand:{[mid]:{state:"bersedia",cardNo:""}}},a.status==="terisi"?{status:"terbuka"}:{})).catch(()=>{});
      await write("update","members",mid,{status:"tersedia"}).catch(()=>{});toast("Pilihan dibatalkan");break;
    case"uncand":{const doc=JSON.parse(JSON.stringify(a));const was=doc.cand&&doc.cand[mid];delete doc.cand[mid];await write("set","alerts",aid,doc).catch(()=>{});if(was&&was.state==="terpilih")await write("update","members",mid,{status:"tersedia"}).catch(()=>{});break}
    case"card":showCard(aid,mid);break;
    case"dlcard":{if(!S.lastCard||!S.downloads)return;S.lastCard.cv.toBlob(async blob=>{try{await S.downloads.save({filename:S.lastCard.name,data:blob});toast("Kartu disimpan")}catch(err){if(err&&err.code!=="declined")toast("Kartu tidak bisa diunduh di sini. Tekan lama gambar untuk menyimpan.")}},"image/png");break}
  }
});
document.addEventListener("input",e=>{
  const t=e.target;
  if(t.id==="q"){S.f.q=t.value;const l=$("#rlist");if(l)l.innerHTML=rosterTable()}
  else if(t.id==="invq"){S.inv.q=t.value;const a=S.selAlert&&S.alerts[S.selAlert];if(a)$("#pick").innerHTML=inviteList(Object.assign({id:S.selAlert},a))}
});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.id==="fprov"){S.f.prov=t.value;render()}
  else if(t.id==="fstat"){S.f.status=t.value;render()}
  else if(t.id==="invrole"){S.inv.roleOnly=t.checked;render()}
  else if(t.id==="invavail"){S.inv.availOnly=t.checked;render()}
  else if(t.id==="mfile"){const f=t.files[0];if(!f)return;resizePhoto(f).then(d=>{S.pendingPhoto=d;$("#mphoto").innerHTML=`<img class="av lg" src="${d}" alt="">`}).catch(()=>toast("Foto tidak bisa dibaca. Coba file JPG atau PNG."))}
  else if(t.id==="impfile"){const f=t.files[0];if(f)handleFile(f)}
  else if(t.dataset.map){S.imp.map[t.dataset.map]=t.value===""?null:+t.value;refreshImp()}
  else if(t.id==="shsheet"&&S.sheetDraft){S.sheetDraft.sheet=t.value;S.sheetDraft.headers=null;sheetModal();sheetLoadGrid()}
  else if(t.dataset.smap&&S.sheetDraft){S.sheetDraft.idx[t.dataset.smap]=t.value===""?null:+t.value;refreshSheetPlan()}
  else if(t.id==="shdef"&&S.sheetDraft){S.sheetDraft.defRole=t.value;refreshSheetPlan()}
  else if(t.id==="impdef"){S.imp.defRole=t.value;refreshImp()}
  else if(t.id==="impdup"){S.imp.dup=t.value;refreshImp()}
  else if(t.dataset.sel){t.checked?S.inv.sel.add(t.dataset.sel):S.inv.sel.delete(t.dataset.sel);$("#selcount").textContent=S.inv.sel.size+" dipilih";$("#invbtn").disabled=!S.inv.sel.size}
});
async function handleFile(f){try{loadGrid(await readSheet(f),f.name)}catch(e){toast(e&&e.message==="noxlsx"?"Pembaca Excel belum termuat. Simpan file sebagai CSV lalu coba lagi.":"File tidak bisa dibaca. Pastikan formatnya Excel atau CSV.")}}
["dragover","dragenter"].forEach(ev=>document.addEventListener(ev,e=>{const d=e.target.closest&&e.target.closest("#drop");if(d){e.preventDefault();d.classList.add("over")}}));
document.addEventListener("dragleave",e=>{const d=e.target.closest&&e.target.closest("#drop");if(d)d.classList.remove("over")});
document.addEventListener("drop",e=>{const d=e.target.closest&&e.target.closest("#drop");if(!d)return;e.preventDefault();d.classList.remove("over");const f=e.dataTransfer.files[0];if(f)handleFile(f)});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target&&(e.target.id==="apw"||e.target.id==="npw2")){e.preventDefault();e.target.id==="apw"?pwEnter():pwCreate(false);return}if(e.key!=="Escape")return;if(!$("#modal").hidden)closeModal();else if(!$("#drawer").hidden)$("#drawer").hidden=true});
document.addEventListener("submit",e=>{
  if(e.target.id==="emailform"){e.preventDefault();sendOtp($("#aemail").value);return}
  if(e.target.id==="codeform"){e.preventDefault();verifyCode($("#acode").value);return}
  if(e.target.id==="adminform"){e.preventDefault();adminLogin($("#admail").value,$("#adpw").value);return}
  if(e.target.id==="askform"){e.preventDefault();const q=$("#askq");const v=q.value;q.value="";ask(v)}});
function route(){let h=(location.hash||"").replace(/^#/,"")||"beranda";if(/^alert-[A-Za-z0-9-]+$/.test(h))h="seleksi-"+h.slice(6);const prev=S.route;S.route=/^(beranda|roster|alert|seleksi|kartu|laporan|seleksi-[A-Za-z0-9-]+)$/.test(h)?h:"beranda";if(S.route.startsWith("seleksi-"))S.selAlert=S.route.slice(8);if(prev!==S.route){S.inv.sel.clear();S.inv.q="";const c=$("#cp");if(c)c.scrollTop=0}render()}
window.addEventListener("hashchange",route);
route();
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

boot();
