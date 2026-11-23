import headers from '../schemas/workbookTableHeaders.json';

const excelRow = value => {
  const match = String(value ?? '').match(/(?:^|!|[A-Z])(\d+)$/);
  return match ? Number(match[1]) : Infinity;
};

export function workbookRow(row) {
  return Math.min(excelRow(row.id), ...[...(row.cells || []), row.notes, row.delta]
    .filter(Boolean).map(field => excelRow(field.source || field.ref)));
}

export function workbookTableRow(table) {
  return Math.min(table.startRow ?? Infinity, ...(table.sourceRows || []).map(row => Number(row.row)),
    ...(table.rows || []).map(workbookRow));
}

export default function orderWorkbookTables(tables) {
  return [...tables].sort((a, b) => workbookTableRow(a) - workbookTableRow(b));
}

export function workbookFirstColumn(sheet, table) {
  const row = workbookTableRow(table);
  const header = (headers[sheet.replace(/\s/g, '').toLowerCase()] || []).filter(item => item.row < row && row - item.row <= 5).pop();
  return header?.label || (table.firstColumn === 'Input' ? '' : table.firstColumn) || '';
}

export function mergeWorkbookTotals(tables) {
  const result = [];
  for (const table of orderWorkbookTables(tables)) {
    const previous = result[result.length - 1];
    const onlyTotals = table.rows.length > 0 && table.rows.every(row => !row.chosen && /^total$/i.test(String(row.label ?? '').trim()));
    const firstRow = Math.min(...table.rows.map(workbookRow));
    const lastRow = previous ? Math.max(...previous.rows.map(workbookRow)) : Infinity;
    if (onlyTotals && previous && Number.isFinite(firstRow) && firstRow > lastRow && firstRow - lastRow <= 2
      && JSON.stringify(previous.columns) === JSON.stringify(table.columns)) {
      result[result.length - 1] = { ...previous, rows: [...previous.rows, ...table.rows] };
    } else result.push(table);
  }
  return result;
}
