import { act } from 'react';
import { createRoot } from 'react-dom/client';
import NuclearUpdateForm from '../pages/NuclearUpdateForm';
import HydroElectricUpdateForm from '../pages/HydroElectricUpdateForm';
import RenewableUpdateForm from '../pages/RenewableUpdateForm';
import BioenergyUpdateForm from '../pages/BioenergyUpdateForm';
import WasteUpdateForm from '../pages/WasteUpdateForm';
import HydrogenUpdateForm from '../pages/HydrogenUpdateForm';
import GridStorageUpdateForm from '../pages/GridStorageUpdateForm';
import { RENEWABLE_FIELDS } from '../config/renewableDataConfig';
import { BIOENERGY_FIELDS } from '../config/bioenergyDataConfig';
import { WASTE_CONFIG } from '../config/wasteDataConfig';
import { HYDROGEN_CONFIG } from '../config/hydrogenDataConfig';
import { fetchSheetInputs } from '../api/sheetInputsApi';
jest.mock('../api/sheetInputsApi', () => ({ fetchSheetInputs: jest.fn() }));

test.each([
  ['II-ND', NuclearUpdateForm, 'ii_G19', 'ii_H19'],
  ['III-ND', HydroElectricUpdateForm, 'iii_O16', 'iii_P16'],
  ['IV.a-VM', RenewableUpdateForm, ...RENEWABLE_FIELDS.slice(0, 2).map(f => f.key)],
  ['V.a-KD', BioenergyUpdateForm, ...BIOENERGY_FIELDS.slice(0, 2).map(f => f.key)],
  ['VI-KS', WasteUpdateForm, ...WASTE_CONFIG.fields.slice(0, 2).map(f => f.key)],
  ['VIII', HydrogenUpdateForm, ...HYDROGEN_CONFIG.fields.slice(0, 2).map(f => f.key)]
])('%s loads API data with retry and no workbook fallback', async (sheet, Form, key, missing) => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  fetchSheetInputs.mockReset();
  let reject;
  fetchSheetInputs.mockImplementationOnce(() => new Promise((_, rejectRequest) => { reject = rejectRequest; }));
  try {
    act(() => root.render(<Form />));
    expect(container.querySelector('[role="status"]').textContent).toContain(sheet);
    expect(container.querySelector('input')).toBeNull();
    await act(async () => reject(new Error('offline')));
    expect(container.querySelector('[role="alert"]').textContent).toContain('Could not load');
    expect(container.querySelector('input')).toBeNull();
    fetchSheetInputs.mockResolvedValueOnce({ [key]: '12.345', [missing]: '' });
    await act(async () => container.querySelector('[role="alert"] button').click());
    const input = container.querySelector(`input[name="${key}"]`);
    expect(input.value).toBe('12.345');
    expect(input.readOnly).toBe(true);
    expect(container.querySelector(`input[name="${missing}"]`).placeholder).toBe('-');
    expect(fetchSheetInputs.mock.calls[1][0]).toBe(sheet);
    const signal = fetchSheetInputs.mock.calls[1][2];
    act(() => root.unmount());
    expect(signal.aborted).toBe(true);
  } finally { act(() => root.unmount()); }
});

test('VII requests every selected sheet and ignores late responses after switching', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  fetchSheetInputs.mockReset();
  const pending = {};
  fetchSheetInputs.mockImplementation(sheet => new Promise(resolve => { pending[sheet] = resolve; }));
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<GridStorageUpdateForm />));
    expect(fetchSheetInputs.mock.calls.map(call => call[0])).toEqual(['VII.a-KS']);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => pending['VII.a-KS']({}));
    expect(container.querySelectorAll('table').length).toBeGreaterThan(0);
    await act(async () => container.querySelector('#gridStorage-tab-viib').click());
    const signal = fetchSheetInputs.mock.calls[1][2];
    await act(async () => container.querySelector('#gridStorage-tab-viic').click());
    expect(signal.aborted).toBe(true);
    expect(fetchSheetInputs.mock.calls.map(call => call[0])).toEqual(['VII.a-KS', 'VII.b-KS', 'VII.c-KS']);
    await act(async () => pending['VII.c-KS']({ viic_G27: '123' }));
    expect(container.querySelector('input[name="viic_G27"]').value).toBe('123');
    await act(async () => pending['VII.b-KS']({ viib_F28: '999' }));
    expect(container.querySelector('input[name="viic_G27"]').value).toBe('123');
    expect(container.querySelector('input[name="viib_F28"]')).toBeNull();
    expect(container.querySelector('[role="tablist"] svg')).toBeNull();
  } finally { act(() => root.unmount()); }
});
