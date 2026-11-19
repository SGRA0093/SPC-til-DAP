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

function renderDateHierarchy(
  years: number[],
  periods: (string | number)[],
  periodLevel: "Month" | "Week",
  periodCategory: "Months" | "Weeks",
  width: number,
  overrides: (s: any) => void = () => undefined,
  chartType: "i" | "g" | "t" = "i",
  localizedMetadata: boolean = false,
  opaqueQueryNames: boolean = false
) {
  const element = testDom(String(width), "400");
  const visual = new Visual({ element: element, host: createVisualHost({}) });
  const settings = JSON.parse(JSON.stringify(defaultSettings));
  settings.spc.chart_type = chartType;
  overrides(settings);

  const baseView = buildDataView({
    key: years.map((year, index) => `${year}-${periods[index]}`),
    numerators: years.map((_, index) => numerators[index % numerators.length])
  }, settings);
  const originalCategory = baseView.categorical!.categories![0];
  const yearColumn = {
    ...originalCategory,
    source: {
      ...originalCategory.source,
      displayName: localizedMetadata ? "År" : "Year",
      queryName: opaqueQueryNames ? "CalendarYear" : localizedMetadata ? "Kalender.Date Hierarki.År" : "Calendar.Date Hierarchy.Year",
      type: { numeric: true, temporal: localizedMetadata, category: localizedMetadata ? "År" : "Years" },
      roles: { key: true }
    },
    values: years
  };
  const periodColumn = {
    ...originalCategory,
    source: {
      ...originalCategory.source,
      displayName: localizedMetadata ? (periodLevel === "Month" ? "Måned" : "Uge") : periodLevel,
      queryName: opaqueQueryNames
        ? `Calendar${periodLevel}`
        : localizedMetadata
          ? `Kalender.Date Hierarki.${periodLevel === "Month" ? "Måned" : "Uge"}`
          : `Calendar.Date Hierarchy.${periodLevel}`,
      type: { text: true, numeric: true, temporal: localizedMetadata, category: localizedMetadata
        ? (periodLevel === "Month" ? "Måned" : "Uge")
        : periodCategory },
      roles: { key: true }
    },
    values: periods
  };
  baseView.categorical!.categories = [yearColumn, periodColumn] as any;

  const update = () => visual.update({
    dataViews: [baseView],
    viewport: { width: width, height: 400 },
    type: 2 /*powerbi.VisualUpdateType.Data*/
  });
  update();
  return { element, settings, update };
}

function renderFullDateHierarchy(
  years: number[],
  months: number[],
  days: number[],
  width: number,
  chartType: "i" | "t" = "i",
  opaqueQueryNames: boolean = false,
  dayIsTemporal: boolean = true
) {
  const element = testDom(String(width), "400");
  const visual = new Visual({ element: element, host: createVisualHost({}) });
  const settings = JSON.parse(JSON.stringify(defaultSettings));
  settings.spc.chart_type = chartType;

  const keys = years.map((year, index) =>
    `${year}-${String(months[index]).padStart(2, "0")}-${String(days[index]).padStart(2, "0")}`
  );
  const baseView = buildDataView({
    key: keys,
    numerators: years.map((_, index) => numerators[index % numerators.length])
  }, settings);
  const originalCategory = baseView.categorical!.categories![0];
  const makeLevel = (
    displayName: string,
    queryName: string,
    category: string,
    values: number[],
    temporal: boolean = true
  ) => ({
    ...originalCategory,
    source: {
      ...originalCategory.source,
      displayName,
      queryName: opaqueQueryNames ? `Calendar${queryName}` : `Calendar.Date Hierarchy.${queryName}`,
      type: { numeric: true, temporal, category },
      roles: { key: true }
    },
    values
  });
  baseView.categorical!.categories = [
    makeLevel("Year", "Year", "Years", years),
    makeLevel("Month", "Month", "Months", months),
    makeLevel("Day", "Day", "Days", days, dayIsTemporal)
  ] as any;

  const update = () => visual.update({
    dataViews: [baseView],
    viewport: { width, height: 400 },
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
  it("viser alle måneder lodret og kun ét årstal pr. år uden datoniveau", () => {
    const months = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    const years = [...months.map(() => 2025), ...months.map(() => 2026)];
    const { element } = renderDateHierarchy(
      years, [...months, ...months], "Month", "Months", 1100,
      settings => { settings.x_axis.xlimit_tick_count = 3; }
    );

    const periodLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));
    const lowerMonthLabels = element.querySelectorAll(
      ".xaxisgroup .date-hierarchy .month-label"
    );

    expect(periodLabels).toHaveLength(24);
    expect(periodLabels[0].textContent).toBe("january");
    expect(periodLabels[0].getAttribute("transform")).toBe("rotate(-90)");
    expect(lowerMonthLabels).toHaveLength(0);
    expect(yearLabels.map(label => label.textContent)).toEqual(["2025", "2026"]);
    element.remove();
  });

  it("viser ugeetiketter vandret, uden overlap, og samler ugerne tæt under årstallet", () => {
    const { element } = renderDateHierarchy(
      [2025, 2025, 2025, 2026, 2026, 2026],
      [1, 2, 3, 1, 2, 3],
      "Week", "Weeks", 600
    );

    const periodLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));

    expect(periodLabels.map(label => label.textContent)).toEqual(["1", "2", "3", "1", "2", "3"]);
    expect(periodLabels.every(label => label.getAttribute("transform") === "rotate(0)")).toBe(true);
    expect(periodLabels.every(label => label.getAttribute("dy") === ".9em")).toBe(true);
    expect(overlaps(periodLabels)).toBe(false);
    expect(yearLabels.map(label => label.textContent)).toEqual(["2025", "2026"]);
    const yearBoundary = element.querySelector<SVGLineElement>(
      ".xaxisgroup .date-hierarchy .year-boundary"
    )!;
    const yearBoundaryY: number = Number(yearBoundary.getAttribute("y1"));
    // Ugenumrene skal have luft både fra akselinjen og fra årsrækken.
    expect(yearBoundaryY).toBeGreaterThan(24);
    expect(yearBoundaryY).toBeLessThan(30);
    element.remove();
  });

  it("begrænser ugeetiketter med Maks. antal mærker", () => {
    const years = [...Array.from({ length: 52 }, () => 2025), ...Array.from({ length: 52 }, () => 2026)];
    const weeks = [...Array.from({ length: 52 }, (_, index) => index + 1),
      ...Array.from({ length: 52 }, (_, index) => index + 1)];
    const { element } = renderDateHierarchy(
      years, weeks, "Week", "Weeks", 900,
      settings => { settings.x_axis.xlimit_tick_count = 6; }
    );

    const shownWeekLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "" && label.style.display !== "none");
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));

    expect(shownWeekLabels).toHaveLength(6);
    expect(yearLabels.map(label => label.textContent)).toEqual(["2025", "2026"]);
    expect(overlaps(shownWeekLabels)).toBe(false);
    element.remove();
  });

  it("skjuler tætte ugeetiketter i stedet for at lade dem overlappe", () => {
    const years = [...Array.from({ length: 52 }, () => 2025), ...Array.from({ length: 52 }, () => 2026)];
    const weeks = [...Array.from({ length: 52 }, (_, index) => index + 1),
      ...Array.from({ length: 52 }, (_, index) => index + 1)];
    const { element } = renderDateHierarchy(
      years, weeks, "Week", "Weeks", 600,
      settings => { settings.x_axis.xlimit_tick_count = 100; }
    );

    const shownWeekLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "" && label.style.display !== "none");

    expect(shownWeekLabels.length).toBeGreaterThan(1);
    expect(shownWeekLabels.length).toBeLessThan(100);
    expect(shownWeekLabels.every(label => label.getAttribute("transform") === "rotate(0)")).toBe(true);
    expect(overlaps(shownWeekLabels)).toBe(false);
    element.remove();
  });

  it("bruger stadig hierarki for måned, når diagramtypen ikke har datobaseret x-akse", () => {
    const { element } = renderDateHierarchy(
      [2025, 2025, 2025, 2026, 2026, 2026],
      [1, 2, 3, 1, 2, 3],
      "Month", "Months", 700, () => undefined, "t"
    );

    const periodLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));

    expect(periodLabels.map(label => label.textContent)).toEqual([
      "january", "february", "march", "january", "february", "march"
    ]);
    expect(yearLabels.map(label => label.textContent)).toEqual(["2025", "2026"]);
    element.remove();
  });

  it("genkender år og måned, selv når Power BI ikke leverer fælles query-navn", () => {
    const { element } = renderDateHierarchy(
      [2025, 2025, 2025, 2026, 2026, 2026],
      [1, 2, 3, 1, 2, 3],
      "Month", "Months", 700, () => undefined, "i", false, true
    );

    const periodLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));

    expect(periodLabels.map(label => label.textContent)).toEqual([
      "january", "february", "march", "january", "february", "march"
    ]);
    expect(yearLabels.map(label => label.textContent)).toEqual(["2025", "2026"]);
    element.remove();
  });

  it("genkender også dansk hierarkimetadata for år og måned", () => {
    const { element } = renderDateHierarchy(
      [2025, 2025, 2025, 2026, 2026, 2026],
      [1, 2, 3, 1, 2, 3],
      "Month", "Months", 700, () => undefined, "i", true
    );

    const periodLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));

    expect(periodLabels.map(label => label.textContent)).toEqual([
      "january", "february", "march", "january", "february", "march"
    ]);
    expect(yearLabels.map(label => label.textContent)).toEqual(["2025", "2026"]);
    element.remove();
  });

  it("bruger stadig hierarki for uge, når diagramtypen ikke har datobaseret x-akse", () => {
    const { element } = renderDateHierarchy(
      [2025, 2025, 2025, 2026, 2026, 2026],
      [1, 2, 3, 1, 2, 3],
      "Week", "Weeks", 700, () => undefined, "g"
    );

    const periodLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));

    expect(periodLabels.map(label => label.textContent)).toEqual(["1", "2", "3", "1", "2", "3"]);
    expect(yearLabels.map(label => label.textContent)).toEqual(["2025", "2026"]);
    element.remove();
  });

  it("bevarer År → Måned → Dato med korrekte datoer og måneds-/årsrækker", () => {
    const { element } = renderFullDateHierarchy(
      [2025, 2025, 2025, 2025, 2026],
      [9, 9, 10, 10, 1],
      [1, 2, 1, 2, 1],
      900
    );

    const dateLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");
    const monthLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .month-label"
    ));
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));

    expect(dateLabels.map(label => label.textContent)).toEqual([
      "01-09-2025", "02-09-2025", "01-10-2025", "02-10-2025", "01-01-2026"
    ]);
    expect(monthLabels.map(label => label.textContent)).toEqual(["september", "october", "january"]);
    expect(yearLabels.map(label => label.textContent)).toEqual(["2025", "2026"]);
    element.remove();
  });

  it("genopbygger År → Måned → Dato, når dag-niveauet ikke er markeret som temporal", () => {
    const { element } = renderFullDateHierarchy(
      [2025, 2025, 2025], [9, 9, 10], [1, 2, 1], 700, "i", false, false
    );

    const dateLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");

    expect(dateLabels.map(label => label.textContent)).toEqual([
      "01-09-2025", "02-09-2025", "01-10-2025"
    ]);
    element.remove();
  });

  it("bevarer dato-hierarkiets år/måned/dag på en kategorisk T-akse med separate query names", () => {
    const { element } = renderFullDateHierarchy(
      [2025, 2025, 2025], [9, 9, 10], [1, 2, 1], 700, "t", true
    );

    const dateLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "");
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));

    expect(dateLabels.map(label => label.textContent)).toEqual([
      "01-09-2025", "02-09-2025", "01-10-2025"
    ]);
    expect(yearLabels.map(label => label.textContent)).toEqual(["2025"]);
    element.remove();
  });

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

  it("viser datoer vandret, når der er plads", () => {
    const dates: Date[] = Array.from({ length: 8 }, (_, index) =>
      new Date(2026, 8, index + 1));
    const { element } = render(dates, 1200);

    const shownDateLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .tick text"
    )).filter(label => label.textContent !== "" && label.style.display !== "none");

    expect(shownDateLabels.length).toBe(8);
    expect(shownDateLabels.every(label => label.getAttribute("transform") === "rotate(0)")).toBe(true);
    expect(shownDateLabels.every(label => label.style.display !== "none")).toBe(true);
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

  it("beholder måned og år synlige ved perioder på to, tre og fire måneder", () => {
    for (const monthCount of [2, 3, 4]) {
      const dates: Date[] = Array.from({ length: monthCount }, (_, index) =>
        new Date(2025, 8 + index, 1));
      const { element } = render(dates, 260, settings => {
        settings.x_axis.xlimit_tick_count = monthCount;
      });

      const monthLabels = Array.from(element.querySelectorAll<SVGTextElement>(
        ".xaxisgroup .date-hierarchy .month-label"
      ));
      const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
        ".xaxisgroup .date-hierarchy .year-label"
      ));

      expect(monthLabels).toHaveLength(monthCount);
      expect(monthLabels.every(label => (label.textContent ?? "").trim().length > 0)).toBe(true);
      expect(yearLabels.length).toBeGreaterThan(0);
      expect(yearLabels.every(label => (label.textContent ?? "").trim().length > 0)).toBe(true);
      expect(yearLabels.map(label => label.textContent)).toContain("2025");
      element.remove();
    }
  });

  it("beholder begge årstal, når en tremånedersperiode krydser et årsskifte", () => {
    const dates: Date[] = [
      new Date(2025, 10, 1),
      new Date(2025, 11, 1),
      new Date(2026, 0, 1)
    ];
    const { element } = render(dates, 260, settings => {
      settings.x_axis.xlimit_tick_count = 3;
    });

    const monthLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .month-label"
    ));
    const yearLabels = Array.from(element.querySelectorAll<SVGTextElement>(
      ".xaxisgroup .date-hierarchy .year-label"
    ));

    expect(monthLabels).toHaveLength(3);
    expect(monthLabels.every(label => (label.textContent ?? "").trim().length > 0)).toBe(true);
    expect(yearLabels.map(label => label.textContent)).toContain("2025");
    expect(yearLabels.map(label => label.textContent)).toContain("2026");
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
    const monthBoundaries = Array.from(element.querySelectorAll<SVGLineElement>(
      ".xaxisgroup .date-hierarchy .month-boundary"
    ));
    expect(monthBoundaries.length).toBeGreaterThan(0);
    expect(monthBoundaries.every(line => line.getAttribute("stroke-opacity") === "0")).toBe(true);
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
