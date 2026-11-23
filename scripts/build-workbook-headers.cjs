// Read the original header cells, including sheets whose headings are not years.
const fs = require('fs');
const os = require('os');
const path = require('path');
const result = {};
for (const group of ['gdp','i','ii','iii','iv','v','vi-viii','ix-xvii']) {
  const sheets = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), `energy-section-${group}-audit.json`), 'utf8').replace(/^\uFEFF/, ''));
  for (const sheet of [].concat(sheets)) {
    const rows = new Map();
    sheet.cells.forEach(c => { if (!rows.has(c.row)) rows.set(c.row, []); rows.get(c.row).push(c); });
    const headers = [];
    for (const [row, cells] of rows) {
      const label = cells.find(c => /^[B-D]\d+$/.test(c.ref) &&
        /^(trajectory|technology|fuel|vector|type|description|plant type|industry|level|parameter|component|estimate|mode|scenario|capacity type|category|name)$/i.test(String(c.value).trim()));
      if (label && cells.some(c => /^[D-N]\d+$/.test(c.ref) && /^(19|20)\d{2}/.test(String(c.value))))
        headers.push({row, label: String(label.value).trim()});
    }
    result[sheet.sheet.replace(/\s/g,'').toLowerCase()] = headers;
  }
}
fs.writeFileSync('src/pages/data/schemas/workbookTableHeaders.json', JSON.stringify(result, null, 2)+'\n');
