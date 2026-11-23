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

export async function fetchGdpInputs(signal) {
  const token = getToken();
  const response = await fetch('/api/admin/sheets/GDP', {
    method: 'GET', signal, cache: 'no-store',
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  if (!response.ok) throw new Error(`Could not load GDP data (HTTP ${response.status}).`);
  return parseGdpResponse(await response.json());
}
