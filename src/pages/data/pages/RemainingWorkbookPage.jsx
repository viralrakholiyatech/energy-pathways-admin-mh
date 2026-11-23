import workbook from '../schemas/remainingWorkbookSchema.json';
import workbookDisplayConfig from '../config/workbookDisplayConfig';
import WorkbookDisplayPage from '../components/WorkbookDisplayPage';

export const REMAINING_CONFIGS = Object.fromEntries(Object.entries(workbook).map(([sheet, data]) => [sheet, workbookDisplayConfig(data)]));

export default function RemainingWorkbookPage({ sheet }) {
  const config = REMAINING_CONFIGS[sheet];
  return <WorkbookDisplayPage config={config} prefix={'sheet-' + sheet.toLowerCase()} label={`Section ${sheet} sheets`}
    tabs={config.sections.length > 1} />;
}
