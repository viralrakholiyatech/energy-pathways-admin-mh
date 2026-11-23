import withFormulaTables from '../utils/formulaTables';
import SheetLoadingCard from '../components/SheetLoadingCard';
import { useEffect, useMemo, useState } from "react";
import { FiSave, FiRotateCcw, FiAlertCircle, FiChevronUp, FiChevronDown } from "react-icons/fi";
import Swal from "sweetalert2";
import WorkbookInputTable from "../components/WorkbookInputTable";
import workbook from '../schemas/hydrocarbonWorkbookSchema.json';
import { workbookFirstColumn } from '../utils/workbookOrder';
import { fetchHydrocarbonInputs } from '../api/hydrocarbonApi';
import {
  HYDROCARBON_SECTIONS, HYDROCARBON_FIELDS, HYDROCARBON_FIELD_MAP,
  EMPTY_HYDROCARBON_VALUES, HYDROCARBON_DRAFT_KEY,
  validateHydrocarbon, pickHydrocarbonInputs, readHydrocarbonDraft
} from "../config/hydrocarbonDataConfig";

const allSections = (value) => Object.fromEntries(HYDROCARBON_SECTIONS.map(({ id }) => [id, value]));
function loadDraft() {
  try { return readHydrocarbonDraft(window.sessionStorage); } catch { return null; }
}

function WorkbookTable({ table, form }) {
  if (table.headingOnly) return <h3 className="text-sm font-semibold text-gray-900">{table.title}</h3>;
  const metadataColumns = table.trajectory ? [] : [...(table.metadataColumns || [])];
  if (table.trajectory) metadataColumns.push({ key: "description", label: "Description" });
  if (table.notes) metadataColumns.push({ key: "notes", label: "Notes" });
  if (table.delta) metadataColumns.push({ key: "delta", label: "Delta (decimal/year)" });
  const rows = table.trajectory ? table.rows.map((row) => ({ ...row, description: row.label, label: row.trajectory })) : table.rows;
  return <WorkbookInputTable title={table.title} description={table.description}
    columns={table.columns} rows={rows} form={form} metadataColumns={metadataColumns}
    firstColumn={table.firstColumn ?? (table.trajectory ? 'Trajectory' : '')}
    showUnit={table.showUnit !== false} emptyLabel="—" />;
}

function HydrocarbonDisplayTabs() {
  const [activeTab, setActiveTab] = useState('ia');
  const [tabValues, setTabValues] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    setTabValues(null); setError('');
    fetchHydrocarbonInputs(activeTab, controller.signal).then((data) => {
      if (active) setTabValues(data);
    }).catch(() => {
      if (active) setError(`Could not load I.${activeTab.slice(1)} data. Please try again.`);
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [activeTab, attempt]);
  const section = HYDROCARBON_SECTIONS.find(({ id }) => id === activeTab);
  const inputTables = section.tables.filter(table => !table.hidden).map(table => {
    const source = workbook.sections.find(item => item.id === activeTab)?.tables.find(item => item.id === table.id);
    const totals = (source?.rows || []).filter(row => row.label === 'Total')
      .map(row => ({ ...row, cells: table.columns.map(() => null), notes: null, delta: null }));
    return { ...table, firstColumn: workbookFirstColumn(section.sheet, table), rows: [...table.rows, ...totals].sort((a,b) => Number(a.id) - Number(b.id)) };
  });
  const displayTables = withFormulaTables(section.sheet, inputTables);
  const form = { values: tabValues || {},
    errors: {}, readOnly: true, inputPrefix: 'hydrocarbon', inputPlaceholder: '-', emptyLabel: '-',
    isErrorVisible: () => false, onChange: () => {}, onBlur: () => {} };
  const selectTab = (id) => { if (id !== activeTab) { setTabValues(null); setError(''); } setActiveTab(id); };
  return <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div role="tablist" aria-label="Section I sheets" className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2.5">
      {HYDROCARBON_SECTIONS.map((item, index) => {
        const selected = activeTab === item.id;
        return <button key={item.id} id={`hydrocarbon-tab-${item.id}`} type="button" role="tab" title={item.title}
        aria-selected={activeTab === item.id} aria-controls={`hydrocarbon-tabpanel-${item.id}`} tabIndex={activeTab === item.id ? 0 : -1}
        onClick={() => selectTab(item.id)} onKeyDown={(event) => {
          const next = event.key === 'ArrowRight' ? (index + 1) % 5 : event.key === 'ArrowLeft' ? (index + 4) % 5 : event.key === 'Home' ? 0 : event.key === 'End' ? 4 : null;
          if (next !== null) { event.preventDefault(); selectTab(HYDROCARBON_SECTIONS[next].id); document.getElementById(`hydrocarbon-tab-${HYDROCARBON_SECTIONS[next].id}`)?.focus(); }
        }} className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${selected ? 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'}`}>

        <span>{`I.${item.id.slice(1)}`}</span>
      </button>; })}
    </div>
    <section role="tabpanel" id={`hydrocarbon-tabpanel-${activeTab}`} aria-labelledby={`hydrocarbon-tab-${activeTab}`}
      className="space-y-6 p-4 sm:p-6">
      <h2 className="text-base font-bold text-gray-900">{section.title}</h2>
      {error ? <div role="alert" className="text-sm text-red-700">{error}
        <button type="button" onClick={() => setAttempt((value) => value + 1)} className="ml-3 underline">Retry</button>
      </div> : tabValues === null ? <SheetLoadingCard sheet={`I.${activeTab.slice(1)}`} />
        : displayTables.map((table, index) => <WorkbookTable key={table.id || `formula-${index}`} table={table} form={form} />)}
    </section>
  </div>;
}

export default function HydrocarbonUpdateForm({ displayOnly = true }) {
  const [initialDraft] = useState(() => displayOnly ? null : loadDraft());
  const [values, setValues] = useState({});
  const [savedValues, setSavedValues] = useState({});
  const [serverValues, setServerValues] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [openSections, setOpenSections] = useState(() => allSections(true));
  const [touched, setTouched] = useState({});
  const [reviewed, setReviewed] = useState(false);
  const [pendingFocus, setPendingFocus] = useState(null);
  const [notice, setNotice] = useState(initialDraft ? "Draft restored from this browser tab." : "");
  const errors = useMemo(() => validateHydrocarbon(values), [values]);
  const changedFields = HYDROCARBON_FIELDS.filter((field) => values[field.key] !== savedValues[field.key]);

  useEffect(() => {
    if (displayOnly) return undefined;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    setServerValues(null); setLoadError('');
    Promise.all(HYDROCARBON_SECTIONS.map(section => fetchHydrocarbonInputs(section.id, controller.signal)))
      .then(results => {
        if (!active) return;
        const loaded = Object.assign({}, EMPTY_HYDROCARBON_VALUES, ...results);
        setServerValues(loaded);
        setValues(initialDraft ? { ...loaded, ...initialDraft } : loaded);
        setSavedValues(initialDraft ? { ...loaded, ...initialDraft } : loaded);
      }).catch(() => {
        if (active) setLoadError('Could not load Section I data. Please try again.');
      }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [displayOnly, initialDraft, loadAttempt]);

  useEffect(() => {
    if (!changedFields.length) return undefined;
    const warnBeforeLeaving = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [changedFields.length]);

  useEffect(() => {
    if (!pendingFocus) return;
    const input = document.getElementById(`hydrocarbon-${pendingFocus}`);
    for (let parent = input?.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === "DETAILS") parent.open = true;
    }
    input?.focus();
    input?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    setPendingFocus(null);
  }, [pendingFocus, openSections]);

  const form = {
    values, errors, inputPrefix: "hydrocarbon", readOnly: displayOnly,
    onChange: (key, value) => { setValues((previous) => ({ ...previous, [key]: value })); setNotice(""); },
    onBlur: (key) => setTouched((previous) => ({ ...previous, [key]: true })),
    isErrorVisible: (field) => touched[field.key] || reviewed
  };
  const revealError = (key) => {
    setOpenSections((previous) => ({ ...previous, [HYDROCARBON_FIELD_MAP[key].section]: true }));
    setPendingFocus(key);
  };
  const saveDraft = () => {
    setReviewed(true);
    const errorKeys = Object.keys(errors);
    if (errorKeys.length) {
      setNotice("Review the highlighted inputs before saving the draft.");
      revealError(errorKeys[0]);
      return;
    }
    const nextSaved = pickHydrocarbonInputs(values);
    try {
      window.sessionStorage.setItem(HYDROCARBON_DRAFT_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), values: nextSaved }));
      setSavedValues(nextSaved);
      setNotice("Section I draft saved in this browser tab. It has not been published to the website.");
    } catch {
      setNotice("Draft could not be saved in this browser. Keep this tab open to retain your changes.");
    }
  };
  const replaceInputs = async (clear) => {
    const result = await Swal.fire({
      title: clear ? "Clear all Section I inputs?" : "Restore all Section I defaults?",
      text: clear ? "This clears the available Section I inputs, including collapsed sections."
        : "This restores the loaded database values for the available Section I inputs, including collapsed sections.",
      icon: "warning", showCancelButton: true,
      confirmButtonText: clear ? "Clear all Section I inputs" : "Restore defaults",
      confirmButtonColor: clear ? "#dc2626" : "#2563eb"
    });
    if (!result.isConfirmed) return;
    setValues((previous) => Object.fromEntries(HYDROCARBON_FIELDS.map((field) => [field.key,
      field.hidden ? previous[field.key] : clear ? "" : serverValues[field.key] ?? ""])));
    setTouched({}); setReviewed(false);
    setNotice(clear ? "Section I inputs cleared. Enter the replacement values before saving."
      : "Database values restored for Section I. Save the draft to keep them.");
  };

  if (displayOnly) return <HydrocarbonDisplayTabs />;
  if (loadError) return <div role="alert" className="text-sm text-red-700">{loadError}<button type="button" onClick={() => setLoadAttempt(value => value + 1)} className="ml-3 underline">Retry</button></div>;
  if (serverValues === null) return <SheetLoadingCard sheet="Section I" />;
  return <div className="space-y-5 pb-3">
    <div hidden className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Section I assumptions &amp; data entry</h2>
          <p className="mt-1 text-xs text-gray-500">Enter data section by section. Dashes mark calculated, linked, or blank cells with no input.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">22 October workbook</span>
          <button type="button" onClick={() => setOpenSections(allSections(true))} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Expand all</button>
          <button type="button" onClick={() => setOpenSections(allSections(false))} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Collapse all</button>
        </div>
      </div>
    </div>

    {HYDROCARBON_SECTIONS.map((section) => {
      const open = openSections[section.id];
      const sectionErrors = Object.keys(errors).filter((key) => HYDROCARBON_FIELD_MAP[key].section === section.id);
      const changes = changedFields.filter((field) => field.section === section.id).length;
      return <section key={section.id} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-labelledby={`hydrocarbon-heading-${section.id}`}>
        <h2>
          <button id={`hydrocarbon-heading-${section.id}`} type="button" aria-expanded={open} aria-controls={`hydrocarbon-panel-${section.id}`}
            onClick={() => setOpenSections((previous) => ({ ...previous, [section.id]: !previous[section.id] }))}
            className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:p-5">
            <span className="flex min-w-0 items-center gap-3">

              <span><span className="block text-base font-bold text-gray-900">{section.title}</span>
                <span className="mt-1 block text-xs font-normal text-gray-500">{section.sheet}</span></span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              {changes > 0 && <span className="hidden rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 sm:inline">{changes} unsaved</span>}
              {reviewed && sectionErrors.length > 0 && <FiAlertCircle className="text-red-600" aria-label="Needs review" />}
              {open ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
            </span>
          </button>
        </h2>
        <div id={`hydrocarbon-panel-${section.id}`} role="region" aria-labelledby={`hydrocarbon-heading-${section.id}`} hidden={!open}>
          {open && <div className="space-y-6 border-t border-gray-100 p-4 sm:p-6">
            {reviewed && sectionErrors.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">{sectionErrors.length} inputs need review.</p>
              <ul className="mt-2 space-y-1">{sectionErrors.slice(0, 5).map((key) => <li key={key}>
                <button type="button" onClick={() => revealError(key)} className="text-left text-xs text-red-700 underline underline-offset-2">{HYDROCARBON_FIELD_MAP[key].label}: {errors[key]}</button>
              </li>)}</ul>
            </div>}
            {section.tables.filter((table) => !table.hidden).map((table) => table.reference
              ? <details key={table.id} className="rounded-xl border border-gray-200 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700">{table.title}</summary>
                  <div className="mt-4"><WorkbookTable table={table} form={form} /></div>
                </details>
              : <WorkbookTable key={table.id} table={table} form={form} />)}
          </div>}
        </div>
      </section>;
    })}

    <div hidden={displayOnly} className="sticky bottom-3 z-20 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{changedFields.length ? `${changedFields.length} unsaved changes in Section I` : "Section I inputs"}</p>
          <p className="mt-1 text-xs text-gray-500">Drafts stay in this browser tab. They do not update the live website.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => replaceInputs(false)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50"><FiRotateCcw aria-hidden="true" />Restore defaults</button>
          <button type="button" onClick={() => replaceInputs(true)} className="rounded-lg px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50">Clear fields</button>
          <button type="button" onClick={saveDraft} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><FiSave aria-hidden="true" />Save Section I draft</button>
        </div>
      </div>
      {notice && <p role="status" className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-700">{notice}</p>}
    </div>
  </div>;
}
