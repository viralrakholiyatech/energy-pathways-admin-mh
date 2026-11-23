import WorkbookDisplayPage from '../components/WorkbookDisplayPage';
import { GRID_STORAGE_CONFIG } from '../config/gridStorageDataConfig';
import gridStorageWorkbookTables from '../utils/gridStorageWorkbookTables';

import MaharashtraSectionI from "./MaharashtraSectionI";

export default function GridStorageUpdateForm({ readOnlyControls }) {
  return <WorkbookDisplayPage config={GRID_STORAGE_CONFIG} prefix="gridStorage" label="Section VII" tabs sheetPanels={{ "VII.a": <MaharashtraSectionI key="VII.a" section="VII.a" />, "VII.b": <MaharashtraSectionI key="VII.b" section="VII.b" />, "VII.c": <MaharashtraSectionI key="VII.c" section="VII.c" /> }} readOnlyControls={readOnlyControls} transformTables={gridStorageWorkbookTables} />;
}
