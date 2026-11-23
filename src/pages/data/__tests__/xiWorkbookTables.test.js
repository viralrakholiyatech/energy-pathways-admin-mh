import workbook from '../schemas/remainingWorkbookSchema.json';
import workbookDisplayConfig from '../config/workbookDisplayConfig';

test('XI energy split tables retain each Excel level and formula-only Refinery rows', () => {
  const { sections, fields } = workbookDisplayConfig(workbook.XI);
  const tables = sections[0].tables;
  const at = row => tables.find(table => table.sourceRows[0].row === row);

  expect([295, 302, 309, 316, 323].map(row => at(row).title)).toEqual(
    [1, 2, 3, 4, 5].map(level => `Energy split by vector: Iron and Steel — Level ${level}`)
  );
  expect([239, 246, 252, 259].map(row => at(row).title)).toEqual(
    [1, 2, 3, 4].map(level => `Energy split by vector: Cement — Level ${level}`)
  );
  expect(at(349).title).toBe('Energy split by vector: Textile');
  expect(at(367).title).toBe('Energy split by vector: Others');
  expect(at(1016).title).toBe('Production of Aluminium');
  expect(at(287).rows.slice(0, 2).map(row => row.label)).toEqual([
    'V.01 · Electricity (delivered to end user)', 'V.03 · Solid hydrocarbons'
  ]);
  expect(at(287).rows.slice(0, 2).every(row => row.cells.every(cell => cell === null))).toBe(true);
  expect(fields.some(field => ['G285', 'G286'].includes(field.ref))).toBe(false);
});
