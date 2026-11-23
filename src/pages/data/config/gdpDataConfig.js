import source from "../schemas/gdpWorkbookSchema.json";

// Field definitions and API mappings only. All values come from the sheet API.
export const GDP_PERIODS = ["2021-25", "2025-29", "2029-35", "2035-40", "2040-45", "2045-50"];
export const GDP_YEARS = ["2021", "2025", "2029", "2035", "2040", "2045", "2050"];
export const TELECOM_PERIODS = ["2015-2030", "2030-2040", "2040-2050"];
export const SCENARIOS = [
  { id: "high", label: "High growth", number: 1 },
  { id: "medium", label: "Medium growth", number: 2 },
  { id: "low", label: "Low growth", number: 3 }
];
export const COOKING_FUELS = ["LPG", "Electricity", "PNG", "Biomass", "Coal", "Kerosene", "Biogas"];
export const SECTIONS = [
  { id: "growth", label: "Growth rates", description: "GDP Growth Rate at Factor cost at real price" },
  { id: "transport", label: "Transport", description: "Passenger and freight demand by growth scenario and demand level." },
  { id: "buildings", label: "Buildings", description: "Floor space per person and residential appliance ownership." },
  { id: "industry", label: "Industry", description: "Base-year production, growth assumptions and manually entered projections." },
  { id: "telecom", label: "Telecom", description: "Optional growth assumptions for base transceiver stations." },
  { id: "cooking", label: "Cooking", description: "Baseline fuel shares, future targets and manual year-specific assumptions." }
];

const fields = [];
// These input rows are hidden in the supplied GDP worksheet. Industry Level 3
// and Telecom are deliberately shown, as requested for the replacement admin.
const hiddenInputRows = new Set([18, 43, 44, 45, 46, 77, 78, 79, 80, 98, 105, 121, 122, 123, 124, 125]);
const hasSource = (ref) => source.inputRefs.includes(ref);
function field(key, ref, label, unit, section, context = {}, optional = false) {
  if (!hasSource(ref) && !optional) throw new Error(`Missing GDP input source: ${ref}`);
  const definition = {
    key, source: `GDP!${ref}`, label, unit, section, ...context, optional,
    hiddenInWorkbook: hiddenInputRows.has(Number(ref.match(/\d+$/)[0])),
    sourceKind: source.normalizedConstantCells.includes(ref) ? "normalized-baseline" : "manual",
    min: unit === "%" && section !== "cooking" ? -100 : 0,
    max: unit === "%" && section === "cooking" ? 100 : undefined
  };
  fields.push(definition);
  return definition;
}
function years(prefix, row, label, unit, section, context = {}, startColumn = 6) {
  return GDP_YEARS.map((year, index) => {
    const ref = `${String.fromCharCode(65 + startColumn + index)}${row}`;
    return hasSource(ref) ? field(`${prefix}_${year}`, ref, `${label} · ${year}`, unit, section, context) : null;
  });
}

export const GROWTH_ROWS = SCENARIOS.map((scenario, index) => ({
  label: `${scenario.number}. ${scenario.label}`, unit: "%",
  cells: GDP_PERIODS.map((period, column) => field(
    `growth_${scenario.id}_val_${period}`, `${String.fromCharCode(71 + column)}${16 + index}`,
    `${scenario.label} · ${period}`, "%", "growth"
  ))
}));

export const TRANSPORT_TABLES = Object.fromEntries(SCENARIOS.map((scenario, index) => [scenario.id,
  [{ id: "passenger", title: "Passenger transport demand", unit: "BPKM", row: 27 },
    { id: "freight", title: "Freight transport demand", unit: "BTKM", row: 61 }].map((table) => ({
    ...table,
    rows: [1, 2, 3, 4].map((level) => ({
      label: `Level ${level}`, unit: table.unit,
      cells: years(`${table.id}_sc${scenario.number}_l${level}`, table.row + index * 8 + level - 1,
        `${scenario.label} · ${table.title} · Level ${level}`, table.unit, "transport", { scenario: scenario.id })
    }))
  }))
]));

const appliances = [["lighting", "Lighting"], ["fans", "Ceiling fans"], ["tvs", "Televisions"], ["fridges", "Refrigerators"], ["acs", "Room air conditioners"]];
export const BUILDING_TABLES = Object.fromEntries(SCENARIOS.map((scenario, index) => [scenario.id, [
  {
    id: "floor-space", title: "Floor space per person",
    rows: [["res", "Residential", 96], ["com", "Commercial", 103]].map(([id, label, row]) => ({
      label, unit: "m²/person",
      cells: years(`bldg_${id}_${scenario.id}`, row + index, `${scenario.label} · ${label} floor space`, "m²/person", "buildings", { scenario: scenario.id })
    }))
  },
  {
    id: "appliances", title: "Residential lighting and appliances",
    rows: appliances.map(([id, label], offset) => ({
      label, unit: "Millions",
      cells: years(`app_${scenario.id}_${id}`, 111 + index * 5 + offset, `${scenario.label} · ${label}`, "Millions", "buildings", { scenario: scenario.id })
    }))
  }
]]));

const industries = [["cement", "Cement"], ["fertilizer", "Fertilizer"], ["refinery", "Refinery"], ["steel", "Iron and steel"], ["paper", "Pulp and paper"], ["textile", "Textile"], ["aluminium", "Aluminium"], ["others", "Others"]];
export const INDUSTRY_TABLES = Object.fromEntries(SCENARIOS.map((scenario, index) => {
  const base = 137 + index * 9;
  const context = { scenario: scenario.id };
  return [scenario.id, {
    baselines: industries.map(([id, label], offset) => ({
      label, unit: id === "others" ? "INR billion" : "MT",
      cells: [field(`ind_l${scenario.number}_${id}_2021`, `G${base + offset}`,
        `${scenario.label} · ${label} baseline · 2021`, id === "others" ? "INR billion" : "MT", "industry", context)]
    })),
    rates: [
      ["cement", "Cement · 2020–2029", `R${base}`],
      ["fertilizer", "Fertilizer · annual growth", `E${base + 1}`],
      ["refinery", "Refinery · annual growth", `V${base + 2}`],
      ["steel_early", "Iron and steel · 2020–2031", `R${base + 4}`],
      ["steel_middle", "Iron and steel · 2031–2040", `S${base + 4}`],
      ["steel_late", "Iron and steel · 2040–2050", `T${base + 4}`],
      ["textile", "Textile · annual growth", `E${base + 5}`],
      ["aluminium", "Aluminium · annual growth", `V${base + 4}`],
      ["others", "Other industries · annual growth", `E${base + 7}`]
    ].map(([id, label, ref]) => ({ label, unit: "%", cells: [field(`ind_l${scenario.number}_rate_${id}`, ref, `${scenario.label} · ${label}`, "%", "industry", context)] })),
    paper: [{
      label: "Pulp and paper", unit: "MT",
      // 2021 is entered once in the baseline table, not duplicated here.
      cells: GDP_YEARS.slice(1).map((year, column) => field(`ind_l${scenario.number}_paper_${year}`,
        `${String.fromCharCode(72 + column)}${base + 4}`, `${scenario.label} · Pulp and paper · ${year}`, "MT", "industry", context))
    }],
    referenceRates: industries.filter((entry, offset) => ![1, 5, 7].includes(offset)).map(([id, label]) => {
      const row = base + industries.findIndex(([key]) => key === id);
      return { label, unit: "%", cells: [field(`ind_l${scenario.number}_reference_${id}`, `E${row}`, `${scenario.label} · ${label} reference growth assumption`, "%", "industry", context, !hasSource(`E${row}`))] };
    })
  }];
}));

export const INDUSTRY_REFERENCE_ROWS = [
  ["cement", "Cement · 2020–2030", "R164"], ["steel_early", "Iron and steel · 2020–2031", "R168"],
  ["steel_middle", "Iron and steel · 2031–2040", "S168"], ["steel_late", "Iron and steel · 2040–2047", "T168"]
].map(([id, label, ref]) => ({ label, unit: "%", cells: [field(`ind_reference_${id}`, ref, `${label} · additional reference`, "%", "industry")] }));

export const TELECOM_ROWS = SCENARIOS.map((scenario, index) => ({
  label: scenario.label, unit: "%",
  cells: TELECOM_PERIODS.map((period, column) => field(`telecom_${scenario.id}_${period}`,
    `${String.fromCharCode(70 + column)}${178 + index}`, `${scenario.label} · ${period}`, "%", "telecom", {}, true))
}));

export const TELECOM_NOTE_ROWS = SCENARIOS.map((scenario, index) => ({
  label: scenario.label, unit: "Text",
  cells: [field(`telecom_${scenario.id}_note`, `E${178 + index}`, `${scenario.label} · Telecom notes`, "Text", "telecom", { inputType: "text" }, true)]
}));

export const COOKING_TABLES = Object.fromEntries(SCENARIOS.map((scenario, index) => [scenario.id,
  [191, 213, 236, 258].map((base, trajectoryIndex) => {
    const trajectory = trajectoryIndex + 1;
    const context = { scenario: scenario.id, trajectory };
    return {
      trajectory,
      areas: ["urban", "rural"].map((area, areaIndex) => {
        const startRow = base + index * 91 + areaIndex * 9;
        const rows = COOKING_FUELS.map((fuel, fuelIndex) => {
          const prefix = `cook_${scenario.id}_t${trajectory}_${area}_${fuel}`;
          const cells = years(prefix, startRow + fuelIndex, `${scenario.label} · Trajectory ${trajectory} · ${area} · ${fuel}`, "%", "cooking", context, 7);
          return { label: fuel, unit: "%", cells: [cells[0], cells[6]], intermediate: cells.slice(1, 6) };
        });
        return { area, rows, manualYears: rows.filter((row) => row.intermediate.some(Boolean)).map((row) => ({ ...row, cells: row.intermediate })) };
      })
    };
  })
]));

export const COOKING_HISTORY = ["urban", "rural"].map((area, areaIndex) => ({
  area,
  rows: COOKING_FUELS.filter((fuel) => fuel !== "PNG").map((fuel) => {
    const row = 191 + areaIndex * 9 + COOKING_FUELS.indexOf(fuel);
    return { label: fuel, unit: "%", cells: ["Q", "R"].map((col, index) => field(
      `cook_history_${area}_${fuel}_${index === 0 ? "2016" : "2021"}`, `${col}${row}`,
      `${area} · ${fuel} · historical ${index === 0 ? "2016" : "2021"}`, "%", "cooking"
    )) };
  })
}));

// Preserve the workbook's unlabelled numeric reference entries without guessing
// fuel names, business meanings, or calculation dependencies. Units follow Excel.
export const UNLABELLED_REFERENCE_ROWS = Object.fromEntries(["industry", "cooking"].map((section) => [section,
  source.unlabelledReferenceCells.filter((item) => item.section === section).map(({ ref, unit }) => ({
    label: `GDP!${ref}`, unit,
    cells: [field(`reference_${ref}`, ref, `Additional workbook reference · GDP!${ref}`, unit, section, { referenceOnly: true })]
  }))
]));

export const GDP_FIELDS = fields;
export const GDP_FIELD_MAP = Object.fromEntries(fields.map((item) => [item.key, item]));
export const EMPTY_GDP_VALUES = Object.fromEntries(fields.map((item) => [item.key, ""]));
export const DRAFT_STORAGE_KEY = "energy-pathways:gdp-input-draft:2026-10-22:v1";

export function validateField(definition, value) {
  if (value === undefined || String(value).trim() === "") return definition.optional ? "" : "Enter a value.";
  const text = String(value).trim();
  if (definition.inputType === "text") return text.length > 1000 ? "Keep notes to 1,000 characters or fewer." : "";
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(Number(text))) return "Enter a valid number.";
  if (definition.referenceOnly) return "";
  if (Number(text) < definition.min || (definition.unit === "%" && definition.section !== "cooking" && Number(text) === -100)) {
    return definition.min === 0 ? "Use zero or a positive value." : "Growth must be greater than -100%.";
  }
  if (definition.max !== undefined && Number(text) > definition.max) return `Use a value from 0 to ${definition.max}%.`;
  return "";
}

export function cookingShareCheck(area, values, column) {
  const definitions = area.rows.map((row) => row.cells[column]).filter(Boolean);
  if (definitions.some((item) => validateField(item, values[item.key]))) return { valid: false, message: "Complete the fuel shares to check the total." };
  const sum = definitions.reduce((total, item) => total + Number(values[item.key]), 0);
  const balanced = definitions.length < COOKING_FUELS.length;
  const valid = balanced ? sum <= 100 + 0.000001 : Math.abs(sum - 100) <= 0.000001;
  return { valid, message: valid
    ? (balanced ? "Valid · PNG fills the remaining share" : "Valid · shares total 100%")
    : balanced ? "Entered shares exceed 100%. Reduce a fuel share." : `Shares total ${Number(sum.toFixed(6))}%. Adjust them to 100%.` };
}

export function validateGdp(values, section, isEditable = () => true) {
  const errors = {};
  fields.filter((item) => (!section || item.section === section) && isEditable(item)).forEach((item) => {
    const error = validateField(item, values[item.key]);
    if (error) errors[item.key] = error;
  });
  if (!section || section === "cooking") {
    const areas = [...Object.values(COOKING_TABLES).flat().flatMap((table) => table.areas), ...COOKING_HISTORY];
    areas.forEach((area) => [0, 1].forEach((column) => {
      if (area.rows.some((row) => row.cells[column] && !isEditable(row.cells[column]))) return;
      const check = cookingShareCheck(area, values, column);
      if (!check.valid) area.rows.forEach((row) => {
        const item = row.cells[column];
        if (item && !errors[item.key]) errors[item.key] = check.message;
      });
    }));
  }
  return errors;
}

export function pickGdpInputs(values, section) {
  return Object.fromEntries(fields.filter((item) => !section || item.section === section).map((item) => [item.key, values[item.key] ?? ""]));
}

export function readGdpDraft(storage) {
  try {
    const draft = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY));
    if (draft?.version !== 1 || !draft.values || typeof draft.values !== "object" || Array.isArray(draft.values)) return null;
    const values = { ...EMPTY_GDP_VALUES };
    fields.forEach(({ key }) => {
      if (typeof draft.values[key] === "string" || typeof draft.values[key] === "number") values[key] = String(draft.values[key]);
    });
    return { values, savedAt: typeof draft.savedAt === "string" ? draft.savedAt : null };
  } catch { return null; }
}
