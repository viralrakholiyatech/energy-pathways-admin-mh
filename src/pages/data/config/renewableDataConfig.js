import workbook from '../schemas/renewableWorkbookSchema.json';

export const RENEWABLE_FIELDS = [];
const years = { G: '2021', H: '2025', I: '2029', J: '2035', K: '2040', L: '2045', M: '2050' };
function table(sheet, title, rowNumbers, unit, labels) {
  const source = workbook.sheets.find((item) => item.sheet === sheet).inputRefs;
  const columns = Object.keys(years).filter((col) => rowNumbers.some((row) => source.includes(col + row)));
  return { title, columns: columns.map((col) => years[col]), firstColumn: labels ? 'Plant type' : 'Trajectory',
    rows: rowNumbers.map((r, index) => ({
      label: labels?.[index] || 'Trajectory ' + (index + 1), unit,
      cells: columns.map((col) => {
        const ref = col + r;
        if (!source.includes(ref)) return null;
        const field = { key: sheet + '_' + ref, source: sheet + '!' + ref, sheet, ref, unit,
          label: title + ' · ' + (labels?.[index] || 'Trajectory ' + (index + 1)) + ' · ' + years[col] };
        RENEWABLE_FIELDS.push(field);
        return field;
      })
    }))
  };
}

// Only manual numeric inputs. Calculated cells are dashes; columns containing
// no manual inputs are omitted. Values are supplied by the sheet API.
export const RENEWABLE_SECTIONS = [
  { id: 'iva', tab: 'IV.a', sheet: 'IV.a-VM', title: 'Solar PV', tables: [
    table('IV.a-VM', 'Capacity Utilisation Factors', [65,66,67,68], '%')
  ] },
  { id: 'ivc1', tab: 'IV.c.1', sheet: 'IV.c.1-VM', title: 'Onshore Wind', tables: [
    table('IV.c.1-VM', 'Onshore wind, cumulative capacity', [33,34,35,36], 'GW'),
    table('IV.c.1-VM', 'Weighted average of cumulative capacities and CUFs', [42,43,44,45], '%')
  ] },
  { id: 'ivc2', tab: 'IV.c.2', sheet: 'IV.c.2-VM', title: 'Offshore Wind', tables: [
    table('IV.c.2-VM', 'Offshore wind, new build', [15,16,17,18], 'GW'),
    table('IV.c.2-VM', 'Capacity factor', [55], '%', ['Offshore wind'])
  ] },
  { id: 'ivd', tab: 'IV.d', sheet: 'IV.d-SD', title: 'Small Hydro', tables: [
    table('IV.d-SD', 'Weighted average of cumulative capacities and CUFs', [48,49,50,51], '%'),
    table('IV.d-SD', 'CUF of new capacity addition', [61], '%', ['Hydro'])
  ] },
  { id: 'ive', tab: 'IV.e', sheet: 'IV.e-VM', title: 'Distributed Solar PV', tables: [
    // Keep workbook trajectory numbers when only trajectories 1 and 4 have inputs.
    { ...table('IV.e-VM', 'Cumulative residential Distributed Solar PV', [30,33], 'GW'),
      firstColumn: 'Trajectory' },
    table('IV.e-VM', 'Weighted average of cumulative capacities and CUFs', [79,80,81,82], '%')
  ] },
  { id: 'ivf', tab: 'IV.f', sheet: 'IV.f-PB', title: 'Solar Water Heater', tables: [
    table('IV.f-PB', 'Capacity factor', [130], '%', ['Solar Water Heaters'])
  ] }
];
RENEWABLE_SECTIONS[4].tables[0].rows[1].label = 'Trajectory 4';
RENEWABLE_SECTIONS[4].tables[0].rows[1].cells.filter(Boolean).forEach((field) => { field.label = field.label.replace('Trajectory 2', 'Trajectory 4'); });
