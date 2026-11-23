import { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import Swal from "sweetalert2";
import GdpUpdateForm from "../pages/GdpUpdateForm";
import { fetchGdpInputs } from "../api/gdpApi";
jest.mock("../api/gdpApi", () => ({ fetchGdpInputs: jest.fn() }));
import { DRAFT_STORAGE_KEY, GDP_FIELDS, SECTIONS } from "../config/gdpDataConfig";

jest.mock("sweetalert2", () => ({ fire: jest.fn() }));
import { GDP_API_VALUES } from '../../../testFixtures/sheetValues';
let container;
let root;
beforeEach(async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  sessionStorage.clear();
  fetchGdpInputs.mockReset();
  fetchGdpInputs.mockResolvedValue({ values: { ...GDP_API_VALUES }, metadata: {} });
  Swal.fire.mockResolvedValue({ isConfirmed: true });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<GdpUpdateForm displayOnly={false} />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const field = (name) => container.querySelector(`input[name="${name}"]`);
const panel = (section) => container.querySelector(`#gdp-panel-${section}`);
function toggle(section) {
  act(() => container.querySelector(`#gdp-heading-${section}`).click());
}
function click(text, scope = container) {
  const button = [...scope.querySelectorAll("button")].find((item) => item.textContent === text);
  expect(button).toBeDefined();
  act(() => button.click());
}
function change(name, value) {
  const input = field(name);
  expect(input).not.toBeNull();
  act(() => Simulate.change(input, { target: { value } }));
}

const accordions = SECTIONS.filter(({ id }) => id !== "growth");
const inputs = () => [...container.querySelectorAll("input[name]")];

test('default display view shows disabled draft controls while hiding entry sections and the top card', async () => {
  act(() => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(<GdpUpdateForm />));
  for (const text of ['GDP assumptions & data entry', 'Enter data section by section', 'Expand all', 'Collapse all',
    'Drafts stay in this browser tab',
    'Additional reference data', 'Historical reference shares', '4. Telecom']) {
    expect(container.textContent).not.toContain(text);
  }
  expect(container.textContent).toContain('GDP inputs');
  expect(container.textContent).toContain('Data entry is currently unavailable.');
  for (const text of ['Restore defaults', 'Clear fields', 'Save GDP draft']) {
    const button = [...container.querySelectorAll('button')].find(item => item.textContent === text);
    expect(button).toBeDefined();
    expect(button.disabled).toBe(true);
  }
  expect(container.textContent).toContain('Data loaded from API');
  const checkbox = container.querySelector('input[type="checkbox"]');
  expect(checkbox.checked).toBe(true);
  expect(checkbox.closest('[hidden]')).not.toBeNull();
  expect(container.querySelector('[role="status"]').closest('[hidden]')).not.toBeNull();
  expect(panel('telecom')).toBeNull();
  expect([...container.querySelectorAll('th')].some((header) => header.textContent.startsWith('Notes'))).toBe(false);
  expect(inputs().length).toBeGreaterThan(0);
  expect(inputs().every((input) => input.readOnly)).toBe(true);
  expect(field('growth_low_val_2021-25')).not.toBeNull();
  const original = field('growth_high_val_2021-25').value;
  change('growth_high_val_2021-25', '999');
  expect(field('growth_high_val_2021-25').value).toBe(original);
  act(() => checkbox.click());
  expect(field('growth_low_val_2021-25')).toBeNull();
  expect(field('growth_high_val_2021-25').value).toBe(original);
  expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
});

test("matches Excel's visible scenarios, subsection order and single Telecom table", () => {
  expect(container.textContent).toContain("GDP Growth Rate at Factor cost at real price");
  expect(panel("growth").querySelectorAll("input")).toHaveLength(18);
  expect(inputs()).toHaveLength(GDP_FIELDS.length);
  expect([...container.querySelectorAll('button[aria-expanded]')].map((button) => button.id)).toEqual([
    "gdp-heading-transport", "gdp-heading-buildings", "gdp-heading-industry", "gdp-heading-telecom", "gdp-heading-cooking"
  ]);
  expect([...panel("transport").querySelectorAll("caption")].map((caption) => caption.textContent)).toEqual([
    "Passenger Transport Demand — Scenario-1", "Passenger Transport Demand — Scenario-2", "Passenger Transport Demand — Scenario-3",
    "Freight Transport Demand — Scenario-1", "Freight Transport Demand — Scenario-2", "Freight Transport Demand — Scenario-3"
  ]);
  expect([...panel("transport").querySelectorAll("section[aria-label]")].map((section) => section.getAttribute("aria-label"))).toEqual(["1.1 Passenger Transport", "1.2 Freight Transport"]);
  expect(panel("buildings").querySelectorAll("table")).toHaveLength(3);
  const industryTables = [...panel("industry").querySelectorAll("table")].filter((table) => !table.closest("details"));
  expect(industryTables.map((table) => table.querySelector("caption").textContent)).toEqual(["Level 1", "Level 2", "Level 3"]);
  industryTables.forEach((table) => expect(table.querySelectorAll("tbody tr")).toHaveLength(8));
  expect(panel("telecom").querySelectorAll("table")).toHaveLength(1);
  expect(field("telecom_high_note").closest("tr")).toBe(field("telecom_high_2015-2030").closest("tr"));
  expect(field("ind_l1_rate_fertilizer").closest("tr")).toBe(field("ind_l1_fertilizer_2021").closest("tr"));
  expect(field("ind_l1_paper_2025").closest("tr")).toBe(field("ind_l1_paper_2021").closest("tr"));
  expect(field("cook_high_t1_rural_Kerosene_2025").closest("tr")).toBe(field("cook_high_t1_rural_Kerosene_2050").closest("tr"));
  expect(container.querySelectorAll("button[aria-pressed]")).toHaveLength(0);
  accordions.forEach(({ id }) => expect(container.querySelector(`#gdp-heading-${id}`).getAttribute("aria-expanded")).toBe("true"));
  expect(field("growth_low_val_2045-50")).not.toBeNull();
  expect(container.textContent).toContain("Drafts stay in this browser tab");
  ["Restore defaults", "Clear fields", "Save GDP draft"].forEach((label) => {
    expect([...container.querySelectorAll("button")].filter((button) => button.textContent === label)).toHaveLength(1);
    SECTIONS.forEach(({ id }) => expect([...panel(id).querySelectorAll("button")].some((button) => button.textContent === label)).toBe(false));
  });
  expect(container.textContent).not.toContain("Save section draft");
  expect(field("reference_A144").value).toBe("1000");
  expect(field("reference_V206").value).toBe("82.8");
  expect(field("cook_high_t3_rural_Coal_2045").value).toBe("1.2");
  expect(field("ind_l2_reference_aluminium")).not.toBeNull();
  expect(container.textContent).toContain("Show rows hidden in Excel");
  expect(container.querySelector('input[type="checkbox"]').checked).toBe(true);
  expect(new Set(inputs().map((input) => input.id)).size).toBe(inputs().length);
  click("Collapse all");
  expect(inputs()).toHaveLength(18);
  accordions.forEach(({ id }) => expect(panel(id).hidden).toBe(true));
  click("Expand all");
  expect(inputs()).toHaveLength(GDP_FIELDS.length);
});

test("invalid numeric text stays visible and cannot be saved", () => {
  change("growth_high_val_2021-25", "0x10");
  act(() => Simulate.blur(field("growth_high_val_2021-25")));
  expect(field("growth_high_val_2021-25").value).toBe("0x10");
  click("Save GDP draft");
  expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  expect(field("growth_high_val_2021-25").getAttribute("aria-invalid")).toBe("true");
});

test("independent accordions preserve edits and the whole-page draft saves all fields", async () => {
  change("growth_high_val_2021-25", "7.5");
  change("passenger_sc1_l1_2021", "450");
  expect(field("passenger_sc2_l1_2021")).not.toBeNull();
  toggle("transport");
  expect(field("passenger_sc1_l1_2021")).toBeNull();
  expect(field("growth_high_val_2021-25").value).toBe("7.5");
  toggle("transport");
  expect(field("passenger_sc1_l1_2021").value).toBe("450");
  change("telecom_high_note", "Keep 001 as the client reference");
  change("reference_O182", "75");
  click("Save GDP draft");
  const saved = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY));
  expect(saved.values['growth_high_val_2021-25']).toBe("7.5");
  expect(saved.values.passenger_sc1_l1_2021).toBe("450");
  expect(saved.values.telecom_high_note).toBe("Keep 001 as the client reference");
  expect(saved.values.reference_O182).toBe("75");
  expect(container.textContent).toContain("has not been published");
  act(() => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(<GdpUpdateForm displayOnly={false} />));
  click("Restore saved draft");
  expect(field("growth_high_val_2021-25").value).toBe("7.5");
  expect(field("passenger_sc1_l1_2021").value).toBe("450");
  expect(field("telecom_high_note").value).toBe("Keep 001 as the client reference");
  expect(field("reference_O182").value).toBe("75");
});

test("calculated industry and cooking projections have no editable fields", () => {
  expect(field("ind_l1_rate_cement")).not.toBeNull();
  expect(field("ind_l1_cement_2025")).toBeNull();
  expect(field("ind_l1_paper_2025")).not.toBeNull();
  expect(field("cook_high_t1_urban_LPG_2050").value).toBe("64");
  expect(field("cook_high_t1_urban_LPG_2025")).toBeNull();
  expect(field("cook_high_t1_urban_PNG_2021")).toBeNull();
  expect(field("cook_high_t1_rural_Kerosene_2025")).not.toBeNull();
});

test("an invalid fuel total blocks saving and opens its collapsed accordion", () => {
  change("cook_high_t1_urban_LPG_2050", "65");
  toggle("cooking");
  expect(field("cook_high_t1_urban_LPG_2050")).toBeNull();
  click("Save GDP draft");
  expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(field("cook_high_t1_urban_LPG_2050").getAttribute("aria-invalid")).toBe("true");
  expect(panel("cooking").hidden).toBe(false);
  expect(document.activeElement).toBe(field("cook_high_t1_urban_LPG_2050"));
  expect(container.textContent).toContain("101%");
});

test("global clear and restore apply to all sections, including collapsed sections", async () => {
  change("growth_high_val_2021-25", "8");
  change("telecom_high_2015-2030", "3");
  toggle("transport");
  await act(async () => { click("Clear fields"); });
  expect(field("telecom_high_2015-2030").value).toBe("");
  expect(field("growth_high_val_2021-25").value).toBe("");
  toggle("transport");
  expect(inputs().every((input) => input.value === "")).toBe(true);
  await act(async () => { click("Restore defaults"); });
  expect(field("passenger_sc1_l1_2021").value).toBe("409");
  expect(field("reference_O182").value).toBe("70");
  expect(field("cook_high_t3_rural_Coal_2045").value).toBe("1.2");
  expect(field("telecom_high_2015-2030").value).toBe("");
  click("Save GDP draft");
  expect(sessionStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
  const saved = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY));
  GDP_FIELDS.filter((item) => item.hiddenInWorkbook).forEach((item) => expect(saved.values[item.key]).toBe(GDP_API_VALUES[item.key]));
});

test("API values take priority over old browser drafts, including hidden fields", async () => {
  act(() => root.unmount());
  sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ version: 1, values: {
    ...GDP_API_VALUES, passenger_sc3_l1_2021: "460", 'growth_low_val_2021-25': ""
  } }));
  root = createRoot(container);
  await act(async () => root.render(<GdpUpdateForm displayOnly={false} />));
  change("growth_high_val_2021-25", "8");
  click("Save GDP draft");
  const saved = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)).values;
  expect(saved.passenger_sc3_l1_2021).toBe(GDP_API_VALUES.passenger_sc3_l1_2021);
  expect(saved['growth_low_val_2021-25']).toBe(GDP_API_VALUES['growth_low_val_2021-25']);
  expect(saved['growth_high_val_2021-25']).toBe("8");
  expect(field("growth_low_val_2021-25")).not.toBeNull();
  expect(field("passenger_sc3_l1_2021")).not.toBeNull();
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

test("cancelling a global clear preserves every input", async () => {
  change("growth_high_val_2021-25", "8");
  Swal.fire.mockResolvedValueOnce({ isConfirmed: false });
  await act(async () => { click("Clear fields"); });
  expect(field("growth_high_val_2021-25").value).toBe("8");
  expect(field("reference_A144").value).toBe("1000");
});

test("API data drives displayed values and reset, while formula and unavailable cells stay non-editable", async () => {
  act(() => root.unmount());
  const apiValues = { ...GDP_API_VALUES, 'growth_high_val_2021-25': '9.5', passenger_sc1_l1_2021: '',
    ind_l1_textile_2021: '', cook_high_t1_rural_Biomass_2021: '', telecom_high_note: '' };
  fetchGdpInputs.mockResolvedValueOnce({ values: apiValues, metadata: {
    ind_l1_textile_2021: { sourceKind: 'formula', readOnly: true, available: false },
    cook_high_t1_rural_Biomass_2021: { sourceKind: 'formula', readOnly: true, available: false },
    telecom_high_note: { sourceKind: 'missing', readOnly: true, available: false }
  } });
  root = createRoot(container);
  await act(async () => root.render(<GdpUpdateForm displayOnly={false} />));
  expect(field('growth_high_val_2021-25').value).toBe('9.5');
  expect(field('passenger_sc1_l1_2021').value).toBe('');
  expect(field('passenger_sc1_l1_2021').placeholder).toBe('-');
  expect(field('ind_l1_textile_2021')).toBeNull();
  expect(field('telecom_high_note')).toBeNull();
  expect(container.textContent).not.toContain('Unavailable');
  const textileRow = [...panel('industry').querySelectorAll('tbody tr')].find((row) => row.querySelector('th')?.textContent === 'Textile');
  expect(textileRow.querySelectorAll('td')[2].textContent).toBe('-');
  change('growth_high_val_2021-25', '8');
  await act(async () => { click('Restore defaults'); });
  expect(field('growth_high_val_2021-25').value).toBe('9.5');
  change('passenger_sc1_l1_2021', '450');
  click('Save GDP draft');
  expect(JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)).values.ind_l1_textile_2021).toBe('');
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

test('hidden rows start visible, toggle without losing edits, and reopen on validation errors', () => {
  const checkbox = container.querySelector('input[type="checkbox"]');
  expect(checkbox.checked).toBe(true);
  expect(field('bldg_res_low_2021')).not.toBeNull();
  expect(field('app_low_lighting_2021')).not.toBeNull();
  change('passenger_sc3_l1_2021', '460');
  act(() => checkbox.click());
  expect(field('passenger_sc3_l1_2021')).toBeNull();
  expect(field('growth_low_val_2021-25')).toBeNull();
  act(() => checkbox.click());
  expect(field('passenger_sc3_l1_2021').value).toBe('460');
  click('Save GDP draft');
  expect(JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY)).values.passenger_sc3_l1_2021).toBe('460');
  change('growth_low_val_2021-25', 'invalid');
  act(() => checkbox.click());
  click('Save GDP draft');
  expect(checkbox.checked).toBe(true);
  expect(document.activeElement).toBe(field('growth_low_val_2021-25'));
});

test("loading errors do not display stale workbook defaults and can be retried", async () => {
  act(() => root.unmount());
  let rejectRequest;
  fetchGdpInputs.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectRequest = reject; }));
  root = createRoot(container);
  await act(async () => root.render(<GdpUpdateForm displayOnly={false} />));
  expect(container.textContent).toContain('Loading GDP data from API');
  expect(container.querySelectorAll('input')).toHaveLength(0);
  await act(async () => rejectRequest(new Error('Network unavailable')));
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(container.querySelectorAll('input')).toHaveLength(0);
  await act(async () => { click('Retry loading GDP'); });
  expect(field('growth_high_val_2021-25')).not.toBeNull();
  expect(container.textContent).toContain('Data loaded from API');
});
