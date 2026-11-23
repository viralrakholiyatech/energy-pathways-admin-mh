import { act } from 'react';
import { createRoot } from 'react-dom/client';
import RemainingWorkbookPage, { REMAINING_CONFIGS } from '../pages/RemainingWorkbookPage';
import EmptySheetPage from '../pages/EmptySheetPage';
import { fetchSheetInputs } from '../api/sheetInputsApi';
import { workbookRowLabel } from '../config/workbookDisplayConfig';
jest.mock('../api/sheetInputsApi', () => ({ fetchSheetInputs: jest.fn() }));
beforeEach(() => {
  fetchSheetInputs.mockReset();
  fetchSheetInputs.mockImplementation(async (sheet, fields) => Object.fromEntries(fields.map(field => [field.key, '12.5'])));
});

test('remaining pages use the legacy reference sheets', () => {
  expect(Object.fromEntries(Object.entries(REMAINING_CONFIGS).map(([page,c]) => [page,c.sections.map(s=>s.sheet)]))).toEqual({
    IX:['IX'], X:['X.a-RM','X.b-RM'], XI:['XI-KS'], XII:['XII.a-ND,KS','XII.b-ND'],
    XIII:['XIII.a-PB'], XIV:['XIV-Evelin'], XVII:['XVII.a','XVII.b']
  });
  for (const config of Object.values(REMAINING_CONFIGS)) {
    expect(new Set(config.fields.map(f=>f.source)).size).toBe(config.fields.length);
    for (const section of config.sections) {
      section.tables.forEach(t=>t.rows.forEach(r=>expect(r.cells).toHaveLength(t.columns.length)));
    }
  }
});

test('schemas preserve the full commercial year range without values', () => {
  expect(REMAINING_CONFIGS.X).not.toHaveProperty('values');
  expect(REMAINING_CONFIGS.IX).not.toHaveProperty('values');
  const annualTable = REMAINING_CONFIGS.X.sections[1].tables.find(t=>t.columns.includes('2022'));
  expect(annualTable.columns).toContain('2050');
  expect(REMAINING_CONFIGS.XVII.sections[1].tables.length).toBeGreaterThan(0);
  expect(REMAINING_CONFIGS.XVII.fields.filter(f=>f.sheet==='XVII.b')).toHaveLength(0);
});

test('X.b technology penetration uses the workbook scenario headers', () => {
  const tables = REMAINING_CONFIGS.X.sections.find(section => section.sheet === 'X.b-RM').tables;
  const table = tables.find(item => item.title === 'Technology penetration level');
  expect(table.firstColumn).toBe('Scenario');
  expect(table.columns).toEqual(['High', 'Med', 'Low']);
  expect(table.showUnit).toBe(false);
  expect(table.rows[0].cells.map(cell => cell.ref)).toEqual(['E19', 'F19', 'G19']);
  const yearlyTable = tables.find(item => item.title === 'Penetration by scenario over years');
  expect(yearlyTable.firstColumn).toBe('Scenario');
  expect(yearlyTable.showUnit).toBe(false);
});

test('X.a lighting penetration follows the workbook trajectory and appliance rows', () => {
  const table = REMAINING_CONFIGS.X.sections.find(section => section.sheet === 'X.a-RM')
    .tables.find(item => item.title === 'Penetration of efficienct lighting');
  expect(table.firstColumn).toBe('Trajectory');
  expect(table.showUnit).toBe(false);
  expect(table.metadataColumns.map(column => column.label)).toEqual(['Type of appliance', 'Efficiency level']);
  expect(table.rows).toHaveLength(16);
  expect(table.rows.map(row => [row.label, row.appliance])).toEqual(
    ['A', 'B', 'C', 'D'].flatMap(trajectory => ['Bulb', 'Tubelight', 'CFL', 'LED'].map(appliance => [trajectory, appliance]))
  );
  expect(table.rows[0].cells.map(cell => cell.ref)).toEqual(['G59', 'H59', 'I59', 'J59', 'K59', 'L59', 'M59']);
  expect(table.rows[15].cells[0].ref).toBe('G74');
});

test('adjacent duplicate Excel labels display once on every remaining page', () => {
  expect(workbookRowLabel('Level 1 · Level 1')).toBe('Level 1');
  expect(workbookRowLabel('Level 1 · Level1')).toBe('Level 1');
  expect(workbookRowLabel('Level 1 · ROAD')).toBe('Level 1 · ROAD');
  for (const page of ['XI', 'XIV']) {
    const tables = REMAINING_CONFIGS[page].sections.flatMap(section => section.tables);
    const split = tables.filter(table => table.rows.some(row => /^[1-4]$/.test(row.label) && row.description === `Level ${row.label}`));
    expect(split.length).toBeGreaterThan(0);
    for (const table of split) {
      expect(table.firstColumn).toBe('Trajectory');
      for (const row of table.rows.filter(row => /^[1-4]$/.test(row.label))) {
        expect(row.description).toBe(`Level ${row.label}`);
      }
    }
  }
  for (const config of Object.values(REMAINING_CONFIGS)) {
    for (const section of config.sections) {
      for (const table of section.tables) {
        for (const row of table.rows) {
          expect(workbookRowLabel(row.label)).toBe(row.label);
        }
      }
    }
  }
});

test.each(['IX','X','XI','XII','XIII','XIV','XVII'])('%s loads its API and renders read-only tables without decorative icons', async sheet => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async()=>root.render(<RemainingWorkbookPage sheet={sheet} />));
    const config = REMAINING_CONFIGS[sheet];
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    if (config.sections.length>1) expect(tabs.map(t=>t.textContent)).toEqual(config.sections.map(s=>s.tab));
    for (let i=0;i<config.sections.length;i++) {
      if (tabs.length) await act(async()=>tabs[i].click());
      expect(fetchSheetInputs.mock.calls.at(-1)[0]).toBe(config.sections[i].sheet);
      const inputs = [...container.querySelectorAll('input')];
      const displayedFields = config.sections[i].tables.filter(t=>!(/\bchosen\b/i.test(t.title)))
        .flatMap(t=>t.rows.filter(r=>!r.chosen && !(/\bchosen\b/i.test(r.label))).flatMap(r=>r.cells.filter(Boolean)));
      expect(inputs.map(input=>input.name).sort()).toEqual(displayedFields.map(f=>f.key).sort());
      expect(inputs.every(input=>input.readOnly)).toBe(true);
      expect(container.querySelectorAll('table').length).toBeGreaterThan(0);
      expect(container.querySelector('[role="tablist"] svg')).toBeNull();
      expect([...container.querySelectorAll('button')].every(button=>button.hasAttribute('aria-expanded') || button.getAttribute('role')==='tab')).toBe(true);
    }
    expect(fetchSheetInputs.mock.calls.map(call=>call[0])).toEqual(config.sections.map(section=>section.sheet));
  } finally { act(()=>root.unmount()); }
});

test.each(['XV','XVI'])('%s has only a simple empty state', sheet => {
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    act(()=>root.render(<EmptySheetPage sheet={sheet} />));
    expect(container.textContent).toContain('No worksheet available.');
    expect(container.querySelector('button, input, svg')).toBeNull();
  } finally { act(()=>root.unmount()); }
});
