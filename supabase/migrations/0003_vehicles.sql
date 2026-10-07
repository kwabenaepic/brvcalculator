-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Vehicle calibration data, looked up by reg_number from the main calculator
-- screen (src/utils/vehicle-lookup.ts) and maintained from the admin-only
-- vehicle entry screen (app/admin-vehicles.tsx).
--
-- Skip this file if `public.vehicles` already exists in your project.

create table public.vehicles (
  reg_number text primary key,
  cert_no text not null,
  bulk_no text not null,
  expiry_date date not null,
  compartments jsonb not null
);

alter table public.vehicles enable row level security;

-- Anyone (including anon) can look up a vehicle by reg number — the main
-- calculator screen does this without requiring sign-in.
create policy "anyone select" on public.vehicles
  for select using (true);

-- Only signed-in users can add/edit vehicle records. The admin-only vehicle
-- entry screen sits behind the session guard in app/_layout.tsx, so any
-- authenticated user reaching it is treated as an admin for now.
create policy "authenticated insert" on public.vehicles
  for insert to authenticated with check (true);

create policy "authenticated update" on public.vehicles
  for update to authenticated using (true) with check (true);
