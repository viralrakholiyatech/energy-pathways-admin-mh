import withFormulaTables, { formulaOnlyTables } from '../utils/formulaTables';
import layouts from '../schemas/formulaWorkbookLayouts.json';
import { NUCLEAR_SECTIONS } from '../config/nuclearDataConfig';
import { RENEWABLE_SECTIONS } from '../config/renewableDataConfig';
import { BIOENERGY_SECTIONS } from '../config/bioenergyDataConfig';
import { GRID_STORAGE_CONFIG } from '../config/gridStorageDataConfig';

const inputs = tables => tables.flatMap(t => t.rows.flatMap(r => r.cells.filter(Boolean)));

test.each([
  ['II-ND', NUCLEAR_SECTIONS.flatMap(s => s.tables)],
  ...RENEWABLE_SECTIONS.map(s => [s.sheet, s.tables]),
  ...BIOENERGY_SECTIONS.map(s => [s.sheet, s.tables]),
  ...GRID_STORAGE_CONFIG.sections.map(s => [s.sheet, s.tables])
])('%s restores calculated tables without changing input objects or duplicating API fields', (sheet, tables) => {
  const restored = withFormulaTables(sheet, tables);
  expect(inputs(restored).map(f => f.key).sort()).toEqual(inputs(tables).map(f => f.key).sort());
  inputs(restored).forEach(field => expect(inputs(tables)).toContain(field));
  expect(restored.some(t => t.rows.some(r => r.cells.includes(null)))).toBe(true);
});

test('formula-only sheets have tables containing only dash placeholders', () => {
  for (const sheet of ['V.e-PB', 'VII.a-KS']) {
    const tables = withFormulaTables(sheet, []);
    expect(tables.length).toBeGreaterThan(0);
    expect(tables.every(t => t.rows.every(r => r.cells.every(c => c === null)))).toBe(true);
  }
});

test('GDP chosen scenarios are restored without copying cached results', () => {
  const tables = formulaOnlyTables('GDP', [], [23, 92]);
  expect(tables.map(t => t.startRow)).toEqual([51, 85]);
  expect(tables.every(t => t.rows.length === 4 && t.rows.every(r => r.cells.every(c => c === null)))).toBe(true);
});

test('layout snapshots contain source addresses and labels, never cached calculation values', () => {
  expect(Object.keys(layouts)).toHaveLength(24);
  Object.values(layouts).flat().forEach(table => table.rows.forEach(row => {
    expect(row).not.toHaveProperty('value');
    expect(row).not.toHaveProperty('formula');
    row.formulas.forEach(ref => expect(row.refs).toContain(ref));
  }));
});

test('gas emissions and land requirements retain their workbook labels and full year range', () => {
  const tables = layouts['i.a-ks'];
  const emissions = tables.filter(t => t.title === 'Emissions');
  expect(emissions).toHaveLength(1);
  expect(emissions[0].rows.map(r => r.label)).toEqual(['CO2', 'CH4', 'N2O']);
  expect(emissions[0].columns).toEqual(['2021', '2025', '2029', '2035', '2040', '2045', '2050']);
  const land = tables.find(t => t.title === 'Land Area Requirement');
  expect(land.rows[0].label).toBe('Land Area Requirement');
  expect(land.rows[0].unit).toBe("'000 ha");
  Object.values(layouts).flat().forEach(t => {
    expect(t.columns.some(c => /^[A-Z]{1,2}$/.test(c))).toBe(false);
    expect(t.rows.some(r => /^Row \d+$/.test(r.label))).toBe(false);
  });
});

test('source estimate headings survive even when the entire table is calculated', () => {
  const costs = withFormulaTables('I.b-KS', []).filter(t => /^(Capital|Operational) cost of a 1\s?GW/.test(t.title));
  expect(costs).toHaveLength(6);
  expect(costs.map(t=>t.title.split(' — ').pop())).toEqual(['Low Estimates','Point Estimates','High Estimates','Low Estimates','Point Estimates','High Estimates']);
  costs.forEach(t=>expect(t.rows.at(-1).label).toBe('Total'));
});

test('a blank Wind row does not split the VII.a Imports table or become a title', () => {
  const tables = withFormulaTables('VII.a-KS', []);
  const imports = tables.find(t=>t.startRow===26);
  expect(imports.title).toBe('Imports');
  expect(imports.rows.slice(0,5).map(r=>r.label)).toEqual(['Coal','Gas','Hydro','Wind','Nuclear']);
  expect(imports.firstColumn).toBe('Capacity Type');
  expect(tables.some(t=>t.title==='Wind')).toBe(false);
});

test('VII.a Imports and Exports retain the fifth numbered trajectory', () => {
  const tables = withFormulaTables('VII.a-KS', []);
  for (const [startRow, description] of [[39, 'Imported Electricity'], [49, 'Exported Electricity']]) {
    const table = tables.find(item => item.startRow === startRow);
    expect(table.rows.slice(0, 5).map(row => row.label)).toEqual(
      [1, 2, 3, 4, 5].map(number => `${number} · ${description}`)
    );
    expect(table.rows[4].cells.every(cell => cell === null)).toBe(true);
  }
});

test('formatted empty rows end a chosen block without hiding later tables', () => {
  const population = layouts['v.b-pb'].find(t=>t.startRow===124).rows[0];
  expect(population.label).toBe('Population of State');
  expect(population.chosen).not.toBe(true);
  const chosen = layouts['ii-nd'].flatMap(t=>t.rows).find(r=>r.id==='272');
  expect(chosen.chosen).toBe(true);
});
