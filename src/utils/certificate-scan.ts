import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/utils/supabase-client';
import type { VehicleDetails } from '@/utils/vehicle-lookup';

export type CertificateScan = {
  regNumber: string;
  details: VehicleDetails;
  warnings: string[];
};

export type ScanOutcome =
  | { status: 'ok'; scan: CertificateScan }
  | { status: 'canceled' }
  | { status: 'error'; message: string };

// Long enough for small print in calibration tables to stay legible, small
// enough to keep a JPEG well under the API's 5 MB per-image limit.
const MAX_IMAGE_EDGE_PX = 2000;
const PDF_TYPE = 'application/pdf';

async function readAsBase64(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

/**
 * Re-encodes photos as JPEG, scaled down if needed — phone camera shots are
 * often over the size limit, and this also normalises formats like HEIC.
 */
async function prepareImage(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const longEdge = Math.max(image.width, image.height);
  const source =
    longEdge > MAX_IMAGE_EDGE_PX
      ? await ImageManipulator.manipulate(image)
          .resize(image.width >= image.height ? { width: MAX_IMAGE_EDGE_PX } : { height: MAX_IMAGE_EDGE_PX })
          .renderAsync()
      : image;
  const saved = await source.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  if (!saved.base64) {
    throw new Error('Could not read the image.');
  }
  return saved.base64;
}

async function errorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') {
        return body.error;
      }
    } catch {
      // Fall through to the generic message.
    }
  }
  return 'Couldn’t scan the certificate — check your connection and try again.';
}

/** Lets an admin pick a certificate photo or PDF and reads it with the scan-certificate Edge Function. */
export async function scanCertificate(): Promise<ScanOutcome> {
  if (!isSupabaseConfigured || !supabase) {
    return { status: 'error', message: 'Certificate scanning isn’t set up for this app yet.' };
  }

  const picked = await DocumentPicker.getDocumentAsync({ type: ['image/*', PDF_TYPE], multiple: false });
  if (picked.canceled || !picked.assets[0]) {
    return { status: 'canceled' };
  }
  const asset = picked.assets[0];
  const isPdf = asset.mimeType === PDF_TYPE || asset.name.toLowerCase().endsWith('.pdf');

  let data: string;
  try {
    data = isPdf ? await readAsBase64(asset.uri) : await prepareImage(asset.uri);
  } catch {
    return { status: 'error', message: 'Couldn’t open that file — try a JPEG or PNG photo, or a PDF.' };
  }

  const { data: result, error } = await supabase.functions.invoke<CertificateScan>('scan-certificate', {
    body: { mediaType: isPdf ? PDF_TYPE : 'image/jpeg', data },
  });
  if (error || !result) {
    return { status: 'error', message: await errorMessage(error) };
  }
  return { status: 'ok', scan: result };
}
