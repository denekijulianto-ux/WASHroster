-- =====================================================================
-- Masuk anggota: aktivasi pertama dengan email + nomor WA (Edge Function
-- member-login), lalu anggota wajib membuat password. Setelah password
-- dibuat, jalur email + WA ditutup untuk akun itu. Jalankan setelah
-- schema.sql dan form_intake.sql. Aman dijalankan ulang.
-- =====================================================================

create table if not exists public.login_attempts (
  id bigserial primary key,
  email text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists login_attempts_email_at on public.login_attempts (email, at desc);
alter table public.login_attempts enable row level security;
revoke all on public.login_attempts from anon, authenticated;
grant all on public.login_attempts to service_role;
grant usage, select on sequence public.login_attempts_id_seq to service_role;

alter table public.members add column if not exists has_password boolean not null default false;

create or replace function public.mark_my_password_set() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Belum masuk' using errcode = '28000'; end if;
  update public.members set has_password = true where user_id = auth.uid();
end $$;
revoke all on function public.mark_my_password_set() from public, anon;
grant execute on function public.mark_my_password_set() to authenticated;
