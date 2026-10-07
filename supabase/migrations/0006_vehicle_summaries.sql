-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
--
-- Lightweight summary of each vehicle for the admin list
-- (src/utils/vehicle-lookup.ts listVehicles). Reading the vehicles table
-- directly would download every calibration table just to show a count and a
-- total — fine for a handful of vehicles, slow for hundreds — so the view
-- computes those in the database and the app pages through it.
--
-- security_invoker makes the view apply the caller's permissions, i.e. the
-- same RLS policies as public.vehicles, rather than the view owner's.

create or replace view public.vehicle_summaries
with (security_invoker = true) as
select
  reg_number,
  cert_no,
  expiry_date,
  jsonb_array_length(compartments) as compartment_count,
  coalesce(
    (select sum((compartment ->> 'nominalCapacityLiters')::numeric)
     from jsonb_array_elements(compartments) as compartment),
    0
  ) as total_nominal_liters
from public.vehicles;

grant select on public.vehicle_summaries to anon, authenticated;

-- Searches filter on reg_number with ILIKE '%...%'; a trigram index keeps that
-- fast once there are thousands of rows. Optional below a few hundred.
create extension if not exists pg_trgm;
create index if not exists vehicles_reg_number_trgm
  on public.vehicles using gin (reg_number gin_trgm_ops);
