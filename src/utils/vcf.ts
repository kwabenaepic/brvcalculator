/**
 * VCF (Volume Correction Factor) to a 15°C base, for diesel/gasoil — the
 * standard alternative to typing in a pre-computed VCF by hand.
 *
 * The exp[-α·ΔT·(1 + 0.8·α·ΔT)] form and the α = K0/ρ² + K1/ρ relationship
 * are the standard API MPMS Chapter 11.1 / ASTM D1250 structure, but the
 * official metric (15°C-base) K0/K1 constants sit behind ASTM/API's paywall.
 * These K0/K1 were fitted from two verified reference points instead:
 *   27.0°C, 828 kg/m³ -> VCF 0.9898
 *   31.2°C, 822 kg/m³ -> VCF 0.9861
 * Both reproduce exactly. Only validated for diesel/gasoil density
 * (~800-860 kg/m³) — re-fit with points in-range before trusting other
 * products. If you get an official reference table, swap the constants
 * below; the rest of the app only depends on `calculateVcf`'s
 * (temperature, density) -> VCF | null signature.
 */

const GENERALIZED_PRODUCTS_K0 = 86.0833;
const GENERALIZED_PRODUCTS_K1 = 0.597740;
const BASE_TEMPERATURE_C = 15;

export function calculateThermalExpansionCoefficient(densityKgM3: number): number {
  return GENERALIZED_PRODUCTS_K0 / densityKgM3 ** 2 + GENERALIZED_PRODUCTS_K1 / densityKgM3;
}

export function calculateVcf(temperatureC: number, densityKgM3: number): number | null {
  if (densityKgM3 <= 0) {
    return null;
  }
  const alpha = calculateThermalExpansionCoefficient(densityKgM3);
  const deltaT = temperatureC - BASE_TEMPERATURE_C;
  return Math.exp(-alpha * deltaT * (1 + 0.8 * alpha * deltaT));
}
