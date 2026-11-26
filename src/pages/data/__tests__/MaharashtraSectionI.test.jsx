import { act } from "react";
import { createRoot } from "react-dom/client";
import MaharashtraSectionI from "../pages/MaharashtraSectionI";

jest.mock("../../../utils/auth", () => ({ getToken: () => "session-token" }));

test("loads I.a values from its sheet API when Section I opens", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ sheet: "I.a", values: { F41: 0.123 } })
  }).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ sheet: "I.b", values: { D16: { value: 12.5 }, note: { source: "workbook" } } })
  }).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ sheet: "I.c", values: { F34: 13.5 } })
  });
  const container = document.createElement("div");
  const root = createRoot(container);

  try {
    await act(async () => root.render(<MaharashtraSectionI section="I" />));
    expect(fetch).toHaveBeenCalledWith("/api/admin/sheets/I.a", expect.objectContaining({
      method: "GET",
      headers: { Accept: "application/json", Authorization: "Bearer session-token" }
    }));
    expect(container.querySelector('input[name="I.a!F41"]').value).toBe("12.3");
    expect(container.textContent).toContain("Data loaded from API");

    await act(async () => container.querySelector('[id="tab-I.b"]').click());
    expect(fetch).toHaveBeenLastCalledWith("/api/admin/sheets/I.b", expect.objectContaining({
      method: "GET",
      headers: { Accept: "application/json", Authorization: "Bearer session-token" }
    }));
    expect(container.querySelector('input[name="I.b!D16"]').value).toBe("12.5");
    expect(container.textContent).toContain("Data loaded from API");

    await act(async () => container.querySelector('[id="tab-I.c"]').click());
    expect(fetch).toHaveBeenLastCalledWith("/api/admin/sheets/I.c", expect.objectContaining({
      method: "GET",
      headers: { Accept: "application/json", Authorization: "Bearer session-token" }
    }));
    expect(container.querySelector('input[name="I.c!F34"]').value).toBe("13.5");
  } finally {
    act(() => root.unmount());
    delete global.fetch;
  }
});

test("loads Section III values from its API when the page opens", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ sheet: "III", values: { D31: 4321 } })
  });
  const container = document.createElement("div");
  const root = createRoot(container);

  try {
    await act(async () => root.render(<MaharashtraSectionI section="III" />));
    expect(fetch).toHaveBeenCalledWith("/api/admin/sheets/III", expect.objectContaining({
      method: "GET",
      headers: { Accept: "application/json", Authorization: "Bearer session-token" }
    }));
    expect(container.querySelector('input[name="III!D31"]').value).toBe("4321");
    expect(container.textContent).toContain("Data loaded from API");
  } finally {
    act(() => root.unmount());
    delete global.fetch;
  }
});

test("loads IV.a values from its API when the tab opens", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ sheet: "IV.a", values: { D20: 456 } })
  });
  const container = document.createElement("div");
  const root = createRoot(container);

  try {
    await act(async () => root.render(<MaharashtraSectionI section="IV" />));
    expect(fetch).toHaveBeenCalledWith("/api/admin/sheets/IV.a", expect.objectContaining({
      method: "GET",
      headers: { Accept: "application/json", Authorization: "Bearer session-token" }
    }));
    expect(container.querySelector('input[name="IV.a!D20"]').value).toBe("456");
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ sheet: "IV.b", values: { D20: 789 } }) });
    await act(async () => Array.from(container.querySelectorAll('[role="tab"]')).find(el => el.textContent === "IV.b").click());
    expect(fetch).toHaveBeenLastCalledWith("/api/admin/sheets/IV.b", expect.objectContaining({
      method: "GET", headers: { Accept: "application/json", Authorization: "Bearer session-token" }
    }));
    expect(container.querySelector('input[name="IV.b!D20"]').value).toBe("789");
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ sheet: "IV.c.1", values: { D20: 321 } }) });
    await act(async () => Array.from(container.querySelectorAll('[role="tab"]')).find(el => el.textContent === "IV.c.1").click());
    expect(fetch).toHaveBeenLastCalledWith("/api/admin/sheets/IV.c1", expect.objectContaining({
      method: "GET", headers: { Accept: "application/json", Authorization: "Bearer session-token" }
    }));
    expect(container.querySelector('input[name="IV.c.1!D20"]').value).toBe("321");
    expect(container.textContent).toContain("Data loaded from API");
  } finally {
    act(() => root.unmount());
    delete global.fetch;
  }
});
