-- BRV Calibration Certificate GN5285-26 (Nakos Jr. Comp. Ltd, SHACMAN, 54,000L
-- nominal, 6 compartments). Cert No 03007924/INPSB52620, issued 2026-05-08,
-- expires 2026-11-08. Run in the Supabase SQL editor.
--
-- Upsert matches src/utils/vehicle-lookup.ts's upsertVehicle (onConflict:
-- reg_number), so re-running this after a re-calibration is safe.

insert into public.vehicles (reg_number, cert_no, bulk_no, expiry_date, compartments)
values (
  'GN5285-26',
  '03007924/INPSB52620',
  'IEC.TM/NJCL/BRV/002',
  '2026-11-08',
  '[
    {
      "id": 1,
      "nominalCapacityLiters": 9000,
      "points": [
        { "ullageCm": 24.4, "capacityLiters": 9050 },
        { "ullageCm": 25.7, "capacityLiters": 9000 },
        { "ullageCm": 27.1, "capacityLiters": 8950 },
        { "ullageCm": 28.4, "capacityLiters": 8900 },
        { "ullageCm": 29.2, "capacityLiters": 8850 },
        { "ullageCm": 30.0, "capacityLiters": 8800 }
      ]
    },
    {
      "id": 2,
      "nominalCapacityLiters": 13500,
      "points": [
        { "ullageCm": 23.1, "capacityLiters": 13550 },
        { "ullageCm": 24.0, "capacityLiters": 13500 },
        { "ullageCm": 24.9, "capacityLiters": 13450 },
        { "ullageCm": 25.8, "capacityLiters": 13400 },
        { "ullageCm": 26.7, "capacityLiters": 13350 },
        { "ullageCm": 27.6, "capacityLiters": 13300 }
      ]
    },
    {
      "id": 3,
      "nominalCapacityLiters": 4500,
      "points": [
        { "ullageCm": 45.2, "capacityLiters": 4550 },
        { "ullageCm": 47.2, "capacityLiters": 4500 },
        { "ullageCm": 49.2, "capacityLiters": 4450 },
        { "ullageCm": 51.2, "capacityLiters": 4400 },
        { "ullageCm": 53.1, "capacityLiters": 4350 },
        { "ullageCm": 55.0, "capacityLiters": 4300 }
      ]
    },
    {
      "id": 4,
      "nominalCapacityLiters": 4500,
      "points": [
        { "ullageCm": 47.5, "capacityLiters": 4550 },
        { "ullageCm": 49.3, "capacityLiters": 4500 },
        { "ullageCm": 51.1, "capacityLiters": 4450 },
        { "ullageCm": 52.9, "capacityLiters": 4400 },
        { "ullageCm": 55.0, "capacityLiters": 4350 },
        { "ullageCm": 57.0, "capacityLiters": 4300 }
      ]
    },
    {
      "id": 5,
      "nominalCapacityLiters": 9000,
      "points": [
        { "ullageCm": 24.7, "capacityLiters": 9050 },
        { "ullageCm": 25.8, "capacityLiters": 9000 },
        { "ullageCm": 26.9, "capacityLiters": 8950 },
        { "ullageCm": 28.0, "capacityLiters": 8900 },
        { "ullageCm": 29.2, "capacityLiters": 8850 },
        { "ullageCm": 30.4, "capacityLiters": 8800 }
      ]
    },
    {
      "id": 6,
      "nominalCapacityLiters": 13500,
      "points": [
        { "ullageCm": 33.2, "capacityLiters": 13550 },
        { "ullageCm": 34.0, "capacityLiters": 13500 },
        { "ullageCm": 34.8, "capacityLiters": 13450 },
        { "ullageCm": 35.5, "capacityLiters": 13400 },
        { "ullageCm": 36.3, "capacityLiters": 13350 },
        { "ullageCm": 37.0, "capacityLiters": 13300 }
      ]
    }
  ]'::jsonb
)
on conflict (reg_number) do update set
  cert_no = excluded.cert_no,
  bulk_no = excluded.bulk_no,
  expiry_date = excluded.expiry_date,
  compartments = excluded.compartments;
