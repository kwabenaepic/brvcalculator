import { useState } from 'react';

import type { CertificateScan } from '@/utils/certificate-scan';
import { lookupVehicleByRegNumber, upsertVehicle, type VehicleDetails } from '@/utils/vehicle-lookup';
import { validateVehicleForm } from '@/utils/vehicle-form-validation';

export type CompartmentPointForm = { ullageCm: string; capacityLiters: string };
/** `key` is a stable React key only — never saved. */
export type CompartmentForm = { key: number; nominalCapacityLiters: string; points: CompartmentPointForm[] };
export type LoadStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'offline';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'invalid' | 'error' | 'not-configured';

let nextCompartmentKey = 1;

function emptyCompartment(): CompartmentForm {
  return { key: nextCompartmentKey++, nominalCapacityLiters: '', points: [{ ullageCm: '', capacityLiters: '' }] };
}

/**
 * Parses calibration points pasted from a spreadsheet or typed out, one point
 * per line as "ullage capacity" — tabs, commas, semicolons or spaces between.
 * Lines without two numbers (headers, blanks) are skipped; thousands
 * separators aren't supported since a comma is also a column separator.
 */
export function parsePastedPoints(text: string): CompartmentPointForm[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().split(/[\t,;\s]+/).filter(Boolean))
    .filter((cells) => cells.length >= 2 && cells.slice(0, 2).every((cell) => !Number.isNaN(Number(cell))))
    .map(([ullageCm, capacityLiters]) => ({ ullageCm, capacityLiters }));
}

function toCompartmentForms(details: VehicleDetails): CompartmentForm[] {
  return details.compartments.map((compartment) => ({
    key: nextCompartmentKey++,
    nominalCapacityLiters: String(compartment.nominalCapacityLiters),
    points: compartment.points.map((point) => ({
      ullageCm: String(point.ullageCm),
      capacityLiters: String(point.capacityLiters),
    })),
  }));
}

function replaceAt<T>(values: T[], index: number, next: T): T[] {
  return values.map((value, i) => (i === index ? next : value));
}

export function useVehicleAdminForm() {
  const [regNumberInput, setRegNumberInput] = useState('');
  const [certNoInput, setCertNoInput] = useState('');
  const [bulkNoInput, setBulkNoInput] = useState('');
  const [expiryDateInput, setExpiryDateInput] = useState('');
  const [compartments, setCompartments] = useState<CompartmentForm[]>([emptyCompartment()]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);

  const clearDetails = () => {
    setCertNoInput('');
    setBulkNoInput('');
    setExpiryDateInput('');
    setCompartments([emptyCompartment()]);
    setSaveStatus('idle');
    setSaveError(null);
    setScanWarnings([]);
  };

  const startNewVehicle = () => {
    setRegNumberInput('');
    setLoadStatus('idle');
    clearDetails();
  };

  /** Loads a saved vehicle into the form — the typed reg number, or `regNumber` when picked from the list. */
  const loadExisting = async (regNumber: string = regNumberInput) => {
    setRegNumberInput(regNumber);
    setLoadStatus('loading');
    setSaveStatus('idle');
    setSaveError(null);
    setScanWarnings([]);
    const outcome = await lookupVehicleByRegNumber(regNumber);
    if (outcome.status === 'offline-unavailable') {
      setLoadStatus('offline');
      return;
    }
    if (outcome.status === 'not-found') {
      // Don't carry over the previously loaded vehicle's details into what
      // is now a new record.
      clearDetails();
      setLoadStatus('not-found');
      return;
    }

    const details = outcome.details;
    setCertNoInput(details.certNo);
    setBulkNoInput(details.bulkNo);
    setExpiryDateInput(details.expiryDate);
    setCompartments(toCompartmentForms(details));
    setLoadStatus('found');
  };

  /**
   * Fills the form from a scanned certificate without saving. Also checks
   * whether the reg number is already on file, so the screen can say that
   * saving will overwrite an existing record.
   */
  const applyScan = async (scan: CertificateScan) => {
    setRegNumberInput(scan.regNumber);
    setCertNoInput(scan.details.certNo);
    setBulkNoInput(scan.details.bulkNo);
    setExpiryDateInput(scan.details.expiryDate);
    setCompartments(
      scan.details.compartments.length > 0 ? toCompartmentForms(scan.details) : [emptyCompartment()],
    );
    setScanWarnings(scan.warnings);
    setSaveStatus('idle');
    setSaveError(null);

    if (!scan.regNumber.trim()) {
      setLoadStatus('idle');
      return;
    }
    setLoadStatus('loading');
    const outcome = await lookupVehicleByRegNumber(scan.regNumber);
    setLoadStatus(outcome.status === 'found' ? 'found' : outcome.status === 'not-found' ? 'not-found' : 'idle');
  };

  const addCompartment = () => {
    setCompartments((current) => [...current, emptyCompartment()]);
  };

  const removeCompartment = (index: number) => {
    setCompartments((current) => current.filter((_, i) => i !== index));
  };

  const setNominalCapacity = (index: number, text: string) => {
    setCompartments((current) => replaceAt(current, index, { ...current[index], nominalCapacityLiters: text }));
  };

  const replacePoints = (compartmentIndex: number, points: CompartmentPointForm[]) => {
    setCompartments((current) => replaceAt(current, compartmentIndex, { ...current[compartmentIndex], points }));
  };

  const addPoint = (compartmentIndex: number) => {
    setCompartments((current) =>
      replaceAt(current, compartmentIndex, {
        ...current[compartmentIndex],
        points: [...current[compartmentIndex].points, { ullageCm: '', capacityLiters: '' }],
      }),
    );
  };

  const removePoint = (compartmentIndex: number, pointIndex: number) => {
    setCompartments((current) =>
      replaceAt(current, compartmentIndex, {
        ...current[compartmentIndex],
        points: current[compartmentIndex].points.filter((_, i) => i !== pointIndex),
      }),
    );
  };

  const setPoint = (compartmentIndex: number, pointIndex: number, patch: Partial<CompartmentPointForm>) => {
    setCompartments((current) =>
      replaceAt(current, compartmentIndex, {
        ...current[compartmentIndex],
        points: replaceAt(current[compartmentIndex].points, pointIndex, {
          ...current[compartmentIndex].points[pointIndex],
          ...patch,
        }),
      }),
    );
  };

  const save = async () => {
    const validation = validateVehicleForm({ certNoInput, bulkNoInput, expiryDateInput, compartments });
    if (validation.status === 'invalid') {
      setSaveStatus('invalid');
      setSaveError(validation.message);
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);
    const outcome = await upsertVehicle(regNumberInput, validation.details);
    if (outcome.status === 'error') {
      setSaveError(outcome.message);
    }
    setSaveStatus(outcome.status === 'ok' ? 'saved' : outcome.status);
  };

  return {
    regNumberInput,
    setRegNumberInput,
    certNoInput,
    setCertNoInput,
    bulkNoInput,
    setBulkNoInput,
    expiryDateInput,
    setExpiryDateInput,
    compartments,
    addCompartment,
    removeCompartment,
    setNominalCapacity,
    addPoint,
    removePoint,
    setPoint,
    replacePoints,
    loadStatus,
    loadExisting,
    startNewVehicle,
    applyScan,
    scanWarnings,
    saveStatus,
    saveError,
    save,
  };
}
