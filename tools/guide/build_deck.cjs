// Builds the member guide deck: node tools/guide/build_deck.cjs <shotsDir> <out.pptx>
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const SHOTS = process.argv[2];
const OUT = process.argv[3];
const img = n => path.join(SHOTS, n + ".png");

const THEME = {
  name: "Roster WASH PMI",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "13233A", lt1: "FFFFFF", dk2: "B5121B", lt2: "EEF4FB",
    accent1: "C8102E", accent2: "2F78D4", accent3: "1F9D55", accent4: "F2B705", accent5: "5B6B82", accent6: "DCE7F5",
    hlink: "2F78D4", folHlink: "5B6B82",
  },
};

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pres.title = "Panduan Aplikasi Roster WASH PMI untuk Anggota";
  pres.author = "Admin Roster WASH PMI";
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
  const C = pres.SchemeColor;

  // ---------- layouts ----------
  pres.defineSlideMaster({
    title: "Judul", background: { color: THEME.colors.accent1 },
    objects: [],
  });
  pres.defineSlideMaster({
    title: "Bagian", background: { color: THEME.colors.dk1 },
    objects: [
      { placeholder: { options: { name: "num", type: "body", x: 0.8, y: 2.0, w: 3, h: 1.2, fontSize: 72, bold: true, color: C.accent1, fontFace: THEME.headFontFace, align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 3.2, w: 11.5, h: 1.2, fontSize: 44, bold: true, color: C.background1, fontFace: THEME.headFontFace, align: "left", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.4, w: 10, h: 1.0, fontSize: 18, color: C.accent6, align: "left", margin: 0 }, text: "" } },
    ],
  });
  pres.defineSlideMaster({
    title: "Isi", background: { color: THEME.colors.lt1 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.45, w: 12.1, h: 0.9, fontSize: 36, bold: true, color: C.text1, fontFace: THEME.headFontFace, valign: "top", align: "left", margin: 0 }, text: "" } },
      { text: { text: "Panduan Anggota · Roster WASH PMI", options: { x: 0.6, y: 7.0, w: 6, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
    ],
    slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: THEME.colors.accent5, align: "right" },
  });

  // ---------- helpers ----------
  // phone frame: navy rounded body with the screenshot inset
  const phone = (s, file, x, y, h, name) => {
    const w = h * (780 / 1688);
    const pad = 0.09;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2, rectRadius: 0.22, fill: { color: C.text1 }, line: { color: C.text1 }, shadow: { type: "outer", color: "13233A", opacity: 0.22, blur: 10, offset: 4, angle: 90 }, objectName: (name || "Ponsel") + " bingkai" });
    s.addImage({ path: img(file), x, y, w, h, rounding: false, objectName: name || "Tangkapan layar", altText: name || "Tangkapan layar aplikasi" });
    return w;
  };
  // numbered step row: red circle + bold header + description
  const step = (s, n, head, desc, x, y, w) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: 0.5, h: 0.5, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: "Langkah " + n });
    s.addText(String(n), { x, y, w: 0.5, h: 0.5, fontSize: 16, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "Nomor " + n });
    s.addText([{ text: head, options: { bold: true, fontSize: 18, color: C.text1, breakLine: true } }, { text: desc, options: { fontSize: 15, color: C.accent5 } }],
      { x: x + 0.7, y: y - 0.05, w: w - 0.7, h: 1.0, valign: "top", margin: 0, paraSpaceAfter: 3, isTextBox: true, objectName: "Teks langkah " + n });
  };
  const tip = (s, text, x, y, w, h, kind) => {
    const fill = kind === "warn" ? "FDECEE" : THEME.colors.lt2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill }, objectName: "Kotak tips" });
    s.addText(text, { x: x + 0.25, y, w: w - 0.5, h, fontSize: 14, color: C.text1, valign: "middle", margin: 0, isTextBox: true, objectName: "Teks tips" });
  };
  const content = (title, sec) => { const s = pres.addSlide({ masterName: "Isi", sectionTitle: sec }); s.addText(title, { placeholder: "title" }); return s; };
  const divider = (num, title, body, sec) => {
    pres.addSection({ title: sec });
    const s = pres.addSlide({ masterName: "Bagian", sectionTitle: sec });
    s.addText(num, { placeholder: "num" }); s.addText(title, { placeholder: "title" }); s.addText(body, { placeholder: "body" });
    return s;
  };

  // ---------- 1. title ----------
  pres.addSection({ title: "Pembuka" });
  let s = pres.addSlide({ masterName: "Judul", sectionTitle: "Pembuka" });
  s.addText("PANDUAN UNTUK ANGGOTA", { x: 0.8, y: 1.3, w: 7.5, h: 0.4, fontSize: 16, bold: true, color: C.background1, charSpacing: 4, margin: 0, isTextBox: true, objectName: "Label" });
  s.addText("Aplikasi Roster WASH PMI", { x: 0.8, y: 1.8, w: 7.5, h: 2.0, fontSize: 48, bold: true, color: C.background1, fontFace: THEME.headFontFace, valign: "top", margin: 0, isTextBox: true, objectName: "Judul" });
  s.addText("Daftar, terima alert penugasan, ajukan diri, lihat kartu ID, dan kirim laporan — semua dari HP.", { x: 0.8, y: 3.9, w: 6.8, h: 1.0, fontSize: 18, color: C.background1, valign: "top", margin: 0, isTextBox: true, objectName: "Subjudul" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 5.4, w: 4.4, h: 0.7, rectRadius: 0.35, fill: { color: C.background1 }, line: { color: C.background1 }, objectName: "Kotak alamat" });
  s.addText("was-hroster.vercel.app", { x: 0.8, y: 5.4, w: 4.4, h: 0.7, fontSize: 20, bold: true, color: C.accent1, align: "center", valign: "middle", margin: 0, isTextBox: true, hyperlink: { url: "https://was-hroster.vercel.app" }, objectName: "Alamat aplikasi" });
  phone(s, "04-home", 9.2, 0.75, 6.0, "Beranda anggota");
  s.addNotes("Panduan ini untuk anggota roster WASH PMI. Aplikasi dibuka di browser HP, tidak perlu memasang aplikasi apa pun.");

  // ---------- 2. overview ----------
  s = content("Alurnya dalam 6 langkah", "Pembuka");
  const flow = [["Isi Google Form", "Daftar dengan email aktif, No. WA, dan No. MIS (SIAMO)"], ["Aktifkan akun", "Masukkan email + No. WA yang sama dengan di Form"], ["Buat password", "Minimal 8 karakter, dipakai untuk masuk berikutnya"], ["Ajukan diri", "Pilih alert penugasan yang sesuai lalu tekan Ajukan diri"], ["Lihat pengumuman", "Hasil seleksi muncul di Beranda, email, dan grup WA"], ["Kartu ID & laporan", "Tunjukkan kartu saat bertugas, kirim laporan setelahnya"]];
  flow.forEach(([h, d], i) => {
    const col = i % 3, row = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.75 + row * 2.55;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.8, h: 2.2, rectRadius: 0.15, fill: { color: THEME.colors.lt2 }, line: { color: THEME.colors.lt2 }, objectName: "Kartu langkah " + (i + 1) });
    s.addText(String(i + 1), { x: x + 0.3, y: y + 0.25, w: 1, h: 0.7, fontSize: 40, bold: true, color: C.accent1, margin: 0, isTextBox: true, objectName: "Angka " + (i + 1) });
    s.addText([{ text: h, options: { bold: true, fontSize: 20, color: C.text1, breakLine: true } }, { text: d, options: { fontSize: 15, color: C.accent5 } }], { x: x + 0.3, y: y + 0.95, w: 3.2, h: 1.1, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true, objectName: "Isi langkah " + (i + 1) });
  });

  // ---------- section 1: register & sign in ----------
  divider("01", "Daftar & masuk", "Sekali saja di awal: isi Form, aktifkan akun, buat password.", "Daftar & masuk");

  s = content("Daftar lewat Google Form pendaftaran", "Daftar & masuk");
  step(s, 1, "Buka formulir pendaftaran", "Link ada di aplikasi (tombol Isi formulir pendaftaran) atau dari admin.", 0.6, 1.75, 7.2);
  step(s, 2, "Isi data dengan benar", "Pakai email yang aktif dan nomor WhatsApp yang dipakai sehari-hari. Isi juga No. MIS (SIAMO) — tercetak di kartu ID.", 0.6, 2.95, 7.2);
  step(s, 3, "Tunggu ± 5 menit", "Data Form masuk otomatis ke roster. Setelah itu akun bisa diaktifkan.", 0.6, 4.35, 7.2);
  tip(s, "Cukup daftar satu kali. Kalau email sudah terdaftar, data Anda hanya diperbarui — tidak dobel.", 0.6, 5.55, 7.2, 0.95);
  phone(s, "02b-notregistered", 9.4, 1.45, 5.3, "Email belum terdaftar");
  s.addNotes("Jika muncul pesan 'Email ini belum terdaftar di roster', berarti Form belum diisi atau datanya belum masuk. Tunggu beberapa menit lalu coba lagi.");

  s = content("Aktifkan akun (pertama kali masuk)", "Daftar & masuk");
  step(s, 1, "Buka was-hroster.vercel.app", "Di halaman Masuk, tekan Aktifkan akun.", 0.6, 1.75, 7.2);
  step(s, 2, "Isi email + nomor WhatsApp", "Harus sama dengan yang Anda isi di Google Form. Penulisan 08… atau +62… sama saja.", 0.6, 2.95, 7.2);
  step(s, 3, "Tekan Lanjut buat password", "Jika cocok, Anda langsung diminta membuat password.", 0.6, 4.15, 7.2);
  tip(s, "Pesan \"Nomor WhatsApp tidak cocok\"? Periksa nomor yang Anda isi di Form, atau minta admin memperbaikinya.", 0.6, 5.35, 7.2, 0.95, "warn");
  phone(s, "02-activate", 9.4, 1.45, 5.3, "Aktifkan akun");

  s = content("Buat password, lalu masuk", "Daftar & masuk");
  phone(s, "03-password", 0.9, 1.45, 5.3, "Buat password");
  phone(s, "01-login", 4.4, 1.45, 5.3, "Halaman masuk");
  step(s, 1, "Buat password", "Minimal 8 karakter, ketik dua kali, tekan Simpan password & masuk.", 7.6, 1.75, 5.1);
  step(s, 2, "Berikutnya: Masuk", "Isi email + password di halaman Masuk. Aktifkan akun tidak dipakai lagi.", 7.6, 3.05, 5.1);
  tip(s, "Jangan bagikan password ke siapa pun. Lupa password? Hubungi admin untuk reset, lalu aktifkan akun lagi.", 7.6, 4.45, 5.1, 1.25, "warn");

  // ---------- section 2: home & profile ----------
  divider("02", "Beranda & profil", "Semua informasi Anda ada di satu halaman.", "Beranda & profil");

  s = content("Kenali Beranda anggota", "Beranda & profil");
  phone(s, "04-home", 0.9, 1.45, 5.3, "Beranda anggota");
  const parts = [["Profil singkat", "Nama, profil WASH, markas, No. MIS, email dan WA."], ["Status ketersediaan", "Tersedia atau tidak — atur dengan tombol Tandai tidak tersedia."], ["WASHPEDIA & grup WhatsApp", "Tepat di bawah profil: pusat informasi WASH PMI dan tombol Gabung grup."], ["Menu bawah", "Beranda · Info · Alert · Tugas · Kartu · Laporan: lompat ke bagian itu."]];
  parts.forEach(([h, d], i) => step(s, i + 1, h, d, 4.4, 1.65 + i * 1.25, 8.3));

  s = content("WASHPEDIA dan grup WhatsApp Roster", "Beranda & profil");
  phone(s, "11-wagroup", 9.4, 1.45, 5.3, "WASHPEDIA dan grup WhatsApp");
  step(s, 1, "Buka WASHPEDIA", "Banner biru di Beranda (juga di halaman Masuk). Pusat informasi tentang WASH PMI — terbuka di tab baru.", 0.6, 1.75, 7.6);
  step(s, 2, "Gabung grup WhatsApp Roster WASH", "Tekan Gabung grup. Alert penugasan dan pengumuman hasil seleksi juga dikirim ke grup ini.", 0.6, 3.05, 7.6);
  step(s, 3, "Pastikan email aktif", "Alert dan pengumuman juga dikirim lewat email. Cek folder Spam/Promosi bila tidak masuk.", 0.6, 4.35, 7.6);
  tip(s, "WASHPEDIA bisa dibuka tanpa login: link langsung bit.ly/WASHPEDIA2026", 0.6, 5.6, 7.6, 0.85);

  s = content("Lengkapi profil agar mudah terpilih", "Beranda & profil");
  phone(s, "10b-profile-origin", 9.4, 1.45, 5.3, "Ubah profil");
  step(s, 1, "Tekan Ubah profil", "Pasang foto wajah tampak depan — dipakai di kartu ID.", 0.6, 1.75, 7.6);
  step(s, 2, "Pilih Asal Markas PMI", "Kabupaten/Kota, Provinsi, Markas Pusat PMI, IFRC, atau Partner National Societies.", 0.6, 2.95, 7.6);
  step(s, 3, "Tulis keahlian & sertifikasi", "Mis. PHAST, operator WTU, MTDB, TOT fasilitator. Sistem memakai ini untuk mencocokkan Anda dengan penugasan.", 0.6, 4.15, 7.6);
  tip(s, "Profil yang lengkap dan status \"Tersedia\" membuat Anda muncul di urutan atas daftar kandidat.", 0.6, 5.55, 7.6, 0.95);

  // ---------- section 3: alerts ----------
  divider("03", "Alert & pengajuan diri", "Penugasan bencana maupun non bencana.", "Alert penugasan");

  s = content("Dua jenis penugasan", "Alert penugasan");
  const kinds = [["Bencana", C.accent1, "Banjir, gempa, longsor, kekeringan, pengungsian…", "Posisi: profil WASH — Suplai Air Bersih, Sanitasi & Limbah, Promosi Kebersihan, Kualitas Air, dan lainnya."], ["Non bencana", C.accent2, "Pelatihan, workshop, simulasi, asesmen…", "Posisi: Fasilitator, Peserta, Narasumber, Panitia, Asesor, Moderator, Notulis/Dokumentasi."]];
  kinds.forEach(([h, col, ex, pos], i) => {
    const x = 0.6 + i * 6.2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.7, w: 5.9, h: 3.0, rectRadius: 0.15, fill: { color: THEME.colors.lt2 }, line: { color: THEME.colors.lt2 }, objectName: "Kartu " + h });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.35, y: 2.0, w: 2.2, h: 0.55, rectRadius: 0.27, fill: { color: col }, line: { color: col }, objectName: "Label " + h });
    s.addText(h, { x: x + 0.35, y: 2.0, w: 2.2, h: 0.55, fontSize: 18, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "Teks label " + h });
    s.addText([{ text: ex, options: { bold: true, fontSize: 18, color: C.text1, breakLine: true } }, { text: pos, options: { fontSize: 16, color: C.accent5 } }], { x: x + 0.35, y: 2.85, w: 5.2, h: 1.7, valign: "top", margin: 0, paraSpaceAfter: 8, isTextBox: true, objectName: "Isi " + h });
  });
  tip(s, "Ajukan diri hanya bila Anda benar-benar bisa berangkat. Cara admin memilih kandidat dijelaskan di bagian 04.", 0.6, 5.0, 12.1, 0.95);

  s = content("Ajukan diri pada alert", "Alert penugasan");
  phone(s, "05-alert", 0.9, 1.45, 5.3, "Alert terbuka");
  phone(s, "06-submitted", 4.4, 1.45, 5.3, "Pengajuan terkirim");
  step(s, 1, "Baca alert", "Posisi, lokasi, tanggal mulai, durasi, dan batas konfirmasi.", 7.6, 1.75, 5.1);
  step(s, 2, "Tekan Ajukan diri", "Label \"Sesuai profil Anda\" menandai alert yang cocok.", 7.6, 2.95, 5.1);
  step(s, 3, "Pengajuan terkirim", "Tunggu hasil seleksi. Berubah pikiran? Tekan Batalkan pengajuan.", 7.6, 4.15, 5.1);
  tip(s, "Diundang langsung oleh admin? Jawab dengan Saya bersedia atau Tidak bisa.", 7.6, 5.45, 5.1, 0.95);

  // ---------- section 4: after selection ----------
  divider("04", "Cara kami memilih kandidat", "Transparan: skor kecocokan membantu, keputusan akhir tetap di tangan admin.", "Seleksi kandidat");

  s = content("Alur seleksi kandidat", "Seleksi kandidat");
  const sel = [["Alert dibuat", "Admin menentukan jenis penugasan, posisi, lokasi, tanggal, dan jumlah orang."], ["Skor kecocokan dihitung", "Sistem memberi setiap anggota skor 0–100 dari profilnya (lihat kriteria)."], ["Admin meninjau", "Anggota diurutkan dari skor tertinggi, lengkap dengan alasannya. Admin mengundang yang paling cocok."], ["Anggota menjawab", "Anda bisa mengajukan diri sendiri, atau menjawab undangan: bersedia / tidak bisa."], ["Keputusan admin", "Admin memilih dari yang bersedia, dengan mempertimbangkan kebutuhan lapangan dan komposisi tim."], ["Pengumuman", "Nama terpilih diumumkan; kartu ID langsung terbit."]];
  sel.forEach(([h, d], i) => {
    const col = i % 3, row = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.7 + row * 2.6;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.8, h: 2.3, rectRadius: 0.15, fill: { color: i === 4 ? "FDECEE" : THEME.colors.lt2 }, line: { color: i === 4 ? "FDECEE" : THEME.colors.lt2 }, objectName: "Tahap " + (i + 1) });
    s.addText(String(i + 1), { x: x + 0.3, y: y + 0.2, w: 1, h: 0.7, fontSize: 36, bold: true, color: C.accent1, margin: 0, isTextBox: true, objectName: "Nomor tahap " + (i + 1) });
    s.addText([{ text: h, options: { bold: true, fontSize: 18, color: C.text1, breakLine: true } }, { text: d, options: { fontSize: 14, color: C.accent5 } }], { x: x + 0.3, y: y + 0.85, w: 3.25, h: 1.35, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true, objectName: "Isi tahap " + (i + 1) });
  });
  s.addNotes("Skor kecocokan adalah alat bantu agar admin cepat menemukan anggota yang relevan. Keputusan akhir tetap diambil admin, misalnya untuk menyeimbangkan komposisi tim atau kebutuhan khusus di lapangan.");

  s = content("Kriteria dan bobot skor kecocokan", "Seleksi kandidat");
  const cats = ["Profil / bidang WASH sama", "Keahlian sesuai posisi (khusus non bencana)", "Keahlian sesuai jenis penugasan", "Status tersedia", "Pengalaman penugasan", "Provinsi sama dengan lokasi", "Level (Team Leader / Staf)", "Pernah menangani jenis ini", "Mengajukan diri sendiri"];
  s.addChart(pres.charts.BAR, [
    { name: "Bencana", labels: cats, values: [40, 0, 20, 15, 15, 10, 8, 5, 5] },
    { name: "Non bencana", labels: cats, values: [25, 30, 20, 15, 15, 6, 8, 5, 5] },
  ], { x: 0.5, y: 1.45, w: 8.2, h: 5.35, barDir: "bar", barGrouping: "clustered", catAxisOrientation: "maxMin", chartColors: [THEME.colors.accent1, THEME.colors.accent2],
    showValue: true, dataLabelPosition: "outEnd", dataLabelFontSize: 11, dataLabelColor: THEME.colors.dk1, dataLabelFontFace: "+mn-lt",
    catAxisLabelFontSize: 12, catAxisLabelColor: THEME.colors.dk1, catAxisLabelFontFace: "+mn-lt", valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    showLegend: true, legendPos: "t", legendFontSize: 12, legendFontFace: "+mn-lt", legendColor: THEME.colors.dk1,
    showTitle: true, title: "Poin maksimum per kriteria", titleFontSize: 14, titleColor: THEME.colors.dk1, titleFontFace: "+mn-lt", barGapWidthPct: 60, objectName: "Grafik bobot kriteria" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.0, y: 1.6, w: 3.7, h: 2.55, rectRadius: 0.15, fill: { color: "FDECEE" }, line: { color: "FDECEE" }, objectName: "Kotak pengurang" });
  s.addText([{ text: "Pengurang skor", options: { bold: true, fontSize: 18, color: C.text1, breakLine: true } }, { text: "Sedang bertugas di penugasan lain: −40", options: { fontSize: 14, color: C.text1, bullet: true, breakLine: true } }, { text: "Menandai diri tidak tersedia: −25", options: { fontSize: 14, color: C.text1, bullet: true, breakLine: true } }, { text: "Peserta pelatihan yang sudah menguasai topiknya: −10", options: { fontSize: 14, color: C.text1, bullet: true } }],
    { x: 9.25, y: 1.75, w: 3.25, h: 2.3, valign: "top", margin: 0, paraSpaceAfter: 6, isTextBox: true, objectName: "Isi pengurang" });
  tip(s, "Total dibatasi 0–100. Admin melihat skor dan alasannya, mis. \"Cocok karena profil cocok, tersedia, keahlian: PHAST, provinsi sama.\"", 9.0, 4.4, 3.7, 2.1);
  s.addNotes("Bobot ini sama dengan yang dipakai aplikasi. Keahlian dibaca dari kolom Keahlian & sertifikasi di profil, jadi tulis pelatihan dan sertifikat Anda dengan jelas.");

  s = content("Penugasan non bencana: cocok per posisi", "Seleksi kandidat");
  const posm = [["Fasilitator", "TOT/TOF, fasilitator, pelatih, trainer, instruktur, PHAST/CHAST"], ["Narasumber / Pembicara", "Narasumber, pembicara, ahli/pakar, dosen, peneliti"], ["Asesor", "Asesor, BNSP, sertifikasi, penguji"], ["Moderator", "Moderator, MC, pembawa acara, fasilitator"], ["Panitia / Penyelenggara", "Panitia, logistik, administrasi, keuangan, event"], ["Notulis / Dokumentasi", "Notulis, dokumentasi, foto, video, media, humas"]];
  posm.forEach(([h, d], i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 0.6 + col * 4.3, y = 1.65 + row * 1.45;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.05, h: 1.25, rectRadius: 0.12, fill: { color: THEME.colors.lt2 }, line: { color: THEME.colors.lt2 }, objectName: "Posisi " + h });
    s.addText([{ text: h, options: { bold: true, fontSize: 16, color: C.text1, breakLine: true } }, { text: d, options: { fontSize: 13, color: C.accent5 } }], { x: x + 0.25, y: y + 0.12, w: 3.6, h: 1.05, valign: "top", margin: 0, paraSpaceAfter: 3, isTextBox: true, objectName: "Kata kunci " + h });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.3, y: 1.65, w: 3.4, h: 4.15, rectRadius: 0.15, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: "Kotak peserta" });
  s.addText([{ text: "Peserta", options: { bold: true, fontSize: 20, color: C.background1, breakLine: true } }, { text: "Relawan (KSR/TSR) diprioritaskan sebagai sasaran pelatihan.", options: { fontSize: 15, color: C.background1, breakLine: true } }, { text: "Anggota yang keahliannya sudah memuat topik pelatihan diturunkan sedikit, agar kesempatan belajar merata.", options: { fontSize: 15, color: C.background1 } }],
    { x: 9.55, y: 1.85, w: 2.9, h: 3.8, valign: "top", margin: 0, paraSpaceAfter: 10, isTextBox: true, objectName: "Isi peserta" });
  tip(s, "Kata kunci dicari di kolom Keahlian & sertifikasi. Tiap kata kunci yang cocok menambah 10 poin (maks. 30).", 0.6, 6.05, 12.1, 0.7);

  s = content("Tips agar peluang terpilih lebih besar", "Seleksi kandidat");
  const tips = [["Tulis keahlian dengan jelas", "Sebut nama pelatihan & sertifikat: PHAST, MTDB, Satgana, TOT, operator WTU, BNSP…"], ["Jaga status ketersediaan", "Tersedia menambah poin. Tandai tidak tersedia hanya saat memang berhalangan."], ["Lengkapi provinsi & asal markas", "Anggota dari provinsi lokasi penugasan mendapat poin tambahan."], ["Ajukan diri sebelum batas konfirmasi", "Pengajuan sendiri menambah poin dan langsung terlihat oleh admin."]];
  tips.forEach(([h, d], i) => step(s, i + 1, h, d, 0.6 + (i % 2) * 6.2, 1.8 + Math.floor(i / 2) * 1.6, 5.8));
  tip(s, "Pengalaman ikut dihitung: setiap penugasan yang Anda jalani lewat roster menambah poin untuk penugasan berikutnya.", 0.6, 5.0, 12.1, 0.85);

  divider("05", "Setelah terpilih", "Pengumuman, kartu ID, dan laporan.", "Setelah terpilih");

  s = content("Pengumuman hasil seleksi", "Setelah terpilih");
  phone(s, "07-announcement", 0.9, 1.45, 5.3, "Pengumuman");
  step(s, 1, "Muncul di Beranda", "Bagian Pengumuman anggota terpilih, dengan nama-nama yang terpilih.", 4.4, 1.75, 8.3);
  step(s, 2, "Juga lewat email & grup WhatsApp", "Pastikan email aktif dan Anda sudah bergabung ke grup WhatsApp Roster WASH.", 4.4, 2.95, 8.3);
  step(s, 3, "Ikuti catatan admin", "Mis. jadwal briefing dan lokasi kumpul.", 4.4, 4.15, 8.3);
  tip(s, "Terpilih? Kotak \"Selamat, Anda terpilih\" muncul dan status Anda berubah menjadi Ditugaskan.", 4.4, 5.35, 8.3, 0.95);

  s = content("Kartu ID penugasan", "Setelah terpilih");
  phone(s, "08-idcard", 9.4, 1.45, 5.3, "Kartu ID penugasan");
  step(s, 1, "Buka menu Kartu", "Tekan Kartu ID pada penugasan Anda.", 0.6, 1.75, 7.6);
  step(s, 2, "Isi kartu", "Foto, nama, posisi, No. MIS (SIAMO), lokasi, periode, nomor kartu, dan kode QR.", 0.6, 2.95, 7.6);
  step(s, 3, "Simpan ke HP", "Tekan lama gambar kartu lalu simpan, atau unduh. Tunjukkan saat bertugas.", 0.6, 4.15, 7.6);
  tip(s, "Foto tidak muncul di kartu? Pasang foto profil lewat Ubah profil, lalu buka kartunya lagi.", 0.6, 5.45, 7.6, 0.95, "warn");

  s = content("Kirim laporan pasca penugasan", "Setelah terpilih");
  phone(s, "09-report", 0.9, 1.45, 5.3, "Form laporan");
  step(s, 1, "Buka menu Laporan", "Tombol Isi laporan muncul setelah penugasan dimulai.", 4.4, 1.75, 8.3);
  step(s, 2, "Isi ringkasan & angka capaian", "Air bersih didistribusikan, penerima manfaat, fasilitas sanitasi, sesi promosi kebersihan, sampel kualitas air.", 4.4, 2.95, 8.3);
  step(s, 3, "Kondisi, kendala, rekomendasi", "Lalu tekan Kirim laporan. Status berubah menjadi Terkirim.", 4.4, 4.35, 8.3);
  tip(s, "Laporan langsung terbaca oleh admin dan dipakai untuk evaluasi penugasan berikutnya.", 4.4, 5.55, 8.3, 0.8);

  // ---------- closing ----------
  pres.addSection({ title: "Penutup" });
  s = content("Pertanyaan yang sering muncul", "Penutup");
  const faq = [["Lupa password?", "Hubungi admin untuk reset akses, lalu tekan Aktifkan akun dan buat password baru."], ["Ganti nomor WA atau email?", "Ubah nomor WA di Ubah profil. Untuk ganti email, hubungi admin."], ["Sedang tidak bisa bertugas?", "Tekan Tandai tidak tersedia di Beranda agar tidak diundang dulu."], ["Tidak menerima alert?", "Cek folder Spam/Promosi di email, dan pastikan sudah gabung grup WhatsApp."]];
  faq.forEach(([q, a], i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 0.6 + col * 6.2, y = 1.7 + row * 2.5;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 5.9, h: 2.2, rectRadius: 0.15, fill: { color: THEME.colors.lt2 }, line: { color: THEME.colors.lt2 }, objectName: "Kartu FAQ " + (i + 1) });
    s.addShape(pres.shapes.OVAL, { x: x + 0.3, y: y + 0.3, w: 0.5, h: 0.5, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: "Ikon tanya " + (i + 1) });
    s.addText("?", { x: x + 0.3, y: y + 0.3, w: 0.5, h: 0.5, fontSize: 18, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "Tanda tanya " + (i + 1) });
    s.addText([{ text: q, options: { bold: true, fontSize: 18, color: C.text1, breakLine: true } }, { text: a, options: { fontSize: 15, color: C.accent5 } }], { x: x + 1.0, y: y + 0.27, w: 4.6, h: 1.75, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true, objectName: "Isi FAQ " + (i + 1) });
  });

  s = pres.addSlide({ masterName: "Judul", sectionTitle: "Penutup" });
  s.addText("Siap bertugas", { x: 0.8, y: 1.6, w: 7.5, h: 1.2, fontSize: 48, bold: true, color: C.background1, fontFace: THEME.headFontFace, margin: 0, isTextBox: true, objectName: "Judul penutup" });
  s.addText([{ text: "1. Isi Google Form pendaftaran", options: { breakLine: true } }, { text: "2. Aktifkan akun dan buat password", options: { breakLine: true } }, { text: "3. Lengkapi profil dan gabung grup WhatsApp", options: { breakLine: true } }, { text: "4. Pantau alert, ajukan diri, kirim laporan", options: { breakLine: true } }, { text: "5. Buka WASHPEDIA untuk info WASH PMI" }],
    { x: 0.8, y: 2.85, w: 7.2, h: 2.4, fontSize: 20, color: C.background1, valign: "top", margin: 0, paraSpaceAfter: 8, isTextBox: true, objectName: "Ringkasan" });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 5.4, w: 4.4, h: 0.7, rectRadius: 0.35, fill: { color: C.background1 }, line: { color: C.background1 }, objectName: "Kotak alamat" });
  s.addText("was-hroster.vercel.app", { x: 0.8, y: 5.4, w: 4.4, h: 0.7, fontSize: 20, bold: true, color: C.accent1, align: "center", valign: "middle", margin: 0, isTextBox: true, hyperlink: { url: "https://was-hroster.vercel.app" }, objectName: "Alamat aplikasi" });
  phone(s, "08-idcard", 9.2, 0.75, 6.0, "Kartu ID");

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
