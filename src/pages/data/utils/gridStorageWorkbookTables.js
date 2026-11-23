// VII.c uses headings and grouped rows that the generic formula layout cannot infer.
// Keep the original field objects so API values remain mapped by Excel cell address.
const years = ['2021', '2025', '2029', '2035', '2040', '2045', '2050'];

export default function gridStorageWorkbookTables(section, generated) {
  if (section.id !== 'viic') return generated;

  const byStart = new Map(generated.filter(table => table.startRow).map(table => [table.startRow, table]));
  const manual = title => section.tables.find(table => table.title === title);
  const heading = title => ({ title, headingOnly: true });
  const formula = (start, title, firstColumn = 'Trajectory') => {
    const table = byStart.get(start);
    return { ...table, title, firstColumn, rows: table.rows.filter(row => !row.chosen) };
  };
  const scenario = (start, title) => {
    const table = formula(start, title);
    const input = start === 27 ? manual('Cumulative Storage ? Energy Applications') : null;
    const inputRows = input?.rows || [];
    return { ...table, columns: ['2020', ...years], rows: table.rows.map((row, index) => ({
      ...row, label: `Trajectory ${index + 1}`, unit: 'GW',
      cells: [null, ...(inputRows[index]?.cells || row.cells)]
    })) };
  };
  const cost = (start, estimate, kind) => {
    const table = formula(start, `${kind} — ${estimate}`, 'Storage type');
    const first = start - 1;
    return { ...table, rows: [
      { id: String(first), label: 'Pumped Hydro Storage', unit: 'INR Billion/GW', cells: years.map(() => null) },
      ...table.rows.map((row, index) => ({ ...row,
        label: index === 0 ? 'Batteries' : 'Other Storage Technologies',
        unit: index === 0 ? 'INR Billion/TWh' : 'INR Billion/GW'
      }))
    ] };
  };
  const category = (start, title, unit) => {
    const table = formula(start, title, 'Category');
    return { ...table, rows: table.rows.map(row => ({ ...row, unit })) };
  };
  const calculatedCosts = (start, title) => {
    const table = formula(start, title, 'Estimate');
    return { ...table, rows: table.rows.map(row => ({ ...row, unit: 'INR Billion' })) };
  };

  return [
    heading('Trajectory assumptions'),
    scenario(18, 'Cumulative-Storage -- Overall Scenario'),
    scenario(27, 'Cumulative:Storage -- Energy Applications'),
    scenario(38, 'Cumulative Storage -- Power Applications'),
    heading('Fixed Assumptions'),
    manual('Share of pumped hydro storage, battery storage and other types of storage'),
    manual('Efficiency'),
    manual('Numbers of hours battery stores energy in a day (hours)'),
    heading('Cost assumptions'),
    heading('Capital costs'),
    cost(70, 'High', 'Capital costs'), cost(76, 'Point', 'Capital costs'), cost(82, 'Low', 'Capital costs'),
    heading('Operating costs'),
    cost(90, 'High', 'Operating costs'), cost(96, 'Point', 'Operating costs'), cost(102, 'Low', 'Operating costs'),
    heading('Derived Assumptions'),
    formula(128, 'New Capacity Addition GW/year', 'Description'),
    category(133, 'Energy storage segregation by category GW per year', 'GW'),
    category(142, 'Energy storage segregation by category', 'GW'),
    category(150, 'Total energy stored', 'TWh'),
    heading('Cost Calculations'),
    heading('Capital Cost'),
    category(158, 'Capital Cost — High', 'INR Billion'),
    category(161, 'Capital Cost — Point', 'INR Billion'),
    category(164, 'Capital Cost — Low', 'INR Billion'),
    heading('Operating Cost'),
    category(170, 'Operating Cost — High', 'INR Billion'),
    category(173, 'Operating Cost — Point', 'INR Billion'),
    category(176, 'Operating Cost — Low', 'INR Billion'),
    heading('Total Costs'),
    calculatedCosts(183, 'Capital'), calculatedCosts(188, 'Operating'),
    { ...formula(199, 'Costs of this physical change', 'Vector'), metadataColumns: [{ key: 'workbookDescription', label: 'Name' }] }
  ];
}
