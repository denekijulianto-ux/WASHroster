// Roster WASH PMI — masuk anggota dengan email + nomor WhatsApp (tanpa kirim email).
// Cocokkan email & nomor WA dengan data roster (dari Google Form), lalu buat token
// masuk sekali pakai yang ditukar aplikasi menjadi sesi (supabase.auth.verifyOtp).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// 0812-3456-789, +62 812 3456 789, 62812... → 8123456789
const corePhone = (p: string) => {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("62")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
};

const MAX_FAILS = 5;          // percobaan gagal per email
const WINDOW_MIN = 15;        // dalam 15 menit

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { email?: string; phone?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
  const email = String(body.email || "").trim().toLowerCase();
  const phone = corePhone(String(body.phone || ""));
  if (!/^\S+@\S+\.\S+$/.test(email) || phone.length < 8) return json({ error: "bad_request" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const since = new Date(Date.now() - WINDOW_MIN * 60_000).toISOString();
  const { count: fails } = await admin.from("login_attempts").select("id", { count: "exact", head: true })
    .eq("email", email).eq("ok", false).gte("at", since);
  if ((fails ?? 0) >= MAX_FAILS) return json({ error: "too_many_attempts" }, 429);

  const { data: member } = await admin.from("members").select("id, email, phone").eq("email", email).maybeSingle();
  if (!member) {
    await admin.from("login_attempts").insert({ email, ok: false });
    return json({ error: "not_registered" }, 404);
  }
  if (corePhone(member.phone) !== phone) {
    await admin.from("login_attempts").insert({ email, ok: false });
    return json({ error: "phone_mismatch" }, 401);
  }

  // Pastikan akun login ada (dibuat sekali, email dianggap terverifikasi karena cocok dengan data roster).
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error && !/already|exists|registered/i.test(created.error.message)) {
    return json({ error: "server", detail: created.error.message }, 500);
  }
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !link?.properties?.hashed_token) return json({ error: "server", detail: error?.message }, 500);

  await admin.from("login_attempts").insert({ email, ok: true });
  return json({ token_hash: link.properties.hashed_token });
});
