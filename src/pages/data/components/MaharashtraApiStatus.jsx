export default function MaharashtraApiStatus({ sheet, loading, error, retry }) {
  return <div aria-live="polite">
    {error ? <div role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
      {error} Workbook defaults are not shown.
      <button type="button" className="ml-3 underline" onClick={retry}>Retry loading {sheet}</button>
    </div> : <span role="status" className={"inline-block rounded-full border px-3 py-1.5 text-xs font-medium " +
      (loading ? "border-gray-200 bg-gray-50 text-gray-600" : "border-emerald-100 bg-emerald-50 text-emerald-700")}>
      {loading ? `Loading ${sheet} data from API...` : "Data loaded from API"}
    </span>}
  </div>;
}
