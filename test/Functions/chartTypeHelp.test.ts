import { describe, expect, it } from "vitest";
import chartTypeHelp from "../../src/Functions/chartTypeHelp";

describe("chartTypeHelp", () => {
  it("returns a Danish explanation for every selectable chart type", () => {
    ["run", "i", "ip", "i_m", "i_mm", "mr", "p", "pp", "u", "up", "c", "xbar", "s", "g", "t"]
      .forEach(type => expect(chartTypeHelp(type).length).toBeGreaterThan(30));
  });

  it("returns a useful fallback for an unknown chart type", () => {
    expect(chartTypeHelp("unknown")).toContain("Diagrammet viser målingerne over tid");
  });
});
