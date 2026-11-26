import { fetchMaharashtraGdpInputs, fetchGdpInputs, parseGdpResponse } from '../api/gdpApi';
import { getToken } from '../../../utils/auth';
jest.mock('../../../utils/auth', () => ({ getToken: jest.fn() }));
afterEach(() => { jest.restoreAllMocks(); });

test('does not import formula CAGR results into displayed input values', () => {
  const data = parseGdpResponse({ sheet: 'GDP', values: {}, cells: [
    { address: 'D27', value: 0.0831542508710134 }, { address: 'D35', value: 0.07671764127966973 },
    { address: 'D43', value: 0.06114303821548658 }, { address: 'D61', value: 0 },
    { address: 'D69', value: null }, { address: 'D77', value: 'invalid' }
  ] });
  expect(data).not.toHaveProperty('cagr');
  expect(data.values).not.toHaveProperty('D27');
});

test('uses displayed API values directly, retaining blanks and excluding unknown fields', () => {
  const data = parseGdpResponse({ sheet: 'GDP', readOnly: true,
    values: { 'growth_high_val_2021-25': '7.123456789', passenger_sc1_l1_2021: 0, telecom_high_note: '', ind_l1_textile_2021: null, unknown: 42 },
    sections: [{ fields: [{ key: 'ind_l1_textile_2021', sourceKind: 'formula', available: false, readOnly: true }] }]
  });
  expect(data.values['growth_high_val_2021-25']).toBe('7.123456789');
  expect(data.values.passenger_sc1_l1_2021).toBe('0');
  expect(data.values.ind_l1_textile_2021).toBe('');
  expect(data.values.telecom_high_note).toBe('');
  expect(data.values).not.toHaveProperty('unknown');
  expect(data.metadata.ind_l1_textile_2021.readOnly).toBe(true);
  expect(data.metadata.reference_A144.available).toBe(false);
});

test('rejects wrong sheets, malformed values and failed HTTP requests', async () => {
  expect(() => parseGdpResponse({ sheet: 'I', values: {} })).toThrow();
  expect(() => parseGdpResponse({ sheet: 'GDP', values: [] })).toThrow();
  expect(() => parseGdpResponse({ sheet: 'GDP', values: { passenger_sc1_l1_2021: {} } })).toThrow();
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
  await expect(fetchGdpInputs()).rejects.toThrow('HTTP 503');
});

test('requests GDP through the existing same-origin proxy and forwards auth and cancellation', async () => {
  getToken.mockReturnValue('test-token');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ sheet: 'GDP', values: {} }) });
  const controller = new AbortController();
  await fetchGdpInputs(controller.signal);
  expect(fetch).toHaveBeenCalledWith('/api/admin/sheets/GDP', expect.objectContaining({ method: 'GET', signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json', Authorization: 'Bearer test-token' } }));
});

test('loads MH fields by address using the login token and preserves display percentages', async () => {
  getToken.mockReturnValue('session-token');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({
    sheet: 'GDP', dataSource: 'mysql', readOnly: true,
    fields: [{ address: 'F16', key: 'F16', value: '10', rawValue: 0.1 },
      { address: 'F17', rawValue: 0.08 }, { address: 'F18', value: '0' }],
    values: { F16: 10 }
  }) });
  const fields = new Map(['F16', 'F17', 'F18'].map(ref => [ref, 'percent']));
  await expect(fetchMaharashtraGdpInputs(fields)).resolves.toEqual({ F16: '10', F17: '8', F18: '0' });
  expect(fetch).toHaveBeenCalledWith('/api/admin/sheets/GDP', expect.objectContaining({
    headers: expect.objectContaining({ Authorization: 'Bearer session-token' })
  }));
});
