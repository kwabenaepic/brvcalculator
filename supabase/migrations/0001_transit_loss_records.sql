-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Phase 1: history storage, no auth yet. user_id stays null until phase 2
-- (multi-user auth) starts populating it and tightens these policies.

create table public.transit_loss_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id),

  reg_number text not null,
  cert_no text,
  bulk_no text,

  loaded_compartment_volumes jsonb not null,
  received_compartment_volumes jsonb not null,
  total_loaded numeric not null,
  total_received numeric not null,
  observed_diff numeric not null,

  loaded_temperature numeric,
  loaded_density numeric,
  loaded_vcf numeric,
  loaded_volume_at15 numeric,

  received_temperature numeric,
  received_density numeric,
  received_vcf numeric,
  received_volume_at15 numeric,

  loss_at15 numeric
);

alter table public.transit_loss_records enable row level security;

-- Permissive phase-1 policies (no auth yet). Replaced in
-- 0002_auth_rls.sql once phone-number sign-in ships.
create policy "anon insert" on public.transit_loss_records
  for insert to anon with check (true);

create policy "anon select" on public.transit_loss_records
  for select to anon using (true);
