// In-browser stand-in for @supabase/supabase-js, used only by the UI test (npm run test:ui).
// It mirrors the access rules and server functions in supabase/schema.sql closely enough
// to exercise the app's screens end to end. It is NOT used in production builds.
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const db = { members: [], alerts: [], candidates: [], reports: [], settings: [], admins: [] };
const users = [{ id: "00000000-0000-0000-0000-0000000000aa", email: "admin@pmi.id", pw: "rahasia123" }];
db.admins.push({ user_id: users[0].id, email: "admin@pmi.id", created_at: now() });
window.__mockdb = db; window.__mockusers = users;
let session = null; const listeners = [];
const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, "");
function mkSession(u, method) { return { access_token: "x." + b64({ sub: u.id, email: u.email, amr: [{ method, timestamp: Date.now() }] }) + ".y", user: { id: u.id, email: u.email } }; }
function emit(ev) { listeners.forEach(f => f(ev, session)); }
const uid = () => session && session.user.id;
const isAdminAcct = () => !!db.admins.find(a => a.user_id === uid());
const isAdmin = () => isAdminAcct() && JSON.parse(atob(session.access_token.split(".")[1])).amr.some(x => x.method === "password");
const myMember = () => db.members.find(m => m.user_id === uid());
const canRead = (t, r) => {
  if (t === "alerts") return true;
  if (isAdmin()) return true;
  const me = myMember();
  if (t === "members") return r.user_id === uid();
  if (t === "candidates") return (me && r.member_id === me.id) || r.state === "terpilih";
  if (t === "reports") return me && r.member_id === me.id;
  if (t === "settings") return r.key === "app";
  if (t === "admins") return r.user_id === uid();
  return false;
};
const err = (message, code = "P0001") => ({ data: null, error: { message, code } });
const defaults = {
  members: () => ({ id: uuid(), user_id: null, email: null, phone: "", role: "Suplai Air Bersih", level: "Relawan (KSR/TSR)", province: "", chapter: "", skills: "", lang: "", status: "tersedia", photo: "", source: "manual", sheet_sig: null, created_at: now() }),
  alerts: () => ({ id: uuid(), emergency: "", slots: 1, description: "", status: "terbuka", announce_at: null, announce_note: "", created_at: now() }),
  candidates: () => ({ self_response: false, invited_at: null, answered_at: null, email_at: null, wa_at: null, card_no: null, selected_at: null, name: null, thumb: null }),
  reports: () => ({ seen: false, submitted_at: now(), metrics: {} }),
  settings: () => ({}), admins: () => ({}),
};
const pk = { members: ["id"], alerts: ["id"], candidates: ["alert_id", "member_id"], reports: ["alert_id", "member_id"], settings: ["key"], admins: ["user_id"] };
function builder(t) {
  let op = "select", payload = null; const filters = [];
  const b = {
    select() { return b; }, insert(p) { op = "insert"; payload = p; return b; }, update(p) { op = "update"; payload = p; return b; },
    upsert(p) { op = "upsert"; payload = p; return b; }, delete() { op = "delete"; return b; },
    eq(c, v) { filters.push(r => r[c] === v); return b; },
    not(c, o, v) { const set = v.replace(/[()]/g, "").split(","); filters.push(r => !set.includes(r[c])); return b; },
    then(res, rej) { return Promise.resolve(run()).then(res, rej); },
  };
  function run() {
    const rows = db[t]; const match = r => filters.every(f => f(r));
    if (op === "select") return { data: JSON.parse(JSON.stringify(rows.filter(r => canRead(t, r) && match(r)))), error: null };
    if (!isAdmin()) return err("new row violates row-level security policy", "42501");
    if (op === "insert" || op === "upsert") {
      for (const p of [].concat(payload)) {
        const ex = rows.find(r => pk[t].every(k => p[k] !== undefined && r[k] === p[k]));
        if (t === "members" && p.email && rows.find(r => r !== ex && r.email && r.email.toLowerCase() === p.email.toLowerCase())) return err("duplicate key value violates unique constraint", "23505");
        if (ex) { if (op === "insert") return err("duplicate key", "23505"); Object.assign(ex, p); }
        else { if (t === "candidates" && !p.state) return err("null value in column state", "23502"); rows.push(Object.assign(defaults[t](), p)); }
      }
      return { data: null, error: null };
    }
    if (op === "update") { rows.filter(match).forEach(r => Object.assign(r, payload)); return { data: null, error: null }; }
    if (op === "delete") { db[t] = rows.filter(r => !match(r)); if (t === "alerts") { db.candidates = db.candidates.filter(c => db.alerts.find(a => a.id === c.alert_id)); } if (t === "members") { db.candidates = db.candidates.filter(c => db.members.find(m => m.id === c.member_id)); } return { data: null, error: null }; }
  }
  return b;
}
const rpcs = {
  app_settings() { const s = db.settings.find(x => x.key === "app"); return { data: s ? s.value : {}, error: null }; },
  save_my_profile({ p }) {
    if (!uid()) return err("Belum masuk"); if (!(p.name || "").trim()) return err("Nama wajib diisi");
    const mail = session.user.email.toLowerCase(); let st = ["tersedia", "tidak"].includes(p.status) ? p.status : "tersedia";
    let r = myMember() || db.members.find(m => !m.user_id && (m.email || "").toLowerCase() === mail);
    if (!r) { r = Object.assign(defaults.members(), { user_id: uid(), email: mail, source: "daftar" }); db.members.push(r); }
    Object.assign(r, { user_id: uid(), email: mail, name: p.name.trim() });
    ["phone", "role", "level", "province", "chapter", "skills", "lang", "photo"].forEach(k => { if (p[k] !== undefined && p[k] !== "") r[k] = p[k]; });
    if (r.status !== "ditugaskan") r.status = st; return { data: r, error: null };
  },
  set_my_status({ s }) { const m = myMember(); if (m && m.status !== "ditugaskan") m.status = s; return { data: null, error: null }; },
  respond({ p_alert, p_state }) {
    const m = myMember(); if (!m) return err("Daftar dulu sebagai anggota");
    const a = db.alerts.find(x => x.id === p_alert); if (!a || a.status !== "terbuka") return err("Alert sudah ditutup");
    const c = db.candidates.find(x => x.alert_id === p_alert && x.member_id === m.id);
    if (c) { if (c.state === "terpilih") return err("Anda sudah terpilih"); c.state = p_state === "menolak" ? "menolak" : (c.invited_at || ["diundang", "bersedia"].includes(c.state)) ? "bersedia" : "mengajukan"; c.self_response = true; c.answered_at = now(); }
    else if (p_state === "bersedia") db.candidates.push(Object.assign(defaults.candidates(), { alert_id: p_alert, member_id: m.id, state: "mengajukan", self_response: true, answered_at: now() }));
    return { data: null, error: null };
  },
  submit_report({ p_alert, p }) {
    const m = myMember(); if (!m || !db.candidates.find(c => c.alert_id === p_alert && c.member_id === m.id && c.state === "terpilih")) return err("Anda tidak ditugaskan pada alert ini");
    const a = db.alerts.find(x => x.id === p_alert); if (a.start_date > today()) return err("Laporan bisa diisi setelah penugasan dimulai");
    let r = db.reports.find(x => x.alert_id === p_alert && x.member_id === m.id); if (!r) { r = Object.assign(defaults.reports(), { alert_id: p_alert, member_id: m.id }); db.reports.push(r); }
    Object.assign(r, { summary: p.summary, metrics: p.metrics || {}, cond: p.cond || "baik", issues: p.issues || "", recs: p.recs || "", seen: false, submitted_at: now() }); return { data: null, error: null };
  },
  claim_my_member() { if (!uid()) return { data: false, error: null }; if (myMember()) return { data: true, error: null }; const m = db.members.find(r => !r.user_id && (r.email || "").toLowerCase() === session.user.email.toLowerCase()); if (m) m.user_id = uid(); return { data: !!m, error: null }; },
  set_intake_token() { if (!isAdmin()) return err("Hanya admin"); const s = db.settings.find(x => x.key === "intake"); if (s) s.value.token_set_at = now(); else db.settings.push({ key: "intake", value: { token_set_at: now(), count: 0 } }); return { data: null, error: null }; },
  add_admin({ p_email }) { if (!isAdmin()) return err("Hanya admin"); const u = users.find(x => x.email === p_email.toLowerCase()); if (!u) return err("Email ini belum pernah masuk ke aplikasi. Minta orang tersebut masuk sekali dengan kode email, lalu coba lagi."); if (!db.admins.find(a => a.user_id === u.id)) db.admins.push({ user_id: u.id, email: u.email, created_at: now() }); return { data: null, error: null }; },
  remove_admin({ p_user }) { if (!isAdmin()) return err("Hanya admin"); if (db.admins.length <= 1) return err("Harus ada minimal satu admin"); db.admins = db.admins.filter(a => a.user_id !== p_user); return { data: null, error: null }; },
};
export function createClient() {
  return {
    from: t => builder(t),
    rpc: async (n, args) => rpcs[n](args || {}),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {},
    storage: { from: () => ({ upload: async (path, blob) => { window.__lastBlob = blob; return { data: { path }, error: null }; }, getPublicUrl: () => ({ data: { publicUrl: URL.createObjectURL(window.__lastBlob) } }) }) },
    auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: f => { listeners.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithOtp: async ({ email }) => { window.__lastOtpEmail = email; return { error: null }; },
      verifyOtp: async ({ email, token }) => { if (token !== "123456") return { error: { message: "invalid" } }; let u = users.find(x => x.email === email); if (!u) { u = { id: uuid(), email }; users.push(u); } session = mkSession(u, "otp"); emit("SIGNED_IN"); return { error: null }; },
      signInWithPassword: async ({ email, password }) => { const u = users.find(x => x.email === email && x.pw && x.pw === password); if (!u) return { error: { message: "Invalid login" } }; session = mkSession(u, "password"); emit("SIGNED_IN"); return { data: { user: { id: u.id } }, error: null }; },
      updateUser: async ({ password }) => { const u = users.find(x => x.id === uid()); u.pw = password; return { error: null }; },
      resetPasswordForEmail: async () => ({ error: null }),
      signOut: async () => { session = null; emit("SIGNED_OUT"); return { error: null }; },
    },
  };
}
