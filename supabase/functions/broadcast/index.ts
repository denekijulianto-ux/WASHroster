// Roster WASH PMI — kirim alert / pengumuman ke semua anggota lewat email (Gmail) dan WhatsApp (Fonnte).
// Hanya admin yang masuk dengan password (public.is_admin()) yang boleh memanggil fungsi ini.
// Rahasia yang dipakai (diisi di Supabase → Edge Functions → Secrets):
//   GMAIL_USER, GMAIL_APP_PASSWORD   → email lewat smtp.gmail.com:465
//   FONNTE_TOKEN                      → WhatsApp lewat api.fonnte.com
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.14";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const env = (k: string) => (Deno.env.get(k) || "").trim();
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
const waNum = (p: string) => { let d = String(p || "").replace(/\D/g, ""); if (!d) return ""; if (d.startsWith("0")) d = "62" + d.slice(1); else if (d.startsWith("8")) d = "62" + d; return d; };

type Alert = { id: string; kind?: string; focus?: string; code: string; title: string; emergency: string; role: string; location: string; start_date: string; dur: number; deadline: string; slots: number; description: string; announce_note: string };

function alertText(a: Alert, link: string) {
  const end = addDays(a.start_date, Math.max(1, a.dur) - 1);
  return `*ALERT PENUGASAN · ROSTER WASH PMI*
Kode: ${a.code}
Operasi: ${a.title}${a.emergency && a.kind !== "non_bencana" ? ` (${a.emergency})` : ""}
${a.kind === "non_bencana" ? `Jenis: ${a.emergency || "Kegiatan non bencana"}\n` : ""}Posisi dibutuhkan: ${a.role}${a.focus ? ` (bidang ${a.focus})` : ""} · ${a.slots} orang
Lokasi: ${a.location}
Periode: ${fmtDate(a.start_date)} – ${fmtDate(end)} (${a.dur} hari)
Batas konfirmasi: ${fmtDate(a.deadline)}
${a.description ? "\n" + a.description + "\n" : ""}
Bila bersedia, masuk ke aplikasi Roster WASH lalu tekan *Ajukan diri* pada alert ini sebelum batas konfirmasi.${link ? "\n" + link : ""}
— Admin Roster WASH PMI`;
}
function announceText(a: Alert, names: { name: string; card_no: string | null }[], link: string) {
  const end = addDays(a.start_date, Math.max(1, a.dur) - 1);
  return `*PENGUMUMAN HASIL SELEKSI · ROSTER WASH PMI*
${a.code} · ${a.role} — ${a.title}
Lokasi: ${a.location}
Periode: ${fmtDate(a.start_date)} – ${fmtDate(end)} (${a.dur} hari)

Anggota terpilih:
${names.map((n, i) => `${i + 1}. ${n.name}${n.card_no ? " (" + n.card_no + ")" : ""}`).join("\n") || "-"}
${a.announce_note ? "\n" + a.announce_note + "\n" : ""}
Anggota terpilih dapat melihat kartu ID penugasan di aplikasi Roster WASH.${link ? "\n" + link : ""}
— Admin Roster WASH PMI`;
}
const toHtml = (t: string) => "<div style=\"font-family:Arial,sans-serif;font-size:14px;line-height:1.5\">" +
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*(.+?)\*/g, "<b>$1</b>").replace(/(https?:\/\/\S+)/g, "<a href=\"$1\">$1</a>").replace(/\n/g, "<br>") + "</div>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = env("SUPABASE_URL");
  const userClient = createClient(url, env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    auth: { persistSession: false },
  });
  const { data: isAdmin } = await userClient.rpc("is_admin");
  if (isAdmin !== true) return json({ error: "admin_only" }, 403);

  const body = await req.json().catch(() => ({}));
  const channels = { email: !!(env("GMAIL_USER") && env("GMAIL_APP_PASSWORD")), wa: !!env("FONNTE_TOKEN") };
  if (body.mode === "status") return json({ channels });

  const kind = body.kind === "announce" ? "announce" : "alert";
  const want = { email: body.email !== false && channels.email, wa: body.wa !== false && channels.wa };
  if (!want.email && !want.wa) return json({ error: "no_channel", channels }, 400);

  const svc = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const { data: a } = await svc.from("alerts").select("*").eq("id", body.alert_id).maybeSingle();
  if (!a) return json({ error: "alert_not_found" }, 404);

  let q = svc.from("members").select("name, email, phone, role, status");
  const wantRole = a.kind === "non_bencana" ? (a.focus || "") : a.role;
  if (kind === "alert" && body.audience === "role" && wantRole) q = q.eq("role", wantRole);
  if (kind === "alert" && body.audience === "available") q = q.eq("status", "tersedia");
  const { data: members } = await q;
  const list = members || [];

  const link = String(body.link || req.headers.get("origin") || "").slice(0, 200);
  let text: string, subject: string;
  if (kind === "announce") {
    const { data: sel } = await svc.from("candidates").select("name, card_no").eq("alert_id", a.id).eq("state", "terpilih");
    text = announceText(a, (sel || []).map((s) => ({ name: s.name || "Anggota roster", card_no: s.card_no })), link);
    subject = `Pengumuman hasil seleksi ${a.code}: ${a.role} — ${a.title}`;
  } else {
    text = alertText(a, link);
    subject = `Alert penugasan ${a.code}: ${a.role} di ${a.location}`;
  }

  const result = { recipients: list.length, email_sent: 0, email_error: null as string | null, wa_sent: 0, wa_error: null as string | null };

  // Email: BCC per 40 penerima agar alamat anggota tidak saling terlihat.
  if (want.email) {
    const emails = [...new Set(list.map((m) => (m.email || "").trim().toLowerCase()).filter((e) => /^\S+@\S+\.\S+$/.test(e)))];
    try {
      const tx = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: env("GMAIL_USER"), pass: env("GMAIL_APP_PASSWORD").replace(/\s/g, "") } });
      for (let i = 0; i < emails.length; i += 40) {
        const bcc = emails.slice(i, i + 40);
        await tx.sendMail({ from: `"Roster WASH PMI" <${env("GMAIL_USER")}>`, to: env("GMAIL_USER"), bcc, subject, text: text.replace(/\*/g, ""), html: toHtml(text) });
        result.email_sent += bcc.length;
      }
    } catch (e) { result.email_error = String((e as Error).message || e).slice(0, 300); }
  }

  // WhatsApp lewat Fonnte: satu permintaan, Fonnte mengantre & memberi jeda antar pesan.
  if (want.wa) {
    const nums = [...new Set(list.map((m) => waNum(m.phone)).filter((n) => n.length >= 10))];
    if (nums.length) {
      try {
        const form = new FormData();
        form.append("target", nums.join(","));
        form.append("message", text);
        form.append("delay", "5-15");
        form.append("countryCode", "62");
        const r = await fetch("https://api.fonnte.com/send", { method: "POST", headers: { Authorization: env("FONNTE_TOKEN") }, body: form });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.status !== false) result.wa_sent = nums.length;
        else result.wa_error = String(j.reason || j.detail || `HTTP ${r.status}`).slice(0, 300);
      } catch (e) { result.wa_error = String((e as Error).message || e).slice(0, 300); }
    }
  }

  const { data: who } = await userClient.auth.getUser();
  await svc.from("broadcasts").insert({ kind, alert_id: a.id, audience: kind === "alert" ? (body.audience || "all") : "all", ...result, sent_by: who?.user?.id || null });
  return json({ ok: true, ...result, channels });
});
