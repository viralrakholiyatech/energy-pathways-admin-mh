import { useState } from 'react';
import MaharashtraSectionI from './MaharashtraSectionI';

const sectionSheets = { V: ['V.a', 'V.b', 'V.c'], X: ['X.a', 'X.b'], XII: ['XII.a', 'XII.b'], XV: ['XV.a', 'XV.b', 'XV.c'], XVII: ['XVII.a', 'XVII.b'] };

export default function MaharashtraSheetTabs({ section, selectedTab, onSelectTab }) {
  const sheets = sectionSheets[section];
  const [localTab, setLocalTab] = useState(sheets[0]);
  const activeTab = selectedTab ?? localTab;
  const setActiveTab = onSelectTab ?? setLocalTab;
  return <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div role="tablist" aria-label={"Section " + section + " sheets"} className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2.5">
      {sheets.map((item, index) => {
        const selected = activeTab === item;
        return <button key={item} id={'mh-tab-' + item} type="button" role="tab"
          aria-selected={selected} aria-controls={'mh-panel-' + item} tabIndex={selected ? 0 : -1}
          onClick={() => setActiveTab(item)} onKeyDown={(event) => {
            const count = sheets.length;
            const next = event.key === 'ArrowRight' ? (index + 1) % count : event.key === 'ArrowLeft' ? (index + count - 1) % count : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : null;
            if (next !== null) { event.preventDefault(); setActiveTab(sheets[next]); document.getElementById('mh-tab-' + sheets[next])?.focus(); }
          }}
          className={'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ' + (selected ? 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50')}>
          <span>{item}</span>
        </button>;
      })}
    </div>
    <section role="tabpanel" id={'mh-panel-' + activeTab} aria-labelledby={'mh-tab-' + activeTab} className="space-y-6 p-4 sm:p-6">
      <MaharashtraSectionI key={activeTab} section={activeTab} />
    </section>
  </div>;
}
