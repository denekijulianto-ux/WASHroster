-- =====================================================================
-- 1) Jenis penugasan: bencana / non bencana (pelatihan, workshop, dll.)
-- 2) Sumber data otomatis dari link spreadsheet jawaban Google Form:
--    Edge Function "sheet-sync" dipanggil pg_cron tiap 5 menit, membaca
--    spreadsheet (dibagikan "siapa saja yang memiliki link"), lalu
--    memasukkan baris baru/berubah ke roster lewat _intake_rows().
-- Jalankan setelah schema.sql, form_intake.sql, member_login.sql. Aman dijalankan ulang.
-- =====================================================================

alter table public.alerts add column if not exists kind text not null default 'bencana';
alter table public.alerts drop constraint if exists alerts_kind_check;
alter table public.alerts add constraint alerts_kind_check check (kind in ('bencana','non_bencana'));

-- Pemetaan jawaban → kolom roster (dipakai Apps Script, sinkron spreadsheet, dan pratinjau).
create or replace function public._intake_map(p_answers jsonb, p_email text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  return jsonb_build_object(
    'email',    lower(coalesce(nullif(trim(p_email), ''), public._pick(p_answers, array['%email%', '%e-mail%', '%surel%']))),
    'name',     public._pick(p_answers, array['nama lengkap%', '%nama lengkap%', 'nama', 'nama %', '%nama relawan%', '%nama anggota%', '%full name%', '%name%'],
                             array['%markas%', '%cabang%', '%pmi%', '%unit%', '%instansi%', '%organisasi%', '%kontak darurat%', '%ibu%', '%ayah%']),
    'phone',    public._pick(p_answers, array['%whatsapp%', '%no wa%', '%nomor wa%', '% wa%', '%no. hp%', '%no hp%', '%nomor hp%', '%handphone%', '%telepon%', '%telp%', '%phone%', '%hp%'], array['%darurat%']),
    'province', public._pick(p_answers, array['%provinsi%', '%province%']),
    'chapter',  public._pick(p_answers, array['%markas%', '%cabang%', '%asal pmi%', '%pmi kab%', '%pmi kota%', '%unit%', '%chapter%'], array['%provinsi%']),
    'skills',   public._pick(p_answers, array['%pelatihan%', '%keahlian%', '%sertifikasi%', '%kompetensi%', '%pengalaman%', '%skill%']),
    'role',     public._map_role(public._pick(p_answers, array['%profil%', '%bidang%', '%posisi%', '%spesialisasi%', '%peminatan%', '%minat%'])),
    'level',    public._map_level(public._pick(p_answers, array['%kategori%', '%status keanggotaan%', '%jenis anggota%', '%keanggotaan%'])),
    'lang',     public._pick(p_answers, array['%bahasa%', '%language%']),
    'mis',      public._pick(p_answers, array['%siamo%', '%no. mis%', '%no mis%', '%nomor mis%', 'mis', 'mis %', '% mis', '% mis %', '%(mis%'])
  );
end $$;

-- Satu jawaban → tambah/perbarui anggota. Mengembalikan 'baru' | 'diperbarui' | 'dilengkapi'.
create or replace function public._intake_row(p_answers jsonb, p_email text default null) returns text
language plpgsql security definer set search_path = public as $$
declare v jsonb; r public.members;
begin
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Format jawaban tidak valid' using errcode = '22023'; end if;
  v := public._intake_map(p_answers, p_email);
  if coalesce(v->>'email', '') !~ '^\S+@\S+\.\S+$' then raise exception 'Email responden tidak ada' using errcode = '22023'; end if;
  if coalesce(v->>'name', '') = '' then raise exception 'Nama tidak ditemukan' using errcode = '22023'; end if;
  select * into r from public.members where lower(email) = v->>'email' limit 1;
  if r.id is null then
    insert into public.members (email, name, phone, role, level, province, chapter, skills, lang, mis, status, source)
    values (v->>'email', v->>'name', coalesce(v->>'phone',''), coalesce(v->>'role','Suplai Air Bersih'), coalesce(v->>'level','Relawan (KSR/TSR)'),
            coalesce(v->>'province',''), coalesce(v->>'chapter',''), coalesce(v->>'skills',''), coalesce(v->>'lang',''), coalesce(v->>'mis',''), 'tersedia', 'form');
    return 'baru';
  elsif r.user_id is not null then
    update public.members set
      phone = case when phone = '' then coalesce(v->>'phone', '') else phone end,
      province = case when province = '' then coalesce(v->>'province', '') else province end,
      chapter = case when chapter = '' then coalesce(v->>'chapter', '') else chapter end,
      skills = case when skills = '' then coalesce(v->>'skills', '') else skills end,
      lang = case when lang = '' then coalesce(v->>'lang', '') else lang end,
      mis = case when mis = '' then coalesce(v->>'mis', '') else mis end
    where id = r.id;
    return 'dilengkapi';
  else
    update public.members set
      name = v->>'name',
      phone = coalesce(nullif(v->>'phone', ''), phone),
      role = coalesce(v->>'role', role),
      level = coalesce(v->>'level', level),
      province = coalesce(nullif(v->>'province', ''), province),
      chapter = coalesce(nullif(v->>'chapter', ''), chapter),
      skills = coalesce(nullif(v->>'skills', ''), skills),
      lang = coalesce(nullif(v->>'lang', ''), lang),
      mis = coalesce(nullif(v->>'mis', ''), mis)
    where id = r.id;
    return 'diperbarui';
  end if;
end $$;

-- Baris yang sudah diproses (isi persis sama) dilewati, jadi sinkron berulang tidak
-- membuat ulang anggota yang sudah dihapus admin dan tidak menimpa data tanpa perubahan.
create table if not exists public.intake_seen (hash text primary key, at timestamptz not null default now());
alter table public.intake_seen enable row level security;
revoke all on public.intake_seen from anon, authenticated;

-- Banyak baris sekaligus: [{"answers": {...}, "email": "..."}]
create or replace function public._intake_rows(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare el jsonb; h text; res text;
  n_new int := 0; n_upd int := 0; n_fill int := 0; n_same int := 0; n_err int := 0; first_err text;
begin
  for el in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    h := md5((el->'answers')::text || coalesce(el->>'email', ''));
    if exists (select 1 from public.intake_seen where hash = h) then n_same := n_same + 1; continue; end if;
    begin
      res := public._intake_row(el->'answers', el->>'email');
      insert into public.intake_seen (hash) values (h) on conflict do nothing;
      if res = 'baru' then n_new := n_new + 1; elsif res = 'diperbarui' then n_upd := n_upd + 1; else n_fill := n_fill + 1; end if;
    exception when others then
      n_err := n_err + 1; if first_err is null then first_err := sqlerrm; end if;
    end;
  end loop;
  return jsonb_build_object('new', n_new, 'updated', n_upd, 'filled', n_fill, 'unchanged', n_same, 'errors', n_err, 'first_error', first_err);
end $$;

-- form_intake (Apps Script) memakai pemetaan yang sama.
create or replace function public.form_intake(p_token text, p_answers jsonb, p_email text default null) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean; result text;
begin
  select exists (select 1 from public.intake_secret where token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex')) into ok;
  if not ok then raise exception 'Token tidak valid' using errcode = '28000'; end if;
  begin
    result := public._intake_row(p_answers, p_email);
  exception when sqlstate '22023' then
    if sqlerrm like 'Email%' then raise exception 'Email responden tidak ada. Aktifkan "Kumpulkan alamat email" di Google Form.' using errcode = '22023'; end if;
    raise;
  end;
  insert into public.settings (key, value) values ('intake', jsonb_build_object('last_at', now(), 'count', 1, 'last_result', result))
  on conflict (key) do update set
    value = public.settings.value || jsonb_build_object('last_at', now(), 'last_result', result,
            'count', coalesce((public.settings.value->>'count')::int, 0) + 1),
    updated_at = now();
  return result;
end $$;

revoke all on function public._intake_map(jsonb, text), public._intake_row(jsonb, text), public._intake_rows(jsonb) from public, anon, authenticated;
grant execute on function public._intake_map(jsonb, text), public._intake_row(jsonb, text), public._intake_rows(jsonb) to service_role;

-- Penjadwal: panggil Edge Function sheet-sync tiap 5 menit.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create table if not exists public.cron_secret (
  id int primary key default 1 check (id = 1),
  secret text not null default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
);
insert into public.cron_secret (id) values (1) on conflict (id) do nothing;
alter table public.cron_secret enable row level security;
revoke all on public.cron_secret from anon, authenticated;
grant select on public.cron_secret to service_role;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'roster-sheet-sync') then perform cron.unschedule('roster-sheet-sync'); end if;
end $$;
select cron.schedule('roster-sheet-sync', '*/5 * * * *', $cron$
  select net.http_post(
    url := 'https://pzoueizgwgccacixelgi.supabase.co/functions/v1/sheet-sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select secret from public.cron_secret where id = 1)),
    body := '{"mode":"run"}'::jsonb,
    timeout_milliseconds := 60000)
$cron$);

-- Bidang WASH untuk alert non bencana (posisi = Fasilitator/Peserta/Narasumber/…)
alter table public.alerts add column if not exists focus text not null default '';
