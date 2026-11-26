import { useState } from "react";

const fieldSuffix = (definition) => definition.inputType === 'text' ? ''
  : definition.unit === '%' ? '%' : definition.displaySuffix || '';

function readOnlyValue(definition, form) {
  const value = form.readOnlyLabel?.(definition) || 'Calculated';
  return String(value).trim() !== '' && Number.isFinite(Number(value))
    ? `${value}${fieldSuffix(definition)}` : value;
}

export function NumericInput({ definition, value, error, onChange, onBlur, inputPrefix, placeholder, readOnly }) {
  const [focused, setFocused] = useState(false);
  const isText = definition.inputType === "text";
  const displayValue = !isText && !focused && !error && value.trim() !== "" && Number.isFinite(Number(value))
    ? String(Number(Number(value).toFixed(6))) : value;
  const id = `${inputPrefix}-${definition.key}`;
  const suffix = fieldSuffix(definition);
  return (
    <div className="min-w-[112px]">
      <div className="relative">
      <input
        id={id} name={definition.key} type="text" inputMode={isText ? "text" : "decimal"} autoComplete="off" readOnly={readOnly} disabled={readOnly}
        aria-label={`${definition.label} (${definition.unit})`} aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        value={displayValue} placeholder={placeholder ?? (definition.optional ? "Optional" : "Enter value")}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); if (!readOnly) onBlur(definition.key); }}
        onChange={(event) => { if (!readOnly) onChange(definition.key, event.target.value); }}
        className={`w-full rounded-lg border ${suffix ? 'pl-3 pr-8' : 'px-3'} py-2.5 text-sm outline-none transition focus:ring-2 ${isText ? "min-w-[240px] text-left" : "text-right tabular-nums"} ${error
          ? "border-red-300 bg-red-50 text-red-800 focus:border-red-400 focus:ring-red-100"
          : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 focus:border-blue-500 focus:ring-blue-100"}`}
      />
      {suffix && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">{suffix}</span>}
      </div>
      {error && <p id={`${id}-error`} className="mt-1 max-w-[220px] text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function WorkbookInputTable({ title, description, columns, rows, form, firstColumn = "", emptyLabel = "Calculated", metadataColumns = [], showUnit = true, headingOnly = false, includeChosen = false }) {
  if (headingOnly) return <h3 className="text-sm font-semibold text-gray-900">{title}</h3>;
  const isChosen = value => typeof value === 'string' && /\bchosen\b/i.test(value);
  const visibleRows = includeChosen ? rows : rows.filter(row => !row.chosen && ![row.label, row.description, row.trajectory].some(isChosen));
  if ((!includeChosen && isChosen(title)) || visibleRows.length === 0) return null;
  const visibleMetadataColumns = metadataColumns.filter((column) => !form.hiddenMetadataColumns?.includes(column.key));
  const renderInput = (definition) => form.isEditable && !form.isEditable(definition)
    ? <span className="block py-2.5 text-right text-xs text-gray-400">{readOnlyValue(definition, form)}</span>
    : <NumericInput
    definition={definition} value={form.values[definition.key] ?? ""}
    error={form.isErrorVisible(definition) ? form.errors[definition.key] : ""}
    onChange={form.onChange} onBlur={form.onBlur} inputPrefix={form.inputPrefix || "gdp"} placeholder={form.inputPlaceholder} readOnly={form.readOnly}
  />;
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500">
              <th scope="col" className="min-w-[155px] px-4 py-3 font-medium">{firstColumn === 'Input' ? '' : firstColumn}</th>
              {visibleMetadataColumns.map((column) => <th scope="col" key={column.key} className="px-3 py-3 font-medium">{column.label}</th>)}
              {showUnit && <th scope="col" className="px-3 py-3 font-medium">Units</th>}
              {columns.map((column, index) => <th scope="col" key={index} className="min-w-[136px] px-3 py-3 text-right font-medium">{column}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleRows.map((row, rowIndex) => {
              const grouped = row.groupRows === true || /^Trajectory\s+\d+$/i.test(row.label);
              const continuation = grouped && visibleRows[rowIndex - 1]?.label === row.label;
              let span = 1;
              if (grouped && !continuation) while (visibleRows[rowIndex + span]?.label === row.label) span++;
              const total = [row.label, row.description].some(value => typeof value === 'string' && /^total$/i.test(value.trim()));
              return (
              <tr key={row.id || row.label} className="hover:bg-slate-50/50">
                {!continuation && <th scope={span > 1 ? 'rowgroup' : 'row'} rowSpan={span} className="px-4 py-3 align-middle text-sm font-medium text-gray-700">{row.label}</th>}
                {visibleMetadataColumns.map((column) => <td key={column.key} className="px-3 py-2.5 align-middle">
                  {row[column.key]?.key ? renderInput(row[column.key]) : <span className="whitespace-nowrap text-xs text-gray-600">{row[column.key]}</span>}
                </td>)}
                {showUnit && <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500">{row.unit}</td>}
                {row.cells.map((definition, index) => (
                  <td key={index} className="px-3 py-2.5 align-middle">
                    {definition && !total ? renderInput(definition) : <span className="block py-2.5 text-right text-xs text-gray-400">{total ? '-' : form.emptyLabel ?? emptyLabel}</span>}
                  </td>
                ))}
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

