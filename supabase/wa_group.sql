-- Link undangan grup WhatsApp Roster: disimpan di settings key 'wa_group',
-- hanya bisa dibaca admin dan anggota yang sudah masuk (tidak publik).
drop policy if exists settings_member_read on public.settings;
create policy settings_member_read on public.settings for select to authenticated
  using (key = 'wa_group' and exists (select 1 from public.members m where m.user_id = auth.uid()));
