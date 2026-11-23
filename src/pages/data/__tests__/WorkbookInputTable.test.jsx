import { act } from 'react';
import { createRoot } from 'react-dom/client';
import WorkbookInputTable from '../components/WorkbookInputTable';

test('percentage suffixes stay separate from numeric values in display and edit modes', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  const onChange = jest.fn();
  const definitions = [
    { key: 'share', unit: '%', label: 'Share' },
    { key: 'growth', unit: '%', label: 'Growth', displaySuffix: '%' },
    { key: 'zero', unit: '%', label: 'Zero' },
    { key: 'capacity', unit: 'GW', label: 'Capacity' },
    null
  ];
  const form = { values: { share: '87.213289', growth: '-0.425278', zero: '0', capacity: '5' },
    errors: {}, emptyLabel: '-', isErrorVisible: () => false, onChange, onBlur: jest.fn() };
  try {
    for (const readOnly of [true, false]) {
      act(() => root.render(<WorkbookInputTable title="Shares" columns={['Share', 'Growth', 'Zero', 'Capacity', 'Formula']}
        rows={[{ label: 'Level 1', cells: definitions }]} form={{ ...form, readOnly }} />));
      expect([...container.querySelectorAll('input')].map(input => input.value)).toEqual(['87.213289', '-0.425278', '0', '5']);
      expect([...container.querySelectorAll('span[aria-hidden="true"]')].map(span => span.textContent)).toEqual(['%', '%', '%']);
      expect(container.querySelector('tbody td:last-child').textContent).toBe('-');
    }
    const input = container.querySelector('input');
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '25');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('share', '25');
  } finally { act(() => root.unmount()); }
});

test('hides chosen rows and complete chosen tables while keeping scenario rows', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  const root = createRoot(container);
  const form = { values: {}, errors: {}, emptyLabel: '-', readOnly: true };
  const row = label => ({ label, unit: '%', cells: [null] });
  try {
    act(() => root.render(<WorkbookInputTable title="Demand" columns={['2021']} rows={[
      row('Level 1'), row('Chosen'), row('Chosen PLF'), row('Level 2'), row('Efficiency: Chosen')
    ]} form={form} />));
    expect([...container.querySelectorAll('tbody th')].map(cell => cell.textContent)).toEqual(['Level 1', 'Level 2']);
    act(() => root.render(<WorkbookInputTable title="Chosen Scenario" columns={['2021']} rows={[row('Level 1')]} form={form} />));
    expect(container.innerHTML).toBe('');
    act(() => root.render(<WorkbookInputTable title="Demand" columns={['2021']} rows={[row('Chosen')]} form={form} />));
    expect(container.innerHTML).toBe('');
  } finally { act(() => root.unmount()); }
});

test('groups consecutive trajectories and displays totals as formula dashes', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const rows = ['Utility', 'Captive', 'Total'].map((description,index) => ({
    id: String(index), label: 'Trajectory 1', description, unit: 'GW',
    cells: description === 'Total' ? [{ key: 'total' }] : [null]
  }));
  try {
    act(() => root.render(<WorkbookInputTable title="Capacity" columns={['2021']} rows={rows}
      metadataColumns={[{ key: 'description', label: 'Description' }]}
      form={{ values: { total: '999' }, errors: {}, emptyLabel: '-', readOnly: true }} />));
    expect(container.querySelectorAll('tbody th')).toHaveLength(1);
    expect(container.querySelector('tbody th').rowSpan).toBe(3);
    expect(container.querySelector('tbody tr:last-child td:last-child').textContent).toBe('-');
    expect(container.querySelector('input')).toBeNull();
  } finally { act(() => root.unmount()); }
});
