// UI test against the mock backend. Usage: MOCK=1 npx vite --port 5179 & node tools/test/e2e.cjs
const { chromium } = require("playwright");
const URL = process.env.APP_URL || "http://localhost:5179/";
const OUT = process.env.SHOTS || "/tmp";
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on("pageerror", e => errs.push("pageerror: " + e.message));
  p.on("console", m => { if (m.type() === "error" && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });
  const step = async (name, fn) => { try { await fn(); console.log("ok  ", name); } catch (e) { console.log("FAIL", name, "-", e.message.split("\n")[0]); errs.push(name); } };
  const shot = n => p.screenshot({ path: `${OUT}/e2e-${n}.png` });
  const t = new Date().toISOString().slice(0, 10);
  // Edge Function stand-in: activation with email + WA (mirrors supabase/functions/member-login)
  await p.route("**/functions/v1/member-login", async r => {
    const b = JSON.parse(r.request().postData() || "{}");
    const st = await p.evaluate(e => { const m = window.__mockdb.members.find(x => x.email === e); return m ? { phone: m.phone, pw: m.has_password } : null; }, b.email);
    const core = x => { let d = String(x || "").replace(/\D/g, ""); if (d.startsWith("62")) d = d.slice(2); if (d.startsWith("0")) d = d.slice(1); return d; };
    const res = !st ? [404, { error: "not_registered" }] : st.pw ? [409, { error: "password_required" }] : core(st.phone) !== core(b.phone) ? [401, { error: "phone_mismatch" }] : [200, { token_hash: "th:" + b.email }];
    r.fulfill({ status: res[0], contentType: "application/json", body: JSON.stringify(res[1]) });
  });
  const sent = []; let gmailOff = false;
  await p.route("**/functions/v1/broadcast", async r => {
    const b = JSON.parse(r.request().postData() || "{}");
    if (b.mode === "status") return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ channels: { email: !gmailOff, wa: false } }) });
    sent.push(b);
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, recipients: 3, email_sent: 3, email_error: null, wa_sent: 0, wa_error: null, channels: { email: true, wa: false } }) });
  });
  const login = async (email, pw) => { await p.fill("#lmail", email); await p.fill("#lpw", pw); await p.click("#pwform button[type=submit]"); };
  const logout = async () => { await p.click("[data-act=logout]"); await p.waitForSelector("#pwform"); };

  await p.goto(URL); await p.waitForTimeout(600);
  await p.evaluate(() => ["Hapus Satu", "Hapus Dua"].forEach((n, i) => window.__mockdb.members.push({ id: crypto.randomUUID(), user_id: null, email: "hapus" + i + "@contoh.id", name: n, phone: "08120000000" + i, role: "Kualitas Air", level: "Relawan (KSR/TSR)", province: "Bali", chapter: "", skills: "", lang: "", status: "tersedia", photo: "", source: "form", sheet_sig: null, has_password: false, created_at: new Date().toISOString() })));
  await step("login page (email + password) shown when signed out", async () => { await p.waitForSelector("#pwform"); });
  await shot("01-login");
  await step("admin logs in with email + password", async () => {
    await login("admin@pmi.id", "salah"); await p.waitForSelector("text=Email atau password salah");
    await login("admin@pmi.id", "rahasia123"); await p.waitForSelector("text=Mode admin", { timeout: 4000 });
  });
  await step("admin creates an alert", async () => {
    await p.click("#tbar [data-act=new-alert]");
    await p.fill("#atitle", "Tanggap Darurat Banjir Demak"); await p.selectOption("#arole", "Promosi Kebersihan");
    await p.fill("#aloc", "Kec. Karanganyar, Demak"); await p.fill("#astart", t); await p.fill("#adead", t); await p.fill("#aslots", "2");
    await p.click("[data-act=save-alert]"); await p.waitForTimeout(800);
    if (!(await p.locator("text=WASH-").count())) throw new Error("alert code not visible");
  });
  await step("after creating, 'send alert to all members' opens; email sends, WA shown as not active", async () => {
    await p.waitForSelector("text=Kirim alert lewat email", { timeout: 4000 });
    await p.waitForSelector("text=Pengiriman otomatis aktif");
    await p.click("[data-act=bc-send]"); await p.waitForSelector("text=3 email terkirim");
    if (sent[0].kind !== "alert" || sent[0].email !== true || sent[0].wa !== false) throw new Error(JSON.stringify(sent[0]));
    await p.click("#modal [data-act=close]");
  });
  await shot("03-broadcast");
  await step("without Gmail secrets: 'Buka di Gmail' fallback with BCC prefilled", async () => {
    gmailOff = true; await p.click(".tab:has-text('Alert Penugasan')"); await p.click("[data-act=sela]"); await p.click("[data-act=bc-open][data-k=alert]");
    await p.waitForSelector("text=Kirim lewat Gmail Anda");
    const href = await p.getAttribute("a:has-text('Buka di Gmail')", "href");
    if (!/mail\.google\.com\/mail\/\?view=cm/.test(href) || !/bcc=/.test(href)) throw new Error(href);
    await p.fill("#bc-from", "roster.wash@gmail.com"); await p.press("#bc-from", "Tab");
    const href2 = await p.getAttribute("a:has-text('Buka di Gmail')", "href");
    if (!/authuser=roster\.wash%40gmail\.com/.test(href2)) throw new Error("authuser missing: " + href2.slice(0, 120));
    await p.click("#modal [data-act=close]"); gmailOff = false;
  });
  await shot("03b-gmail");
  await step("admin deletes two members at once", async () => {
    await p.click(".tab:has-text('Anggota Roster')"); await p.waitForSelector("text=Hapus Satu");
    await p.check("tr:has-text('Hapus Satu') [data-act=rsel]"); await p.check("tr:has-text('Hapus Dua') [data-act=rsel]");
    await p.waitForSelector("text=2 anggota dipilih");
    await p.click("[data-act=rsel-del]"); await p.click("[data-act=rsel-del]"); await p.waitForTimeout(800);
    if (await p.locator("text=Hapus Satu").count()) throw new Error("still listed");
  });
  await step("admin logs out", logout);

  await step("activation with unregistered email points to the Google Form", async () => {
    await p.click("[data-act=auth-mode][data-v=activate]");
    await p.fill("#aemail", "wulan@contoh.id"); await p.fill("#awa", "081355554444"); await p.click("#waform button[type=submit]");
    await p.waitForSelector("text=belum terdaftar di roster");
  });
  await step("Form answer arrives; wrong WA rejected", async () => {
    await p.evaluate(() => window.__mockdb.members.push({ id: crypto.randomUUID(), user_id: null, email: "wulan@contoh.id", name: "Wulan Pratiwi", phone: "081355554444", role: "Promosi Kebersihan", level: "Relawan (KSR/TSR)", province: "Jawa Tengah", chapter: "PMI Kota Semarang", skills: "", lang: "", status: "tersedia", photo: "", source: "form", sheet_sig: null, has_password: false, created_at: new Date().toISOString() }));
    await p.fill("#awa", "0811111111"); await p.click("#waform button[type=submit]"); await p.waitForSelector("text=Nomor WhatsApp tidak cocok");
  });
  await step("right WA → must create a password first", async () => {
    await p.fill("#awa", "0813-5555-4444"); await p.click("#waform button[type=submit]");
    await p.waitForSelector("#firstpw", { timeout: 4000 });
  });
  await shot("02-setpw");
  await step("create password → member home", async () => {
    await p.fill("#fpw1", "pendek"); await p.fill("#fpw2", "pendek"); await p.click("#firstpw button[type=submit]"); await p.waitForSelector("text=minimal 8 karakter");
    await p.fill("#fpw1", "wulanaman123"); await p.fill("#fpw2", "wulanaman123"); await p.click("#firstpw button[type=submit]");
    await p.waitForSelector("text=Beranda anggota", { timeout: 4000 });
  });
  await step("member applies to the alert", async () => {
    await p.click("#m-alert [data-act=respond][data-v=bersedia]"); await p.waitForTimeout(600); await p.waitForSelector("text=Menunggu keputusan admin");
    if (await p.locator("[data-act=mode]").count()) throw new Error("mode switch visible to member");
  });
  await step("member logs out", logout);
  await step("after a password exists, email + WA no longer works", async () => {
    await p.click("[data-act=auth-mode][data-v=activate]");
    await p.fill("#aemail", "wulan@contoh.id"); await p.fill("#awa", "081355554444"); await p.click("#waform button[type=submit]");
    await p.waitForSelector("text=sudah punya password");
    await p.click("[data-act=auth-mode][data-v=member]");
  });

  await step("admin selects the applicant and announces", async () => {
    await login("admin@pmi.id", "rahasia123"); await p.waitForSelector("text=Mode admin"); await p.click(".tab:has-text('Beranda')"); await p.waitForSelector("text=Seleksi kandidat");
    await p.click("[data-act=select]"); await p.waitForTimeout(1500);
    await p.waitForSelector("text=Kartu ID penugasan"); await p.click("#modal [data-act=close]");
    await p.click(".tab:has-text('Seleksi Kandidat')"); await p.waitForTimeout(400);
    await p.fill("#annnote", "Briefing di Markas PMI Jateng pukul 08.00."); await p.click("[data-act=announce]"); await p.waitForTimeout(600);
    await p.waitForSelector("text=Kirim pengumuman lewat email", { timeout: 4000 });
    await p.click("[data-act=bc-send]"); await p.waitForSelector("text=3 email terkirim");
    if (sent[sent.length - 1].kind !== "announce") throw new Error("announce not sent");
    await p.click("#modal [data-act=close]");
    await p.waitForSelector("text=Diumumkan");
  });
  await step("admin sees password status and can reset login", async () => {
    await p.click(".tab:has-text('Anggota Roster')"); await p.click("tr[data-act=selm]"); await p.waitForSelector("text=Sudah memakai password.");
  });
  await step("admin generates the Google Form script", async () => {
    await p.click("#tbar [data-act=gform]"); await p.click("[data-act=gform-gen]"); await p.waitForSelector("#gscode");
    if (!/TOKEN = "rw_[0-9a-f]{48}"/.test(await p.inputValue("#gscode"))) throw new Error("script missing token");
    await p.click("#modal [data-act=close]");
  });
  await step("admin appoints wulan as admin", async () => {
    await p.click("#hright [data-act=admins]"); await p.fill("#newadm", "wulan@contoh.id"); await p.click("[data-act=admin-add]"); await p.waitForTimeout(500);
    await p.waitForSelector("#modal >> text=wulan@contoh.id"); await p.click("#modal [data-act=close]");
  });
  await step("admin logs out", logout);
  await step("wulan logs in with password, sees announcement & card, writes report", async () => {
    await login("wulan@contoh.id", "wulanaman123");
    await p.waitForTimeout(800);
    if (await p.locator("[data-act=mode][data-v=anggota]").count()) await p.click("[data-act=mode][data-v=anggota]");
    await p.waitForSelector("text=Pengumuman anggota terpilih", { timeout: 4000 }); await p.waitForSelector("text=Selamat, Anda terpilih");
    await p.click("#m-rep [data-act=report]"); await p.fill("#rsum", "Promosi kebersihan di 3 posko pengungsian."); await p.fill("#rm-people", "1250");
    await p.click("[data-act=report-save]"); await p.waitForTimeout(600); await p.waitForSelector("#m-rep >> text=Terkirim");
  });
  await step("wulan (now admin) switches to Mode Admin and reads the report", async () => {
    await p.click("[data-act=mode][data-v=admin]"); await p.waitForSelector("text=Mode admin", { timeout: 4000 });
    await p.click(".tab:has-text('Laporan')"); await p.waitForTimeout(300); await p.click("tr[data-act=selr]"); await p.waitForSelector("text=Promosi kebersihan di 3 posko");
  });
  await p.setViewportSize({ width: 390, height: 844 }); await logout(); await shot("08-phone-login");
  console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno errors");
  await b.close();
})();
