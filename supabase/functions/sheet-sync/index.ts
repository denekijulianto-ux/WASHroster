// Roster WASH PMI — sinkron otomatis dari spreadsheet jawaban Google Form.
// Dipanggil pg_cron tiap 5 menit (header x-cron-secret) atau oleh admin dari aplikasi.
//   {mode:"test", url}  → baca spreadsheet, kembalikan judul kolom + pratinjau pemetaan
//   {mode:"run"}        → baca spreadsheet di settings.sheet_source, masukkan ke roster
// Spreadsheet harus dibagikan "Siapa saja yang memiliki link – Pelihat" (atau dipublikasikan).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const env = (k: string) => (Deno.env.get(k) || "").trim();

type Src = { url: string; sheet_id?: string; gid?: string; pub?: string; enabled?: boolean };

function parseUrl(raw: string): Src | null {
  const url = String(raw || "").trim();
  if (!/^https:\/\/docs\.google\.com\/spreadsheets\//.test(url)) return null;
  const pub = url.match(/\/spreadsheets\/d\/e\/([A-Za-z0-9_-]+)/);
  const gid = (url.match(/[#&?]gid=(\d+)/) || [])[1] || "0";
  if (pub) return { url, pub: pub[1], gid };
  const id = url.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/);
  if (!id) return null;
  return { url, sheet_id: id[1], gid };
}
const csvUrl = (s: Src) => s.pub
  ? `https://docs.google.com/spreadsheets/d/e/${s.pub}/pub?output=csv&gid=${s.gid || "0"}`
  : `https://docs.google.com/spreadsheets/d/${s.sheet_id}/export?format=csv&gid=${s.gid || "0"}`;

function parseCsv(t: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let f = ""; let q = false;
  t = t.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(f); rows.push(row); row = []; f = "";
    } else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  return rows;
}

async function readSheet(s: Src) {
  const r = await fetch(csvUrl(s), { redirect: "follow" });
  const ct = r.headers.get("content-type") || "";
  const body = await r.text();
  if (!r.ok || ct.includes("text/html") || /^\s*<(!doctype|html)/i.test(body)) {
    throw new Error("Spreadsheet tidak bisa dibaca. Bagikan sebagai \"Siapa saja yang memiliki link – Pelihat\", lalu coba lagi.");
  }
  const rows = parseCsv(body);
  const hi = rows.findIndex((r) => r.filter((c) => c.trim()).length >= 2);
  if (hi < 0) return { headers: [] as string[], items: [] as { answers: Record<string, string>; email: string }[] };
  const headers = rows[hi].map((h) => h.trim());
  const items = rows.slice(hi + 1)
    .filter((r) => r.some((c) => c.trim()))
    .map((r) => {
      const answers: Record<string, string> = {};
      headers.forEach((h, i) => { if (h && !/^(timestamp|cap waktu|stempel waktu)$/i.test(h)) answers[h] = (r[i] || "").trim(); });
      const email = headers.findIndex((h) => /^(email address|alamat email)$/i.test(h));
      return { answers, email: email >= 0 ? (r[email] || "").trim() : "" };
    });
  return { headers, items };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = env("SUPABASE_URL");
  const svc = createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  // Autentikasi: rahasia cron atau admin yang masuk dengan password.
  let ok = false;
  const cs = req.headers.get("x-cron-secret");
  if (cs) {
    const { data } = await svc.from("cron_secret").select("secret").eq("id", 1).maybeSingle();
    ok = !!data && data.secret === cs;
  } else if (req.headers.get("Authorization")) {
    const uc = createClient(url, env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } }, auth: { persistSession: false },
    });
    const { data } = await uc.rpc("is_admin");
    ok = data === true;
  }
  if (!ok) return json({ error: "forbidden" }, 403);

  const body = await req.json().catch(() => ({}));

  if (body.mode === "test") {
    const s = parseUrl(body.url);
    if (!s) return json({ error: "Link bukan link Google Spreadsheet." }, 400);
    try {
      const { headers, items } = await readSheet(s);
      const preview = [];
      for (const it of items.slice(0, 3)) {
        const { data } = await svc.rpc("_intake_map", { p_answers: it.answers, p_email: it.email || null });
        preview.push(data);
      }
      return json({ ok: true, source: s, headers, rows: items.length, preview });
    } catch (e) { return json({ error: String((e as Error).message || e) }, 400); }
  }

  // mode run
  const { data: st } = await svc.from("settings").select("value").eq("key", "sheet_source").maybeSingle();
  const cfg = (st?.value || {}) as Src & Record<string, unknown>;
  if (!cfg.url || cfg.enabled === false) return json({ ok: true, skipped: "no_source" });
  const s = parseUrl(cfg.url);
  if (!s) return json({ error: "bad_url" }, 400);

  const total = { new: 0, updated: 0, filled: 0, unchanged: 0, errors: 0, first_error: null as string | null, rows: 0 };
  let error: string | null = null;
  try {
    const { items } = await readSheet(s);
    total.rows = items.length;
    for (let i = 0; i < items.length; i += 200) {
      const { data, error: e } = await svc.rpc("_intake_rows", { p_rows: items.slice(i, i + 200) });
      if (e) throw new Error(e.message);
      for (const k of ["new", "updated", "filled", "unchanged", "errors"] as const) total[k] += Number(data?.[k] || 0);
      if (!total.first_error && data?.first_error) total.first_error = data.first_error;
    }
  } catch (e) { error = String((e as Error).message || e).slice(0, 300); }

  const value = { ...cfg, last_at: new Date().toISOString(), last_result: total, last_error: error };
  await svc.from("settings").upsert({ key: "sheet_source", value, updated_at: new Date().toISOString() });
  return json({ ok: !error, ...total, error }, error ? 400 : 200);
});
