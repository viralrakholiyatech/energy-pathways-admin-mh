export default function EmptySheetPage({ sheet }) {
  return <section className="rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="text-base font-semibold text-gray-900">{sheet}</h2>
    <p className="mt-2 text-sm text-gray-500">No worksheet available.</p>
  </section>;
}
