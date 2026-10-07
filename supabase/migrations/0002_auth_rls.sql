-- Run this in the Supabase SQL editor once phone-number sign-in is live and
-- you're ready to make history personal (each user sees only their own
-- records) instead of the permissive phase-1 policies.
--
-- Before running this: enable the Phone provider under Authentication ->
-- Providers in the dashboard, and configure an SMS provider (Twilio,
-- MessageBird, Vonage, ...) with real account credentials. Without that,
-- signInWithOtp will fail for every phone number.

drop policy if exists "anon insert" on public.transit_loss_records;
drop policy if exists "anon select" on public.transit_loss_records;

create policy "select own" on public.transit_loss_records
  for select to authenticated using (auth.uid() = user_id);

create policy "insert own" on public.transit_loss_records
  for insert to authenticated with check (auth.uid() = user_id);

-- Optional: if your `vehicles` table currently has a public/anon select
-- policy, consider restricting it too now that the whole app sits behind
-- login. Review this against whatever policy you actually have first —
-- it's a suggestion, not applied automatically.
--
-- drop policy if exists "anon select" on public.vehicles;
-- create policy "authenticated select" on public.vehicles
--   for select to authenticated using (true);
