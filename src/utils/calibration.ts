export type CalibrationPoint = {
  ullageCm: number;
  capacityLiters: number;
};

/**
 * Piecewise-linear interpolation of capacity from a per-compartment calibration
 * table (as printed on a BRV calibration certificate). Out-of-range ullage
 * clamps to the nearest boundary point rather than extrapolating, since
 * extrapolation accuracy can't be verified and this feeds real loss accounting.
 */
export function interpolateCapacityLiters(
  points: readonly CalibrationPoint[],
  ullageCm: number,
): number {
  if (points.length === 0) {
    return 0;
  }

  const sorted = [...points].sort((a, b) => a.ullageCm - b.ullageCm);

  if (ullageCm <= sorted[0].ullageCm) {
    return sorted[0].capacityLiters;
  }

  const last = sorted[sorted.length - 1];
  if (ullageCm >= last.ullageCm) {
    return last.capacityLiters;
  }

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const lower = sorted[i];
    const upper = sorted[i + 1];
    if (ullageCm >= lower.ullageCm && ullageCm <= upper.ullageCm) {
      const span = upper.ullageCm - lower.ullageCm;
      if (span === 0) {
        return lower.capacityLiters;
      }
      const t = (ullageCm - lower.ullageCm) / span;
      return lower.capacityLiters + t * (upper.capacityLiters - lower.capacityLiters);
    }
  }

  return last.capacityLiters;
}
