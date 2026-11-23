// Excel often labels only the first row of a multi-row chosen scenario.
module.exports = function chosenWorkbookRows(sheet) {
  const rows = new Map(), chosen = new Set();
  sheet.cells.forEach(cell => {
    if (!rows.has(cell.row)) rows.set(cell.row, []);
    rows.get(cell.row).push(cell);
  });
  let active = false, marker = '';
  for (let row = 1; row <= Math.max(...rows.keys()); row++) {
    const cells = (rows.get(row) || []).filter(c => /^[A-N]\d+$/.test(c.ref) && (c.hasFormula || String(c.value ?? '').trim() !== ''));
    const label = cells.find(c => /^[B-F]\d+$/.test(c.ref) && /\bchosen\b/i.test(c.value));
    if (label) { active = true; marker = label.ref.replace(/\d+$/, ''); }
    else if (!cells.length || cells.some(c => c.ref === marker + row && /^(?:[1-4]|(?:Level|Trajectory)\s*[1-4])$/i.test(c.value))) active = false;
    if (active) chosen.add(String(row));
  }
  return chosen;
};
