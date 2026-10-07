import type { CompartmentForm } from '@/hooks/use-vehicle-admin-form';
import { parseOptionalDecimal } from '@/utils/transit-loss';
import type { CalibrationPoint } from '@/utils/calibration';
import type { VehicleDetails } from '@/utils/vehicle-lookup';

export type VehicleFormInput = {
  certNoInput: string;
  bulkNoInput: string;
  expiryDateInput: string;
  compartments: CompartmentForm[];
};

export type VehicleFormValidation =
  | { status: 'valid'; details: VehicleDetails }
  | { status: 'invalid'; message: string };

function isValidIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return false;
  }
  // Round-trips through Date to reject impossible days like 2026-02-30.
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

/**
 * Converts the admin form into VehicleDetails, rejecting anything that would
 * silently corrupt the calibration table — blank fields would otherwise be
 * saved as 0 and garbage as NaN, and the calculator would interpolate
 * against them without complaint. Fully blank point rows are dropped.
 */
export function validateVehicleForm(input: VehicleFormInput): VehicleFormValidation {
  const certNo = input.certNoInput.trim();
  const bulkNo = input.bulkNoInput.trim();
  const expiryDate = input.expiryDateInput.trim();

  if (!certNo) {
    return { status: 'invalid', message: 'Cert No is required.' };
  }
  if (!bulkNo) {
    return { status: 'invalid', message: 'Bulk No is required.' };
  }
  if (!isValidIsoDate(expiryDate)) {
    return { status: 'invalid', message: 'Expiry Date must be a real date in YYYY-MM-DD format.' };
  }

  const compartments: VehicleDetails['compartments'] = [];

  for (const [index, compartment] of input.compartments.entries()) {
    const label = `Compartment ${index + 1}`;

    const nominal = parseOptionalDecimal(compartment.nominalCapacityLiters);
    if (nominal === null || nominal <= 0) {
      return { status: 'invalid', message: `${label}: Nominal Capacity must be a number above 0.` };
    }

    const points: CalibrationPoint[] = [];
    for (const [pointIndex, point] of compartment.points.entries()) {
      const pointLabel = `${label}, point ${pointIndex + 1}`;
      if (!point.ullageCm.trim() && !point.capacityLiters.trim()) {
        continue;
      }
      const ullageCm = parseOptionalDecimal(point.ullageCm);
      const capacityLiters = parseOptionalDecimal(point.capacityLiters);
      if (ullageCm === null || ullageCm < 0) {
        return { status: 'invalid', message: `${pointLabel}: Ullage must be a number of 0 or more.` };
      }
      if (capacityLiters === null || capacityLiters <= 0) {
        return { status: 'invalid', message: `${pointLabel}: Capacity must be a number above 0.` };
      }
      if (points.some((existing) => existing.ullageCm === ullageCm)) {
        return { status: 'invalid', message: `${pointLabel}: ullage ${ullageCm} cm is entered twice.` };
      }
      points.push({ ullageCm, capacityLiters });
    }

    if (points.length < 2) {
      return { status: 'invalid', message: `${label}: enter at least 2 calibration points.` };
    }

    compartments.push({ id: index + 1, nominalCapacityLiters: nominal, points });
  }

  if (compartments.length === 0) {
    return { status: 'invalid', message: 'Add at least one compartment.' };
  }

  return { status: 'valid', details: { certNo, bulkNo, expiryDate, compartments } };
}
