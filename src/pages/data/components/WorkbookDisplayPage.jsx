import useSheetInputs from '../hooks/useSheetInputs';
import SheetApiStatus from './SheetApiStatus';
import withFormulaTables from '../utils/formulaTables';
import { useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import WorkbookInputTable from './WorkbookInputTable';

export default function WorkbookDisplayPage({ config, prefix, label, tabs = false, transformTables, sheetPanels, readOnlyControls }) {
  const [active, setActive] = useState(config.sections[0].id);
  const [open, setOpen] = useState(() => Object.fromEntries(config.sections.map((section) => [section.id, true])));
  const selectedSheet = config.sections.find(section => section.id === active).sheet;
  const apiSheet = selectedSheet === 'VII.C-KS' ? 'VII.c-KS' : selectedSheet;
  const fields = useMemo(() => config.fields.filter(f => f.sheet === selectedSheet), [config.fields, selectedSheet]);
  const panel = sheetPanels?.[config.sections.find(section => section.id === active).tab];
  const api = useSheetInputs(panel ? null : apiSheet, fields);
  const form = { values: api.values || {}, errors: {}, readOnly: true, inputPrefix: prefix,
    inputPlaceholder: '-', emptyLabel: '-', isErrorVisible: () => false, onChange: () => {}, onBlur: () => {} };
  const content = (section) => <div className="space-y-6 p-4 sm:p-6">
    {tabs && <h2 className="text-base font-bold text-gray-900">{section.tab} {section.title}</h2>}
    {(transformTables || ((_, tables) => tables))(section, withFormulaTables(section.sheet, section.tables, config.sections.filter(s => s.sheet === section.sheet).length > 1 ? (section.id === 'trajectory' ? [0, prefix === 'hydrogen' ? 44 : 75] : [prefix === 'hydrogen' ? 44 : 75, Infinity]) : undefined)).map((table, index) => <WorkbookInputTable key={table.title + index} {...table} form={form} />)}
  </div>;
  if (tabs) return <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2.5">
      {config.sections.map((section, index) => <button key={section.id} id={`${prefix}-tab-${section.id}`} type="button" role="tab"
        title={section.title} aria-selected={active === section.id} aria-controls={`${prefix}-panel-${section.id}`} tabIndex={active === section.id ? 0 : -1}
        onClick={() => setActive(section.id)} onKeyDown={(event) => {
          const count = config.sections.length;
          const next = event.key === 'ArrowRight' ? (index + 1) % count : event.key === 'ArrowLeft' ? (index + count - 1) % count : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
          if (next !== null) { event.preventDefault(); setActive(config.sections[next].id); document.getElementById(`${prefix}-tab-${config.sections[next].id}`)?.focus(); }
        }} className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${active === section.id ? 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'}`}>
        {section.tab}
      </button>)}
    </div>
    <section role="tabpanel" id={`${prefix}-panel-${active}`} aria-labelledby={`${prefix}-tab-${active}`}>
      {panel || <SheetApiStatus sheet={apiSheet} {...api}>{content(config.sections.find((section) => section.id === active))}</SheetApiStatus>}
    </section>
    {!panel && readOnlyControls}
  </div>;
  return <SheetApiStatus sheet={apiSheet} {...api}><div className="space-y-5 pb-3">{config.sections.map((section) => <section key={section.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <h2><button type="button" id={`${prefix}-heading-${section.id}`} aria-expanded={open[section.id]} aria-controls={`${prefix}-panel-${section.id}`}
      onClick={() => setOpen((previous) => ({ ...previous, [section.id]: !previous[section.id] }))}
      className="flex w-full items-center justify-between gap-3 p-5 text-left font-bold text-gray-900 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500">
      <span className="flex items-center gap-3">{section.title}</span>{open[section.id] ? <FiChevronUp /> : <FiChevronDown />}
    </button></h2>
    <div role="region" hidden={!open[section.id]} id={`${prefix}-panel-${section.id}`} aria-labelledby={`${prefix}-heading-${section.id}`} className="border-t border-gray-100">{open[section.id] && content(section)}</div>
  </section>)}</div></SheetApiStatus>;
}
