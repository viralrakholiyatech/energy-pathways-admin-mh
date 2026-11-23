import { fetchSheetInputs } from '../api/sheetInputsApi';
jest.mock('../api/sheetInputsApi', () => ({ fetchSheetInputs: jest.fn() }));
beforeEach(() => fetchSheetInputs.mockResolvedValue({ ii_G81: '35', ii_G19: '0.273' }));
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import NuclearUpdateForm from '../pages/NuclearUpdateForm';
import { NUCLEAR_FIELDS, NUCLEAR_SECTIONS } from '../config/nuclearDataConfig';

test('Section II matches the shared display layout with all manual inputs and independent accordions', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<NuclearUpdateForm />));
    expect([...container.querySelectorAll('caption')].map((caption) => caption.textContent)).toEqual(expect.arrayContaining(NUCLEAR_SECTIONS.flatMap((section) => section.tables.map((table) => table.title))));
    const inputs = [...container.querySelectorAll('input')];
    expect(inputs.map((input) => input.name).sort()).toEqual(NUCLEAR_FIELDS.map((field) => field.key).sort());
    expect(inputs.every((input) => input.readOnly)).toBe(true);
    expect(container.textContent).not.toContain('Notes');
    expect(container.textContent).not.toContain('Expand all');
    expect(container.textContent).not.toContain('Save');
    expect(container.textContent).not.toContain('Data loaded from API');
    expect(container.querySelector('input[name="ii_G81"]').value).toBe('35');
    const capacity = container.querySelector('#nuclear-heading-capacity');
    act(() => capacity.click());
    expect(capacity.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('input[name="ii_G19"]')).toBeNull();
    expect(container.querySelector('input[name="ii_G81"]')).not.toBeNull();
    act(() => capacity.click());
    expect(container.querySelector('input[name="ii_G19"]').value).toBe('0.273');
  } finally { act(() => root.unmount()); container.remove(); }
});
