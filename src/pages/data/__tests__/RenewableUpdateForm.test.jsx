import { fetchSheetInputs } from '../api/sheetInputsApi';
jest.mock('../api/sheetInputsApi', () => ({ fetchSheetInputs: jest.fn() }));
beforeEach(() => fetchSheetInputs.mockImplementation(async (sheet, fields) => Object.fromEntries(fields.map(f => [f.key, '12.5']))));
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import RenewableUpdateForm from '../pages/RenewableUpdateForm';
import { RENEWABLE_FIELDS, RENEWABLE_SECTIONS } from '../config/renewableDataConfig';

test('six compact tabs display every named manual input once, read-only without save actions', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RenewableUpdateForm />));
    expect([...container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)).toEqual(['IV.a','IV.c.1','IV.c.2','IV.d','IV.e','IV.f']);
    expect(container.querySelector('[aria-selected="true"]').textContent).toBe('IV.a');
    const tableByTitle = title => [...container.querySelectorAll('table')].find(table => table.querySelector('caption')?.textContent.replace(/\s+/g, ' ').trim() === title);
    const additions = tableByTitle('Domestic solar PV New capacity addition');
    expect([...additions.querySelectorAll('tbody tr')].map(row => row.cells[0].textContent)).toEqual(['Trajectory 1', 'Trajectory 2', 'Trajectory 3', 'Trajectory 4']);
    const factors = tableByTitle('Capacity Utilisation Factors');
    const headers = [...factors.querySelectorAll('thead th')].map(cell => cell.textContent);
    const cagrIndex = headers.indexOf('CAGR');
    expect(cagrIndex).toBeGreaterThan(-1);
    expect(headers.filter(label => label === 'CAGR')).toHaveLength(1);
    expect([...factors.querySelectorAll('tbody tr')].map(row => row.cells[cagrIndex].textContent.trim())).toEqual(['-', '-', '-', '-']);
    const seen = [];
    for (const section of RENEWABLE_SECTIONS) {
      await act(async () => container.querySelector('#renewable-tab-' + section.id).click());
      expect([...container.querySelectorAll('caption')].map((caption) => caption.textContent)).toEqual(expect.arrayContaining(section.tables.map((table) => table.title)));
      expect(fetchSheetInputs.mock.calls.at(-1)[0]).toBe(section.sheet);
      if (section.id === 'ivf') {
        const matching = [...container.querySelectorAll('table')].filter(table => table.querySelector('caption')?.textContent === 'Final Capacity Addition after after every 5 years');
        expect(matching).toHaveLength(1);
        expect([...matching[0].querySelectorAll('thead th')].map(cell => cell.textContent)).toEqual(['Trajectory', 'Units', '2010', '2021', '2025', '2029', '2035', '2040', '2045', '2050']);
        expect([...matching[0].querySelectorAll('tbody tr')].map(row => row.cells[0].textContent)).toEqual(['Trajectory 1', 'Trajectory 2', 'Trajectory 3', 'Trajectory 4']);
      }
      expect(container.querySelector('[role="tablist"] svg')).toBeNull();
      const inputs = [...container.querySelectorAll('input')];
      seen.push(...inputs.map((input) => input.name));
      expect(inputs.every((input) => input.readOnly)).toBe(true);
      const value = inputs[0].value;
      act(() => Simulate.change(inputs[0], { target: { value: '999' } }));
      expect(inputs[0].value).toBe(value);
      expect(container.textContent).not.toMatch(/Save|Restore defaults|Clear fields|Data loaded from API/);
    }
    expect(seen.sort()).toEqual(RENEWABLE_FIELDS.map((field) => field.key).sort());
    await act(async () => Simulate.keyDown(container.querySelector('#renewable-tab-ivf'), { key: 'ArrowRight' }));
    expect(container.querySelector('[aria-selected="true"]').textContent).toBe('IV.a');
    expect(document.activeElement.id).toBe('renewable-tab-iva');
  } finally { act(() => root.unmount()); container.remove(); }
});
