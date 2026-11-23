import WorkbookDisplayPage from '../components/WorkbookDisplayPage';
import { WASTE_CONFIG } from '../config/wasteDataConfig';

export default function WasteUpdateForm() {
  return <WorkbookDisplayPage config={WASTE_CONFIG} prefix="waste" label="Section VI" />;
}
