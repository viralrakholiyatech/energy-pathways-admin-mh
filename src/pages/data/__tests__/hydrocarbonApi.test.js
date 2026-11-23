import { parseGasResponse, fetchGasInputs, parseHydrocarbonResponse, fetchHydrocarbonInputs } from '../api/hydrocarbonApi';
import { HYDROCARBON_FIELDS } from '../config/hydrocarbonDataConfig';
import { getToken } from '../../../utils/auth';
jest.mock('../../../utils/auth', () => ({ getToken: jest.fn() }));
afterEach(() => jest.restoreAllMocks());

test.each(['ib', 'ic', 'id', 'ie'])('%s requests its own API and maps only its visible inputs', async (section) => {
  const sheet = `I.${section.slice(1)}-KS`;
  const fields = HYDROCARBON_FIELDS.filter((field) => field.section === section && !field.hidden);
  const values = Object.fromEntries(fields.map((field) => [field.ref, field.inputType === 'text' ? 'Example' : 0.25]));
  values[fields[0].ref] = 0;
  delete values[fields[1].ref];
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ sheet, values }) });
  const parsed = await fetchHydrocarbonInputs(section);
  expect(fetch.mock.calls[0][0]).toBe(`/api/admin/sheets/${sheet}`);
  expect(Object.keys(parsed).sort()).toEqual(fields.map((field) => field.key).sort());
  expect(parsed[fields[0].key]).toBe('0');
  expect(parsed[fields[1].key]).toBe('');
  fields.slice(2).forEach((field) => expect(parsed[field.key]).toBe(field.inputType === 'text' ? 'Example' : field.unit === '%' ? '25' : '0.25'));
  expect(() => parseHydrocarbonResponse({ sheet: 'I.a-KS', values }, section)).toThrow();
});

test('maps only the visible manual I.a cells and converts raw percentage fractions once', () => {
  expect(parseGasResponse({ sheet: 'I.a- KS', values: { H69: 0.58326, H70: 0, H71: null, G16: 99 } })).toEqual({
    ia_H69: '58.326', ia_H70: '0', ia_H71: '', ia_H72: ''
  });
  expect(() => parseGasResponse({ sheet: 'GDP', values: {} })).toThrow();
  expect(() => parseGasResponse({ sheet: 'I.a-KS', values: { H69: {} } })).toThrow();
});

test('uses same-origin GET with auth and cancellation and rejects HTTP errors', async () => {
  getToken.mockReturnValue('test-token');
  const signal = new AbortController().signal;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ sheet: 'I.a-KS', values: { H69: 0.5 } }) });
  expect((await fetchGasInputs(signal)).ia_H69).toBe('50');
  expect(fetch).toHaveBeenCalledWith('/api/admin/sheets/I.a-KS', expect.objectContaining({ method: 'GET', signal,
    headers: { Accept: 'application/json', Authorization: 'Bearer test-token' } }));
  fetch.mockResolvedValue({ ok: false, status: 503 });
  await expect(fetchGasInputs()).rejects.toThrow('HTTP 503');
});
