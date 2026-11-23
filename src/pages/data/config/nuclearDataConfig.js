
export const NUCLEAR_YEARS = ['2021', '2025', '2029', '2035', '2040', '2045', '2050'];
export const NUCLEAR_FIELDS = [];
function row(label, refs, unit, description) {
  return { label, unit, description, cells: refs.map((ref) => {
    const definition = { key: `ii_${ref}`, source: `II-ND!${ref}`, label: `${label} · II-ND!${ref}`, unit };
    NUCLEAR_FIELDS.push(definition);
    return definition;
  }) };
}
const yearRefs = (row) => ['G','H','I','J','K','L','M'].map((col) => `${col}${row}`);

// Direct manual cells only. Formula-derived capacity, totals, retirement, land,
// operating/fuel costs, and output placeholders are excluded by the cell audit.
export const NUCLEAR_SECTIONS = [
  { id: 'capacity', title: 'Trajectory assumptions', tables: [
    { title: 'Cumulative Nuclear Capacity (PHWR and Boiling water reactors)', columns: ['2021','2025'], firstColumn: 'Trajectory',
      rows: [19,20,21,22].map((r,i) => row(`Trajectory ${i+1}`, [`G${r}`,`H${r}`], 'GW')) },
    { title: 'Cumulative Nuclear Capacity (LWR)', columns: ['2021'], firstColumn: 'Trajectory', rows: [row('Trajectory 1', ['G28'], 'GW')] },
    { title: 'Cumulative Nuclear Capacity (FBR)', columns: ['2050'], firstColumn: 'Trajectory', rows: [row('Trajectory 4', ['M40'], 'GW')] }
  ] },
  { id: 'fixed', title: 'Fixed assumptions', tables: [
    { title: 'Thermal efficiency (based on gross calorific values)', columns: NUCLEAR_YEARS, firstColumn: 'Plant type', rows: [row('Nuclear', yearRefs(81), '%')] },
    { title: 'Load factor', columns: NUCLEAR_YEARS, firstColumn: 'Plant type', rows: [row('Nuclear', yearRefs(86), '%')] },
    { title: 'Legacy plant capacities (added prior to 2012)', columns: ['2021'], firstColumn: 'Plant type', rows: [row('PHWR Plants, and TAPS1 and 2', ['G92'], 'GW')] }
  ] },
  { id: 'cost', title: 'Cost Assumptions', tables: [
    { title: 'Capital Cost of PHWR (per GW basis)', description: 'Real 2015', columns: ['2050'], firstColumn: 'Estimate',
      rows: [row('High Estimate', ['M173'], 'INR Billion/GW', '15% increase in costs by 2055'),
        row('Low Estimate', ['M174'], 'INR Billion/GW', '15% reduction in costs by 2055'),
        row('Point Estimate', ['M175'], 'INR Billion/GW', '10% reduction in costs by 2055')] },
    { title: 'Capital Cost of FBR (per GW basis)', description: 'Real 2015', columns: ['2050'], firstColumn: 'Estimate',
      rows: [row('High Estimate', ['M189'], 'INR Billion/GW', 'No reduction in costs by 2055'),
        row('Point Estimate', ['M190'], 'INR Billion/GW', '15% reduction in costs by 2055'),
        row('Low Estimate', ['M191'], 'INR Billion/GW', '15% reduction in costs by 2055')] }
  ] }
];
