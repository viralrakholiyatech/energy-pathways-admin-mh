import { fetchSheetInputs } from '../api/sheetInputsApi';
jest.mock('../api/sheetInputsApi', () => ({ fetchSheetInputs: jest.fn() }));
beforeEach(() => fetchSheetInputs.mockImplementation(async (sheet, fields) => Object.fromEntries(fields.map(f => [f.key, '12.5']))));
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import BioenergyUpdateForm from '../pages/BioenergyUpdateForm';
import { BIOENERGY_FIELDS, BIOENERGY_SECTIONS } from '../config/bioenergyDataConfig';

test('V.a–V.e tabs show all manual fields read-only and explain the calculations-only sheet', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<BioenergyUpdateForm />));
    expect([...container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)).toEqual(['V.a','V.b','V.c','V.d','V.e']);
    expect(container.querySelector('[aria-selected="true"]').textContent).toBe('V.a');
    const seen = [];
    for (const section of BIOENERGY_SECTIONS) {
      await act(async () => container.querySelector('#bioenergy-tab-' + section.id).click());
      expect([...container.querySelectorAll('caption')].map((caption) => caption.textContent)).toEqual(expect.arrayContaining(section.tables.filter(table=>!(/\bchosen\b/i.test(table.title)) && !(section.id === 'vb' && (table.title.startsWith('Bio Energy Feedstock Cultivation Yield Scenarios') || table.title.includes('growth assumptions'))) && !(section.id === 'vd' && table.title.includes('growth assumptions'))).map((table) => table.title)));
      if (section.id === 'vb') {
        const yieldTables = [...container.querySelectorAll('table')].filter(table => table.querySelector('caption')?.textContent === 'Bio Energy Feedstock Cultivation Yield Scenarios');
        expect(yieldTables).toHaveLength(1);
        const yieldTable = yieldTables[0];
        expect([...yieldTable.querySelectorAll('thead th')].map(cell => cell.textContent)).toEqual(['Trajectory', 'Description', 'Type', 'Units', '2010', '2021', '2025', '2029', '2035', '2040', '2045', '2050']);
        expect(yieldTable.querySelectorAll('tbody tr')).toHaveLength(20);
        expect([...yieldTable.querySelectorAll('tbody th')].map(cell => cell.textContent)).toEqual(['Trajectory 1', 'Trajectory 2', 'Trajectory 3', 'Trajectory 4']);
        expect([...yieldTable.querySelectorAll('tbody tr')].slice(0, 5).map(row => row.querySelector('td')?.textContent)).toEqual([
          'Crop yield for Sugarcane', 'Crop yield for Sugarbeet', 'Crop yield for Sweet Sorghum',
          'Oil yield for Jatropha, Pangomia', 'Crop yield for Biomass from Wastelands'
        ]);
        expect(container.textContent).not.toContain('Bio Energy Feedstock Cultivation Yield Scenarios ? Trajectory');
        const tableFor = title => [...container.querySelectorAll('table')].find(table => table.querySelector('caption')?.textContent === title);
        const consumption = tableFor('Annual Per Capita Consumption of Sugar');
        const exports = tableFor('Annual Sugar Exports');
        const expectedColumns = ['Trajectory', 'Description', 'Type', 'Units', '2010', '2021', '2025', '2029', '2035', '2040', '2045', '2050'];
        expect([...consumption.querySelectorAll('thead th')].map(cell => cell.textContent)).toEqual(expectedColumns);
        expect([...exports.querySelectorAll('thead th')].map(cell => cell.textContent)).toEqual(expectedColumns);
        expect([...consumption.querySelectorAll('tbody tr')].map(row => row.querySelector('th')?.textContent)).toEqual(['Trajectory 1', 'Trajectory 2', 'Trajectory 3', 'Trajectory 4']);
        expect(exports.querySelectorAll('tbody tr')).toHaveLength(4);
        expect(consumption.querySelector('tbody tr').cells[2].querySelector('input')?.value).toBe('12.5');
        expect(consumption.querySelector('tbody tr').cells[2].textContent).toBe('%');
        expect(consumption.querySelector('tbody tr').cells[3].textContent).toBe('KG of Sugar/Person');
        expect(exports.querySelector('tbody tr').cells[3].textContent).toBe('Metric Tonnes/year');
        const sugarbeet = tableFor('Sugarbeet Available for Bioethanol Production');
        expect([...sugarbeet.querySelectorAll('tbody tr')].map(row => row.querySelector('th')?.textContent)).toEqual([
          'Trajectory 1', 'Trajectory 2', 'Trajectory 3', 'Trajectory 4'
        ]);
        expect([...sugarbeet.querySelectorAll('tbody tr')].every(row => [...row.cells].slice(4).every(cell => cell.textContent === '-'))).toBe(true);
      }
      if (section.id === 'vd') {
        for (const title of ['Total Non Fodder Agriculture Residue', 'Total Non Fodder Forestry Arisings']) {
          const table = [...container.querySelectorAll('table')].find(item => item.querySelector('caption')?.textContent === title);
          expect([...table.querySelectorAll('thead th')].map(cell => cell.textContent)).toEqual([
            'Trajectory', 'Comment', 'Notes', 'Units', '2015', '2021', '2025', '2029', '2035', '2040', '2045', '2050'
          ]);
          expect([...table.querySelectorAll('tbody th')].map(cell => cell.textContent)).toEqual([
            'Trajectory 1', 'Trajectory 2', 'Trajectory 3', 'Trajectory 4'
          ]);
        }
        const endUse = [...container.querySelectorAll('table')].find(item => item.querySelector('caption')?.textContent === 'End Usage Split for Solid Bio Energy Feedstock in 2050');
        expect([...endUse.querySelectorAll('thead th')].map(cell => cell.textContent)).toEqual([
          'Trajectory', 'For Cooking', 'For Electricity', 'For Liquid Fuel Usage', 'Others'
        ]);
        expect(endUse.querySelectorAll('tbody tr')).toHaveLength(4);
      }
      expect(fetchSheetInputs.mock.calls.at(-1)[0]).toBe(section.sheet);
      expect(container.querySelector('[role="tablist"] svg')).toBeNull();
      const inputs = [...container.querySelectorAll('input')];
      seen.push(...inputs.map((input) => input.name));
      expect(inputs.every((input) => input.readOnly)).toBe(true);
      if (inputs.length) {
        const value = inputs[0].value;
        act(() => Simulate.change(inputs[0], { target: { value: '999' } }));
        expect(inputs[0].value).toBe(value);
      }
      expect(container.textContent).not.toMatch(/Save|Restore defaults|Clear fields|Data loaded from API/);
    }
    expect(seen.sort()).toEqual(BIOENERGY_FIELDS.filter(field=>field.key !== 'vb_G134').map((field) => field.key).sort());
    expect(container.querySelectorAll('table').length).toBeGreaterThan(0);
    expect([...container.querySelectorAll('td')].every(cell => cell.textContent.trim() === '-' || !cell.textContent.trim() || cell.textContent.length < 40)).toBe(true);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    await act(async () => Simulate.keyDown(container.querySelector('#bioenergy-tab-ve'), { key: 'ArrowRight' }));
    expect(container.querySelector('[aria-selected="true"]').textContent).toBe('V.a');
    expect(document.activeElement.id).toBe('bioenergy-tab-va');
  } finally { act(() => root.unmount()); container.remove(); }
});
