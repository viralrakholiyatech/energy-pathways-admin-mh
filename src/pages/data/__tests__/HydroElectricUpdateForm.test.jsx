import { fetchSheetInputs } from '../api/sheetInputsApi';
jest.mock('../api/sheetInputsApi', () => ({ fetchSheetInputs: jest.fn() }));
beforeEach(() => fetchSheetInputs.mockResolvedValue({ iii_G54: '33.08', iii_O16: '2.06' }));
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import HydroElectricUpdateForm from '../pages/HydroElectricUpdateForm';
import { HYDRO_FIELDS, HYDRO_SECTIONS } from '../config/hydroElectricDataConfig';

test('Section III matches the shared display layout with all manual inputs and independent accordions', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<HydroElectricUpdateForm />));
    expect([...container.querySelectorAll('caption')].map((caption) => caption.textContent)).toEqual(expect.arrayContaining(HYDRO_SECTIONS.flatMap((section) => section.tables.map((table) => table.title))));
    const inputs = [...container.querySelectorAll('input')];
    expect(inputs.map((input) => input.name).sort()).toEqual(HYDRO_FIELDS.map((field) => field.key).sort());
    expect(inputs.every((input) => input.readOnly)).toBe(true);
    expect(container.textContent).not.toContain('Notes');
    expect(container.textContent).not.toContain('Expand all');
    expect(container.textContent).not.toContain('Save');
    expect(container.textContent).not.toContain('Data loaded from API');
    expect(container.querySelector('input[name="iii_G54"]').value).toBe('33.08');
    const capacity = container.querySelector('#hydroElectric-heading-growth');
    act(() => capacity.click());
    expect(capacity.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('input[name="iii_O16"]')).toBeNull();
    expect(container.querySelector('input[name="iii_G54"]')).not.toBeNull();
    act(() => capacity.click());
    expect(container.querySelector('input[name="iii_O16"]').value).toBe('2.06');
  } finally { act(() => root.unmount()); container.remove(); }
});
