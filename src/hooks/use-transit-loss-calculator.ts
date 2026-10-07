import { useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { useTransitLossHistory } from '@/hooks/use-transit-loss-history';
import { computeTransitLossSummary, parseOptionalDecimal } from '@/utils/transit-loss';
import { lookupVehicleByRegNumber, type VehicleDetails } from '@/utils/vehicle-lookup';

export type VehicleLookupStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'offline-unavailable';
export type VehicleDataSource = 'network' | 'cache' | null;

function replaceAt(values: string[], index: number, text: string): string[] {
  const next = values.slice();
  next[index] = text;
  return next;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useTransitLossCalculator() {
  const [regNumberInput, setRegNumberInput] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null);
  const [vehicleLookupStatus, setVehicleLookupStatus] = useState<VehicleLookupStatus>('idle');
  const [vehicleDataSource, setVehicleDataSource] = useState<VehicleDataSource>(null);
  /** When the device copy in use was fetched; null when using live data or unknown. */
  const [vehicleSavedAt, setVehicleSavedAt] = useState<string | null>(null);
  const [loadedUllageInputs, setLoadedUllageInputs] = useState<string[]>([]);
  const [receivedUllageInputs, setReceivedUllageInputs] = useState<string[]>([]);
  const [loadedTemperatureInput, setLoadedTemperatureInput] = useState('');
  const [loadedDensityInput, setLoadedDensityInput] = useState('');
  const [receivedTemperatureInput, setReceivedTemperatureInput] = useState('');
  const [receivedDensityInput, setReceivedDensityInput] = useState('');

  const lookupVehicle = async () => {
    setVehicleLookupStatus('loading');
    const outcome = await lookupVehicleByRegNumber(regNumberInput);

    const details = outcome.status === 'found' ? outcome.details : null;
    setVehicleDetails(details);
    setVehicleLookupStatus(outcome.status);
    setVehicleDataSource(outcome.status === 'found' ? outcome.source : null);
    setVehicleSavedAt(outcome.status === 'found' && outcome.source === 'cache' ? outcome.savedAt : null);

    const compartmentCount = details?.compartments.length ?? 0;
    setLoadedUllageInputs(Array(compartmentCount).fill(''));
    setReceivedUllageInputs(Array(compartmentCount).fill(''));
  };

  const setLoadedUllage = (index: number, text: string) => {
    setLoadedUllageInputs((current) => replaceAt(current, index, text));
  };

  const setReceivedUllage = (index: number, text: string) => {
    setReceivedUllageInputs((current) => replaceAt(current, index, text));
  };

  const isCertExpired = vehicleDetails ? vehicleDetails.expiryDate < todayIsoDate() : false;
  const showOfflineExpiredWarning = vehicleDataSource === 'cache' && isCertExpired;

  const summary = computeTransitLossSummary({
    compartments: vehicleDetails?.compartments ?? [],
    loadedUllageInputs,
    receivedUllageInputs,
    loadedTemperatureInput,
    loadedDensityInput,
    receivedTemperatureInput,
    receivedDensityInput,
  });

  const history = useTransitLossHistory();
  const { session } = useSession();

  const saveRecord = () => {
    if (!vehicleDetails) {
      return;
    }
    history.saveRecord({
      regNumber: regNumberInput,
      vehicleDetails,
      summary,
      loadedTemperature: parseOptionalDecimal(loadedTemperatureInput),
      loadedDensity: parseOptionalDecimal(loadedDensityInput),
      receivedTemperature: parseOptionalDecimal(receivedTemperatureInput),
      receivedDensity: parseOptionalDecimal(receivedDensityInput),
      userId: session?.user.id ?? null,
    });
  };

  return {
    regNumberInput,
    setRegNumberInput,
    vehicleDetails,
    vehicleLookupStatus,
    vehicleDataSource,
    vehicleSavedAt,
    isCertExpired,
    showOfflineExpiredWarning,
    lookupVehicle,
    loadedUllageInputs,
    setLoadedUllage,
    receivedUllageInputs,
    setReceivedUllage,
    loadedTemperatureInput,
    setLoadedTemperatureInput,
    loadedDensityInput,
    setLoadedDensityInput,
    receivedTemperatureInput,
    setReceivedTemperatureInput,
    receivedDensityInput,
    setReceivedDensityInput,
    summary,
    saveRecord,
    saveStatus: history.saveStatus,
  };
}
