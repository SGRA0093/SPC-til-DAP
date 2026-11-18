import { defaultSettings } from "../src/settings";
import { testDom, createVisualHost } from "powerbi-visuals-utils-testutils";
import { Visual } from "../src/visual";
import buildDataView from "./helpers/buildDataView";
import { describe, it, expect } from "vitest";

// Skaleringsfaktoren trækker nedre grænse ud fra centerlinjen. Et lavt punkt
// og en høj median gav en akse ned til omkring -600, selvom ingen værdier er
// negative. Aksen skal stoppe ved 0, når intet er negativt.

// Værdier som i et dagligt tal med dyk i weekenden: median omkring 1400,
// laveste værdi 7.
const udeblivelser: number[] = [1527, 1381, 1457, 1211, 62, 46, 1502, 1472, 1760, 1398,
  1195, 50, 52, 1614, 1473, 1419, 1392, 1179, 62, 50, 1442, 1527, 1469, 1436, 1161,
  50, 46, 1496, 1489, 1441, 1516, 1256, 47, 7, 824, 822, 733];
const keys: string[] = udeblivelser.map((_, i) =>
  `2026-${String(Math.floor(i / 28) + 9).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`);

function yTicks(chartType: string, values: number[], tweak: (s: any) => void = () => undefined): number[] {
  const element = testDom("900", "500");
  const visual = new Visual({ element: element, host: createVisualHost({}) });
  const settings = JSON.parse(JSON.stringify(defaultSettings));
  settings.spc.chart_type = chartType;
  tweak(settings);

  visual.update({
    dataViews: [ buildDataView({
      key: values.map((_, i) => keys[i % keys.length]),
      numerators: values
    }, settings) ],
    viewport: { width: 900, height: 500 },
    type: 2 /*powerbi.VisualUpdateType.Data*/
  });

  const ticks: number[] = Array.from(element.querySelectorAll(".yaxisgroup .tick text"))
    .map(t => (t.textContent ?? "").replace(/\u2212/g, "-").replace(/\./g, "").replace(",", "."))
    .map(Number)
    .filter(Number.isFinite);
  element.remove();
  return ticks;
}

describe("Y-aksens nedre grænse", () => {
  it("går ikke under nul, når ingen værdier er negative", () => {
    const ticks = yTicks("run", udeblivelser);
    expect(ticks.length).toBeGreaterThan(1);
    expect(Math.min(...ticks)).toBe(0);
  });

  it("går ikke under nul, selv med en høj skaleringsfaktor", () => {
    const ticks = yTicks("run", udeblivelser, s => { s.y_axis.limit_multiplier = 3; });
    expect(Math.min(...ticks)).toBe(0);
  });

  it("holder aksen åben for en negativ kontrolgrænse, så grænselinjen ikke skæres væk", () => {
    // Værdierne er positive, men 3σ-grænsen under middelværdien er negativ.
    const ticks = yTicks("i", [1, 9, 2, 8, 1, 10, 2, 9, 1, 8, 2, 9, 1, 10]);
    expect(Math.min(...ticks)).toBeLessThan(0);
  });

  it("følger en eksplicit nedre grænse fra brugeren, også under nul", () => {
    const ticks = yTicks("run", udeblivelser, s => { s.y_axis.ylimit_l = -500; });
    expect(Math.min(...ticks)).toBeLessThan(0);
  });

  it("lader aksen følge negative værdier", () => {
    const ticks = yTicks("run", [-40, 20, -10, 35, -25, 30, -15, 25, -30, 10, -20, 15]);
    expect(Math.min(...ticks)).toBeLessThan(0);
  });
});
