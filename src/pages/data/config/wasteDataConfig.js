import workbook from '../schemas/wasteWorkbookSchema.json';
import workbookDisplayConfig from './workbookDisplayConfig';

export const WASTE_CONFIG = workbookDisplayConfig(workbook);
const original = WASTE_CONFIG.sections[0];
WASTE_CONFIG.sections = [
  { ...original, id: 'trajectory', title: 'Trajectory assumptions', tables: original.tables.slice(0, 4) },
  { ...original, id: 'fixed', title: 'Fixed assumptions', tables: original.tables.slice(4) }
];
