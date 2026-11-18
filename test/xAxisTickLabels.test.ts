import { defaultSettings } from "../src/settings";
import { testDom, createVisualHost } from "powerbi-visuals-utils-testutils";
import { Visual } from "../src/visual";
import buildDataView from "./helpers/buildDataView";
import { describe, it, expect } from "vitest";

// Uroterede aksemærke-etiketter kan ikke vige for hinanden, så de, der ville
// overlappe, skjules. Datoetiketter er den tætte sag; korte tal er den frie.

const numerators: number[] = [50, 52, 48, 51, 49, 53, 47, 50, 52, 48, 51, 49,
                              68, 50, 52, 48, 51, 49, 53, 47];
const dateKeys: string[] = numerators.map((_, i) => `2024-${String((i % 12) + 1).padStart(2, "0")}-01`);
const shortKeys: string[] = numerators.map((_, i) => String(i + 1));

function render(keys: any[], width: number, overrides: (s: any) => void = () => undefined) {
  const element = testDom(String(width), "400");
  const visual = new Visual({ element: element, host: createVisualHost({}) });
  const settings = JSON.parse(JSON.stringify(defaultSettings));
  settings.spc.chart_type = "i";
  overrides(settings);

  const values: number[] = keys.map((_, index) => numerators[index % numerators.length]);
  const update = () => visual.update({
    dataViews: [ buildDataView({ key: keys, numerators: values }, settings) ],
    viewport: { width: width, height: 400 },
    type: 2 /*powerbi.VisualUpdateType.Data*/
  });
  update();
  return { element, settings, update };
}

function labels(element: HTMLElement) {
  const all = Array.from(element.querySelectorAll<SVGGraphicsElement>(".xaxisgroup .tick text"));
  const withText = all.filter(l => (l.textContent ?? "") !== "");
  return {
    all: all,
    shown: withText.filter(l => l.style.display !== "none"),
    hidden: withText.filter(l => l.style.display === "none")
  };
}

function overlaps(shown: SVGGraphicsElement[]): boolean {
  for (let i = 1; i < shown.length; i++) {
    if (shown[i].getBoundingClientRect().left < shown[i - 1].getBoundingClientRect().right) {
      return true;
    }
  }
  return false;
}

describe("Uroterede aksemærke-etiketter", () => {
  it("skjuler datoetiketter, der ville overlappe", () => {
    const { element } = render(dateKeys, 600);
    const { shown, hidden } = labels(element);
    expect(hidden.length).toBeGreaterThan(0);
    expect(shown.length).toBeGreaterThan(1);
    expect(overlaps(shown)).toBe(false);
    element.remove();
  });

  it("beholder alle korte etiketter, der er plads til", () => {
    const { element } = render(shortKeys, 600);
    const { shown, hidden } = labels(element);
    expect(hidden.length).toBe(0);
    expect(shown.length).toBeGreaterThan(1);
    element.remove();
  });

  it("viser færre etiketter, når aksen bliver smallere", () => {
    const smal = render(dateKeys, 250);
    const bred = render(dateKeys, 900);
    expect(labels(smal.element).shown.length).toBeLessThan(labels(bred.element).shown.length);
    // Aksen må ikke ende uden etiketter, uanset hvor smal den bliver.
    expect(labels(smal.element).shown.length).toBeGreaterThan(0);
    smal.element.remove();
    bred.element.remove();
  });

  it("viser en skjult etiket igen, når rotationen slås til", () => {
    const { element, settings, update } = render(dateKeys, 600);
    expect(labels(element).hidden.length).toBeGreaterThan(0);

    // Samme visual, ny optegning: en etiket, der vigede, må ikke blive væk,
    // fordi den var skjult sidst.
    settings.x_axis.xlimit_tick_rotation = -35;
    update();
    expect(labels(element).hidden.length).toBe(0);
    element.remove();
  });
});


describe("Datoakse med måned- og årsniveau", () => {
  it("roterer datoer lodret, når de ikke kan stå ved siden af hinanden", () => {
    const dates: Date[] = Array.from({ length: 40 }, (_, index) =>
      new Date(2026, 8, index + 1));
    const { element } = render(dates, 1100, settings => {
      settings.x_axis.xlimit_tick_count = 40;
    });

    const dateLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    ));
    const shownDateLabels = dateLabels.filter(label =>
      label.textContent !== "" && label.style.display !== "none");
    expect(shownDateLabels.length).toBe(40);
    expect(shownDateLabels[0].textContent).toBe("01-09-2026");
    expect(shownDateLabels[0].getAttribute("transform")).toBe("rotate(-90)");

    const monthLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .month-label"
    ));
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));
    expect(monthLabels.map(label => label.textContent)).toContain("september");
    expect(monthLabels.map(label => label.textContent)).toContain("october");
    expect(yearLabels.map(label => label.textContent)).toContain("2026");
    element.remove();
  });

  it("respekterer Maks. antal mærker på datoaksen", () => {
    const dates: Date[] = Array.from({ length: 40 }, (_, index) =>
      new Date(2026, 8, index + 1));
    const { element } = render(dates, 1100, settings => {
      settings.x_axis.xlimit_tick_count = 6;
    });

    const shownDateLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "" && label.style.display !== "none");

    expect(shownDateLabels).toHaveLength(6);
    expect(shownDateLabels[0].textContent).toBe("01-09-2026");
    expect(shownDateLabels[shownDateLabels.length - 1].textContent).toBe("10-10-2026");

    // Måned/år-inddelingen skal fortsat bruge hele perioden, selvom kun seks
    // datoetiketter er synlige.
    const monthLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .month-label"
    ));
    expect(monthLabels.map(label => label.textContent)).toContain("september");
    expect(monthLabels.map(label => label.textContent)).toContain("october");
    element.remove();
  });

  it("viser altid datoer lodret, også når der er plads til at lægge dem vandret", () => {
    const dates: Date[] = Array.from({ length: 8 }, (_, index) =>
      new Date(2026, 8, index + 1));
    const { element } = render(dates, 1200);

    const shownDateLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "" && label.style.display !== "none");

    expect(shownDateLabels.length).toBe(8);
    expect(shownDateLabels.every(label => label.getAttribute("transform") === "rotate(-90)")).toBe(true);
    element.remove();
  });

  it("respekterer en eksplicit rotation fra brugeren på datoaksen", () => {
    const dates: Date[] = Array.from({ length: 8 }, (_, index) =>
      new Date(2026, 8, index + 1));
    const { element } = render(dates, 1200, settings => {
      settings.x_axis.xlimit_tick_rotation = -45;
    });

    const dateLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");
    expect(dateLabels.every(label => label.getAttribute("transform") === "rotate(-45)")).toBe(true);
    element.remove();
  });

  it("bruger samme skrifttype og størrelse til dato, måned og år", () => {
    const dates: Date[] = Array.from({ length: 40 }, (_, index) =>
      new Date(2026, 8, index + 1));
    const { element } = render(dates, 1100, settings => {
      settings.x_axis.xlimit_tick_size = 12;
      settings.x_axis.xlimit_tick_count = 40;
    });

    const dateLabel = element.querySelector<SVGTextElement>(".xaxisgroup .tick text")!;
    const monthLabel = element.querySelector<SVGTextElement>(".xaxisgroup .month-label")!;
    const yearLabel = element.querySelector<SVGTextElement>(".xaxisgroup .year-label")!;

    expect(dateLabel.style.fontSize).toBe("12pt");
    expect(monthLabel.style.fontSize).toBe(dateLabel.style.fontSize);
    expect(yearLabel.style.fontSize).toBe(dateLabel.style.fontSize);
    expect(monthLabel.style.fontFamily).toBe(dateLabel.style.fontFamily);
    expect(yearLabel.style.fontFamily).toBe(dateLabel.style.fontFamily);
    element.remove();
  });

  it("lader skellene mellem månederne starte ved aksen", () => {
    const dates: Date[] = Array.from({ length: 40 }, (_, index) =>
      new Date(2026, 8, index + 1));
    const { element } = render(dates, 1100);

    const dividers = Array.from(element.querySelectorAll<SVGLineElement>(
      ".xaxisgroup .date-hierarchy .month-divider"
    ));
    const monthBoundary = element.querySelector<SVGLineElement>(
      ".xaxisgroup .date-hierarchy .month-boundary"
    )!;

    expect(dividers.length).toBeGreaterThan(0);
    for (const divider of dividers) {
      // 0 er aksens baseline i gruppens egne koordinater.
      expect(Number(divider.getAttribute("y1"))).toBe(0);
      expect(Number(divider.getAttribute("y2"))).toBeGreaterThan(
        Number(monthBoundary.getAttribute("y1"))
      );
    }
    element.remove();
  });

  it("holder første og sidste datoetiket inden for grafen", () => {
    const dates: Date[] = Array.from({ length: 40 }, (_, index) =>
      new Date(2026, 8, index + 1));
    const { element } = render(dates, 1100, settings => {
      settings.x_axis.xlimit_tick_count = 40;
    });

    const axisLine = element.querySelector<SVGPathElement>(".xaxisgroup path.domain")!.getBoundingClientRect();
    const shown = Array.from(element.querySelectorAll<SVGTextElement>(".xaxisgroup .tick text"))
      .filter(label => label.textContent !== "" && label.style.display !== "none")
      .map(label => label.getBoundingClientRect());

    expect(shown.length).toBeGreaterThan(1);
    // 1 px tolerance: aksens stregs egen bredde.
    const left = Math.min(...shown.map(rect => rect.left));
    const right = Math.max(...shown.map(rect => rect.right));
    expect(left).toBeGreaterThanOrEqual(axisLine.left - 1);
    expect(right).toBeLessThanOrEqual(axisLine.right + 1);
    element.remove();
  });

  it("lader månedsinddelingen gå helt ud til aksens kanter", () => {
    const dates: Date[] = Array.from({ length: 40 }, (_, index) =>
      new Date(2026, 8, index + 1));
    const { element } = render(dates, 1100);

    const axisLine = element.querySelector<SVGPathElement>(".xaxisgroup path.domain")!.getBoundingClientRect();
    const boundaries = Array.from(element.querySelectorAll<SVGLineElement>(
      ".xaxisgroup .date-hierarchy .month-boundary"
    )).map(line => line.getBoundingClientRect());

    expect(Math.min(...boundaries.map(rect => rect.left))).toBeLessThanOrEqual(axisLine.left + 1);
    expect(Math.max(...boundaries.map(rect => rect.right))).toBeGreaterThanOrEqual(axisLine.right - 1);
    element.remove();
  });
});
