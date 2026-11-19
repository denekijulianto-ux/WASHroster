// Screenshots for the member guide deck, taken from the mock backend at phone size.
// Usage: MOCK=1 npx vite --port 5179 & node tools/guide/shots.cjs <outdir>
const { chromium } = require("playwright");
const URL = process.env.APP_URL || "http://localhost:5179/";
const OUT = process.argv[2] || "/tmp";
(async () => {
  const b = await chromium.launch();
  const W = +process.env.W || 390, desk = W > 800;
  const ctx = await b.newContext(desk ? { viewport: { width: W, height: 900 }, deviceScaleFactor: 1 } : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const shot = async (n) => { await p.waitForTimeout(350); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log("shot", n); };
  const top = async (sel, dy = 70) => { await p.evaluate(([s, d]) => { const el = document.querySelector(s); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - d); }, [sel, dy]); };
  await p.route("**/functions/v1/member-login", async r => {
    const q = JSON.parse(r.request().postData() || "{}");
    const st = await p.evaluate(e => { const m = window.__mockdb.members.find(x => x.email === e); return m ? { phone: m.phone, pw: m.has_password } : null; }, q.email);
    const core = x => { let d = String(x || "").replace(/\D/g, ""); if (d.startsWith("62")) d = d.slice(2); if (d.startsWith("0")) d = d.slice(1); return d; };
    const res = !st ? [404, { error: "not_registered" }] : st.pw ? [409, { error: "password_required" }] : core(st.phone) !== core(q.phone) ? [401, { error: "phone_mismatch" }] : [200, { token_hash: "th:" + q.email }];
    r.fulfill({ status: res[0], contentType: "application/json", body: JSON.stringify(res[1]) });
  });
  await p.goto(URL); await p.waitForTimeout(700);

  // seed: member from Google Form, one open alert, one ongoing assignment with announcement
  await p.evaluate(() => {
    const db = window.__mockdb, d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    const mid = crypto.randomUUID(), a1 = crypto.randomUUID(), a2 = crypto.randomUUID();
    window.__mid = mid;
    db.members.push({ id: mid, user_id: null, email: "dian@contoh.id", name: "Dian Lestari", phone: "081234567890", mis: "3374012345", role: "Promosi Kebersihan", level: "Relawan (KSR/TSR)", province: "Jawa Tengah", chapter: "PMI Kota Semarang", skills: "PHAST, fasilitator promosi kesehatan", lang: "Indonesia", status: "tersedia", photo: "", source: "form", sheet_sig: null, has_password: false, created_at: new Date().toISOString() });
    db.alerts.push({ id: a1, kind: "bencana", focus: "", code: "WASH-2026-004", title: "Tanggap Darurat Banjir Demak", emergency: "Banjir", role: "Promosi Kebersihan", location: "Kec. Karanganyar, Demak, Jawa Tengah", start_date: d(4), dur: 14, deadline: d(2), slots: 3, description: "Promosi kebersihan di posko pengungsian, distribusi hygiene kit.", status: "terbuka", announce_at: null, announce_note: "", created_at: new Date().toISOString() });
    db.alerts.push({ id: a2, kind: "non_bencana", focus: "Promosi Kebersihan", code: "WASH-2026-002", title: "Pelatihan PHAST Kab. Kendal", emergency: "Pelatihan", role: "Fasilitator", location: "Kendal, Jawa Tengah", start_date: d(-2), dur: 5, deadline: d(-6), slots: 2, description: "", status: "terisi", announce_at: new Date(Date.now() - 4 * 864e5).toISOString(), announce_note: "Briefing di Markas PMI Kab. Kendal pukul 08.00.", created_at: new Date().toISOString() });
    db.candidates.push({ alert_id: a2, member_id: mid, state: "terpilih", self_response: true, invited_at: null, answered_at: new Date().toISOString(), email_at: null, wa_at: null, card_no: "WASH-2026-002-01", selected_at: new Date().toISOString(), name: "Dian Lestari", thumb: null });
    db.settings.push({ key: "wa_group", value: { url: "https://chat.whatsapp.com/ContohGrup123" } });
  });

  // 1. login page
  await p.waitForSelector("#pwform"); await shot("01-login");
  // 2. first-time activation (email + WhatsApp)
  await p.click("[data-act=auth-mode][data-v=activate]");
  await p.fill("#aemail", "dian@contoh.id"); await p.fill("#awa", "081234567890"); await shot("02-activate");
  // 2b. not registered
  await p.fill("#aemail", "belum@contoh.id"); await p.click("#waform button[type=submit]"); await p.waitForSelector("text=belum terdaftar di roster"); await shot("02b-notregistered");
  // 3. create password
  await p.fill("#aemail", "dian@contoh.id"); await p.click("#waform button[type=submit]"); await p.waitForSelector("#firstpw");
  await p.fill("#fpw1", "dianaman2026"); await p.fill("#fpw2", "dianaman2026"); await shot("03-password");
  await p.click("#firstpw button[type=submit]"); await p.waitForSelector("#m-top"); await p.waitForTimeout(4500);
  // 4. member home (profile)
  await p.evaluate(() => window.scrollTo(0, 0)); await shot("04-home");
  // 5. open alert + apply
  await top("#m-alert"); await shot("05-alert");
  await p.click("#m-alert [data-act=respond][data-v=bersedia]"); await p.waitForSelector("text=sudah terkirim");
  await p.waitForTimeout(2500); await top("#m-alert"); await shot("06-submitted");
  // 7. announcement
  await top("#m-ann"); await shot("07-announcement");
  // 8. ongoing + ID card
  await p.click("#m-card [data-act=card]"); await p.waitForTimeout(1800); await shot("08-idcard"); await p.click("#modal [data-act=close]");
  // 9. report
  await p.click("#m-rep [data-act=report]"); await p.waitForTimeout(400);
  await p.fill("#rsum", "Fasilitasi PHAST untuk 28 peserta dari 6 desa."); await shot("09-report"); await p.click("#modal [data-act=close]");
  // 10. edit profile
  await p.evaluate(() => window.scrollTo(0, 0)); await p.click("[data-act=edit-self]"); await p.waitForTimeout(400); await shot("10-profile");
  await p.evaluate(() => { const m = document.querySelector("#modal .modal-b, #modal .mb, #modal [class*=body]") || document.querySelector("#modal"); const el = document.querySelector("#mchapk"); el && el.scrollIntoView({ block: "center" }); }); await shot("10b-profile-origin");
  await p.click("#modal [data-act=close]");
  // 11. WhatsApp group
  await top("#washpedia", 90); await shot("11-wagroup");
  // 12. bottom nav / logout
  await p.evaluate(() => window.scrollTo(0, 0)); await shot("12-top");
  await b.close();
})();
