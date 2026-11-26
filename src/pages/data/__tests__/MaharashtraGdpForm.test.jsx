import { act } from "react";
import { createRoot } from "react-dom/client";
import MaharashtraGdpForm from "../pages/MaharashtraGdpForm";
import { fetchMaharashtraGdpInputs } from "../api/gdpApi";

jest.mock("../api/gdpApi", () => ({ fetchMaharashtraGdpInputs: jest.fn() }));

test("shows dashes until Maharashtra GDP values are returned by the API", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  let resolveInputs;
  fetchMaharashtraGdpInputs.mockReturnValue(new Promise(resolve => {
    resolveInputs = resolve;
  }));
  const container = document.createElement("div");
  const root = createRoot(container);

  try {
    await act(async () => root.render(<MaharashtraGdpForm />));
    const field = container.querySelector('input[name="F16"]');
    expect(field).not.toBeNull();
    expect(field.value).toBe("");
    expect(field.placeholder).toBe("-");

    await act(async () => resolveInputs({ F16: "10" }));
    expect(field.value).toBe("10");
    expect(container.textContent).toContain("Data loaded from API");
  } finally {
    act(() => root.unmount());
  }
});
