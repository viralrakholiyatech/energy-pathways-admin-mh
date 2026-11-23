const energySplitTitles = {
  236: 'Energy split by vector: Cement',
  239: 'Energy split by vector: Cement — Level 1',
  246: 'Energy split by vector: Cement — Level 2',
  252: 'Energy split by vector: Cement — Level 3',
  259: 'Energy split by vector: Cement — Level 4',
  267: 'Energy split by vector: Cement — Chosen',
  276: 'Energy split by vector: Fertilizers',
  287: 'Energy split by vector: Refinery',
  295: 'Energy split by vector: Iron and Steel — Level 1',
  302: 'Energy split by vector: Iron and Steel — Level 2',
  309: 'Energy split by vector: Iron and Steel — Level 3',
  316: 'Energy split by vector: Iron and Steel — Level 4',
  323: 'Energy split by vector: Iron and Steel — Level 5',
  331: 'Energy split by vector: Iron and Steel — Chosen',
  340: 'Energy split by vector: Pulp n Paper',
  346: 'Energy split by vector: Textile',
  349: 'Energy split by vector: Textile',
  358: 'Energy split by vector: Aluminium',
  364: 'Energy split by vector: Others',
  367: 'Energy split by vector: Others'
};

const refineryMissingRows = [
  { id: '285', label: 'V.01 · Electricity (delivered to end user)' },
  { id: '286', label: 'V.03 · Solid hydrocarbons' }
];

export default function xiWorkbookTables(sheet, tables) {
  if (sheet !== 'XI-KS') return tables;
  return tables.map(table => {
    const startRow = table.sourceRows?.[0]?.row;
    const title = energySplitTitles[startRow] || (startRow === 1016 ? 'Production of Aluminium' : table.title);
    if (startRow !== 287) return { ...table, title };
    return { ...table, title,
      rows: [
        ...refineryMissingRows.map(row => ({ ...row, unit: '%', cells: table.columns.map(() => null) })),
        ...table.rows
      ]
    };
  });
}
