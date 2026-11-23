import { getToken } from '../../../utils/auth';

export function parseSheetInputs(payload, sheet, fields) {
  if (typeof payload?.sheet !== 'string' || payload.sheet.replace(/\s/g, '').toLowerCase() !== sheet.replace(/\s/g, '').toLowerCase()
    || !payload.values || typeof payload.values !== 'object' || Array.isArray(payload.values)) {
    throw new Error(`Invalid ${sheet} response.`);
  }
  return Object.fromEntries(fields.map((field) => {
    const raw = payload.values[field.source.split('!').pop()];
    if (raw == null || raw === '') return [field.key, ''];
    if (!['number', 'string'].includes(typeof raw) || !String(raw).trim() || !Number.isFinite(Number(raw))) {
      throw new Error(`Invalid ${sheet} field value.`);
    }
    return [field.key, field.unit === '%' ? String(Number((Number(raw) * 100).toPrecision(15))) : String(raw)];
  }));
}

export async function fetchSheetInputs(sheet, fields, signal) {
  const token = getToken();
  const response = await fetch(`/api/admin/sheets/${encodeURIComponent(sheet)}`, {
    method: 'GET', signal, cache: 'no-store',
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  if (!response.ok) throw new Error(`Could not load ${sheet} (HTTP ${response.status}).`);
  return parseSheetInputs(await response.json(), sheet, fields);
}
