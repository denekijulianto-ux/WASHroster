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

  await p.goto(URL); await p.waitForTimeout(600);
  await step("login page shown when signed out", async () => { await p.waitForSelector("#emailform"); });
  await shot("01-login");

  await step("admin logs in with password", async () => {
    await p.click("[data-act=auth-mode][data-v=admin]");
    await p.fill("#admail", "admin@pmi.id"); await p.fill("#adpw", "salah"); await p.click("#adminform button[type=submit]");
    await p.waitForSelector("text=Email atau password salah.");
    await p.fill("#adpw", "rahasia123"); await p.click("#adminform button[type=submit]");
    await p.waitForSelector("text=Mode admin", { timeout: 4000 });
  });
  await step("admin creates an alert", async () => {
    await p.click("#tbar [data-act=new-alert]");
    await p.fill("#atitle", "Tanggap Darurat Banjir Demak"); await p.selectOption("#arole", "Promosi Kebersihan");
    await p.fill("#aloc", "Kec. Karanganyar, Demak"); await p.fill("#astart", t); await p.fill("#adead", t); await p.fill("#aslots", "2");
    await p.click("[data-act=save-alert]"); await p.waitForTimeout(800);
    if (!(await p.locator("text=WASH-").count())) throw new Error("alert code not visible");
  });
  await shot("02-admin-alert");
  await step("admin logs out", async () => { await p.click("[data-act=logout]"); await p.waitForSelector("#emailform"); });

  await step("new member: email code → registration (email locked)", async () => {
    await p.fill("#aemail", "wulan@contoh.id"); await p.click("#emailform button[type=submit]");
    await p.waitForSelector("#codeform"); await p.fill("#acode", "000000"); await p.click("#codeform button[type=submit]");
    await p.waitForSelector("text=Kode salah");
    await p.fill("#acode", "123456"); await p.click("#codeform button[type=submit]");
    await p.waitForSelector("#mform", { timeout: 4000 });
    const v = await p.inputValue("#memail"); const ro = await p.getAttribute("#memail", "readonly");
    if (v !== "wulan@contoh.id" || ro === null) throw new Error("email not locked: " + v);
  });
  await shot("03-register");
  await step("member registers", async () => {
    await p.fill("#mname", "Wulan Pratiwi"); await p.fill("#mphone", "081355554444"); await p.selectOption("#mrole", "Promosi Kebersihan");
    await p.fill("#mprov", "Jawa Tengah"); await p.check("#mconsent"); await p.click("[data-act=save-member][data-self]");
    await p.waitForSelector("text=Beranda anggota", { timeout: 4000 });
  });
  await step("member sees alert and applies", async () => {
    await p.waitForSelector("text=Tanggap Darurat Banjir Demak");
    await p.click("#m-alert [data-act=respond][data-v=bersedia]"); await p.waitForTimeout(600);
    await p.waitForSelector("text=Menunggu keputusan admin");
  });
  await step("member cannot see admin controls", async () => {
    if (await p.locator("[data-act=mode]").count()) throw new Error("mode switch visible to member");
    if (await p.locator("#tbar:visible").count()) throw new Error("toolbar visible");
  });
  await shot("04-member-home");
  await step("member logs out", async () => { await p.click("[data-act=logout]"); await p.waitForSelector("#emailform"); });

  await step("admin selects the applicant and announces", async () => {
    await p.click("[data-act=auth-mode][data-v=admin]"); await p.fill("#admail", "admin@pmi.id"); await p.fill("#adpw", "rahasia123"); await p.click("#adminform button[type=submit]");
    await p.waitForSelector("text=Seleksi kandidat");
    await p.click("[data-act=select]"); await p.waitForTimeout(1500);
    await p.waitForSelector("text=Kartu ID penugasan"); await p.click("#modal [data-act=close]");
    await p.click(".tab:has-text('Seleksi Kandidat')"); await p.waitForTimeout(400);
    await p.fill("#annnote", "Briefing di Markas PMI Jateng pukul 08.00."); await p.click("[data-act=announce]"); await p.waitForTimeout(600);
    await p.waitForSelector("text=Diumumkan");
  });
  await shot("05-admin-seleksi");
  await step("admin appoints wulan as admin", async () => {
    await p.click("#hright [data-act=admins]"); await p.fill("#newadm", "wulan@contoh.id"); await p.click("[data-act=admin-add]"); await p.waitForTimeout(500);
    await p.waitForSelector("#modal >> text=wulan@contoh.id");
    await p.click("#modal [data-act=close]");
  });
  await step("admin logs out", async () => { await p.click("[data-act=logout]"); await p.waitForSelector("#emailform"); });

  await step("wulan (code login) sees announcement, card, writes report", async () => {
    await p.fill("#aemail", "wulan@contoh.id"); await p.click("#emailform button[type=submit]"); await p.fill("#acode", "123456"); await p.click("#codeform button[type=submit]");
    await p.waitForSelector("text=Pengumuman anggota terpilih", { timeout: 4000 });
    await p.waitForSelector("text=Selamat, Anda terpilih");
    await p.click("#m-rep [data-act=report]"); await p.fill("#rsum", "Promosi kebersihan di 3 posko pengungsian."); await p.fill("#rm-people", "1250");
    await p.click("[data-act=report-save]"); await p.waitForTimeout(600); await p.waitForSelector("#m-rep >> text=Terkirim");
  });
  await shot("06-member-after");
  await step("wulan's code session cannot enter Mode Admin without password", async () => {
    await p.click("[data-act=mode][data-v=admin]"); await p.waitForSelector("text=Mode Admin memerlukan password");
    await p.click("[data-act=pw-new]"); await p.fill("#npw1", "passwordbaru1"); await p.fill("#npw2", "passwordbaru1"); await p.click("[data-act=pw-create]");
    await p.waitForSelector("text=Mode admin", { timeout: 4000 });
  });
  await step("admin sees the report", async () => {
    await p.click(".tab:has-text('Laporan')"); await p.waitForTimeout(300); await p.click("tr[data-act=selr]"); await p.waitForSelector("text=Promosi kebersihan di 3 posko");
  });
  await shot("07-admin-laporan");
  await p.setViewportSize({ width: 390, height: 844 }); await p.click(".bnav a:has-text('Beranda')"); await p.waitForTimeout(300); await shot("08-phone-admin");
  console.log(errs.length ? "\nERRORS:\n" + errs.join("\n") : "\nno errors");
  await b.close();
})();
