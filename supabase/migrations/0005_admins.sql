-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
--
-- Sign-in is email + password and exists only so admins can maintain vehicle
-- records; every visitor uses the calculator and history without signing in.
-- Supabase still lets anyone create an account via the public API, so
-- "signed in" isn't enough to edit vehicles — admins are listed explicitly in
-- public.admins.
--
-- Recommended: Authentication -> Sign In / Providers -> turn OFF "Allow new
-- users to sign up", so accounts only come from the dashboard.

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

-- Lets the app check whether the current user is an admin; the list itself
-- is managed from the dashboard/SQL editor only.
create policy "select own" on public.admins
  for select to authenticated using (auth.uid() = user_id);

-- Vehicle edits: admins only (previously any authenticated user).
drop policy if exists "authenticated insert" on public.vehicles;
drop policy if exists "authenticated update" on public.vehicles;

create policy "admin insert" on public.vehicles
  for insert to authenticated
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create policy "admin update" on public.vehicles
  for update to authenticated
  using (exists (select 1 from public.admins where user_id = auth.uid()))
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

-- History stays open to visitors (the 0004 policies only cover `anon`), but a
-- signed-in admin runs as `authenticated` and would otherwise be unable to
-- save or read records while signed in.
drop policy if exists "anon insert" on public.transit_loss_records;
drop policy if exists "anon select" on public.transit_loss_records;

create policy "anyone insert" on public.transit_loss_records
  for insert to anon, authenticated with check (true);

create policy "anyone select" on public.transit_loss_records
  for select to anon, authenticated using (true);

-- To create an admin: Authentication -> Users -> Add user (email + password,
-- tick "Auto Confirm User"), then run:
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'admin@example.com';
