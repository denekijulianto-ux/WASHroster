-- Jumlah anggota per provinsi/kategori/status untuk peta sebaran di Beranda anggota.
-- Hanya angka agregat (tanpa nama/kontak); hanya untuk anggota yang sudah masuk atau admin.
create or replace function public.roster_geo_stats()
returns table(province text, level text, status text, n int)
language sql stable security definer set search_path = public as $$
  select coalesce(m.province, ''), m.level, m.status, count(*)::int
  from public.members m
  where auth.uid() is not null
    and (public.is_admin() or exists (select 1 from public.members me where me.user_id = auth.uid()))
  group by 1, 2, 3
$$;
revoke all on function public.roster_geo_stats() from public, anon;
grant execute on function public.roster_geo_stats() to authenticated;
