import useSheetInputs from '../hooks/useSheetInputs';
import SheetApiStatus from '../components/SheetApiStatus';
import withFormulaTables from '../utils/formulaTables';
import { useMemo, useState } from 'react';
import WorkbookInputTable from '../components/WorkbookInputTable';
import { RENEWABLE_FIELDS, RENEWABLE_SECTIONS } from '../config/renewableDataConfig';

export default function RenewableUpdateForm() {
  const [activeTab, setActiveTab] = useState('iva');
  const section = RENEWABLE_SECTIONS.find(({ id }) => id === activeTab);
  const fields = useMemo(() => RENEWABLE_FIELDS.filter(f => f.source.split('!')[0] === section.sheet), [section.sheet]);
  const api = useSheetInputs(section.sheet, fields);
  const form = { values: api.values || {}, errors: {}, readOnly: true, inputPrefix: 'renewable',
    inputPlaceholder: '-', emptyLabel: '-', isErrorVisible: () => false, onChange: () => {}, onBlur: () => {} };
  return <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div role="tablist" aria-label="Section IV sheets" className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2.5">
      {RENEWABLE_SECTIONS.map((item, index) => {
        const selected = activeTab === item.id;
        return <button key={item.id} id={'renewable-tab-' + item.id} type="button" role="tab" title={item.title}
          aria-selected={selected} aria-controls={'renewable-panel-' + item.id} tabIndex={selected ? 0 : -1}
          onClick={() => setActiveTab(item.id)} onKeyDown={(event) => {
            const count = RENEWABLE_SECTIONS.length;
            const next = event.key === 'ArrowRight' ? (index + 1) % count : event.key === 'ArrowLeft' ? (index + count - 1) % count : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
            if (next !== null) { event.preventDefault(); setActiveTab(RENEWABLE_SECTIONS[next].id); document.getElementById('renewable-tab-' + RENEWABLE_SECTIONS[next].id)?.focus(); }
          }}
          className={'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ' + (selected ? 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50')}>
          <span>{item.tab}</span>
        </button>;
      })}
    </div>
    <section role="tabpanel" id={'renewable-panel-' + activeTab} aria-labelledby={'renewable-tab-' + activeTab} className="space-y-6 p-4 sm:p-6">
      <h2 className="text-base font-bold text-gray-900">{section.tab} {section.title}</h2>
      <SheetApiStatus sheet={section.sheet} {...api}>
      {withFormulaTables(section.sheet, section.tables).map((table, index) => {
        if (section.id === 'iva' && table.startRow === 37) {
          // Excel repeats trajectory 2 at row 39; this is the third trajectory.
          table = { ...table, rows: table.rows.map(row => row.id === '39' ? { ...row, label: 'Trajectory 3' } : row) };
        }
        if (section.id === 'iva' && table.title === 'Capacity Utilisation Factors') {
          // F65:F68 are formula cells already represented by null (dash) values.
          table = { ...table, columns: table.columns.map((column, index) => index === 0 ? 'CAGR' : column) };
        }
        return <WorkbookInputTable key={table.title + index} {...table} form={form} />;
      })}
      </SheetApiStatus>
    </section>
  </div>;
}
