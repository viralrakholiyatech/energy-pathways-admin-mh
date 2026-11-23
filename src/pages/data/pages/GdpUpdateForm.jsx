import SheetLoadingCard from '../components/SheetLoadingCard';
import InputTable from "../components/WorkbookInputTable";
import { fetchGdpInputs } from "../api/gdpApi";
import { useEffect, useMemo, useState } from "react";
import { FiSave, FiRotateCcw, FiCheckCircle, FiAlertCircle, FiChevronDown, FiChevronUp } from "react-icons/fi";
import Swal from "sweetalert2";
import {
  GDP_PERIODS, GDP_YEARS, TELECOM_PERIODS, SCENARIOS, SECTIONS,
  GROWTH_ROWS, TRANSPORT_TABLES, BUILDING_TABLES, INDUSTRY_TABLES,
  INDUSTRY_REFERENCE_ROWS, TELECOM_ROWS, TELECOM_NOTE_ROWS, COOKING_TABLES, COOKING_HISTORY, UNLABELLED_REFERENCE_ROWS,
  GDP_FIELDS, GDP_FIELD_MAP, DRAFT_STORAGE_KEY,
  validateGdp, cookingShareCheck, pickGdpInputs, readGdpDraft
} from "../config/gdpDataConfig";

const titleCase = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const inputId = (key) => `gdp-${key}`;
const ENABLE_HIDDEN_WORKBOOK_ROWS = true;

function ShareStatus({ area, values, isEditable = () => true, columns = ["2021 baseline", "2050 target"] }) {
  return <div className="mt-3 space-y-1.5" aria-live="polite">
    {columns.map((label, column) => {
      if (area.rows.some((row) => row.cells[column] && !isEditable(row.cells[column]))) {
        return <p key={label} className="text-xs text-gray-500">{label}: Total includes calculated values not supplied by the API.</p>;
      }
      const check = cookingShareCheck(area, values, column);
      const Icon = check.valid ? FiCheckCircle : FiAlertCircle;
      return <p key={label} className={`flex items-start gap-2 text-xs ${check.valid ? "text-emerald-700" : "text-amber-700"}`}>
        <Icon className="mt-0.5 shrink-0" /><span>{label}: {check.message}</span>
      </p>;
    })}
  </div>;
}

function loadDraft() {
  try { return readGdpDraft(window.sessionStorage); } catch { return null; }
}

function ScenarioGroup({ scenario, children }) {
  return (
    <section className="space-y-4">
      <h3 className="border-b border-gray-200 pb-3 text-sm font-bold text-gray-800">
        {`Penetration of Cooking Technologies (${titleCase(scenario.id)} Growth Scenario)`}
      </h3>
      {children}
    </section>
  );
}

// Keep the full entry workflow available for later; the page currently displays data only.
export default function GdpUpdateForm({ displayOnly = true }) {
  const [localDraft, setLocalDraft] = useState(loadDraft);
  const [values, setValues] = useState({});
  const [savedValues, setSavedValues] = useState({});
  const [serverValues, setServerValues] = useState(null);
  const [metadata, setMetadata] = useState({});
  const [loadError, setLoadError] = useState('');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [openSections, setOpenSections] = useState(() => Object.fromEntries(SECTIONS.map((item) => [item.id, true])));
  const [touched, setTouched] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [notice, setNotice] = useState("");
  const [pendingFocus, setPendingFocus] = useState(null);
  const [showHiddenRows, setShowHiddenRows] = useState(true);
  const visibleScenarios = showHiddenRows ? SCENARIOS : SCENARIOS.slice(0, 2);
  const isEditable = useMemo(() => (field) => metadata[field.key]?.readOnly !== true
    && metadata[field.key]?.available !== false && metadata[field.key]?.sourceKind !== 'formula', [metadata]);
  const errors = useMemo(() => Object.fromEntries(Object.entries(validateGdp(values, undefined, isEditable))
    .filter(([key]) => ENABLE_HIDDEN_WORKBOOK_ROWS || !GDP_FIELD_MAP[key].hiddenInWorkbook)), [values, isEditable]);
  const changedFields = GDP_FIELDS.filter((item) => values[item.key] !== savedValues[item.key]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    setLoadError('');
    fetchGdpInputs(controller.signal).then((data) => {
      if (!active) return;
      setValues(data.values); setSavedValues(data.values); setServerValues(data.values); setMetadata(data.metadata);
    }).catch((error) => {
      if (active) setLoadError(error.name === 'AbortError' ? 'The GDP request timed out. Please try again.' : 'Could not load GDP data. Please try again.');
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [loadAttempt]);

  useEffect(() => {
    if (!changedFields.length) return undefined;
    const warnBeforeLeaving = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [changedFields.length]);

  useEffect(() => {
    if (!pendingFocus) return;
    const input = document.getElementById(inputId(pendingFocus));
    // Reference inputs may be inside a native disclosure. Open their ancestors
    // before moving focus so validation always takes the user to a visible field.
    for (let parent = input?.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === "DETAILS") parent.open = true;
    }
    input?.focus();
    input?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    setPendingFocus(null);
  }, [pendingFocus, openSections]);

  const form = {
    values, errors, isEditable, inputPlaceholder: '-', emptyLabel: '-', readOnly: displayOnly,
    hiddenMetadataColumns: displayOnly ? ['notes'] : [],
    readOnlyLabel: (field) => String(values[field.key] ?? '').trim() || '-',
    onChange: (key, value) => {
      setValues((previous) => ({ ...previous, [key]: value }));
      setNotice("");
    },
    onBlur: (key) => setTouched((previous) => ({ ...previous, [key]: true })),
    isErrorVisible: (definition) => touched[definition.key] || reviewed[definition.section]
  };

  const revealError = (key) => {
    if (ENABLE_HIDDEN_WORKBOOK_ROWS && GDP_FIELD_MAP[key].hiddenInWorkbook) setShowHiddenRows(true);
    setOpenSections((previous) => ({ ...previous, [GDP_FIELD_MAP[key].section]: true }));
    setPendingFocus(key);
  };

  const saveDraft = () => {
    setReviewed(Object.fromEntries(SECTIONS.map((item) => [item.id, true])));
    const errorKeys = Object.keys(errors);
    if (errorKeys.length) {
      setNotice("Review the highlighted inputs before saving the draft.");
      revealError(errorKeys[0]);
      return;
    }
    const nextSaved = pickGdpInputs(values);
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), values: pickGdpInputs(nextSaved) }));
      setSavedValues(nextSaved);
      setLocalDraft({ values: nextSaved });
      setNotice("GDP draft saved in this browser tab. It has not been published to the website.");
    } catch {
      setNotice("Draft could not be saved in this browser. Keep this tab open to retain your changes.");
    }
  };

  const replaceAllInputs = async (clear) => {
    const result = await Swal.fire({
      title: clear ? "Clear all GDP inputs?" : "Restore all GDP defaults?",
      text: clear ? "This clears the available GDP inputs, including collapsed sections."
        : "This restores the values last loaded from the GDP API, including collapsed sections.",
      icon: "warning", showCancelButton: true, confirmButtonText: clear ? "Clear all GDP inputs" : "Restore defaults",
      confirmButtonColor: clear ? "#dc2626" : "#2563eb"
    });
    if (!result.isConfirmed) return;
    setValues((previous) => Object.fromEntries(GDP_FIELDS.map((item) => [item.key,
      !isEditable(item) || (item.hiddenInWorkbook && !showHiddenRows) ? previous[item.key] : clear ? "" : serverValues[item.key]])));
    setTouched({});
    setReviewed({});
    setNotice(clear ? "GDP inputs cleared. Enter the replacement values before saving." : "Values from the GDP API restored. Save the draft to keep them.");
  };

  const setAllSections = (open) => setOpenSections(Object.fromEntries(SECTIONS.map((item) => [item.id, open])));

  if (loadError) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5">
    <p className="text-sm text-red-800">{loadError}</p>
    <button type="button" onClick={() => setLoadAttempt((value) => value + 1)} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">Retry loading GDP</button>
  </div>;
  if (!serverValues) return <SheetLoadingCard sheet="GDP" />;

  return (
    <div className="space-y-5 pb-3">
      <div hidden className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        {!displayOnly && <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">GDP assumptions &amp; data entry</h2>
            <p className="mt-1 text-xs text-gray-500">Enter data section by section. Open multiple sections together or collapse the ones you are not using.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">Data loaded from API</span>
            <button type="button" onClick={() => setAllSections(true)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Expand all</button>
            <button type="button" onClick={() => setAllSections(false)} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Collapse all</button>
          </div>
        </div>}
        {displayOnly && <span role="status" className="inline-block rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">Data loaded from API</span>}
        {ENABLE_HIDDEN_WORKBOOK_ROWS && <label className="mt-4 flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={showHiddenRows} onChange={(event) => setShowHiddenRows(event.target.checked)} />
          Show rows hidden in Excel
        </label>}
      </div>

      <div id="gdp-panel-growth">
        <InputTable title="GDP Growth Rate at Factor cost at real price" firstColumn="Trajectory"
          description={displayOnly ? undefined : "Enter growth rates in percent. For example, enter 6.97 for 6.97%."}
          metadataColumns={[{ key: "description", label: "Description" }]}
          columns={GDP_PERIODS} rows={visibleScenarios.map((scenario) => {
            const index = SCENARIOS.findIndex((s) => s.id === scenario.id);
            return {
              ...GROWTH_ROWS[index],
              label: String(scenario.number),
              description: `${titleCase(scenario.id)} Growth Scenario`
            };
          })} form={form} />
      </div>

      {/* {displayOnly && formulaOnlyTables('GDP', GDP_FIELDS, [0, 23]).map((table, index) => <InputTable key={'growth-formula-' + index} {...table} form={form} />)} */}
      <h2 className="text-base font-bold text-gray-900">Trajectory for Demand Activity</h2>
      {SECTIONS.filter((info) => info.id !== "growth").map((info, sectionIndex) => {
        const section = info.id;
        if (displayOnly && section === "telecom") return null;
        const open = openSections[section];
        const sectionErrors = Object.keys(errors).filter((key) => GDP_FIELD_MAP[key].section === section);
        const sectionChanges = changedFields.filter((item) => item.section === section).length;
        return (
          <section key={section} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-labelledby={"gdp-heading-" + section}>
            <h2>
              <button id={"gdp-heading-" + section} type="button" aria-expanded={open} aria-controls={"gdp-panel-" + section}
                onClick={() => setOpenSections((previous) => ({ ...previous, [section]: !previous[section] }))}
                className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:p-5">
                <span className="flex min-w-0 items-center gap-3"> 
                  <span>
                    <span className="block text-base font-bold text-gray-900">{sectionIndex + 1 + ". " + info.label}</span>
                    <span className="mt-1 block text-xs font-normal text-gray-500">{info.description}</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  {sectionChanges > 0 && <span className="hidden rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 sm:inline">{sectionChanges + " unsaved"}</span>}
                  {reviewed[section] && sectionErrors.length > 0 && <FiAlertCircle className="text-red-600" aria-label="Needs review" />}
                  {open ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
                </span>
              </button>
            </h2>

            <div id={"gdp-panel-" + section} role="region" aria-labelledby={"gdp-heading-" + section} hidden={!open}>
              {open && <div className="space-y-6 border-t border-gray-100 p-4 sm:p-6">
                {reviewed[section] && sectionErrors.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-800">{sectionErrors.length + " inputs need review in " + info.label.toLowerCase() + "."}</p>
                  <ul className="mt-2 space-y-1">
                    {sectionErrors.slice(0, 5).map((key) => <li key={key}><button type="button" onClick={() => revealError(key)} className="text-left text-xs text-red-700 underline underline-offset-2">{GDP_FIELD_MAP[key].label + ": " + errors[key]}</button></li>)}
                  </ul>
                  {sectionErrors.length > 5 && <p className="mt-2 text-xs text-red-700">Additional errors are marked beside their inputs.</p>}
                </div>}

                {section === "transport" && ["Passenger", "Freight"].map((name, index) => <section key={name} className="space-y-4" aria-label={`1.${index + 1} ${name} Transport`}>
                  <h3 className="border-b border-gray-200 pb-3 text-sm font-bold text-gray-800">{`1.${index + 1} ${name} Transport`}</h3>
                  {visibleScenarios.map((scenario) => <InputTable key={scenario.id}
                    title={`${name} Transport Demand — Scenario-${scenario.number}`}
                    metadataColumns={[{ key: 'gdpCagr', label: 'CAGR of GDP' }]}
                    columns={GDP_YEARS} rows={TRANSPORT_TABLES[scenario.id][index].rows.map((row, rowIndex) => ({
                      ...row, gdpCagr: rowIndex === 0 ? '-' : ''
                    }))} form={form} firstColumn="Level" />)}
                </section>)}

                {section === "buildings" && <>
                  {["2.1 Residential Floor space per capita", "2.2 Commercial floor space Demand/Capita"].map((title, index) => <InputTable key={title}
                    title={title} firstColumn="Trajectory" columns={GDP_YEARS} form={form}
                    metadataColumns={[{ key: "description", label: "Description" }]}
                    rows={visibleScenarios.map((scenario) => ({ ...BUILDING_TABLES[scenario.id][0].rows[index],
                      label: String(scenario.number), description: `${titleCase(scenario.id)} Growth Scenario`, unit: "sq.m/capita"
                    }))} />)}
                  <InputTable title="Ownership of Residential Lighting and Appliances" firstColumn="Trajectory" columns={GDP_YEARS} form={form}
                    metadataColumns={[{ key: "description", label: "Description" }, { key: "appliance", label: "Appliance" }]}
                    rows={visibleScenarios.flatMap((scenario) => BUILDING_TABLES[scenario.id][1].rows.map((row, index) => ({ ...row,
                      id: `${scenario.id}-${row.label}`, label: index === 0 ? String(scenario.number) : "",
                      description: index === 0 ? `${titleCase(scenario.id)} Growth Scenario` : "", appliance: row.label,
                      unit: "Millions"
                    })))} />
                </>}

                {section === "industry" && <>
                  {SCENARIOS.map((scenario) => {
                    const industry = INDUSTRY_TABLES[scenario.id];
                    const notes = [...industry.rates, ...industry.referenceRates].flatMap((row) => row.cells).filter((item) => item.source.startsWith("GDP!E"));
                    return <InputTable key={scenario.id} title={`Level ${scenario.number}`} columns={GDP_YEARS} form={form} firstColumn="Industry"
                      metadataColumns={[{ key: "notes", label: "Notes (%)" }]}
                      rows={industry.baselines.map((row, index) => ({ ...row,
                        notes: notes.find((item) => item.source === `GDP!E${137 + (scenario.number - 1) * 9 + index}`),
                        cells: [...row.cells, ...(index === 4 ? industry.paper[0].cells : Array(6).fill(null))]
                      }))} />;
                  })}
                  {!displayOnly && <details className="space-y-4 rounded-xl border border-gray-200 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700">Additional reference data and growth assumptions</summary>
                    {SCENARIOS.map((scenario) => <InputTable key={scenario.id} title={`Level ${scenario.number} — additional growth assumptions`}
                      columns={["Growth rate (%)"]} rows={INDUSTRY_TABLES[scenario.id].rates.filter((row) => !row.cells[0].source.startsWith("GDP!E"))} form={form} />)}
                    <InputTable title="Additional period reference rates" columns={["Growth rate (%)"]} rows={INDUSTRY_REFERENCE_ROWS} form={form} />
                    <InputTable title="Additional reference data" columns={["Value"]} rows={UNLABELLED_REFERENCE_ROWS.industry} form={form} firstColumn="Excel cell" />
                  </details>}
                </>}

                {section === "telecom" && <InputTable title="Growth rate of Base Transceiver Stations" columns={TELECOM_PERIODS} form={form} firstColumn="Level" showUnit={false}
                  description="Growth rates are in percent. Blank cells may be left empty, as in Excel."
                  metadataColumns={[{ key: "description", label: "Description" }, { key: "notes", label: "Notes" }]}
                  rows={SCENARIOS.map((scenario, index) => ({ ...TELECOM_ROWS[index], label: String(scenario.number),
                    description: `${titleCase(scenario.id)} Growth Scenario`, notes: TELECOM_NOTE_ROWS[index].cells[0]
                  }))} />}

                {section === "cooking" && <>
                  {!displayOnly && <p className="text-xs leading-relaxed text-gray-500">Enter fuel shares from 0–100%. Where PNG balances the baseline, enter the other fuels only. Targets must total 100%.</p>}
                  {SCENARIOS.map((scenario) => <ScenarioGroup key={scenario.id} scenario={scenario}>
                    {COOKING_TABLES[scenario.id].map((table) => <section key={table.trajectory} className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/40 p-4">
                      <h4 className="text-sm font-semibold text-gray-800">{"Trajectory " + table.trajectory}</h4>
                      <InputTable title={`Trajectory ${table.trajectory} — Cooking Technologies`} columns={GDP_YEARS} form={form} firstColumn="Type"
                        metadataColumns={[{ key: "fuel", label: "Description" }]}
                        rows={table.areas.flatMap((area) => area.rows.map((row, index) => ({ ...row,
                          id: `${area.area}-${row.label}`, label: index === 0 ? titleCase(area.area) : "", fuel: row.label,
                          cells: [row.cells[0], ...row.intermediate, row.cells[1]]
                        })))} />
                      {!displayOnly && <div className="grid gap-4 sm:grid-cols-2">
                        {table.areas.map((area) => <div key={area.area}>
                          <p className="text-xs font-semibold text-gray-700">{titleCase(area.area)}</p>
                          <ShareStatus area={area} values={values} isEditable={isEditable} />
                        </div>)}
                      </div>}
                    </section>)}
                  </ScenarioGroup>)}
                  {!displayOnly && <details open className="rounded-xl border border-gray-200 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700">Historical reference shares · 2016 and 2021</summary>
                    <p className="mb-4 mt-2 text-xs text-gray-500">Maintain the historical reference data separately from trajectory baselines. PNG is the remaining share.</p>
                    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
                      {COOKING_HISTORY.map((area) => <div key={area.area} className="min-w-0"><InputTable title={titleCase(area.area) + " historical shares"} columns={["2016", "2021"]} rows={area.rows} form={form} firstColumn="Fuel" /><ShareStatus area={area} values={values} isEditable={isEditable} columns={["2016", "2021"]} /></div>)}
                    </div>
                  </details>}
                </>}

                {section === "cooking" && !displayOnly && <InputTable
                  title="Additional reference data"
                  description="These numbers have no individual names in the workbook. Their Excel cell addresses identify them until their labels are confirmed. Keep the displayed units when editing."
                  columns={["Value"]} rows={UNLABELLED_REFERENCE_ROWS[section]} form={form} firstColumn="Excel cell"
                />}
              </div>}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-3 z-20 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">{changedFields.length ? changedFields.length + " unsaved changes in GDP" : "GDP inputs"}</p>
            <p className="mt-1 text-xs text-gray-500">{displayOnly ? 'Data entry is currently unavailable.' : 'Drafts stay in this browser tab. They do not update the live website.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {localDraft && !displayOnly && <button type="button" onClick={() => {
              setValues((previous) => Object.fromEntries(GDP_FIELDS.map((field) => [field.key,
                isEditable(field) && (showHiddenRows || !field.hiddenInWorkbook) ? localDraft.values[field.key] : previous[field.key]])));
              setNotice('Saved browser draft restored. API values remain available through Restore defaults.');
            }} className="rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-600">Restore saved draft</button>}
            <button type="button" disabled={displayOnly} onClick={() => replaceAllInputs(false)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"><FiRotateCcw aria-hidden="true" />Restore defaults</button>
            <button type="button" disabled={displayOnly} onClick={() => replaceAllInputs(true)} className="rounded-lg px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Clear fields</button>
            <button type="button" disabled={displayOnly} onClick={saveDraft} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><FiSave aria-hidden="true" />Save GDP draft</button>
          </div>
        </div>
        {notice && <p role="status" className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-700">{notice}</p>}
      </div>
    </div>
  );
}
