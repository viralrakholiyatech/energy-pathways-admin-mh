import workbook from '../schemas/remainingWorkbookSchema.json';
import workbookDisplayConfig from '../config/workbookDisplayConfig';

test('XII tables use their Excel headings instead of column headers', () => {
  const sections = workbookDisplayConfig(workbook.XII).sections;
  const passenger = sections.find(section => section.sheet === 'XII.a-ND,KS');
  const freight = sections.find(section => section.sheet === 'XII.b-ND');
  const tableAt = (section, row) => section.tables.find(table => table.sourceRows[0].row === row);

  expect(tableAt(passenger, 71).title).toBe('Public Private share of Passenger Km in Road Transport — Trajectory 1');
  expect(tableAt(passenger, 143).title).toBe('Modal Share by Technology — Scenario 1');
  expect(tableAt(passenger, 515).title).toBe('Average capital costs of each vehicle type');
  expect(tableAt(freight, 56).title).toBe('Efficiencies - Energy/Vehicle-tonne-km — Trajectory 1');
  expect(tableAt(freight, 188).title).toBe('Average capital costs of each vehicle type');
  expect(sections.flatMap(section => section.tables).map(table => table.title)).not.toContain('Mode');
  expect(tableAt(passenger, 473)).toBeUndefined();
  expect(tableAt(freight, 375)).toBeUndefined();
});
