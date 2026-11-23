import xiiWorkbookTitle from '../utils/xiiWorkbookTitles';
import xiWorkbookTables from '../utils/xiWorkbookTables';

// Keep source values and cell addresses separate from their displayed units.
export function workbookRowLabel(label) {
  if (typeof label !== 'string') return label;
  const parts = label.split(/\s*\u00b7\s*/);
  return parts.filter((part, index) => index === 0 ||
    part.replace(/\s/g, '').toLowerCase() !== parts[index - 1].replace(/\s/g, '').toLowerCase()
  ).join(' \u00b7 ');
}

const repeatedLevel = label => /^(Level)\s*([1-5])\s*\u00b7\s*Level\s*\2$/i.exec(label || '');

export default function workbookDisplayConfig(workbook) {
  const fields = [];
  const sections = workbook.sections.map((section) => ({ ...section,
    tables: xiWorkbookTables(section.sheet, section.tables).filter((table) => !(section.sheet.startsWith('XII.')
      && [51, 375, 422, 473, 512, 726, 1128, 1377, 1397, 1552, 1729, 1856].includes(table.sourceRows?.[0]?.row)
      && table.rows.every(row => row.cells.every(cell => !cell))))
      .map((table) => section.sheet === 'X.b-RM' && table.title === 'Technology penetration level'
        ? { ...table, firstColumn: 'Scenario', columns: ['High', 'Med', 'Low'], showUnit: false }
        : section.sheet === 'X.b-RM' && table.title === 'Penetration by scenario over years'
          ? { ...table, firstColumn: 'Scenario', showUnit: false }
        : section.sheet === 'X.a-RM' && table.title === 'Penetration of efficienct lighting'
          ? { ...table, firstColumn: 'Trajectory', showUnit: false,
            metadataColumns: [{ key: 'appliance', label: 'Type of appliance' }, { key: 'efficiency', label: 'Efficiency level' }],
            rows: table.rows.filter(row => Number(row.id) >= 59 && Number(row.id) <= 74).map((row) => ({
              ...row, label: 'ABCD'[Math.floor((Number(row.id) - 59) / 4)], groupRows: true,
              appliance: ['Bulb', 'Tubelight', 'CFL', 'LED'][(Number(row.id) - 59) % 4], efficiency: ''
            })) }
        : table)
      .map((table) => ({ ...table,
      title: xiiWorkbookTitle(section.sheet, table),
      ...(section.sheet.startsWith('XII.') && /^(Mode|ROAD|AIR-Frieght)$/.test(table.title) ? { firstColumn: 'Mode' } : {}),
      ...(section.sheet === 'XII.a-ND,KS' && table.title === 'Code' ? { firstColumn: 'Code' } : {}),
      ...(table.rows.some(row => repeatedLevel(row.label)) ? {
        firstColumn: 'Trajectory',
        metadataColumns: [{ key: 'description', label: 'Description' }, ...(table.metadataColumns || [])]
      } : {}),
      rows: table.rows.map((row) => ({ ...row,
        label: repeatedLevel(row.label)?.[2] || workbookRowLabel(row.label),
        ...(repeatedLevel(row.label) ? { description: `Level ${repeatedLevel(row.label)[2]}` } : {}),
        cells: row.cells.map((cell, index) => {
          if (!cell) return null;

          const unit = cell.unit ?? row.unit;
          const field = { key: section.id + '_' + cell.ref, sheet: section.sheet, ref: cell.ref,
            source: section.sheet + '!' + cell.ref, unit,
            label: table.title + ' · ' + workbookRowLabel(row.label) + ' · ' + table.columns[index] };
          fields.push(field);
          return field;
        })
      }))
    }))
  }));
  return { sections, fields };
}
