import { interpolateCapacityLiters } from '@/utils/calibration';
import { calculateVcf } from '@/utils/vcf';
import type { CompartmentCalibration } from '@/utils/vehicle-lookup';

export type CompartmentUllageInputs = string[];

export type TransitLossSummary = {
  loadedCompartmentVolumes: (number | null)[];
  receivedCompartmentVolumes: (number | null)[];
  totalLoaded: number;
  totalReceived: number;
  observedDiff: number;
  loadedVcf: number | null;
  receivedVcf: number | null;
  loadedVolumeAt15: number | null;
  receivedVolumeAt15: number | null;
  lossAt15: number | null;
};

export function parseOptionalDecimal(text: string): number | null {
  const value = Number(text);
  return text.trim() === '' || Number.isNaN(value) ? null : value;
}

export function roundVolume(value: number): number {
  return Math.round(value);
}

export function calculateCompartmentVolumes(
  ullageInputs: CompartmentUllageInputs,
  compartments: CompartmentCalibration[],
): (number | null)[] {
  return ullageInputs.map((text, index) => {
    const ullageCm = parseOptionalDecimal(text);
    if (ullageCm === null) {
      return null;
    }
    const compartment = compartments[index];
    if (!compartment) {
      return null;
    }
    return roundVolume(interpolateCapacityLiters(compartment.points, ullageCm));
  });
}

export function sumCompartmentVolumes(values: (number | null)[]): number {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function calculateVolumeAt15(total: number, vcf: number | null): number | null {
  return vcf === null ? null : roundVolume(total * vcf);
}

export function calculateLossAt15(
  receivedAt15: number | null,
  loadedAt15: number | null,
): number | null {
  if (receivedAt15 === null || loadedAt15 === null) {
    return null;
  }
  return Math.min(receivedAt15 - loadedAt15, 0);
}

export function computeTransitLossSummary(input: {
  compartments: CompartmentCalibration[];
  loadedUllageInputs: CompartmentUllageInputs;
  receivedUllageInputs: CompartmentUllageInputs;
  loadedTemperatureInput: string;
  loadedDensityInput: string;
  receivedTemperatureInput: string;
  receivedDensityInput: string;
}): TransitLossSummary {
  const loadedCompartmentVolumes = calculateCompartmentVolumes(
    input.loadedUllageInputs,
    input.compartments,
  );
  const receivedCompartmentVolumes = calculateCompartmentVolumes(
    input.receivedUllageInputs,
    input.compartments,
  );

  const totalLoaded = sumCompartmentVolumes(loadedCompartmentVolumes);
  const totalReceived = sumCompartmentVolumes(receivedCompartmentVolumes);
  const observedDiff = totalReceived - totalLoaded;

  const loadedTemperature = parseOptionalDecimal(input.loadedTemperatureInput);
  const loadedDensity = parseOptionalDecimal(input.loadedDensityInput);
  const loadedVcf =
    loadedTemperature === null || loadedDensity === null
      ? null
      : calculateVcf(loadedTemperature, loadedDensity);

  const receivedTemperature = parseOptionalDecimal(input.receivedTemperatureInput);
  const receivedDensity = parseOptionalDecimal(input.receivedDensityInput);
  const receivedVcf =
    receivedTemperature === null || receivedDensity === null
      ? null
      : calculateVcf(receivedTemperature, receivedDensity);

  const loadedVolumeAt15 = calculateVolumeAt15(totalLoaded, loadedVcf);
  const receivedVolumeAt15 = calculateVolumeAt15(totalReceived, receivedVcf);
  const lossAt15 = calculateLossAt15(receivedVolumeAt15, loadedVolumeAt15);

  return {
    loadedCompartmentVolumes,
    receivedCompartmentVolumes,
    totalLoaded,
    totalReceived,
    observedDiff,
    loadedVcf,
    receivedVcf,
    loadedVolumeAt15,
    receivedVolumeAt15,
    lossAt15,
  };
}
