// Extract layout metadata and API mappings only. Input values and formula results are never copied.
const fs = require('fs');
const os = require('os');
const path = require('path');
const chosenWorkbookRows = require('./chosen-workbook-rows.cjs');
const sheets = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'energy-section-ix-xvii-audit.json'), 'utf8').replace(/^\uFEFF/, ''));
const references = {
  IX: [['IX', 'IX', 'Temperature stress']],
  X: [['X.a-RM', 'X.a', 'Residential buildings'], ['X.b-RM', 'X.b', 'Commercial buildings']],
  XI: [['XI-KS', 'XI', 'Industry']],
  XII: [['XII.a-ND,KS', 'XII.a', 'Passenger transport'], ['XII.b-ND', 'XII.b', 'Freight transport']],
  XIII: [['XIII.a-PB', 'XIII.a', 'Domestic cooking']],
  XIV: [['XIV-Evelin', 'XIV', 'Agriculture']],
  XVII: [['XVII.a', 'XVII.a', 'Fossil fuel transfer'], ['XVII.b', 'XVII.b', 'Fossil fuel imports']]
};
const text = c => String(c?.value || '').replace(/System.Xml.XmlElement/g, '').trim();
const column = ref => ref.replace(/\d+$/, '');
const columnNumber = ref => column(ref).split('').reduce((n,c) => n*26+c.charCodeAt(0)-64,0);
const numeric = c => c && !['s','str'].includes(c.type) && text(c) !== '' && Number.isFinite(Number(c.value));
const period = c => /^(?:19|20)\d{2}(?:\s*[-–]\s*\d{2,4})?$/.test(text(c));
const output = {};
for (const [page, refs] of Object.entries(references)) {
  output[page] = { sections: [] };
  for (const [name, tab, title] of refs) {
    const source = sheets.find(s => s.sheet === name);
    if (!source) throw new Error(`Missing reference: ${name}`);
    const rows = new Map();
    source.cells.forEach(c => { if (!rows.has(c.row)) rows.set(c.row, []); rows.get(c.row).push(c); });
    const baseEndColumn = ['XIII.a-PB', 'XVII.a','XVII.b'].includes(name) ? 14 : 13;
    let endColumn = baseEndColumn;
    const start = source.cells.find(c => /trajectory assumptions|^inputs$/i.test(text(c)))?.row || 11;
    const section = { id: tab.toLowerCase().replace(/\W/g,''), sheet: name, tab, title, tables: [] };
    let heading = title, estimate = '', units = '', headers = {}, pending;
    const included = new Set(), formulaRefs = new Set();
    const finish = () => {
      if (!pending?.rows.length) { pending = null; return; }
      const cols = [...new Set(pending.rows.flatMap(r => Object.keys(r.data)))].sort((a,b) => columnNumber(a)-columnNumber(b));
      const columns = cols.map(col => pending.headers[col] || '');
      const table = { title: pending.title + (pending.estimate ? ` — ${pending.estimate}` : ''), firstColumn: 'Description', columns, rows: pending.rows.map(r => ({ id: String(r.row), label: r.label, unit: r.unit, cells: cols.map(col => r.data[col] || null) })) };
      // Retain source coordinates for dash cells separately from the input registry.
      table.sourceRows = pending.rows.map(r => ({ row: r.row, formulaCells: r.formulas }));
      section.tables.push(table); pending = null;
    };
    for (let row = start; row <= Math.max(...rows.keys()); row++) {
      const allCells = rows.get(row) || [];
      const periods = allCells.filter(c => columnNumber(c.ref)>=4 && period(c)).sort((a,b) => columnNumber(a.ref)-columnNumber(b.ref));
      if (periods.length>=2 && columnNumber(periods[0].ref)<=8) {
        let end = columnNumber(periods[0].ref);
        for (const c of periods.slice(1)) { if (columnNumber(c.ref)!==end+1) break; end++; }
        if (end>columnNumber(periods[0].ref)) endColumn = Math.max(baseEndColumn,end);
      }
      const cells = allCells.filter(c => columnNumber(c.ref) <= endColumn);
      const yearCells = cells.filter(c => columnNumber(c.ref) >= 4 && period(c));
      if (yearCells.length >= 2 || (yearCells.length===1 && !cells.some(c=>numeric(c) && !period(c)))) {
        finish();
        headers = Object.fromEntries(cells.filter(c => columnNumber(c.ref)>=4).map(c => [column(c.ref), text(c)==='.' ? 'Factor' : /^Notes$/i.test(text(c)) ? 'Assumption' : text(c)]));
        const estimateCell = cells.find(c => columnNumber(c.ref)<=4 && /^(low|point|high|central|medium) estimates?$/i.test(text(c)));
        estimate = estimateCell ? text(estimateCell) : '';
        const candidate = cells.find(c => columnNumber(c.ref)<=3 && /[a-z]/i.test(text(c)) && !/^(trajectory|type|vector|fuel|description|level|chosen|scenario)/i.test(text(c)));
        if (candidate && candidate !== estimateCell) heading = text(candidate);
        continue;
      }
      const startColumn = headers.D && /^(?:19|20)\d{2}/.test(headers.D) ? 4 : 5;
      const values = cells.filter(c => columnNumber(c.ref)>=startColumn && (numeric(c) || (c.hasFormula && !['s','str'].includes(c.type))));
      if (!values.length) {
        finish();
        const labels = cells.filter(c => columnNumber(c.ref)>=2 && columnNumber(c.ref)<=4 && /[a-z]/i.test(text(c)) && !/^(description|trajectory|notes:?|units|vector|name|fuel|type|level|mode|low|medium|high|scenario)$/i.test(text(c)));
        if (labels.length) {
          const next = text(labels[labels.length-1]);
          estimate = '';
          heading = /^(urban|rural)$/i.test(next) ? heading.replace(/ · (Urban|Rural)$/i,'')+' · '+next : next;
          units = '';
        }
        const u = cells.find(c => columnNumber(c.ref)>=5 && /[a-z%]/i.test(text(c)) && text(c).length<40);
        if (u) units = text(u);
        continue;
      }
      const inlineTitle = cells.find(c => column(c.ref)==='B' && /[a-z]/i.test(text(c)) && !/^[x×=+*-]$|^[A-Z]\.\d+$/i.test(text(c)));
      if (inlineTitle && !pending) heading = text(inlineTitle);
      if (!pending) pending = { title: heading, estimate, headers: { ...headers }, rows: [] };
      const labelCells = cells.filter(c => columnNumber(c.ref)>=2 && columnNumber(c.ref)<startColumn && text(c));
      const label = labelCells.map(c => /^\d$/.test(text(c)) ? `Level ${text(c)}` : text(c)).join(' · ');
      const rowUnit = cells.find(c => ['E','F'].includes(column(c.ref)) && ['s','str'].includes(c.type) && text(c).length<35);
      const unit = rowUnit ? text(rowUnit) : units;
      const data = {}, formulas = [];
      for (const c of values) {
        if (c.hasFormula) { data[column(c.ref)] = null; formulas.push(c.ref); formulaRefs.add(c.ref); }
        else {
          const fieldUnit = [9,10].includes(c.formatId) || c.format.includes('%') ? '%' : unit;
          data[column(c.ref)] = { ref: c.ref, unit: fieldUnit };
          included.add(c.ref);
        }
      }
      pending.rows.push({ row, label, unit, data, formulas });
    }
    finish();
    const chosenRows = chosenWorkbookRows(source);
    section.tables.forEach(t => t.rows.forEach(r => { if (chosenRows.has(r.id)) r.chosen = true; }));
    output[page].sections.push(section);
    console.log(`${name}: ${section.tables.length} tables, ${included.size} manual values, ${formulaRefs.size} calculated cells`);
  }
}
fs.writeFileSync('src/pages/data/schemas/remainingWorkbookSchema.json', JSON.stringify(output, null, 2)+'\n');
