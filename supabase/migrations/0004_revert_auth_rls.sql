-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Restores the permissive phase-1 policies from 0001_transit_loss_records.sql.
--
-- 0002_auth_rls.sql was run against this project, switching
-- transit_loss_records to authenticated-only reads/writes. But phone
-- sign-in still isn't live (blocked on an SMS provider — see the note at
-- the top of 0002_auth_rls.sql), so the app is always unauthenticated and
-- every save/read was failing with "new row violates row-level security
-- policy". This undoes that switch until sign-in actually works — re-run
-- 0002_auth_rls.sql once it does.

drop policy if exists "select own" on public.transit_loss_records;
drop policy if exists "insert own" on public.transit_loss_records;

create policy "anon insert" on public.transit_loss_records
  for insert to anon with check (true);

create policy "anon select" on public.transit_loss_records
  for select to anon using (true);
