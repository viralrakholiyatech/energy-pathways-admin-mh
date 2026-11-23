// APIs may report validation errors as a string, field map, or detail array.
export default function uploadError(result, status) {
  const describe = value => {
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.map(describe).filter(Boolean).join('; ');
    if (!value || typeof value !== 'object') return '';
    const message = value.msg || value.message;
    if (message) {
      const location = Array.isArray(value.loc) ? value.loc.filter(part=>part !== 'body').join('.') : '';
      return `${location ? location + ': ' : ''}${describe(message)}`;
    }
    return Object.entries(value).map(([key, entry]) => {
      const text = describe(entry);
      return text ? `${key}: ${text}` : '';
    }).filter(Boolean).join('; ');
  };
  const details = [result?.message, result?.messages, result?.detail, result?.errors, result?.error]
    .map(describe).filter(Boolean);
  for (const issue of result?.details?.issues || []) {
    const location = [issue.sheet, issue.address].filter(Boolean).join('!');
    const message = describe(issue.error || issue.message);
    if (message) details.push(`${location ? location + ': ' : ''}${message}`);
  }
  return [...new Set(details)].join('; ') || `Upload failed (HTTP ${status}). The server did not provide validation details.`;
}
