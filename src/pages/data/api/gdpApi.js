import { GDP_FIELDS } from '../config/gdpDataConfig';
import { getToken } from '../../../utils/auth';

export function parseGdpResponse(payload) {
  if (payload?.sheet !== 'GDP' || !payload.values || typeof payload.values !== 'object' || Array.isArray(payload.values)) {
    throw new Error('The server returned an invalid GDP response.');
  }
  const metadata = Object.fromEntries((payload.sections || []).flatMap((section) => section.fields || []).map((field) => [field.key, field]));
  const values = {};
  GDP_FIELDS.forEach(({ key }) => {
    const value = payload.values[key];
    if (value !== null && value !== undefined && typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error('The server returned an invalid GDP field value.');
    }
    values[key] = value == null ? '' : String(value);
    if (!Object.prototype.hasOwnProperty.call(payload.values, key)) metadata[key] = { available: false, readOnly: true, sourceKind: 'missing' };
  });
  return { values, metadata };
}

async function requestGdp(signal) {
  const token = getToken();
  const response = await fetch('/api/admin/sheets/GDP', {
    method: 'GET', signal, cache: 'no-store',
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  if (!response.ok) throw new Error(`Could not load GDP data (HTTP ${response.status}).`);
  return response.json();
}

export async function fetchGdpInputs(signal) {
  return parseGdpResponse(await requestGdp(signal));
}

export async function fetchMaharashtraGdpInputs(fields, signal) {
  const payload = await requestGdp(signal);
  if (payload?.sheet !== 'GDP') throw new Error('Unexpected GDP sheet response.');
  const result = {};
  function assign(source, value, raw) {
    const ref = String(source).replace(/^GDP!/i, '').replace(/\$/g, '').toUpperCase();
    if (!fields.has(ref)) return;
    if (value == null || value === '') { result[ref] = ''; return; }
    if (!['number','string'].includes(typeof value) || !Number.isFinite(Number(value))) throw new Error('Invalid GDP value at ' + ref);
    result[ref] = raw && fields.get(ref) === 'percent' ? String(Number((Number(value) * 100).toPrecision(15))) : String(value);
  }
  if (Array.isArray(payload.fields)) {
    for (const field of payload.fields) {
      if (!field || field.sourceKind === 'formula') continue;
      const address = field.address || field.key;
      if (Object.prototype.hasOwnProperty.call(field, 'value')) assign(address, field.value, false);
      else assign(address, field.rawValue, true);
    }
  } else {
    for (const cell of payload.cells || []) assign(cell.address, cell.value, true);
    for (const [ref, value] of Object.entries(payload.values || {})) assign(ref, value, true);
    for (const section of payload.sections || []) {
      for (const field of section.fields || []) {
        if (field.sourceKind !== 'formula' && Object.prototype.hasOwnProperty.call(payload.values || {}, field.key)) {
          assign(field.source || field.address, payload.values[field.key], false);
        }
      }
    }
  }
  if (!Object.keys(result).length) throw new Error('The GDP response contained no matching worksheet inputs.');
  return result;
}
