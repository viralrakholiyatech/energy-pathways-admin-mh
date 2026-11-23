
export const HYDRO_FIELDS = [];
function row(label, refs, unit) {
  return { label, unit, cells: refs.map((ref) => {
    const definition = { key: 'iii_' + ref, source: 'III- ND!' + ref, label: label + ' · III- ND!' + ref, unit };
    HYDRO_FIELDS.push(definition);
    return definition;
  }) };
}

// Direct manual assumptions only. Column P has no heading in the workbook.
export const HYDRO_SECTIONS = [
  { id: 'growth', title: 'Trajectory assumptions', tables: [
    { title: 'Domestic Large Hydroelectric Cumulative Capacity',
      columns: ['CAGR (2020-47)', 'Excel column P'], firstColumn: 'Trajectory',
      rows: [16,17,18,19].map((r,i) => row('Trajectory ' + (i+1), ['O'+r,'P'+r], '%')) }
  ] },
  { id: 'fixed', title: 'Fixed assumptions', tables: [
    { title: 'Load factor [1]', columns: ['2021','2025','2050'], firstColumn: 'Plant type',
      rows: [row('Large Hydro', ['G54','H54','M54'], '%')] }
  ] },
  { id: 'cost', title: 'Cost assumptions', tables: [
    { title: 'Capital cost of a 1 GW plant', columns: ['2050'], firstColumn: 'Estimate',
      rows: [row('Low estimate', ['M68'], 'INR Billion/plant')] },
    { title: 'Operating cost of a 1 GW plant', columns: ['Rate'], firstColumn: 'Estimate',
      rows: [row('High estimate', ['D73'], '%'), row('Low estimate', ['D75'], '%')] }
  ] }
];
