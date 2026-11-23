// Synthetic responses for tests only; never imported by application code.
import { GDP_FIELDS, COOKING_TABLES, COOKING_HISTORY } from '../pages/data/config/gdpDataConfig';
import { HYDROCARBON_FIELDS, HYDROCARBON_SECTIONS } from '../pages/data/config/hydrocarbonDataConfig';

export const GDP_API_VALUES = Object.fromEntries(GDP_FIELDS.map(field => [field.key, field.optional ? '' : '0']));
const areas = [...Object.values(COOKING_TABLES).flat().flatMap(table => table.areas), ...COOKING_HISTORY];
areas.forEach(area => [0, 1].forEach(column => {
  const fields = area.rows.map(row => row.cells[column]).filter(Boolean);
  fields.forEach((field, index) => { GDP_API_VALUES[field.key] = index === 0 ? '64' : index === 1 ? '36' : '0'; });
}));
Object.assign(GDP_API_VALUES, {
  reference_A144: '1000', reference_V206: '82.8', reference_O182: '70',
  cook_high_t3_rural_Coal_2045: '1.2', passenger_sc1_l1_2021: '409'
});

export const HYDROCARBON_API_VALUES = Object.fromEntries(HYDROCARBON_FIELDS.map(field => [field.key, field.hidden ? '' : '0']));
HYDROCARBON_SECTIONS.forEach(section => section.tables.filter(table => table.total).forEach(table => {
  const groups = table.totalAcrossRow ? table.rows.map(row => row.cells)
    : table.columns.map((_, index) => table.rows.map(row => row.cells[index]));
  groups.forEach(group => group.filter(Boolean).forEach((field, index) => {
    HYDROCARBON_API_VALUES[field.key] = index === 0 ? String(table.total) : '0';
  }));
}));
Object.assign(HYDROCARBON_API_VALUES, { ia_H69: '58.326', ia_H70: '59.426', ia_H71: '1', ia_H72: '0', ie_G19: '2' });
