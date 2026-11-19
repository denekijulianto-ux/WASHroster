-- =====================================================================
-- Roster WASH PMI — skema database Supabase
-- Jalankan sekali di Supabase: Dashboard → SQL Editor → New query →
-- tempel seluruh isi file ini → Run.
-- Aman dijalankan ulang (idempotent) untuk memperbarui fungsi & aturan.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tabel ----------------------------------------------------

create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete set null,
  email       text,
  name        text not null,
  phone       text not null default '',
  role        text not null default 'Suplai Air Bersih',
  level       text not null default 'Relawan (KSR/TSR)',
  province    text not null default '',
  chapter     text not null default '',
  skills      text not null default '',
  mis         text not null default '',
  lang        text not null default '',
  status      text not null default 'tersedia' check (status in ('tersedia','ditugaskan','tidak')),
  photo       text not null default '',
  source      text not null default 'manual' check (source in ('daftar','manual','impor','sheet')),
  sheet_sig   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists members_email_uniq on public.members (lower(email)) where email is not null and email <> '';

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  added_by   uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  title         text not null,
  emergency     text not null default '',
  role          text not null,
  location      text not null,
  start_date    date not null,
  dur           int  not null check (dur > 0),
  deadline      date not null,
  slots         int  not null default 1 check (slots > 0),
  description   text not null default '',
  status        text not null default 'terbuka' check (status in ('terbuka','terisi','ditutup')),
  announce_at   timestamptz,
  announce_note text not null default '',
  created_at    timestamptz not null default now()
);

create table if not exists public.candidates (
  alert_id      uuid not null references public.alerts(id) on delete cascade,
  member_id     uuid not null references public.members(id) on delete cascade,
  state         text not null check (state in ('diundang','mengajukan','bersedia','menolak','terpilih')),
  self_response boolean not null default false,
  invited_at    timestamptz,
  answered_at   timestamptz,
  email_at      timestamptz,
  wa_at         timestamptz,
  card_no       text,
  selected_at   timestamptz,
  name          text,      -- nama publik anggota terpilih (untuk pengumuman & penugasan berlangsung)
  thumb         text,      -- URL foto anggota terpilih
  primary key (alert_id, member_id)
);

create table if not exists public.reports (
  alert_id     uuid not null references public.alerts(id) on delete cascade,
  member_id    uuid not null references public.members(id) on delete cascade,
  summary      text not null,
  metrics      jsonb not null default '{}'::jsonb,
  cond         text not null default 'baik' check (cond in ('baik','lelah','dukungan')),
  issues       text not null default '',
  recs         text not null default '',
  seen         boolean not null default false,
  submitted_at timestamptz not null default now(),
  primary key (alert_id, member_id)
);

create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists members_touch on public.members;
create trigger members_touch before update on public.members for each row execute function public.touch_updated_at();

-- ---------- Fungsi peran ---------------------------------------------

-- Akun ini terdaftar sebagai admin (belum tentu masuk dengan password).
create or replace function public.is_admin_account() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- Admin yang AKTIF: terdaftar sebagai admin DAN sesi ini masuk dengan password.
-- Sesi yang masuk dengan kode email saja tidak mendapat hak admin.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin_account() and coalesce((
    select bool_or(x->>'method' = 'password')
    from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) x
  ), false)
$$;

create or replace function public.my_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.members where user_id = auth.uid()
$$;

-- ---------- Row Level Security ---------------------------------------

alter table public.members    enable row level security;
alter table public.admins     enable row level security;
alter table public.alerts     enable row level security;
alter table public.candidates enable row level security;
alter table public.reports    enable row level security;
alter table public.settings   enable row level security;

drop policy if exists members_read on public.members;
create policy members_read on public.members for select to authenticated
  using (public.is_admin() or user_id = auth.uid());
drop policy if exists members_admin_write on public.members;
create policy members_admin_write on public.members for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

drop policy if exists alerts_read on public.alerts;
create policy alerts_read on public.alerts for select to authenticated using (true);
drop policy if exists alerts_admin_write on public.alerts;
create policy alerts_admin_write on public.alerts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists candidates_read on public.candidates;
create policy candidates_read on public.candidates for select to authenticated
  using (public.is_admin() or member_id = public.my_member_id() or state = 'terpilih');
drop policy if exists candidates_admin_write on public.candidates;
create policy candidates_admin_write on public.candidates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select to authenticated
  using (public.is_admin() or member_id = public.my_member_id());
drop policy if exists reports_admin_write on public.reports;
create policy reports_admin_write on public.reports for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to authenticated
  using (key = 'app' or public.is_admin());
drop policy if exists settings_admin_write on public.settings;
create policy settings_admin_write on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Nama markas tampil juga di halaman masuk (sebelum login).
create or replace function public.app_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.settings where key = 'app'), '{}'::jsonb)
$$;

-- ---------- Fungsi untuk anggota (dipanggil dari aplikasi) -----------

-- Daftar / perbarui profil sendiri. Email selalu diambil dari akun yang
-- sudah terverifikasi lewat kode email, tidak bisa diisi bebas.
create or replace function public.save_my_profile(p jsonb) returns public.members
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mail text := lower(coalesce(auth.jwt()->>'email', ''));
  r public.members;
  st text := coalesce(p->>'status', 'tersedia');
begin
  if uid is null then raise exception 'Belum masuk' using errcode = '28000'; end if;
  if coalesce(trim(p->>'name'), '') = '' then raise exception 'Nama wajib diisi' using errcode = '22023'; end if;
  if st not in ('tersedia','tidak') then st := 'tersedia'; end if;

  select * into r from public.members where user_id = uid;
  if not found and mail <> '' then
    -- data impor/Sheets dengan email yang sama: klaim baris itu
    select * into r from public.members where lower(email) = mail and user_id is null limit 1;
  end if;

  if r.id is null then
    insert into public.members (user_id, email, name, phone, role, level, province, chapter, skills, lang, mis, status, photo, source)
    values (uid, mail, trim(p->>'name'), coalesce(p->>'phone',''), coalesce(nullif(p->>'role',''),'Suplai Air Bersih'),
            coalesce(nullif(p->>'level',''),'Relawan (KSR/TSR)'), coalesce(p->>'province',''), coalesce(p->>'chapter',''),
            coalesce(p->>'skills',''), coalesce(p->>'lang',''), trim(coalesce(p->>'mis','')), st, coalesce(p->>'photo',''), 'daftar')
    returning * into r;
  else
    update public.members set
      user_id  = uid,
      email    = case when mail <> '' then mail else email end,
      name     = trim(p->>'name'),
      phone    = coalesce(p->>'phone', phone),
      role     = coalesce(nullif(p->>'role',''), role),
      level    = coalesce(nullif(p->>'level',''), level),
      province = coalesce(p->>'province', province),
      chapter  = coalesce(p->>'chapter', chapter),
      skills   = coalesce(p->>'skills', skills),
      lang     = coalesce(p->>'lang', lang),
      mis      = coalesce(trim(p->>'mis'), mis),
      photo    = coalesce(p->>'photo', photo),
      status   = case when status = 'ditugaskan' then status else st end
    where id = r.id returning * into r;
  end if;
  return r;
end $$;

create or replace function public.set_my_status(s text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if s not in ('tersedia','tidak') then raise exception 'Status tidak valid' using errcode = '22023'; end if;
  update public.members set status = s where user_id = auth.uid() and status <> 'ditugaskan';
end $$;

-- Jawab undangan (bersedia/menolak) atau ajukan diri pada alert terbuka.
create or replace function public.respond(p_alert uuid, p_state text) returns void
language plpgsql security definer set search_path = public as $$
declare
  mid uuid := public.my_member_id();
  a public.alerts;
  c public.candidates;
  mstatus text;
begin
  if mid is null then raise exception 'Daftar dulu sebagai anggota' using errcode = '28000'; end if;
  if p_state not in ('bersedia','menolak') then raise exception 'Jawaban tidak valid' using errcode = '22023'; end if;
  select * into a from public.alerts where id = p_alert;
  if not found or a.status <> 'terbuka' then raise exception 'Alert sudah ditutup' using errcode = '22023'; end if;
  select status into mstatus from public.members where id = mid;
  select * into c from public.candidates where alert_id = p_alert and member_id = mid;
  if found then
    if c.state = 'terpilih' then raise exception 'Anda sudah terpilih' using errcode = '22023'; end if;
    if p_state = 'bersedia' and mstatus = 'ditugaskan' then raise exception 'Anda sedang bertugas' using errcode = '22023'; end if;
    update public.candidates set
      state = case when p_state = 'menolak' then 'menolak'
                   when invited_at is not null or state in ('diundang','bersedia') then 'bersedia' else 'mengajukan' end,
      self_response = true, answered_at = now()
    where alert_id = p_alert and member_id = mid;
  else
    if p_state = 'menolak' then return; end if;
    if mstatus = 'ditugaskan' then raise exception 'Anda sedang bertugas' using errcode = '22023'; end if;
    if a.deadline < current_date then raise exception 'Batas konfirmasi sudah lewat' using errcode = '22023'; end if;
    insert into public.candidates (alert_id, member_id, state, self_response, answered_at)
    values (p_alert, mid, 'mengajukan', true, now());
  end if;
end $$;

-- Laporan pasca penugasan (hanya untuk anggota yang terpilih & penugasan sudah mulai).
create or replace function public.submit_report(p_alert uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  mid uuid := public.my_member_id();
  a public.alerts;
begin
  if mid is null then raise exception 'Daftar dulu sebagai anggota' using errcode = '28000'; end if;
  if not exists (select 1 from public.candidates where alert_id = p_alert and member_id = mid and state = 'terpilih') then
    raise exception 'Anda tidak ditugaskan pada alert ini' using errcode = '42501';
  end if;
  select * into a from public.alerts where id = p_alert;
  if a.start_date > current_date then raise exception 'Laporan bisa diisi setelah penugasan dimulai' using errcode = '22023'; end if;
  if length(coalesce(trim(p->>'summary'),'')) < 10 then raise exception 'Ringkasan kegiatan terlalu pendek' using errcode = '22023'; end if;
  insert into public.reports (alert_id, member_id, summary, metrics, cond, issues, recs, seen, submitted_at)
  values (p_alert, mid, trim(p->>'summary'), coalesce(p->'metrics','{}'::jsonb),
          case when p->>'cond' in ('baik','lelah','dukungan') then p->>'cond' else 'baik' end,
          coalesce(p->>'issues',''), coalesce(p->>'recs',''), false, now())
  on conflict (alert_id, member_id) do update set
    summary = excluded.summary, metrics = excluded.metrics, cond = excluded.cond,
    issues = excluded.issues, recs = excluded.recs, seen = false, submitted_at = now();
end $$;

-- ---------- Fungsi admin ---------------------------------------------

-- Tunjuk admin baru. Orang itu harus sudah pernah masuk sekali (dengan kode email).
create or replace function public.add_admin(p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare u uuid;
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  select id into u from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if u is null then
    raise exception 'Email ini belum pernah masuk ke aplikasi. Minta orang tersebut masuk sekali dengan kode email, lalu coba lagi.' using errcode = 'P0002';
  end if;
  insert into public.admins (user_id, email, added_by) values (u, lower(trim(p_email)), auth.uid())
  on conflict (user_id) do nothing;
end $$;

create or replace function public.remove_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if (select count(*) from public.admins) <= 1 then raise exception 'Harus ada minimal satu admin' using errcode = '22023'; end if;
  delete from public.admins where user_id = p_user;
end $$;

revoke all on function public.save_my_profile(jsonb), public.set_my_status(text), public.respond(uuid,text),
  public.submit_report(uuid,jsonb), public.add_admin(text), public.remove_admin(uuid) from public, anon;
grant execute on function public.save_my_profile(jsonb), public.set_my_status(text), public.respond(uuid,text),
  public.submit_report(uuid,jsonb), public.add_admin(text), public.remove_admin(uuid),
  public.is_admin(), public.is_admin_account(), public.my_member_id() to authenticated;
grant execute on function public.app_settings() to anon, authenticated;
revoke execute on function public.is_admin(), public.is_admin_account(), public.my_member_id() from public, anon;

-- Hak akses tabel untuk API. Proyek Supabase baru tidak lagi memberikannya otomatis.
-- Batas sebenarnya tetap diatur Row Level Security di atas.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.members, public.alerts, public.candidates, public.reports, public.settings to authenticated;
grant select on public.admins to authenticated;
grant all on public.members, public.alerts, public.candidates, public.reports, public.settings, public.admins to service_role;
revoke all on public.members, public.alerts, public.candidates, public.reports, public.settings, public.admins from anon;

-- ---------- Penyimpanan foto profil ----------------------------------
-- Bucket publik: foto dibuka lewat URL acak yang tidak bisa ditebak.

insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do update set public = true;

-- Tanpa kebijakan SELECT: file bucket publik tetap bisa dibuka lewat URL-nya,
-- tetapi daftar isi bucket tidak bisa ditelusuri orang lain.
drop policy if exists photos_read on storage.objects;
drop policy if exists photos_insert on storage.objects;
create policy photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists photos_update on storage.objects;
create policy photos_update on storage.objects for update to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists photos_delete on storage.objects;
create policy photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- Realtime -------------------------------------------------
-- Perubahan data langsung tampil di layar semua pengguna yang berhak.
do $$
declare t text;
begin
  foreach t in array array['members','alerts','candidates','reports','settings','admins'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; when undefined_object then null;
    end;
  end loop;
end $$;
