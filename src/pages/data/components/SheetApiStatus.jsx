import SheetLoadingCard from './SheetLoadingCard';

export default function SheetApiStatus({ sheet, values, error, retry, children }) {
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">
    {error}<button type="button" onClick={retry} className="ml-3 underline">Retry</button>
  </div>;
  if (values === null) return <SheetLoadingCard sheet={sheet} />;
  return children;
}
