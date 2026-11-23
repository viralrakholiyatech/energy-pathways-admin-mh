import WorkbookDisplayPage from '../components/WorkbookDisplayPage';
import { HYDROGEN_CONFIG } from '../config/hydrogenDataConfig';

export default function HydrogenUpdateForm() {
  return <WorkbookDisplayPage config={HYDROGEN_CONFIG} prefix="hydrogen" label="Section VIII" />;
}
