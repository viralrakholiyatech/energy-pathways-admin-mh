import layouts from '../schemas/formulaWorkbookLayouts.json';
import { mergeWorkbookTotals, workbookFirstColumn } from './workbookOrder';

const normalize = sheet => sheet.replace(/\s/g, '').toLowerCase();
const refOf = field => field?.source?.split('!').pop();

// Presentation only: retain the existing field objects and their API mappings.
// No cached workbook result, formula, or new editable field is introduced.
export default function withFormulaTables(sheet, tables, range = [0, Infinity]) {
  const source = (layouts[normalize(sheet)] || []).filter(t => t.startRow >= range[0] && t.startRow < range[1]);
  const fields = new Map(tables.flatMap(t => t.rows.flatMap(r => r.cells.filter(Boolean))).map(f => [refOf(f), f]));
  const consumed = new Set();
  const additions = source.map(layout => {
    const refs = new Set(layout.rows.flatMap(r => r.refs));
    const candidates = tables.filter(t => {
      const inputs = t.rows.flatMap(r => r.cells.filter(Boolean));
      return inputs.length && inputs.every(f => refs.has(refOf(f)));
    });
    const candidate = candidates.length === 1 ? candidates[0] : null;
    const candidateRows = new Set(candidate?.rows.flatMap(r => r.cells.filter(Boolean)).map(f => refOf(f).match(/\d+$/)[0]));
    const sharedRows = tables.some(t => t !== candidate && t.rows.some(r => r.cells.some(f => f && candidateRows.has(refOf(f).match(/\d+$/)[0]))));
    const matches = candidate && !sharedRows ? [candidate] : [];
    matches.forEach(t => consumed.add(t));
    const representedRows = new Set(tables.filter(t => !matches.includes(t)).flatMap(t => t.rows.flatMap(r => r.cells.filter(Boolean))).map(f => refOf(f)?.match(/\d+$/)?.[0]));
    const rows = layout.rows.filter(r => !representedRows.has(r.id)).map(r => {
      const original = matches.flatMap(t => t.rows).find(row => row.cells.some(f => f && r.refs.includes(refOf(f))));
      return { ...original, id: r.id, chosen: r.chosen, label: r.workbookDescription !== undefined ? r.label : original?.label || r.label, workbookDescription: r.workbookDescription, description: original?.description || r.description, unit: original?.unit || matches[0]?.rows[0]?.unit || r.unit,
        cells: layout.columnRefs.map(c => fields.get(c + r.id) || null) };
    });
    return { ...(matches[0] || {}), metadataColumns: matches[0]?.metadataColumns || layout.metadataColumns, title: layout.estimate ? `${layout.title} — ${layout.estimate}` : matches.length === 1 ? matches[0].title : layout.title, columns: layout.columns,
      firstColumn: layout.firstColumn || 'Description', rows, startRow: layout.startRow };
  }).filter(t => t.rows.length);
  const result = mergeWorkbookTotals([...tables.filter(t => !consumed.has(t)), ...additions]);
  return result.map(table => table.title === '' ? table : { ...table, firstColumn: workbookFirstColumn(sheet, table),
    headingOnly: /^(cost|fixed|derived|trajectory) assumptions$/i.test(table.title.trim()) && table.rows.every(row => (!row.label || row.label === table.title) && row.cells.every(cell => !cell)) });
}

export function formulaOnlyTables(sheet, fields, range) {
  // GDP's custom layout already renders its registered input rows.
  const placeholder = { title: '', rows: [{ cells: fields }] };
  return withFormulaTables(sheet, [placeholder], range).filter(t => t !== placeholder);
}
