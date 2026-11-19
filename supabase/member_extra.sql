-- =====================================================================
-- Data tambahan dari Google Form: posisi/jabatan di PMI (relawan/staf/pengurus),
-- pendidikan, pengalaman, pelatihan, sertifikasi, aktivitas di masyarakat, kontribusi.
-- Disimpan di members.extra (jsonb). Aman dijalankan ulang.
-- =====================================================================
alter table public.members add column if not exists extra jsonb not null default '{}'::jsonb;


create or replace function public._map_level(s text) returns text
language sql immutable set search_path = public as $$
  select case
    when s is null or s = '' then null
    when lower(s) ~ '(pengurus|ketua|wakil ketua|sekretaris|bendahara|dewan|kabid|kepala bidang)' and lower(s) !~ '(ketua tim|ketua regu)' then 'Pengurus PMI'
    when lower(s) ~ '(team leader|\mtl\M|ketua tim|koordinator lapangan)' then 'Team Leader'
    when lower(s) ~ '(staf|staff|pegawai|karyawan|kepala markas|kamar)' then 'Staf PMI'
    else 'Relawan (KSR/TSR)' end
$$;

-- Satu jawaban → data tambahan (teks apa adanya, untuk ringkasan profil admin).
create or replace function public._intake_extra(p jsonb) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'position',     public._pick(p, array['%posisi%jabatan%', '%jabatan%', '%status keanggotaan%', '%keanggotaan%', '%kategori%']),
    'education',    public._pick(p, array['%pendidikan terakhir%', '%pendidikan%']),
    'study',        public._pick(p, array['%program studi%', '%jurusan%']),
    'skills_extra', public._pick(p, array['%skill tambahan%', '%keterampilan%']),
    'trainings',    public._pick(p, array['%pelatihan yang pernah%', '%pelatihan%']),
    'certs',        public._pick(p, array['%sertifkasi%', '%sertifikasi%'], array['%upload%']),
    'confident',    public._pick(p, array['%percaya diri%']),
    'wants',        public._pick(p, array['%ingin bertugas%']),
    'experience',   public._pick(p, array['%lama pengalaman%', '%pengalaman%']),
    'activity',     public._pick(p, array['%aktivitas%', '%kegiatan di masyarakat%']),
    'contribution', public._pick(p, array['%kontribusi%'])
  ))
$$;

create or replace function public._intake_map(p_answers jsonb, p_email text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare x jsonb := public._intake_extra(p_answers);
begin
  return jsonb_build_object(
    'email',    lower(coalesce(nullif(trim(p_email), ''), public._pick(p_answers, array['%email%', '%e-mail%', '%surel%']))),
    'name',     public._pick(p_answers, array['nama lengkap%', '%nama lengkap%', 'nama', 'nama %', '%nama relawan%', '%nama anggota%', '%full name%', '%name%'],
                             array['%markas%', '%cabang%', '%pmi%', '%unit%', '%instansi%', '%organisasi%', '%kontak darurat%', '%ibu%', '%ayah%']),
    'phone',    public._pick(p_answers, array['%whatsapp%', '%no wa%', '%nomor wa%', '% wa%', '%no. hp%', '%no hp%', '%nomor hp%', '%handphone%', '%telepon%', '%telp%', '%phone%', '%hp%'], array['%darurat%']),
    'province', public._pick(p_answers, array['%provinsi%', '%province%']),
    'chapter',  public._pick(p_answers, array['%markas%', '%cabang%', '%asal pmi%', '%pmi kab%', '%pmi kota%', '%unit%', '%chapter%'], array['%provinsi%']),
    'skills',   nullif(concat_ws(E'\n', x->>'skills_extra', x->>'trainings', x->>'certs'), ''),
    'role',     public._map_role(public._pick(p_answers, array['%ingin bertugas%', '%profil%', '%bidang%', '%spesialisasi%', '%peminatan%', '%minat%'])),
    'level',    public._map_level(x->>'position'),
    'lang',     public._pick(p_answers, array['%bahasa%', '%language%']),
    'mis',      public._pick(p_answers, array['%siamo%', '%no. mis%', '%no mis%', '%nomor mis%', 'mis', 'mis %', '% mis', '% mis %', '%(mis%']),
    'extra',    x
  );
end $$;

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
    insert into public.members (email, name, phone, role, level, province, chapter, skills, lang, mis, status, source, extra)
    values (v->>'email', v->>'name', coalesce(v->>'phone',''), coalesce(v->>'role','Suplai Air Bersih'), coalesce(v->>'level','Relawan (KSR/TSR)'),
            coalesce(v->>'province',''), coalesce(v->>'chapter',''), coalesce(v->>'skills',''), coalesce(v->>'lang',''), coalesce(v->>'mis',''), 'tersedia', 'form', v->'extra');
    return 'baru';
  elsif r.user_id is not null then
    update public.members set
      phone = case when phone = '' then coalesce(v->>'phone', '') else phone end,
      province = case when province = '' then coalesce(v->>'province', '') else province end,
      chapter = case when chapter = '' then coalesce(v->>'chapter', '') else chapter end,
      skills = case when skills = '' then coalesce(v->>'skills', '') else skills end,
      lang = case when lang = '' then coalesce(v->>'lang', '') else lang end,
      mis = case when mis = '' then coalesce(v->>'mis', '') else mis end,
      extra = v->'extra' || jsonb_build_object('position', coalesce(v->'extra'->>'position', extra->>'position'))
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
      mis = coalesce(nullif(v->>'mis', ''), mis),
      extra = v->'extra'
    where id = r.id;
    return 'diperbarui';
  end if;
end $$;

-- Baris yang sudah pernah diproses tetap dilewati untuk data utama (anggota yang dihapus admin
-- tidak dibuat ulang), tetapi data tambahan (extra) & kategori anggota yang masih ada disegarkan.
create or replace function public._intake_rows(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare el jsonb; h text; res text; v jsonb;
  n_new int := 0; n_upd int := 0; n_fill int := 0; n_same int := 0; n_err int := 0; first_err text;
begin
  for el in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    h := md5((el->'answers')::text || coalesce(el->>'email', ''));
    if exists (select 1 from public.intake_seen where hash = h) then
      n_same := n_same + 1;
      begin
        v := public._intake_map(el->'answers', el->>'email');
        update public.members m set extra = v->'extra',
          level = case when v->>'level' is not null and (m.user_id is null or m.level = 'Relawan (KSR/TSR)') then v->>'level' else m.level end
        where lower(m.email) = v->>'email'
          and (m.extra is distinct from v->'extra'
               or (v->>'level' is not null and (m.user_id is null or m.level = 'Relawan (KSR/TSR)') and m.level is distinct from v->>'level'));
      exception when others then null;
      end;
      continue;
    end if;
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

revoke all on function public._intake_extra(jsonb) from public, anon, authenticated;
grant execute on function public._intake_extra(jsonb) to service_role;
revoke all on function public._intake_map(jsonb, text), public._intake_row(jsonb, text), public._intake_rows(jsonb) from public, anon, authenticated;
grant execute on function public._intake_map(jsonb, text), public._intake_row(jsonb, text), public._intake_rows(jsonb) to service_role;
