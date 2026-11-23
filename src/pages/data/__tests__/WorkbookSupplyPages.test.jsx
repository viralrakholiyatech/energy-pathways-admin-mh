import { fetchSheetInputs } from '../api/sheetInputsApi';
jest.mock('../api/sheetInputsApi', () => ({ fetchSheetInputs: jest.fn() }));
beforeEach(() => fetchSheetInputs.mockImplementation(async (sheet, fields) => Object.fromEntries(fields.map(f => [f.key, '12.5']))));
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import WasteUpdateForm from '../pages/WasteUpdateForm';
import GridStorageUpdateForm from '../pages/GridStorageUpdateForm';
import HydrogenUpdateForm from '../pages/HydrogenUpdateForm';
import { WASTE_CONFIG } from '../config/wasteDataConfig';
import { GRID_STORAGE_CONFIG } from '../config/gridStorageDataConfig';
import { HYDROGEN_CONFIG } from '../config/hydrogenDataConfig';

const cases = [
  ['VI', WasteUpdateForm, WASTE_CONFIG, 172, 'waste'],
  ['VII', GridStorageUpdateForm, GRID_STORAGE_CONFIG, 89, 'gridStorage'],
  ['VIII', HydrogenUpdateForm, HYDROGEN_CONFIG, 140, 'hydrogen']
];

test.each(cases)('%s retains unique API mappings without stored values', (_, Form, config, count) => {
  expect(config.fields).toHaveLength(count);
  expect(new Set(config.fields.map((field) => field.source)).size).toBe(count);
  expect(config).not.toHaveProperty('values');
  expect(config.fields.every(field => !('initialValue' in field))).toBe(true);
});

test.each(cases)('%s displays its manual fields read-only with working navigation', async (name, Form, config, count, prefix) => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Form />));
    const seen = [];
    if (name === 'VII') {
      expect([...container.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)).toEqual(['VII.a','VII.b','VII.c']);
      expect(container.querySelectorAll('table').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('input')).toHaveLength(0);
      for (const section of config.sections) {
        await act(async () => container.querySelector(`#${prefix}-tab-${section.id}`).click());
        seen.push(...[...container.querySelectorAll('input')].map((input) => input.name));
      }
      await act(async () => Simulate.keyDown(container.querySelector('#gridStorage-tab-viic'), { key: 'Home' }));
      expect(container.querySelector('[aria-selected="true"]').textContent).toBe('VII.a');
    } else {
      seen.push(...[...container.querySelectorAll('input')].map((input) => input.name));
      const heading = container.querySelector('button[aria-expanded]');
      act(() => heading.click());
      expect(heading.getAttribute('aria-expanded')).toBe('false');
      expect(container.querySelectorAll('input').length).toBeLessThan(count);
      act(() => heading.click());
      expect(container.querySelectorAll('input')).toHaveLength(count);
      const input = container.querySelector('input');
      const value = input.value;
      act(() => Simulate.change(input, { target: { value: '999' } }));
      expect(input.value).toBe(value);
    }
    expect(seen.sort()).toEqual(config.fields.map((field) => field.key).sort());
    expect([...container.querySelectorAll('input')].every((input) => input.readOnly)).toBe(true);
    expect(container.textContent).not.toMatch(/Save|Restore defaults|Clear fields|Data loaded from API/);
  } finally { act(() => root.unmount()); container.remove(); }
});

test('year labels remain available without embedded values', () => {
  expect(GRID_STORAGE_CONFIG.sections[1].tables[0].columns).toEqual(['2020','2021','2025','2050']);
  expect(HYDROGEN_CONFIG.fields.find(field => field.key === 'viii_G48').unit).toBe('%');
});
