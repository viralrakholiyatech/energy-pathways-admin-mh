import withFormulaTables from '../utils/formulaTables';
import SheetLoadingCard from '../components/SheetLoadingCard';
import { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import WorkbookInputTable from '../components/WorkbookInputTable';
import { HYDRO_FIELDS, HYDRO_SECTIONS } from '../config/hydroElectricDataConfig';

import useSheetInputs from '../hooks/useSheetInputs';


export default function HydroElectricUpdateForm() {
  const [openSections, setOpenSections] = useState(() => Object.fromEntries(HYDRO_SECTIONS.map(({ id }) => [id, true])));
  const { values, error, retry } = useSheetInputs('III-ND', HYDRO_FIELDS);
  const form = {
    values: values || {}, errors: {}, readOnly: true, inputPrefix: 'hydroElectric',
    inputPlaceholder: '-', emptyLabel: '-', isErrorVisible: () => false,
    onChange: () => {}, onBlur: () => {}
  };
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">{error}<button type="button" onClick={retry} className="ml-3 underline">Retry</button></div>;
  if (values === null) return <SheetLoadingCard sheet="III-ND" />;
  return <div className="space-y-5 pb-3">
    {HYDRO_SECTIONS.map((section) => {
      const open = openSections[section.id];
      return <section key={section.id} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-labelledby={`hydroElectric-heading-${section.id}`}>
        <h2>
          <button id={`hydroElectric-heading-${section.id}`} type="button" aria-expanded={open} aria-controls={`hydroElectric-panel-${section.id}`}
            onClick={() => setOpenSections((previous) => ({ ...previous, [section.id]: !previous[section.id] }))}
            className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:p-5">
            <span className="flex min-w-0 items-center gap-3">

              <span><span className="block text-base font-bold text-gray-900">{section.title}</span>
                <span className="mt-1 block text-xs font-normal text-gray-500">III- ND</span></span>
            </span>
            {open ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
          </button>
        </h2>
        <div id={`hydroElectric-panel-${section.id}`} role="region" aria-labelledby={`hydroElectric-heading-${section.id}`} hidden={!open}>
          {open && <div className="space-y-6 border-t border-gray-100 p-4 sm:p-6">
            {withFormulaTables('III-ND', section.tables, section.id === 'cost' ? [60, Infinity] : section.id === 'fixed' ? [45, 60] : [0, 45]).map((table, index) => <WorkbookInputTable key={table.title + index} {...table} form={form}
              metadataColumns={table.rows.some((row) => row.description) ? [{ key: 'description', label: 'Description' }] : []} />)}
          </div>}
        </div>
      </section>;
    })}
  </div>;
}
