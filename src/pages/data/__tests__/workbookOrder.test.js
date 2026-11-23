import orderWorkbookTables, { workbookTableRow } from '../utils/workbookOrder';
import withFormulaTables from '../utils/formulaTables';
import { HYDROCARBON_SECTIONS } from '../config/hydrocarbonDataConfig';
import { NUCLEAR_SECTIONS } from '../config/nuclearDataConfig';
import { HYDRO_SECTIONS } from '../config/hydroElectricDataConfig';
import { RENEWABLE_SECTIONS } from '../config/renewableDataConfig';
import { BIOENERGY_SECTIONS } from '../config/bioenergyDataConfig';
import { WASTE_CONFIG } from '../config/wasteDataConfig';
import { GRID_STORAGE_CONFIG } from '../config/gridStorageDataConfig';
import { HYDROGEN_CONFIG } from '../config/hydrogenDataConfig';
import { REMAINING_CONFIGS } from '../pages/RemainingWorkbookPage';

const assertOrdered = tables => {
  const positions = tables.map(workbookTableRow);
  expect(positions.every(Number.isFinite)).toBe(true);
  expect(positions).toEqual([...positions].sort((a,b)=>a-b));
};

test.each(HYDROCARBON_SECTIONS)('$sheet interleaves input and formula tables in Excel order', section => {
  const tables = withFormulaTables(section.sheet, section.tables);
  assertOrdered(tables);
  if (section.id === 'ib') {
    const titles = tables.map(t=>t.title.replace(/\s+/g, ' ').trim());
    expect(titles.indexOf('Coal Powered Utility Plants New Build')).toBeLessThan(titles.indexOf('Coal Powered Plants Installed Capacity Cumulative'));
    expect(titles.indexOf('Coal Powered Plants Retirement Rate')).toBeLessThan(titles.indexOf('Coal Powered Plants Installed Capacity Cumulative'));
    expect(titles).toContain('Coal Powered Utility Plants New Build');
    expect(titles).toContain('Coal Powered Plants Retirement Rate');
  }
});

test.each([
  ['II-ND', NUCLEAR_SECTIONS.flatMap(s=>s.tables)], ['III-ND', HYDRO_SECTIONS.flatMap(s=>s.tables)],
  ...[...RENEWABLE_SECTIONS,...BIOENERGY_SECTIONS,...WASTE_CONFIG.sections,...GRID_STORAGE_CONFIG.sections,...HYDROGEN_CONFIG.sections,
    ...Object.values(REMAINING_CONFIGS).flatMap(config=>config.sections)].map(s=>[s.sheet,s.tables])
])('%s orders displayed tables by their workbook positions', (sheet,tables) => {
  assertOrdered(withFormulaTables(sheet,tables));
  const fields = rows => rows.flatMap(t=>t.rows.flatMap(r=>r.cells.filter(Boolean)));
  expect(fields(withFormulaTables(sheet,tables)).map(f=>f.key).sort()).toEqual(fields(tables).map(f=>f.key).sort());
});

test('ordering preserves the original field objects and leaves its input array unchanged', () => {
  const later = { title:'Later', rows:[{cells:[{source:'GDP!M90'}]}] };
  const earlier = { title:'Earlier', startRow:16, rows:[] };
  const original = [later,earlier];
  expect(orderWorkbookTables(original)).toEqual([earlier,later]);
  expect(original).toEqual([later,earlier]);
});
