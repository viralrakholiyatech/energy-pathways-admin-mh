import { fetchSheetInputs, parseSheetInputs } from '../api/sheetInputsApi';
import { NUCLEAR_FIELDS } from '../config/nuclearDataConfig';
import { HYDRO_FIELDS } from '../config/hydroElectricDataConfig';
import { getToken } from '../../../utils/auth';
jest.mock('../../../utils/auth', () => ({ getToken: jest.fn() }));

test.each([['II-ND', NUCLEAR_FIELDS], ['III-ND', HYDRO_FIELDS]])('%s maps raw cells to registered fields only', async (sheet, fields) => {
  const values = Object.fromEntries(fields.map((field) => [field.source.split('!').pop(), 0.25]));
  values[fields[0].source.split('!').pop()] = 0;
  delete values[fields[1].source.split('!').pop()];
  getToken.mockReturnValue('test-token');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ sheet: sheet.replace('-ND','- ND'), values }) });
  const signal = new AbortController().signal;
  const result = await fetchSheetInputs(sheet, fields, signal);
  expect(Object.keys(result).sort()).toEqual(fields.map((field) => field.key).sort());
  expect(result[fields[0].key]).toBe('0');
  expect(result[fields[1].key]).toBe('');
  fields.slice(2).forEach((field) => expect(result[field.key]).toBe(field.unit === '%' ? '25' : '0.25'));
  expect(fetch).toHaveBeenCalledWith('/api/admin/sheets/' + sheet, expect.objectContaining({ method: 'GET', signal,
    headers: { Accept: 'application/json', Authorization: 'Bearer test-token' } }));
  expect(() => parseSheetInputs({ sheet: 'GDP', values }, sheet, fields)).toThrow();
  values[fields[0].source.split('!').pop()] = {};
  expect(() => parseSheetInputs({ sheet, values }, sheet, fields)).toThrow();
  fetch.mockResolvedValue({ ok: false, status: 503 });
  await expect(fetchSheetInputs(sheet, fields)).rejects.toThrow('HTTP 503');
});
