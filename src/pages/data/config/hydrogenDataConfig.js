import workbook from '../schemas/hydrogenWorkbookSchema.json';
import workbookDisplayConfig from './workbookDisplayConfig';

export const HYDROGEN_CONFIG = workbookDisplayConfig(workbook);
const original = HYDROGEN_CONFIG.sections[0];
HYDROGEN_CONFIG.sections = [
  { ...original, id: 'trajectory', title: 'Trajectory assumptions', tables: original.tables.slice(0, 4) },
  { ...original, id: 'fixed', title: 'Fixed assumptions', tables: original.tables.slice(4) }
];
