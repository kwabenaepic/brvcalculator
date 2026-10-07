-- BRV Calibration Certificate GX 1103-18 (Brite Light Services Ltd, OMC Gaso
-- Petroleum, 45,000L nominal, 5 compartments — compartment 6 is unused/"***").
-- Cert No 0260393003/INSPO/013, issued 04/03/2026, expires 04/09/2026
-- (day-first, i.e. 2026-09-04). Run in the Supabase SQL editor.
--
-- Transcribed from a faxed scan (Fax0302232.pdf). Check against the paper
-- certificate before relying on it, especially:
--   - Compartment 2, 9050 L row: ullage 32.0 is faint on the scan.
--   - Compartment 3, 9000 L / 8950 L rows: capacity digits sit under the
--     watermark (read as 9000 / 8950, consistent with the 50 L steps).
--
-- Upsert matches src/utils/vehicle-lookup.ts's upsertVehicle (onConflict:
-- reg_number), so re-running this after a re-calibration is safe.

insert into public.vehicles (reg_number, cert_no, bulk_no, expiry_date, compartments)
values (
  'GX1103-18',
  '0260393003/INSPO/013',
  'BLS.TKD/MGAS/BRV001',
  '2026-09-04',
  '[
    {
      "id": 1,
      "nominalCapacityLiters": 9000,
      "points": [
        { "ullageCm": 29.5, "capacityLiters": 9050 },
        { "ullageCm": 31.5, "capacityLiters": 9000 },
        { "ullageCm": 33.5, "capacityLiters": 8950 },
        { "ullageCm": 35.5, "capacityLiters": 8900 },
        { "ullageCm": 37.5, "capacityLiters": 8850 },
        { "ullageCm": 39.5, "capacityLiters": 8800 }
      ]
    },
    {
      "id": 2,
      "nominalCapacityLiters": 9000,
      "points": [
        { "ullageCm": 32.0, "capacityLiters": 9050 },
        { "ullageCm": 33.5, "capacityLiters": 9000 },
        { "ullageCm": 35.0, "capacityLiters": 8950 },
        { "ullageCm": 36.5, "capacityLiters": 8900 },
        { "ullageCm": 38.0, "capacityLiters": 8850 },
        { "ullageCm": 39.5, "capacityLiters": 8800 }
      ]
    },
    {
      "id": 3,
      "nominalCapacityLiters": 9000,
      "points": [
        { "ullageCm": 34.2, "capacityLiters": 9050 },
        { "ullageCm": 36.0, "capacityLiters": 9000 },
        { "ullageCm": 37.7, "capacityLiters": 8950 },
        { "ullageCm": 39.5, "capacityLiters": 8900 },
        { "ullageCm": 41.2, "capacityLiters": 8850 },
        { "ullageCm": 43.0, "capacityLiters": 8800 }
      ]
    },
    {
      "id": 4,
      "nominalCapacityLiters": 9000,
      "points": [
        { "ullageCm": 33.0, "capacityLiters": 9050 },
        { "ullageCm": 34.5, "capacityLiters": 9000 },
        { "ullageCm": 36.0, "capacityLiters": 8950 },
        { "ullageCm": 37.5, "capacityLiters": 8900 },
        { "ullageCm": 39.0, "capacityLiters": 8850 },
        { "ullageCm": 40.5, "capacityLiters": 8800 }
      ]
    },
    {
      "id": 5,
      "nominalCapacityLiters": 9000,
      "points": [
        { "ullageCm": 27.0, "capacityLiters": 9050 },
        { "ullageCm": 29.5, "capacityLiters": 9000 },
        { "ullageCm": 32.0, "capacityLiters": 8950 },
        { "ullageCm": 34.5, "capacityLiters": 8900 },
        { "ullageCm": 37.0, "capacityLiters": 8850 },
        { "ullageCm": 39.5, "capacityLiters": 8800 }
      ]
    }
  ]'::jsonb
)
on conflict (reg_number) do update set
  cert_no = excluded.cert_no,
  bulk_no = excluded.bulk_no,
  expiry_date = excluded.expiry_date,
  compartments = excluded.compartments;
