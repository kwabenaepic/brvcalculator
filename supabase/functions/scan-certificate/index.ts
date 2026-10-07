// Reads a BRV calibration certificate (photo or PDF) with Claude and returns
// the fields the vehicle admin form needs. Nothing is saved here — the app
// fills the form and an admin reviews it before pressing Save.
//
// Deploy:   supabase functions deploy scan-certificate
// Secret:   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// SUPABASE_URL / SUPABASE_ANON_KEY are provided by the Edge runtime.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const MODEL = 'claude-opus-5-5';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const PDF_TYPE = 'application/pdf';
// Base64 inflates by ~4/3; the API caps images at 5 MB, and the app resizes
// photos well below that before sending.
const MAX_BASE64_LENGTH = 7_000_000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SYSTEM_PROMPT = `You extract data from Bulk Road Vehicle (BRV) calibration certificates issued in Ghana (GSA / NPA). The values you return are used for fuel transit-loss accounting, so accuracy matters more than completeness: never guess a digit you cannot read.

Certificates differ by issuing company, but contain:
- Registration number of the vehicle (e.g. "GX 1103-18"). Return it exactly as printed.
- Certificate number and bulk number, exactly as printed.
- Expiry date. Ghanaian certificates write dates day-first (DD/MM/YYYY); return ISO YYYY-MM-DD. If the issue date is also printed, use it as a sanity check (validity is typically 6 months).
- One calibration table per compartment, each with a nominal capacity in litres and rows pairing capacity (litres) with ullage (cm). Column order varies between issuers (capacity may come before ullage) — read the column headers. An asterisk marking the row where nominal capacity is set is not part of the number.

Rules:
- Skip compartments that are unused, blank, or filled with "***".
- Return compartments in the order of their compartment number.
- If any value is smudged, obscured by a stamp or watermark, or otherwise uncertain, still give your best reading but add a warning naming the compartment, row and value (e.g. "Compartment 2, 9050 L row: ullage looks like 32.0 but is faint"). Also warn if a column's values don't change monotonically, which suggests a misread.
- If a field is not on the certificate or unreadable, return an empty string for it and add a warning.
- If the image is not a BRV calibration certificate, set is_certificate to false and leave the other fields empty.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_certificate', 'reg_number', 'cert_no', 'bulk_no', 'expiry_date', 'compartments', 'warnings'],
  properties: {
    is_certificate: { type: 'boolean' },
    reg_number: { type: 'string' },
    cert_no: { type: 'string' },
    bulk_no: { type: 'string' },
    expiry_date: { type: 'string', description: 'ISO date YYYY-MM-DD, or empty if unreadable' },
    compartments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['compartment_number', 'nominal_capacity_liters', 'points'],
        properties: {
          compartment_number: { type: 'integer' },
          nominal_capacity_liters: { type: 'number' },
          points: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['ullage_cm', 'capacity_liters'],
              properties: {
                ullage_cm: { type: 'number' },
                capacity_liters: { type: 'number' },
              },
            },
          },
        },
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
};

type Extraction = {
  is_certificate: boolean;
  reg_number: string;
  cert_no: string;
  bulk_no: string;
  expiry_date: string;
  compartments: {
    compartment_number: number;
    nominal_capacity_liters: number;
    points: { ullage_cm: number; capacity_liters: number }[];
  }[];
  warnings: string[];
};

async function isAdmin(authHeader: string): Promise<boolean> {
  // Runs as the caller, so the admins table's "select own" policy decides.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return false;
  }
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', userData.user.id).maybeSingle();
  return Boolean(data);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !(await isAdmin(authHeader))) {
    return json({ error: 'Only admins can scan certificates.' }, 403);
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return json({ error: 'Certificate scanning isn’t set up yet (missing ANTHROPIC_API_KEY secret).' }, 500);
  }

  let mediaType: string;
  let data: string;
  try {
    ({ mediaType, data } = await req.json());
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  if (typeof data !== 'string' || !data) {
    return json({ error: 'No file received.' }, 400);
  }
  if (data.length > MAX_BASE64_LENGTH) {
    return json({ error: 'File is too large — use a smaller photo or PDF.' }, 413);
  }

  let fileBlock: Anthropic.Beta.BetaContentBlockParam;
  if (mediaType === PDF_TYPE) {
    fileBlock = { type: 'document', source: { type: 'base64', media_type: PDF_TYPE, data } };
  } else if (IMAGE_TYPES.includes(mediaType)) {
    fileBlock = {
      type: 'image',
      source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data },
    };
  } else {
    return json({ error: 'Unsupported file type — use a JPEG/PNG photo or a PDF.' }, 400);
  }

  const client = new Anthropic({ apiKey });

  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 32000,
        system: SYSTEM_PROMPT,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
        // If a safety classifier declines, retry on Anthropic's recommended
        // fallback model inside the same call instead of failing the scan.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: [
          {
            role: 'user',
            content: [fileBlock, { type: 'text', text: 'Extract this calibration certificate.' }],
          },
        ],
      })
      .finalMessage();
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return json({ error: 'The scanner is busy — try again in a minute.' }, 503);
    }
    if (error instanceof Anthropic.BadRequestError) {
      return json({ error: `The scanner couldn't read this file: ${error.message}` }, 400);
    }
    if (error instanceof Anthropic.APIError) {
      return json({ error: `Scanner error (${error.status}). Try again.` }, 502);
    }
    throw error;
  }

  if (message.stop_reason === 'refusal') {
    return json({ error: 'The scanner declined to read this file.' }, 422);
  }
  if (message.stop_reason === 'max_tokens') {
    return json({ error: 'The scan was cut off before finishing. Try again.' }, 502);
  }

  const text = message.content.find((block) => block.type === 'text');
  let extraction: Extraction;
  try {
    extraction = JSON.parse(text && text.type === 'text' ? text.text : '');
  } catch {
    return json({ error: 'The scanner returned an unreadable result. Try again.' }, 502);
  }

  if (!extraction.is_certificate) {
    return json({ error: 'This doesn’t look like a BRV calibration certificate.' }, 422);
  }

  return json({
    regNumber: extraction.reg_number,
    details: {
      certNo: extraction.cert_no,
      bulkNo: extraction.bulk_no,
      expiryDate: extraction.expiry_date,
      compartments: [...extraction.compartments]
        .sort((a, b) => a.compartment_number - b.compartment_number)
        .map((compartment, index) => ({
          id: index + 1,
          nominalCapacityLiters: compartment.nominal_capacity_liters,
          points: compartment.points.map((point) => ({
            ullageCm: point.ullage_cm,
            capacityLiters: point.capacity_liters,
          })),
        })),
    },
    warnings: extraction.warnings,
  });
});
