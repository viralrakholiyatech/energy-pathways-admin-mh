import { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import Swal from "sweetalert2";
import HydrocarbonUpdateForm from "../pages/HydrocarbonUpdateForm";
import { fetchHydrocarbonInputs } from '../api/hydrocarbonApi';
jest.mock('../api/hydrocarbonApi', () => ({ fetchHydrocarbonInputs: jest.fn() }));
import { HYDROCARBON_FIELDS, HYDROCARBON_DRAFT_KEY } from "../config/hydrocarbonDataConfig";
import { DRAFT_STORAGE_KEY as GDP_DRAFT_KEY } from "../config/gdpDataConfig";

jest.mock("sweetalert2", () => ({ fire: jest.fn() }));
import { HYDROCARBON_API_VALUES } from '../../../testFixtures/sheetValues';
let container, root;
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.clear();
  fetchHydrocarbonInputs.mockReset();
  fetchHydrocarbonInputs.mockResolvedValue(HYDROCARBON_API_VALUES);
  Swal.fire.mockResolvedValue({ isConfirmed: true });
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<HydrocarbonUpdateForm displayOnly={false} />));
});
afterEach(() => { act(() => root.unmount()); fetchHydrocarbonInputs.mockClear(); container.remove(); });
const field = (key) => container.querySelector(`input[name="${key}"]`);

test('technology trajectories use the Excel heading and keep totals inside each table', async () => {
  act(() => root.unmount()); fetchHydrocarbonInputs.mockClear();
  root = createRoot(container);
  await act(async () => root.render(<HydrocarbonUpdateForm />));
  await act(async () => container.querySelector('#hydrocarbon-tab-ib').click());
  for (const trajectory of ['A', 'B', 'C', 'D']) {
    const table = [...container.querySelectorAll('table')].find(table => table.querySelector('caption').textContent === `Technology penetrations — Trajectory ${trajectory}`);
    expect(table).toBeDefined();
    expect(table.querySelector('thead th').textContent).toBe('Technology');
    expect([...table.querySelectorAll('tbody th')].map(cell=>cell.textContent)).toEqual(['SubC', 'SC', 'USC', 'IGCC', 'Total']);
    expect([...table.querySelectorAll('tbody tr:last-child td')].slice(1).every(cell=>cell.textContent.trim()==='-')).toBe(true);
    expect([...container.querySelectorAll('caption')].some(c=>c.textContent===`Trajectory ${trajectory}`)).toBe(false);
  }
  expect([...container.querySelectorAll('thead th')].some(cell=>cell.textContent==='Input')).toBe(false);
  const costTables = [...container.querySelectorAll('table')].filter(table => table.querySelector('caption').textContent.startsWith('Capital cost of a 1 GW coal Thermal Power Plant'));
  expect(costTables).toHaveLength(3);
  expect(costTables.map(table => table.querySelector('caption').textContent)).toEqual(
    ['Low Estimates', 'Point Estimates', 'High Estimates'].map(estimate => `Capital cost of a 1 GW coal Thermal Power Plant — ${estimate}`)
  );
  costTables.forEach(table => {
    expect(table.querySelectorAll('thead th')).toHaveLength(9);
    expect(table.querySelector('tbody tr:last-child th').textContent).toBe('Total');
    expect([...table.querySelectorAll('tbody tr:last-child td')].slice(1).every(cell => cell.textContent.trim() === '-')).toBe(true);
  });
  expect([...container.querySelectorAll('caption')].some(c => c.textContent === 'Cost assumptions')).toBe(false);
  expect([...container.querySelectorAll('h3')].some(h => h.textContent === 'Cost assumptions')).toBe(true);
  expect(container.textContent).toContain('Subcritical (SubC) (current State)');
  expect(container.textContent).toContain('Integrated Gasification Combined Cycle (IGCC)');
  const operatingTables = [...container.querySelectorAll('caption')].filter(c => c.textContent.startsWith('Operational cost of a 1GW'));
  expect(operatingTables.map(c => c.textContent.split(' — ').pop())).toEqual(['Low Estimates', 'Point Estimates', 'High Estimates']);

});

test('CCS tables have distinct titles and separate workbook text columns', async () => {
  act(() => root.unmount()); fetchHydrocarbonInputs.mockClear(); root = createRoot(container);
  await act(async () => root.render(<HydrocarbonUpdateForm />));
  await act(async () => container.querySelector('#hydrocarbon-tab-ic').click());
  const tables = [...container.querySelectorAll('table')];
  const named = title => tables.filter(t=>t.querySelector('caption').textContent===title);
  expect(named('Split between type of CCS plant')).toHaveLength(1);
  expect(named('CCS Installed Capacity, Gross (GW)')).toHaveLength(1);
  for (const title of ['Split between type of CCS plant','CCS Installed Capacity, Gross (GW)']) {
    const table = named(title)[0];
    expect([...table.querySelectorAll('thead th')].slice(0,2).map(c=>c.textContent)).toEqual(['Fuel','Plant Type']);
    expect(table.querySelector('tbody th').textContent).toBe('Coal');
    expect(table.querySelector('tbody td').textContent).toBe('Post');
  }
  for (const [title, heading, code, description] of [
    ['Information summary','Information type','B.01','Land Area available'],
    ['Costs of this physical change','Name','C1.Low','Low estimate of capital costs']
  ]) {
    const table = named(title)[0];
    expect([...table.querySelectorAll('thead th')].slice(0,2).map(c=>c.textContent)).toEqual(['Vector',heading]);
    expect(table.querySelector('tbody th').textContent).toBe(code);
    expect(table.querySelector('tbody td').textContent).toBe(description);
  }
});

test('I.d preserves blank greenhouse-gas rows and keeps output costs in one table', async () => {
  act(() => root.unmount()); fetchHydrocarbonInputs.mockClear(); root = createRoot(container);
  await act(async () => root.render(<HydrocarbonUpdateForm />));
  await act(async () => container.querySelector('#hydrocarbon-tab-id').click());
  const tables = [...container.querySelectorAll('table')];
  const named = title => tables.filter(t=>t.querySelector('caption').textContent===title);
  expect(named('Greenhouse gases')).toHaveLength(1);
  const gases = named('Greenhouse gases')[0];
  expect([...gases.querySelectorAll('thead th')].slice(0,2).map(c=>c.textContent)).toEqual(['GHG','IPCC Sector']);
  expect([...gases.querySelectorAll('tbody th')].map(c=>c.textContent)).toEqual(['CO2','CH4','N2O','Total']);
  expect(gases.querySelectorAll('input')).toHaveLength(0);
  expect(named('Costs of this physical change')).toHaveLength(1);
  expect(named('Costs of this physical change')[0].querySelectorAll('tbody tr')).toHaveLength(6);
  expect(named('Solidfueled unabated generation')[0].querySelectorAll('tbody tr')).toHaveLength(2);
  ['N2O','C2.low','C2.point','C2.high'].forEach(title=>expect(named(title)).toHaveLength(0));
});

test('default I.a tab loads API values, hides actions and prevents editing', async () => {
  act(() => root.unmount()); fetchHydrocarbonInputs.mockClear();
  root = createRoot(container);
  await act(async () => root.render(<HydrocarbonUpdateForm />));
  ['Restore defaults', 'Clear fields', 'Save Section I draft'].forEach((label) => {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent === label);
    expect(button).toBeUndefined();
  });
  expect([...container.querySelectorAll('input')].every((input) => input.readOnly)).toBe(true);
  const original = field('ia_H70').value;
  change('ia_H70', '999');
  expect(field('ia_H70').value).toBe(original);
  expect(sessionStorage.getItem(HYDROCARBON_DRAFT_KEY)).toBeNull();
  expect(fetchHydrocarbonInputs).toHaveBeenCalledTimes(1);
  expect(container.querySelector('[role="tab"][aria-selected="true"]').textContent).toBe('I.a');
  expect(field('ia_H69').value).toBe('58.326');
  expect(field('ia_H71').placeholder).toBe('-');
  expect(field('ia_H71').value).toBe('1');
  expect(field('ia_H72').value).toBe('0');
  expect(field('ib_G19')).toBeNull();
  await act(async () => container.querySelector('#hydrocarbon-tab-ib').click());
  expect(field('ia_H69')).toBeNull();
  expect(fetchHydrocarbonInputs).toHaveBeenCalledTimes(2);
  await act(async () => container.querySelector('#hydrocarbon-tab-ia').click());
  expect(fetchHydrocarbonInputs).toHaveBeenCalledTimes(3);
  expect(field('ia_H69').value).toBe('58.326');
});

test('I.a API failure offers retry without showing workbook fallback', async () => {
  act(() => root.unmount()); fetchHydrocarbonInputs.mockClear(); root = createRoot(container);
  fetchHydrocarbonInputs.mockRejectedValueOnce(new Error('offline'));
  await act(async () => root.render(<HydrocarbonUpdateForm />));
  expect(container.querySelector('[role="alert"]').textContent).toContain('Could not load I.a');
  expect(field('ia_H69')).toBeNull();
  await act(async () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'Retry').click());
  expect(field('ia_H69').value).toBe('58.326');
});
function click(text) {
  const button = [...container.querySelectorAll("button")].find((button) => button.textContent === text);
  expect(button).toBeDefined(); act(() => button.click());
}

test('every tab fetches its own data and late responses cannot replace the selected tab', async () => {
  act(() => root.unmount()); fetchHydrocarbonInputs.mockClear(); root = createRoot(container);
  await act(async () => root.render(<HydrocarbonUpdateForm />));
  let resolveOld;
  fetchHydrocarbonInputs.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  act(() => container.querySelector('#hydrocarbon-tab-ib').click());
  const oldSignal = fetchHydrocarbonInputs.mock.calls[1][1];
  expect(container.querySelector('[role="status"]').textContent).toContain('I.b');
  for (const section of ['ic', 'id', 'ie']) {
    const visible = HYDROCARBON_FIELDS.filter((item) => item.section === section && !item.hidden);
    fetchHydrocarbonInputs.mockResolvedValueOnce(Object.fromEntries(visible.map((item) => [item.key, '12.5'])));
    await act(async () => container.querySelector(`#hydrocarbon-tab-${section}`).click());
    expect(fetchHydrocarbonInputs.mock.calls.at(-1)[0]).toBe(section);
    expect(field(visible[0].key).value).toBe('12.5');
  }
  expect(oldSignal.aborted).toBe(true);
  await act(async () => resolveOld({ ib_F61: '999' }));
  expect(field('ie_G19').value).toBe('12.5');
  expect(field('ib_F61')).toBeNull();
});
function change(key, value) { act(() => Simulate.change(field(key), { target: { value } })); }
function toggle(section) { act(() => container.querySelector(`#hydrocarbon-heading-${section}`).click()); }

test("five ordered accordions render every visible input once, with one global action bar", () => {
  expect([...container.querySelectorAll('button[aria-expanded]')].map((button) => button.id)).toEqual(['ia','ib','ic','id','ie'].map((id) => `hydrocarbon-heading-${id}`));
  const visible = HYDROCARBON_FIELDS.filter((field) => !field.hidden);
  const inputs = [...container.querySelectorAll('input')];
  expect(inputs.map((input) => input.name).sort()).toEqual(visible.map((field) => field.key).sort());
  expect(new Set(inputs.map((input) => input.id)).size).toBe(visible.length);
  expect(container.querySelector('input[type="checkbox"]')).toBeNull();
  const intro = [...container.querySelectorAll('h2')].find((heading) => heading.textContent === 'Section I assumptions & data entry');
  expect(intro.closest('[hidden]')).not.toBeNull();
  ['Restore defaults','Clear fields','Save Section I draft'].forEach((label) => {
    const buttons = [...container.querySelectorAll('button')].filter((button) => button.textContent === label);
    expect(buttons).toHaveLength(1); expect(buttons[0].closest('[role="region"]')).toBeNull();
  });
  expect(field('ia_H70')).not.toBeNull();
  expect([...container.querySelectorAll('#hydrocarbon-panel-ia caption')].map((caption) => caption.textContent)).toEqual(['Conversion efficiency of combined cycle gas turbine']);
  expect(container.querySelectorAll('#hydrocarbon-panel-ia input')).toHaveLength(4);
  expect(field('ia_N60')).toBeNull();
  expect(field('ia_G36')).toBeNull();
  expect(field('ia_M46')).toBeNull();
  visible.forEach((field) => expect(field.kind).toBe('manual'));
  expect(field('ic_F67')).not.toBeNull();
  expect(field('ia_I70')).toBeNull();
  expect(field('ic_H60')).toBeNull();
  click('Collapse all'); expect(container.querySelectorAll('input')).toHaveLength(0);
  click('Expand all'); expect(container.querySelectorAll('input')).toHaveLength(visible.length);
});

test("edits persist across accordions and remounts, with a draft separate from GDP", async () => {
  sessionStorage.setItem(GDP_DRAFT_KEY, 'existing GDP draft');
  change('ia_H70','20'); change('ie_G19','3');
  toggle('ia'); toggle('ia'); expect(field('ia_H70').value).toBe('20');
  click('Save Section I draft');
  expect(sessionStorage.getItem(GDP_DRAFT_KEY)).toBe('existing GDP draft');
  const saved = JSON.parse(sessionStorage.getItem(HYDROCARBON_DRAFT_KEY)).values;
  expect(saved.ia_H70).toBe('20'); expect(saved.ie_G19).toBe('3');
  expect(Object.keys(saved)).toHaveLength(HYDROCARBON_FIELDS.length);
  act(() => root.unmount()); fetchHydrocarbonInputs.mockClear(); root = createRoot(container);
  await act(async () => root.render(<HydrocarbonUpdateForm displayOnly={false} />));
  expect(field('ia_H70').value).toBe('20');
});

test('the editor waits for every API sheet and offers retry without a local fallback', async () => {
  act(() => root.unmount()); root = createRoot(container);
  sessionStorage.setItem(HYDROCARBON_DRAFT_KEY, JSON.stringify({ version: 1, values: { ia_H70: '999' } }));
  let rejectRequest;
  fetchHydrocarbonInputs.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectRequest = reject; }));
  await act(async () => root.render(<HydrocarbonUpdateForm displayOnly={false} />));
  expect(container.querySelector('[role="status"]').textContent).toContain('Loading');
  expect(field('ia_H70')).toBeNull();
  await act(async () => rejectRequest(new Error('offline')));
  expect(container.querySelector('[role="alert"]').textContent).toContain('Could not load Section I');
  expect(field('ia_H70')).toBeNull();
  await act(async () => container.querySelector('[role="alert"] button').click());
  expect(field('ia_H70').value).toBe('999');
  expect(field('ie_G19').value).toBe(HYDROCARBON_API_VALUES.ie_G19);
});

test("invalid shares block saving and reveal the relevant collapsed accordion", () => {
  change('ic_D43','90'); toggle('ic');
  click('Save Section I draft');
  expect(sessionStorage.getItem(HYDROCARBON_DRAFT_KEY)).toBeNull();
  expect(field('ic_D43').getAttribute('aria-invalid')).toBe('true');
  expect(document.activeElement).toBe(field('ic_D43'));
  expect(container.textContent).toContain('90%');
});

test("global clear and restore include collapsed sections while retaining hidden values", async () => {
  change('ia_H70','20'); toggle('ia');
  await act(async () => { click('Clear fields'); }); toggle('ia');
  expect([...container.querySelectorAll('input')].every((input) => input.value === '')).toBe(true);
  await act(async () => { click('Restore defaults'); });
  click('Save Section I draft');
  expect(JSON.parse(sessionStorage.getItem(HYDROCARBON_DRAFT_KEY)).values).toEqual(HYDROCARBON_API_VALUES);
  Swal.fire.mockResolvedValueOnce({isConfirmed:false});
  await act(async () => { click('Clear fields'); });
  expect(field('ie_G19').value).toBe('2');
});

test("storage failure does not falsely report a saved draft", () => {
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('Storage unavailable'); });
  click('Save Section I draft');
  expect(container.textContent).toContain('Draft could not be saved');
  setItem.mockRestore();
});
