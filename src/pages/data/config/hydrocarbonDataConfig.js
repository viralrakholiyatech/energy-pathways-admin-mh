import workbook from "../schemas/hydrocarbonWorkbookSchema.json";

export const HYDROCARBON_DRAFT_KEY = "energy-pathways:section-i-input-draft:2026-10-22:v1";
export const HYDROCARBON_FIELDS = [];

function register(source, section, table, row, column) {
  if (!source) return null;
  const field = {
    ...source, section: section.id, source: `${section.sheet}!${source.ref}`,
    label: `${section.title} · ${table.title} · ${row.label} · ${column}`,
    hidden: Boolean(source.hidden || table.hidden), optional: false
  };
  HYDROCARBON_FIELDS.push(field);
  return field;
}

// Preserve the audited source separately; admin shows direct manual inputs only.
// I.a is restricted to manual fixed assumptions at the client's request (no PLF).
const excludedTables = new Set(['ia-1', 'ia-2', 'ia-3', 'ia-5', 'ia-6', 'ia-7', 'ib-7', 'ib-18', 'ic-2', 'id-5', 'id-6']);
const auditedSections = workbook.sections.map((section) => ({
  ...section,
  tables: section.tables.map((table) => ({
    ...table,
    rows: table.rows.map((row) => ({
      ...row,
      cells: row.cells.map((source, index) => register(source, section, table, row, table.columns[index])),
      notes: register(row.notes, section, table, row, "Notes"),
      delta: register(row.delta, section, table, row, "Delta")
    }))
  }))
}));
export const HYDROCARBON_SECTIONS = auditedSections.map((section) => ({
  ...section,
  tables: section.tables.filter((table) => !table.hidden && !excludedTables.has(table.id)).map((table) => ({
    ...table,
    rows: table.rows.filter((row) => row.label !== 'Total').map((row) => ({
      ...row,
      cells: row.cells.map((field) => field?.kind === 'manual' && !field.hidden ? field : null),
      notes: row.notes?.kind === 'manual' ? row.notes : null,
      delta: row.delta?.kind === 'manual' ? row.delta : null
    })).filter((row) => [...row.cells, row.notes, row.delta].some(Boolean))
  })).filter((table) => table.rows.length).map((table) => {
    const indices = table.columns.map((_, index) => index).filter((index) => table.rows.some((row) => row.cells[index]));
    return { ...table, columns: indices.map((index) => table.columns[index]),
      zeroTotalColumns: table.zeroTotalColumns?.map((index) => indices.indexOf(index)).filter((index) => index >= 0),
      rows: table.rows.map((row) => ({ ...row, cells: indices.map((index) => row.cells[index]) })) };
  })
}));
const editableKeys = new Set(HYDROCARBON_SECTIONS.flatMap((section) => section.tables.flatMap((table) => table.rows.flatMap((row) => [...row.cells, row.notes, row.delta].filter(Boolean).map((field) => field.key)))));
HYDROCARBON_FIELDS.forEach((field) => { field.hidden = !editableKeys.has(field.key); });
export const HYDROCARBON_FIELD_MAP = Object.fromEntries(HYDROCARBON_FIELDS.map((field) => [field.key, field]));
export const EMPTY_HYDROCARBON_VALUES = Object.fromEntries(HYDROCARBON_FIELDS.map((field) => [field.key, ""]));

export function validateHydrocarbonField(field, value) {
  if (value === undefined || String(value).trim() === "") return "Enter a value.";
  const text = String(value).trim();
  if (field.inputType === "text") return text.length > 1000 ? "Keep notes to 1,000 characters or fewer." : "";
  if (field.allowDash && text === "-") return "";
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(Number(text))) return "Enter a valid number.";
  const number = Number(text);
  if (field.growth) {
    return number <= (field.unit === "%" ? -100 : -1) ? "Growth must be greater than -100%." : "";
  }
  if (number < 0) return "Use zero or a positive value.";
  if (field.unit === "%" && number > 100) return "Use a value from 0 to 100%.";
  return "";
}

export function validateHydrocarbon(values) {
  const errors = {};
  HYDROCARBON_FIELDS.filter((field) => !field.hidden).forEach((field) => {
    const error = validateHydrocarbonField(field, values[field.key]);
    if (error) errors[field.key] = error;
  });
  for (const section of HYDROCARBON_SECTIONS) for (const table of section.tables) {
    if (table.hidden || !table.total) continue;
    const groups = table.totalAcrossRow ? table.rows.map((row) => row.cells)
      : table.columns.map((_, index) => table.rows.map((row) => row.cells[index]));
    groups.forEach((group, index) => {
      const fields = group.filter(Boolean);
      if (fields.length !== group.length || fields.some((field) => errors[field.key])) return;
      const total = fields.reduce((sum, field) => sum + (String(values[field.key]).trim() === "-" ? 0 : Number(values[field.key])), 0);
      const allowedZero = table.zeroTotalColumns?.includes(index) && Math.abs(total) < 1e-6;
      if (!allowedZero && Math.abs(total - table.total) > 1e-6) {
        fields.forEach((field) => { errors[field.key] = `Shares total ${Number(total.toFixed(6))}%. Adjust them to ${table.total}%.`; });
      }
    });
  }
  return errors;
}

export function pickHydrocarbonInputs(values) {
  return Object.fromEntries(HYDROCARBON_FIELDS.map((field) => [field.key, values[field.key] ?? ""]));
}

export function readHydrocarbonDraft(storage) {
  try {
    const draft = JSON.parse(storage.getItem(HYDROCARBON_DRAFT_KEY));
    if (draft?.version !== 1 || !draft.values || typeof draft.values !== "object" || Array.isArray(draft.values)) return null;
    const values = {};
    HYDROCARBON_FIELDS.forEach(({ key }) => {
      if (typeof draft.values[key] === "string" || typeof draft.values[key] === "number") values[key] = String(draft.values[key]);
    });
    return values;
  } catch { return null; }
}
