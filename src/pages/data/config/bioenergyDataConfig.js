import workbook from '../schemas/bioenergyWorkbookSchema.json';

export const BIOENERGY_FIELDS = [];
export const BIOENERGY_SECTIONS = workbook.sections.map((section) => ({
  ...section,
  tables: section.tables.map((table) => ({
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell, index) => {
        if (!cell) return null;

        const percentField = (section.id === 'vb' && /^E13[0-3]$/.test(cell.ref))
          || (section.id === 'vd' && /^E(?:1[7-9]|20|2[6-9])$/.test(cell.ref));
        const unit = percentField ? '%' : row.unit;
        const field = { key: section.id + '_' + cell.ref, source: section.sheet + '!' + cell.ref,
          sheet: section.sheet, ref: cell.ref, unit,
          ...(percentField ? { displaySuffix: '%' } : {}),
          label: table.title + ' · ' + row.label + ' · ' + table.columns[index] };
        BIOENERGY_FIELDS.push(field);
        return field;
      })
    }))
  }))
}));
