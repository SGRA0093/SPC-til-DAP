import { describe, it, expect } from "vitest";
import * as d3 from "../src/D3 Plotting Functions/D3 Modules";
import drawErrors from "../src/D3 Plotting Functions/drawErrors";
import pbiviz from "../pbiviz.json";

// Indledningen over en fejlbesked på lærredet. Den interne fejl er en fejl i
// visualen, så den skal sige, hvor den rapporteres — det samme sted som
// support-linket i About-fanen.

function preamble(type: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  document.body.appendChild(svg);
  const palette: any = { foregroundColour: "#000000" };
  drawErrors(d3.select(svg) as any, { viewport: { width: 400, height: 300 } } as any, palette, "detalje", type);
  const text: string = svg.querySelector(".errormessage text")?.textContent ?? "";
  svg.remove();
  return text;
}

describe("Fejlbeskedernes indledning", () => {
  it("er på dansk", () => {
    expect(preamble("internal")).toMatch(/^Intern fejl\./);
    expect(preamble("settings")).toBe("Ugyldige indstillinger for alle observationer. Første fejl:");
  });

  it("peger den interne fejl på samme sted som About-fanens support-link", () => {
    const supportUrl: string = (pbiviz as any).visual.supportUrl;
    expect(supportUrl).toBe("https://github.com/johanreventlow/SPC-til-DAP/issues");
    expect(preamble("internal")).toContain(supportUrl.replace("https://", ""));
  });

  it("peger About-fanens GitHub-link på det offentlige repo", () => {
    expect((pbiviz as any).visual.gitHubUrl).toBe("https://github.com/johanreventlow/SPC-til-DAP");
  });
});
