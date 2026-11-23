import { GRID_STORAGE_CONFIG } from '../config/gridStorageDataConfig';
import withFormulaTables from '../utils/formulaTables';
import gridStorageWorkbookTables from '../utils/gridStorageWorkbookTables';

test('VII.c follows workbook table order and retains every API-backed cell once', () => {
  const section = GRID_STORAGE_CONFIG.sections.find(item => item.id === 'viic');
  const tables = gridStorageWorkbookTables(section, withFormulaTables(section.sheet, section.tables));
  const energy = tables.filter(table => table.title === 'Cumulative:Storage -- Energy Applications');
  expect(energy).toHaveLength(1);
  expect(energy[0].columns).toEqual(['2020', '2021', '2025', '2029', '2035', '2040', '2045', '2050']);
  expect(energy[0].rows).toHaveLength(4);
  expect(energy[0].rows[0].cells[1].ref).toBe('G27');
  expect(energy[0].rows[3].cells[7].ref).toBe('M30');
  const used = tables.flatMap(table => (table.rows || []).flatMap(row => row.cells || [])).filter(Boolean).map(field => field.ref);
  expect(used).toHaveLength(section.tables.flatMap(table => table.rows.flatMap(row => row.cells)).filter(Boolean).length);
  expect(new Set(used).size).toBe(used.length);
  expect(tables.findIndex(table => table.title === 'Fixed Assumptions')).toBeGreaterThan(tables.findIndex(table => table.title === 'Cumulative Storage -- Power Applications'));
});
