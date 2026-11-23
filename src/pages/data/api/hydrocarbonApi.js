import { HYDROCARBON_FIELDS } from '../config/hydrocarbonDataConfig';
import { getToken } from '../../../utils/auth';

const SHEETS = { ia: 'I.a-KS', ib: 'I.b-KS', ic: 'I.c-KS', id: 'I.d-KS', ie: 'I.e-KS' };

export function parseHydrocarbonResponse(payload, section) {
  if (!SHEETS[section] || typeof payload?.sheet !== 'string' || payload.sheet.replace(/\s/g, '') !== SHEETS[section]
    || !payload.values || typeof payload.values !== 'object' || Array.isArray(payload.values)) {
    throw new Error('The server returned an invalid Section I response.');
  }
  return Object.fromEntries(HYDROCARBON_FIELDS.filter((field) => field.section === section && !field.hidden).map((field) => {
    const raw = payload.values[field.ref];
    if (raw == null || raw === '') return [field.key, ''];
    if (field.inputType === 'text' && typeof raw === 'string') return [field.key, raw];
    if (field.allowDash && raw === '-') return [field.key, '-'];
    if (!['number', 'string'].includes(typeof raw) || String(raw).trim() === '' || !Number.isFinite(Number(raw))) {
      throw new Error('The server returned an invalid Section I value.');
    }
    return [field.key, field.unit === '%' ? String(Number((Number(raw) * 100).toPrecision(15))) : String(raw)];
  }));
}

export async function fetchHydrocarbonInputs(section, signal) {
  if (!SHEETS[section]) throw new Error('Unknown Section I sheet.');
  const token = getToken();
  const response = await fetch(`/api/admin/sheets/${SHEETS[section]}`, {
    method: 'GET', signal, cache: 'no-store',
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  if (!response.ok) throw new Error(`Could not load ${SHEETS[section]} data (HTTP ${response.status}).`);
  return parseHydrocarbonResponse(await response.json(), section);
}

export const parseGasResponse = (payload) => parseHydrocarbonResponse(payload, 'ia');
export const fetchGasInputs = (signal) => fetchHydrocarbonInputs('ia', signal);
