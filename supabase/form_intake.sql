-- =====================================================================
-- Integrasi Google Form → roster
-- Jawaban Google Form dikirim oleh Apps Script ke fungsi form_intake().
-- Anggota yang masuk dengan kode email otomatis tersambung ke datanya
-- lewat claim_my_member(), sehingga tidak perlu daftar dua kali.
-- Jalankan setelah schema.sql. Aman dijalankan ulang.
-- =====================================================================

alter table public.members drop constraint if exists members_source_check;
alter table public.members add constraint members_source_check
  check (source in ('daftar','manual','impor','sheet','form'));

-- Token rahasia untuk Apps Script (hanya hash yang disimpan; tabel tidak terbuka lewat API).
create table if not exists public.intake_secret (
  id int primary key default 1 check (id = 1),
  token_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.intake_secret enable row level security;
revoke all on public.intake_secret from anon, authenticated;

create or replace function public.set_intake_token(p_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Hanya admin' using errcode = '42501'; end if;
  if length(coalesce(p_token,'')) < 32 then raise exception 'Token terlalu pendek' using errcode = '22023'; end if;
  insert into public.intake_secret (id, token_hash, created_at)
  values (1, encode(digest(p_token, 'sha256'), 'hex'), now())
  on conflict (id) do update set token_hash = excluded.token_hash, created_at = now();
  insert into public.settings (key, value) values ('intake', jsonb_build_object('token_set_at', now(), 'count', 0))
  on conflict (key) do update set value = public.settings.value || jsonb_build_object('token_set_at', now()), updated_at = now();
end $$;

-- Gabungkan jawaban (string atau array string) menjadi teks.
create or replace function public._ans(v jsonb) returns text
language sql immutable set search_path = public as $$
  select case jsonb_typeof(v)
    when 'array' then (select string_agg(trim(x), ', ') from jsonb_array_elements_text(v) x where trim(x) <> '')
    when 'string' then trim(v #>> '{}')
    when 'null' then null
    else trim(v::text) end
$$;

-- Ambil jawaban pertama yang judul pertanyaannya cocok dengan salah satu pola.
create or replace function public._pick(p jsonb, pats text[], excl text[] default '{}') returns text
language sql immutable set search_path = public as $$
  select public._ans(e.value)
  from jsonb_each(p) e, unnest(pats) with ordinality as pt(pat, ord)
  where lower(e.key) like pt.pat
    and not exists (select 1 from unnest(excl) x where lower(e.key) like x)
    and coalesce(public._ans(e.value), '') <> ''
  order by pt.ord
  limit 1
$$;

create or replace function public._map_role(s text) returns text
language sql immutable set search_path = public as $$
  select case
    when s is null or s = '' then null
    when lower(s) ~ '(koordinator|coordinator)' then 'Koordinator WASH'
    when lower(s) ~ '(pengolahan|wtu|treatment|operator)' then 'Operator Unit Pengolahan Air'
    when lower(s) ~ '(kualitas|quality|laborat)' then 'Kualitas Air'
    when lower(s) ~ '(vektor|vector|fogging)' then 'Pengendalian Vektor'
    when lower(s) ~ '(promosi|hygiene|higiene|kebersihan|phast|promkes)' then 'Promosi Kebersihan'
    when lower(s) ~ '(sanitasi|sanitation|limbah|jamban|sampah)' then 'Sanitasi & Limbah'
    when lower(s) ~ '(air bersih|suplai|supply|water|distribusi)' then 'Suplai Air Bersih'
    else null end
$$;

create or replace function public._map_level(s text) returns text
language sql immutable set search_path = public as $$
  select case
    when s is null or s = '' then null
    when lower(s) ~ '(leader|ketua|\mtl\M)' then 'Team Leader'
    when lower(s) ~ '(staf|staff|pegawai|karyawan)' then 'Staf PMI'
    else 'Relawan (KSR/TSR)' end
$$;

-- Dipanggil Apps Script setiap ada jawaban Form.
-- p_answers: {"Judul pertanyaan": "jawaban" | ["jawaban", ...], ...}
-- p_email: email responden yang dikumpulkan Google Form (boleh kosong bila ada pertanyaan email).
create or replace function public.form_intake(p_token text, p_answers jsonb, p_email text default null) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  ok boolean;
  v_email text; v_name text; v_phone text; v_prov text; v_chap text; v_skills text; v_role text; v_level text; v_lang text; v_mis text;
  r public.members; result text;
begin
  select exists (select 1 from public.intake_secret where token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex')) into ok;
  if not ok then raise exception 'Token tidak valid' using errcode = '28000'; end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Format jawaban tidak valid' using errcode = '22023'; end if;

  v_email := lower(coalesce(nullif(trim(p_email), ''), public._pick(p_answers, array['%email%', '%e-mail%', '%surel%'])));
  v_name  := public._pick(p_answers, array['nama lengkap%', '%nama lengkap%', 'nama', 'nama %', '%nama relawan%', '%nama anggota%', '%full name%', '%name%'],
                          array['%markas%', '%cabang%', '%pmi%', '%unit%', '%instansi%', '%organisasi%', '%kontak darurat%', '%ibu%', '%ayah%']);
  v_phone := public._pick(p_answers, array['%whatsapp%', '%no wa%', '%nomor wa%', '% wa%', '%no. hp%', '%no hp%', '%nomor hp%', '%handphone%', '%telepon%', '%telp%', '%phone%', '%hp%'],
                          array['%darurat%']);
  v_prov  := public._pick(p_answers, array['%provinsi%', '%province%']);
  v_chap  := public._pick(p_answers, array['%markas%', '%cabang%', '%asal pmi%', '%pmi kab%', '%pmi kota%', '%unit%', '%chapter%'], array['%provinsi%']);
  v_skills:= public._pick(p_answers, array['%pelatihan%', '%keahlian%', '%sertifikasi%', '%kompetensi%', '%pengalaman%', '%skill%']);
  v_role  := public._map_role(public._pick(p_answers, array['%profil%', '%bidang%', '%posisi%', '%spesialisasi%', '%peminatan%', '%minat%']));
  v_level := public._map_level(public._pick(p_answers, array['%kategori%', '%status keanggotaan%', '%jenis anggota%', '%keanggotaan%']));
  v_lang  := public._pick(p_answers, array['%bahasa%', '%language%']);
  v_mis   := public._pick(p_answers, array['%siamo%', '%no. mis%', '%no mis%', '%nomor mis%', 'mis', 'mis %', '% mis', '% mis %', '%(mis%']);

  if coalesce(v_email, '') !~ '^\S+@\S+\.\S+$' then raise exception 'Email responden tidak ada. Aktifkan "Kumpulkan alamat email" di Google Form.' using errcode = '22023'; end if;
  if coalesce(v_name, '') = '' then raise exception 'Nama tidak ditemukan di jawaban' using errcode = '22023'; end if;

  select * into r from public.members where lower(email) = v_email limit 1;
  if r.id is null then
    insert into public.members (email, name, phone, role, level, province, chapter, skills, lang, mis, status, source)
    values (v_email, v_name, coalesce(v_phone,''), coalesce(v_role,'Suplai Air Bersih'), coalesce(v_level,'Relawan (KSR/TSR)'),
            coalesce(v_prov,''), coalesce(v_chap,''), coalesce(v_skills,''), coalesce(v_lang,''), coalesce(v_mis,''), 'tersedia', 'form');
    result := 'baru';
  elsif r.user_id is not null then
    -- Sudah login & mengelola profil sendiri: hanya lengkapi kolom yang masih kosong.
    update public.members set
      phone = case when phone = '' then coalesce(v_phone, '') else phone end,
      province = case when province = '' then coalesce(v_prov, '') else province end,
      chapter = case when chapter = '' then coalesce(v_chap, '') else chapter end,
      skills = case when skills = '' then coalesce(v_skills, '') else skills end,
      lang = case when lang = '' then coalesce(v_lang, '') else lang end,
      mis = case when mis = '' then coalesce(v_mis, '') else mis end
    where id = r.id;
    result := 'dilengkapi';
  else
    update public.members set
      name = v_name,
      phone = coalesce(nullif(v_phone, ''), phone),
      role = coalesce(v_role, role),
      level = coalesce(v_level, level),
      province = coalesce(nullif(v_prov, ''), province),
      chapter = coalesce(nullif(v_chap, ''), chapter),
      skills = coalesce(nullif(v_skills, ''), skills),
      lang = coalesce(nullif(v_lang, ''), lang),
      mis = coalesce(nullif(v_mis, ''), mis)
    where id = r.id;
    result := 'diperbarui';
  end if;

  insert into public.settings (key, value) values ('intake', jsonb_build_object('last_at', now(), 'count', 1, 'last_result', result))
  on conflict (key) do update set
    value = public.settings.value || jsonb_build_object('last_at', now(), 'last_result', result,
            'count', coalesce((public.settings.value->>'count')::int, 0) + 1),
    updated_at = now();
  return result;
end $$;

-- Dipanggil aplikasi tepat setelah anggota masuk dengan kode email:
-- sambungkan akun ke data Form / impor yang emailnya sama.
create or replace function public.claim_my_member() returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); mail text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.members where user_id = uid) then return true; end if;
  if mail = '' then return false; end if;
  update public.members set user_id = uid where lower(email) = mail and user_id is null;
  return found;
end $$;

revoke all on function public.set_intake_token(text), public.form_intake(text, jsonb, text), public.claim_my_member() from public;
grant execute on function public.form_intake(text, jsonb, text) to anon, authenticated;
grant execute on function public.set_intake_token(text), public.claim_my_member() to authenticated;
revoke all on function public._ans(jsonb), public._pick(jsonb, text[], text[]), public._map_role(text), public._map_level(text) from public, anon, authenticated;
