import gdpSchema from '../schemas/gdpWorkbookSchema.json';
import hydrocarbonSchema from '../schemas/hydrocarbonWorkbookSchema.json';
import renewableSchema from '../schemas/renewableWorkbookSchema.json';
import bioenergySchema from '../schemas/bioenergyWorkbookSchema.json';
import wasteSchema from '../schemas/wasteWorkbookSchema.json';
import gridSchema from '../schemas/gridStorageWorkbookSchema.json';
import hydrogenSchema from '../schemas/hydrogenWorkbookSchema.json';
import remainingSchema from '../schemas/remainingWorkbookSchema.json';
import layouts from '../schemas/formulaWorkbookLayouts.json';
import headers from '../schemas/workbookTableHeaders.json';
import { GDP_FIELDS, GDP_FIELD_MAP, EMPTY_GDP_VALUES, GROWTH_ROWS, COOKING_TABLES,
  validateGdp, cookingShareCheck, pickGdpInputs, readGdpDraft, DRAFT_STORAGE_KEY } from '../config/gdpDataConfig';
import { HYDROCARBON_FIELDS, HYDROCARBON_SECTIONS, EMPTY_HYDROCARBON_VALUES,
  validateHydrocarbon, pickHydrocarbonInputs, readHydrocarbonDraft, HYDROCARBON_DRAFT_KEY } from '../config/hydrocarbonDataConfig';
import { NUCLEAR_FIELDS, NUCLEAR_SECTIONS } from '../config/nuclearDataConfig';
import { HYDRO_FIELDS, HYDRO_SECTIONS } from '../config/hydroElectricDataConfig';
import { RENEWABLE_FIELDS, RENEWABLE_SECTIONS } from '../config/renewableDataConfig';
import { BIOENERGY_FIELDS, BIOENERGY_SECTIONS } from '../config/bioenergyDataConfig';
import { GDP_API_VALUES, HYDROCARBON_API_VALUES } from '../../../testFixtures/sheetValues';

test.each(Object.entries({ gdpSchema, hydrocarbonSchema, renewableSchema, bioenergySchema,
  wasteSchema, gridSchema, hydrogenSchema, remainingSchema, layouts, headers }))('%s stores only presentation and field mappings', (_, schema) => {
  const inspect = value => {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      expect(['value', 'values', 'initialValue', 'formula'].includes(key)).toBe(false);
      inspect(item);
    }
  };
  inspect(schema);
});

test.each([
  ['nuclear', NUCLEAR_FIELDS, 31], ['hydro', HYDRO_FIELDS, 14],
  ['renewable', RENEWABLE_FIELDS, 79], ['bioenergy', BIOENERGY_FIELDS, 397]
])('%s retains unique API field mappings without defaults', (_, fields, count) => {
  expect(fields).toHaveLength(count);
  expect(new Set(fields.map(field => field.source)).size).toBe(count);
  expect(fields.every(field => !('initialValue' in field))).toBe(true);
});

test('sparse years and trajectory labels are preserved independently of values', () => {
  expect(NUCLEAR_SECTIONS[0].tables.map(table => table.columns)).toEqual([['2021','2025'],['2021'],['2050']]);
  expect(HYDRO_SECTIONS[1].tables[0].columns).toEqual(['2021','2025','2050']);
  expect(RENEWABLE_SECTIONS[4].tables[0].rows.map(row => row.label)).toEqual(['Trajectory 1', 'Trajectory 4']);
  expect(RENEWABLE_SECTIONS[0].tables[0].rows[0].cells[2]).toBeNull();
  expect(BIOENERGY_SECTIONS[4].tables).toHaveLength(0);
  expect(BIOENERGY_FIELDS.find(field => field.key === 'vb_E130').unit).toBe('%');
});

test('GDP registry keeps all mapped inputs and no stored baseline', () => {
  const refs = new Set(GDP_FIELDS.map(field => field.source.replace('GDP!', '')));
  expect(new Set(GDP_FIELDS.map(field => field.key)).size).toBe(GDP_FIELDS.length);
  expect(refs.size).toBe(GDP_FIELDS.length);
  expect(gdpSchema.inputRefs.filter(ref => !refs.has(ref))).toEqual([]);
  expect(Object.values(EMPTY_GDP_VALUES).every(value => value === '')).toBe(true);
  expect(GROWTH_ROWS).toHaveLength(3);
  expect(GROWTH_ROWS.every(row => row.cells.length === 6)).toBe(true);
  expect(GDP_FIELD_MAP.ind_l1_rate_cement.source).toBe('GDP!R137');
  expect(GDP_FIELD_MAP.ind_l1_cement_2025).toBeUndefined();
  expect(GDP_FIELD_MAP.cook_high_t1_urban_PNG_2021).toBeUndefined();
});

test('GDP validation checks totals, numeric input, bounds, blanks and optional fields using API values', () => {
  expect(validateGdp(GDP_API_VALUES)).toEqual({});
  const values = { ...GDP_API_VALUES, cook_high_t1_urban_LPG_2050: '65' };
  expect(cookingShareCheck(COOKING_TABLES.high[0].areas[0], values, 1).valid).toBe(false);
  expect(validateGdp(values, 'cooking').cook_high_t1_urban_LPG_2050).toContain('101%');
  for (const [value, message] of [['-100', 'greater than -100'], ['0x10', 'valid number'], ['', 'Enter a value']]) {
    expect(validateGdp({ ...GDP_API_VALUES, 'growth_high_val_2021-25': value }, 'growth')['growth_high_val_2021-25']).toContain(message);
  }
  expect(validateGdp({ ...GDP_API_VALUES, 'telecom_high_2015-2030': '0' }, 'telecom')).toEqual({});
});

test('hydrocarbon tables expose only manual inputs and preserve validation without defaults', () => {
  expect(new Set(HYDROCARBON_FIELDS.map(field => field.source)).size).toBe(HYDROCARBON_FIELDS.length);
  expect(Object.values(EMPTY_HYDROCARBON_VALUES).every(value => value === '')).toBe(true);
  HYDROCARBON_SECTIONS.forEach(section => section.tables.forEach(table => {
    table.rows.forEach(row => expect([...row.cells, row.notes, row.delta].filter(Boolean)
      .every(field => field.kind === 'manual' && !field.hidden)).toBe(true));
    table.columns.forEach((_, index) => expect(table.rows.some(row => row.cells[index])).toBe(true));
  }));
  expect(validateHydrocarbon(HYDROCARBON_API_VALUES)).toEqual({});
  for (const [key, value, message] of [['ib_F84', '99', '99%'], ['ic_D43', '90', '90%'],
    ['ic_G52', '10', '10%'], ['ie_G19', '101', '100%'], ['ib_M223', '-1', 'positive'], ['ie_G19', '0x10', 'valid number']]) {
    expect(validateHydrocarbon({ ...HYDROCARBON_API_VALUES, [key]: value })[key]).toContain(message);
  }
  expect(validateHydrocarbon({ ...HYDROCARBON_API_VALUES, ic_E106: '-0.1' })).toEqual({});
});

test('drafts reject invalid JSON, keep registered edits and leave missing fields empty', () => {
  sessionStorage.setItem(DRAFT_STORAGE_KEY, 'invalid-json');
  sessionStorage.setItem(HYDROCARBON_DRAFT_KEY, 'invalid-json');
  expect(readGdpDraft(sessionStorage)).toBeNull();
  expect(readHydrocarbonDraft(sessionStorage)).toBeNull();
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ version: 1, values: { 'growth_high_val_2021-25': '9', unknown: 'no' } }));
  sessionStorage.setItem(HYDROCARBON_DRAFT_KEY, JSON.stringify({ version: 1, values: { ie_G19: 3, unknown: 'no' } }));
  const gdp = readGdpDraft(sessionStorage).values;
  const hydrocarbon = readHydrocarbonDraft(sessionStorage);
  expect(gdp['growth_high_val_2021-25']).toBe('9');
  expect(gdp.passenger_sc1_l1_2021).toBe('');
  expect(hydrocarbon).toEqual({ ie_G19: '3' });
  expect(pickGdpInputs(gdp)).not.toHaveProperty('unknown');
  expect(pickHydrocarbonInputs(hydrocarbon).ia_H70).toBe('');
});
