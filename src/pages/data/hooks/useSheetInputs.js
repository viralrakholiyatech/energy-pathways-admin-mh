import { useEffect, useState } from 'react';
import { fetchSheetInputs } from '../api/sheetInputsApi';

export default function useSheetInputs(sheet, fields) {
  const [result, setResult] = useState({ sheet: null, values: null, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!sheet) return undefined;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    setResult({ sheet, values: null, error: '' });
    fetchSheetInputs(sheet, fields, controller.signal).then((data) => {
      if (active) setResult({ sheet, values: data, error: '' });
    }).catch(() => {
      if (active) setResult({ sheet, values: null, error: `Could not load ${sheet} data. Please try again.` });
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [sheet, fields, attempt]);
  return { values: !sheet ? {} : result.sheet === sheet ? result.values : null,
    error: result.sheet === sheet ? result.error : '', retry: () => setAttempt((value) => value + 1) };
}
