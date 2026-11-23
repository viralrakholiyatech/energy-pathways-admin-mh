// Read-only workbook audit exports. Never copy cached formula values into the UI.
const fs = require('fs');
const path = require('path');
const os = require('os');
const chosenWorkbookRows = require('./chosen-workbook-rows.cjs');
const col = ref => ref.replace(/\d+$/, '');
const number = ref => col(ref).split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
const clean = value => String(value ?? '').replace(/System.Xml.XmlElement/g, '').trim();
const result = {};
for (const name of ['gdp','i','ii','iii','iv','v','vi-viii']) {
  const parsed = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), `energy-section-${name}-audit.json`), 'utf8').replace(/^\uFEFF/, ''));
  for (const sheet of [].concat(parsed)) {
    if (sheet.sheet === 'IV.b') continue;
    const chosenRows = chosenWorkbookRows(sheet);
    const byRow = new Map();
    for (const c of sheet.cells) { if (!byRow.has(c.row)) byRow.set(c.row, []); byRow.get(c.row).push(c); }
    let headings = {}, title = '', estimate = '', unit = '', pending = null, endColumn = 14;
    const tables = [];
    const finish = () => { if (pending?.rows.some(r => r.formulas.length)) tables.push(pending); pending = null; };
    for (let r = 1; r <= Math.max(...byRow.keys()); r++) {
      const cells = byRow.get(r) || [];
      const years = cells.filter(c => number(c.ref) >= 6 && number(c.ref) <= 14 && /^(19|20)\d{2}(?:\s*[-–]\s*\d{2,4})?$/.test(clean(c.value)));
      if (years.length >= 3) {
        finish();
        const estimateCell = cells.find(c => number(c.ref) <= 4 && /^(low|point|high|central|medium) estimates?$/i.test(clean(c.value)));
        estimate = estimateCell ? clean(estimateCell.value) : '';
        const headerTitle = cells.find(c => number(c.ref) <= 3 && /[a-z]/i.test(clean(c.value)) &&
          !/^(trajectory|description|fuel|vector|type|level|scenario|chosen|low estimates?|point estimates?|high estimates?)$/i.test(clean(c.value)));
        if (headerTitle) title = clean(headerTitle.value);
        headings = Object.fromEntries(years.map(c => [col(c.ref), clean(c.value)]));
        endColumn = Math.max(...years.map(c=>number(c.ref))); continue;
      }
      const data = cells.filter(c => number(c.ref) >= 6 && number(c.ref) <= endColumn && c.type !== 's' && c.type !== 'str' && (c.hasFormula || (clean(c.value) !== '' && Number.isFinite(Number(c.value)))));
      const titleCell = cells.find(c => ['B','C'].includes(col(c.ref)) && /[a-z]/i.test(clean(c.value)) && clean(c.value).length > 15);
      const nearbyHeader = [1,2,3].some(offset => (byRow.get(r + offset) || []).filter(c => number(c.ref)>=6 && number(c.ref)<=14 && /^(19|20)\d{2}$/.test(clean(c.value))).length>=3);
      // Titles can have a conversion factor/plant size beside them. It isn't a data table.
      if (titleCell && data.length <= 2 && nearbyHeader && cells.some(c => number(c.ref)>=12 && ['s','str'].includes(c.type))) {
        finish(); title = clean(titleCell.value); estimate = '';
        unit = clean([...cells].reverse().find(c => number(c.ref)>=12 && ['s','str'].includes(c.type))?.value);
        continue;
      }
      if (!data.length) {
        // A row with a label but empty numeric cells still belongs to its table.
        // Match its label cell's column/style to the preceding data row, not a title.
        const previousCells = byRow.get(r - 1) || [];
        const nextCells = byRow.get(r + 1) || [];
        const continuation = pending && cells.find(c => col(c.ref) === 'D' && /[a-z]/i.test(clean(c.value)) &&
          previousCells.some(p => col(p.ref) === col(c.ref) && p.style === c.style && /[a-z]/i.test(clean(p.value))) &&
          nextCells.some(p => col(p.ref) === col(c.ref) && p.style === c.style && /[a-z]/i.test(clean(p.value))));
        if (continuation) {
          pending.rows.push({id: String(r), label: clean(continuation.value), unit, refs: [], formulas: []});
          continue;
        }
        finish();
        const label = cells.find(c => number(c.ref) <= 4 && /[a-z]/i.test(clean(c.value)) && clean(c.value).length >= 3 && !/^Notes$|^Description$|^Trajectory$|^Fuel$/.test(clean(c.value)));
        if (label) { title = clean(label.value); estimate = ''; unit = ''; }
        const u = [...cells].reverse().find(c => number(c.ref) >= 6 && (c.type === 'str' || c.type === 's') && clean(c.value).length < 40 && !/notes|numbers need|delta|description/i.test(clean(c.value)));
        if (u) unit = clean(u.value);
        continue;
      }
      const inlineTitle = cells.find(c => col(c.ref) === 'B' && /[a-z]/i.test(clean(c.value)) && !/^[x×=+*-]$|^[A-Z]\.\d+$/i.test(clean(c.value)));
      if (inlineTitle) { finish(); title = clean(inlineTitle.value); }
      if (!pending) pending = { title: title || sheet.sheet, ...(estimate ? { estimate } : {}), startRow: r, columns: [], columnRefs: [], rows: [] };
      for (const c of data) if (!pending.columnRefs.includes(col(c.ref))) pending.columnRefs.push(col(c.ref));
      const labels = cells.filter(c => number(c.ref) >= 2 && number(c.ref) <= 4 &&
        (['s','str'].includes(c.type) || /^[1-5]$/.test(clean(c.value)))).map(c => clean(c.value)).filter(v=>v && !/^[×÷=+*-]$/.test(v));
      const label = labels.filter(v => v.length < 100).join(' · ');
      const rowUnit = cells.find(c => ['E', 'F'].includes(col(c.ref)) && (c.type === 's' || c.type === 'str') && clean(c.value).length < 35);
      pending.rows.push({ id: String(r), label: /^\d$/.test(label) ? `Trajectory ${label}` : label, unit: rowUnit ? clean(rowUnit.value) : unit,
        refs: data.map(c => c.ref), formulas: data.filter(c => c.hasFormula).map(c => c.ref) });
      pending.headings = { ...headings };
    }
    finish();
    tables.forEach(t => t.rows.forEach(r => { if (chosenRows.has(r.id)) r.chosen = true; }));
    tables.forEach(t => {
      let trajectory = '';
      for (const row of t.rows) {
        const cells = byRow.get(Number(row.id)) || [];
        const category = cells.find(c => ['E','F'].includes(col(c.ref)) && /^(Utility|Captive|Total)$/i.test(clean(c.value)));
        if (!category) continue;
        if (/^Trajectory [1-4]$/.test(row.label)) trajectory = row.label;
        if (trajectory) {
          row.label = trajectory; row.description = clean(category.value);
          t.metadataColumns = [{key:'description',label:'Description'}];
        } else if (!row.label) row.label = clean(category.value);
        row.unit = t.rows.find(r => /^(GW|TWh|GW\/year)$/.test(r.unit))?.unit ||
          clean((byRow.get(t.startRow-3)||[]).find(c=>number(c.ref)>=12)?.value) || '';
      }
    });
    // Keep adjacent text columns distinct: a vector code isn't its description,
    // and a fuel isn't a plant type. These headers are part of the source table.
    tables.forEach(t => {
      const header = [1,2,3,4,5].map(offset => byRow.get(t.startRow-offset) || []).find(cells =>
        cells.some(c => col(c.ref)==='C' && /^(Fuel|Vector)$/i.test(clean(c.value))) &&
        cells.some(c => col(c.ref)==='D' && /^(Plant Type|Information type|Name|Description)$/i.test(clean(c.value))));
      if (!header) return;
      t.metadataColumns = [{key:'workbookDescription',label:clean(header.find(c=>col(c.ref)==='D').value)}];
      for (const row of t.rows) {
        const cells = byRow.get(Number(row.id)) || [];
        row.label = clean(cells.find(c=>col(c.ref)==='C')?.value);
        row.workbookDescription = clean(cells.find(c=>col(c.ref)==='D')?.value);
        if (!row.label && /^Total$/i.test(row.workbookDescription)) { row.label = row.workbookDescription; row.workbookDescription = ''; }
      }
    });
    if (sheet.sheet.replace(/\s/g,'').toLowerCase()==='i.c-ks') {
      // C155 is the next table's heading; G155 is a helper flag, not a year row.
      const heading = clean((byRow.get(155)||[]).find(c=>c.ref==='C155')?.value);
      const capacity = tables.find(t=>t.startRow===157);
      if (capacity) capacity.title = heading;
      const helper = tables.findIndex(t=>t.startRow===155);
      if (helper>=0) tables.splice(helper,1);
    }
    const normalizedSheet = sheet.sheet.replace(/\s/g, '').toLowerCase();
    if (normalizedSheet === 'iv.f-pb') {
      // D84/J84 are unit conversion helpers below the capacity table,
      // not a second capacity-addition table with a single year.
      const helper = tables.findIndex(t => t.startRow === 84);
      if (helper >= 0) tables.splice(helper, 1);
    }
    result[normalizedSheet] = tables.map(t => {
      t.columnRefs.sort((a,b) => number(a)-number(b));
      t.columns = t.columnRefs.map(c => t.headings[c] || '');
      delete t.headings;
      return t;
    });
    if (normalizedSheet === 'i.d-ks') {
      // These workbook output tables include labelled rows with no numeric cells.
      // Reconstruct their explicit ranges instead of treating each label as a title.
      const specs = [
        {titleRef:'C134',header:136,start:137,end:140,label:'C',description:'D',firstColumn:'GHG',descriptionLabel:'IPCC Sector',unit:'Mt CO2e/yr'},
        {titleRef:'C144',header:146,start:147,end:148,label:'C',description:'D',firstColumn:'Vector',descriptionLabel:'Information type'},
        {titleRef:'B157',header:158,start:159,end:164,label:'B',description:'C',firstColumn:'Vector',descriptionLabel:'Name',unit:'INR Billion/year'}
      ];
      const cell = ref => sheet.cells.find(c=>c.ref===ref);
      for (const spec of specs) {
        const columnRefs = ['G','H','I','J','K','L','M'];
        const table = {title:clean(cell(spec.titleRef)?.value),startRow:spec.start,firstColumn:spec.firstColumn,
          metadataColumns:[{key:'workbookDescription',label:spec.descriptionLabel}],
          columns:['2021','2025','2029','2035','2040','2045','2050'],columnRefs,
          rows:Array.from({length:spec.end-spec.start+1},(_,index)=>{
            const r=spec.start+index;
            return {id:String(r),label:clean(cell(spec.label+r)?.value),workbookDescription:clean(cell(spec.description+r)?.value),
              unit:spec.unit || clean(cell('E'+r)?.value),refs:columnRefs.map(c=>c+r),
              formulas:columnRefs.filter(c=>cell(c+r)?.hasFormula).map(c=>c+r)};
          })};
        result[normalizedSheet] = result[normalizedSheet].filter(t=>t.startRow<spec.header || t.startRow>spec.end);
        result[normalizedSheet].push(table);
      }
      result[normalizedSheet].sort((a,b)=>a.startRow-b.startRow);
    }
  }
}
fs.writeFileSync('src/pages/data/schemas/formulaWorkbookLayouts.json', JSON.stringify(result, null, 2) + '\n');
console.log(Object.entries(result).map(([s,t]) => `${s}: ${t.length} tables`).join('\n'));
