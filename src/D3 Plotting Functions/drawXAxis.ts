import * as d3 from "./D3 Modules";
import type { axisProperties } from "../Classes/plotPropertiesClass";
import type { svgBaseType, Visual } from "../visual";
import ptToPx from "../Functions/ptToPx";

// Mindste luft mellem to uroterede aksemærke-etiketter, i px.
const TICK_LABEL_GAP: number = 4;

/** Skjuler etiketter, der fysisk overlapper efter rotationen er anvendt. */
function hideOverlappingTickLabels(labels: SVGGraphicsElement[]): void {
  let lastRight: number = -Infinity;
  for (const label of labels) {
    const rect: DOMRect = label.getBoundingClientRect();
    if (rect.width === 0) {
      continue;
    }
    if (rect.left < lastRight + TICK_LABEL_GAP) {
      label.style.display = "none";
    } else {
      lastRight = rect.right;
    }
  }
}

function getDateLocale(visualObj: Visual): string {
  return visualObj.viewModel.inputSettings.settings[0].dates.date_format_locale || "en-GB";
}

function formatDateTick(date: Date, locale: string): string {
  const parts: Intl.DateTimeFormatPart[] = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).formatToParts(date);
  const day: string = parts.find(part => part.type === "day")?.value ?? "";
  const month: string = parts.find(part => part.type === "month")?.value ?? "";
  const year: string = parts.find(part => part.type === "year")?.value ?? "";
  return locale.toLowerCase().startsWith("en-us")
    ? `${month}-${day}-${year}`
    : `${day}-${month}-${year}`;
}

type DateTick = { x: number; date: Date };
type DateGroup = { key: string; label: string; year: number; month: number; first: number; last: number };

/**
 * Begrænser datoetiketterne til det maksimale antal, som brugeren har valgt.
 * Udvælgelsen fordeles jævnt over perioden og medtager altid første og sidste
 * dato, når der er plads til mindst to mærker.
 *
 * Værdien 0 har samme betydning som i den oprindelige D3-akse: brug standarden
 * på cirka 10 mærker i stedet for at vise samtlige kategorier.
 */
function limitDateTicks(ticks: DateTick[], configuredMaximum: number): DateTick[] {
  const maximum: number = configuredMaximum > 0
    ? Math.max(1, Math.floor(configuredMaximum))
    : 10;

  if (ticks.length <= maximum) {
    return ticks;
  }
  if (maximum === 1) {
    return [ticks[Math.floor((ticks.length - 1) / 2)]];
  }

  const selected: DateTick[] = [];
  for (let index = 0; index < maximum; index++) {
    const sourceIndex: number = Math.round(index * (ticks.length - 1) / (maximum - 1));
    selected.push(ticks[sourceIndex]);
  }
  return selected;
}

type fittedLabel = { text: string; fontSize: string };

/**
 * Keeps month labels visible when the month band is narrow: use the full
 * localized month name when it fits, then its localized short form, and
 * finally a two-digit month number. The font is reduced only as needed.
 */
function fitMonthLabel(
  group: DateGroup,
  availableWidth: number,
  locale: string,
  fontPx: number,
  fontPt: number
): fittedLabel {
  const shortLabel: string = new Intl.DateTimeFormat(locale, { month: "short" })
    .format(new Date(group.year, group.month, 1))
    .toLocaleLowerCase(locale)
    .replace(/[.]$/, "");
  const candidates: string[] = [
    group.label,
    shortLabel,
    String(group.month + 1).padStart(2, "0")
  ];
  const text: string = candidates.find(candidate =>
    candidate.length * fontPx * 0.55 <= availableWidth
  ) ?? candidates[candidates.length - 1];
  const estimatedWidth: number = Math.max(1, text.length * fontPx * 0.55);
  const scale: number = Math.min(1, availableWidth > 0 ? availableWidth / estimatedWidth : 1);
  return { text, fontSize: `${Math.max(5, fontPt * scale)}pt` };
}

function fitBandFontSize(label: string, availableWidth: number, fontPx: number, fontPt: number): string {
  const estimatedWidth: number = Math.max(1, label.length * fontPx * 0.55);
  const scale: number = Math.min(1, availableWidth > 0 ? availableWidth / estimatedWidth : 1);
  return `${Math.max(5, fontPt * scale)}pt`;
}

function groupDatesByMonth(ticks: DateTick[], locale: string): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const tick of ticks) {
    const year: number = tick.date.getFullYear();
    const month: number = tick.date.getMonth();
    const key: string = `${year}-${month}`;
    const existing: DateGroup | undefined = groups[groups.length - 1];
    if (existing?.key === key) {
      existing.last = tick.x;
      continue;
    }
    const label: string = new Intl.DateTimeFormat(locale, { month: "long" })
      .format(tick.date)
      .toLocaleLowerCase(locale);
    groups.push({ key, label, year, month, first: tick.x, last: tick.x });
  }
  return groups;
}

function addDateHierarchy(
  xAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  ticks: DateTick[],
  visualObj: Visual,
  xAxisProperties: axisProperties,
  tickRotation: number
): void {
  if (ticks.length === 0) {
    return;
  }

  const locale: string = getDateLocale(visualObj);
  const monthGroups: DateGroup[] = groupDatesByMonth(ticks, locale);
  const yearGroups: DateGroup[] = [];
  monthGroups.forEach(month => {
    const previous: DateGroup | undefined = yearGroups[yearGroups.length - 1];
    if (previous?.year === month.year) {
      previous.last = month.last;
    } else {
      yearGroups.push({ ...month, key: String(month.year), label: String(month.year) });
    }
  });

  // Datoer, måned og år står i samme skrifttype og størrelse, som aksemærkerne
  // er sat til. Rækkernes højde følger skriften, så en større skrift ikke
  // skubber teksten op i skillelinjerne.
  const dateFontPt: number = Number.parseFloat(xAxisProperties.tick_size) || 9;
  const fontPx: number = ptToPx(dateFontPt);
  const rowHeight: number = Math.max(22, Math.round(fontPx * 1.6));
  const rowTextOffset: number = rowHeight / 2 + fontPx * 0.35;
  // Vandrette etiketter bruger kun én linje; lodrette etiketter kræver
  // plads til hele datoens længde. Måned og år får hver sin række nedenunder.
  const dateLabelDepth: number = tickRotation === 0
    ? Math.max(20, fontPx * 1.8)
    : Math.max(42, fontPx * 5.2);
  // .xaxisgroup er allerede flyttet ned til aksens baseline. Koordinaterne
  // her skal derfor være lokale for gruppen og ikke indeholde xAxisHeight.
  const monthLineY: number = dateLabelDepth + 14;
  const monthTextY: number = monthLineY + rowTextOffset;
  const yearLineY: number = monthLineY + rowHeight;
  const yearTextY: number = yearLineY + rowTextOffset;
  // D3 AxisScale er typet som muligvis undefined, men den konkrete lineære
  // x-skala returnerer altid en koordinat for gyldige domæneværdier.
  const axisScale = (value: number): number =>
    visualObj.plotProperties.xScale(value) as number;
  // Første og sidste gruppe går helt ud til aksens kanter, også når
  // datapunkterne ligger et stykke inde fra dem (se xInset).
  const [axisLeft, axisRight]: number[] = visualObj.plotProperties.xScale.range();

  const boundary = (previousLast: number | undefined, nextFirst: number | undefined): number => {
    if (previousLast === undefined) {
      return axisLeft;
    }
    if (nextFirst === undefined) {
      return axisRight;
    }
    return axisScale((previousLast + nextFirst) / 2);
  };

  const monthBounds = monthGroups.map((group, index) => ({
    group,
    left: boundary(index === 0 ? undefined : monthGroups[index - 1].last, group.first),
    right: boundary(group.last, index === monthGroups.length - 1 ? undefined : monthGroups[index + 1].first)
  }));
  const yearBounds = yearGroups.map((group, index) => ({
    group,
    left: boundary(index === 0 ? undefined : yearGroups[index - 1].last, group.first),
    right: boundary(group.last, index === yearGroups.length - 1 ? undefined : yearGroups[index + 1].first)
  }));

  const hierarchy = xAxisGroup.append("g").classed("date-hierarchy", true);
  const separatorColour: string = xAxisProperties.grid_colour || xAxisProperties.colour;
  const labelColour: string = visualObj.plotProperties.displayPlot ? xAxisProperties.tick_colour : "#FFFFFF";
  const lineWidth: number = Math.max(0.5, xAxisProperties.grid_width || 1);

  // Månedernes øverste linje og lodrette skel svarer til Power BI's
  // kategoriske datohierarki under de enkelte datoetiketter.
  hierarchy.selectAll<SVGLineElement, typeof monthBounds[number]>(".month-boundary")
    .data(monthBounds)
    .join("line")
    .classed("month-boundary", true)
    .attr("x1", d => d.left)
    .attr("x2", d => d.right)
    .attr("y1", monthLineY)
    .attr("y2", monthLineY)
    .attr("stroke", separatorColour)
    // Behold geometry for month layout, but do not draw a horizontal line
    // between the date labels and the month names.
    .attr("stroke-opacity", 0)
    .attr("stroke-width", lineWidth);

  hierarchy.selectAll<SVGLineElement, typeof monthBounds[number]>(".month-divider")
    .data(monthBounds.slice(1))
    .join("line")
    .classed("month-divider", true)
    .attr("x1", d => d.left)
    .attr("x2", d => d.left)
    // Skellene mellem månederne starter ved aksen (y = 0) og går ned gennem
    // datoerne, som i Power BI's linjediagram, i stedet for først under dem.
    .attr("y1", 0)
    .attr("y2", yearLineY + 1)
    .attr("stroke", separatorColour)
    .attr("stroke-width", lineWidth);

  hierarchy.selectAll<SVGTextElement, typeof monthBounds[number]>(".month-label")
    .data(monthBounds)
    .join("text")
    .classed("month-label", true)
    .attr("x", d => (d.left + d.right) / 2)
    .attr("y", monthTextY)
    .attr("text-anchor", "middle")
    .style("font-size", d => fitMonthLabel(
      d.group, Math.max(0, d.right - d.left - 4), locale, fontPx, dateFontPt
    ).fontSize)
    .style("font-family", xAxisProperties.tick_font)
    .style("fill", labelColour)
    .text(d => fitMonthLabel(
      d.group, Math.max(0, d.right - d.left - 4), locale, fontPx, dateFontPt
    ).text);

  hierarchy.selectAll<SVGLineElement, typeof yearBounds[number]>(".year-boundary")
    .data(yearBounds)
    .join("line")
    .classed("year-boundary", true)
    .attr("x1", d => d.left)
    .attr("x2", d => d.right)
    .attr("y1", yearLineY)
    .attr("y2", yearLineY)
    .attr("stroke", separatorColour)
    .attr("stroke-width", lineWidth);

  hierarchy.selectAll<SVGTextElement, typeof yearBounds[number]>(".year-label")
    .data(yearBounds)
    .join("text")
    .classed("year-label", true)
    .attr("x", d => (d.left + d.right) / 2)
    .attr("y", yearTextY)
    .attr("text-anchor", "middle")
    .style("font-size", d => fitBandFontSize(
      d.group.label, Math.max(0, d.right - d.left - 4), fontPx, dateFontPt
    ))
    .style("font-family", xAxisProperties.tick_font)
    .style("fill", labelColour)
    .text(d => d.group.label);
}

export default function drawXAxis(selection: svgBaseType, visualObj: Visual) {
  const xAxisGroup = selection.select(".xaxisgroup") as d3.Selection<SVGGElement, unknown, null, undefined>;
  const xAxisLabel = selection.select(".xaxislabel") as d3.Selection<SVGTextElement, unknown, null, undefined>;
  if (!visualObj.viewModel.inputSettings.settings[0].x_axis.xlimit_show) {
    // X Axis plotting is disabled, so remove any existing axis and return early
    xAxisGroup.remove();
    xAxisLabel.remove();
    return;
  }
  // If the groups have been removed, re-add them
  if (xAxisGroup.empty()) {
    selection.append("g").classed("xaxisgroup", true);
  }
  if (xAxisLabel.empty()) {
    selection.append("text").classed("xaxislabel", true);
  }

  const xAxisProperties: axisProperties = visualObj.plotProperties.xAxis;
  const allDateTicks: DateTick[] = visualObj.viewModel.tickLabels
    .filter(tick => tick.date instanceof Date && Number.isFinite(tick.date.getTime()))
    .map(tick => ({ x: tick.x, date: tick.date as Date }));
  const useDateHierarchy: boolean = allDateTicks.length > 1
    && allDateTicks.length === visualObj.viewModel.tickLabels.length
    && xAxisProperties.ticks;
  const dateHierarchyTicks: DateTick[] = allDateTicks
    .filter(tick => tick.x >= xAxisProperties.lower && tick.x <= xAxisProperties.upper);
  // Selve datomærkerne følger brugerens maksimum. Måned/år-rækkerne nedenunder
  // bruger fortsat alle datoer, så periodernes inddeling ikke forsvinder,
  // blot fordi der vises færre datoetiketter.
  const visibleDateTicks: DateTick[] = limitDateTicks(
    dateHierarchyTicks,
    xAxisProperties.tick_count
  );
  const locale: string = getDateLocale(visualObj);
  // For datoakser betyder standardrotationen (0), at layoutet selv vælger:
  // vandret, hvis alle etiketter kan være der, ellers lodret. En eksplicit
  // rotation fra brugeren respekteres altid.
  let tickRotation: number = xAxisProperties.tick_rotation;
  const xAxis: d3.Axis<number> = d3.axisBottom(visualObj.plotProperties.xScale);

  // D3's axis call updates its own ticks, but does not remove custom children
  // added on a previous render/resize.
  (selection.select(".xaxisgroup") as d3.Selection<SVGGElement, unknown, null, undefined>)
    .selectAll(".date-hierarchy").remove();

  if (useDateHierarchy) {
    xAxis.tickValues(visibleDateTicks.map(tick => tick.x));
    xAxis.tickFormat(axisX => {
      const match: DateTick | undefined = visibleDateTicks.find(tick => tick.x === Number(axisX));
      return match ? formatDateTick(match.date, locale) : "";
    });
  } else if (xAxisProperties.ticks) {
    if (xAxisProperties.tick_count) {
      xAxis.ticks(xAxisProperties.tick_count);
    }
    if (visualObj.viewModel.tickLabels) {
      xAxis.tickFormat(axisX => {
        const targetKey = visualObj.viewModel.tickLabels.filter(d => d.x == <number>axisX);
        return targetKey.length > 0 ? targetKey[0].label : "";
      });
    }
  } else {
    xAxis.tickValues([]);
  }

  const plotHeight: number = visualObj.viewModel.svgHeight;
  const xAxisHeight: number = plotHeight - visualObj.plotProperties.yAxis.start_padding;
  const displayPlot: boolean = visualObj.plotProperties.displayPlot;
  const gridHeight: number = xAxisHeight - visualObj.plotProperties.yAxis.end_padding;
  xAxis.tickSizeOuter(0)
    // Daily date marks would make a dense forest of vertical gridlines. The
    // month/year separators below the labels carry the time hierarchy instead.
    .tickSizeInner(!useDateHierarchy && xAxisProperties.grid && displayPlot && xAxisProperties.ticks ? -gridHeight : 0);

  const currentXAxisGroup = selection.select(".xaxisgroup") as d3.Selection<SVGGElement, unknown, null, undefined>;
  currentXAxisGroup
    .call(xAxis)
    .attr("color", displayPlot ? xAxisProperties.colour : "#FFFFFF")
    .attr("transform", `translate(0, ${xAxisHeight})`);

  const tickText = currentXAxisGroup.selectAll<SVGGraphicsElement, unknown>(".tick text");
  const applyTickTextLayout = (rotation: number): void => {
    const anchor: string = rotation === 0
      ? "middle"
      : (rotation < 0 ? "end" : "start");
    const dx: string = rotation === 0 ? "0" : (rotation < 0 ? "-.8em" : ".8em");
    const dy: string = rotation === 0 ? ".71em" : (rotation < 0 ? "-.15em" : ".15em");
    tickText
      .style("text-anchor", anchor)
      .attr("dx", dx)
      .attr("dy", dy)
      .attr("transform", "rotate(" + rotation + ")")
      .style("display", null)
      .style("font-size", xAxisProperties.tick_size)
      .style("font-family", xAxisProperties.tick_font)
      .style("fill", displayPlot ? xAxisProperties.tick_colour : "#FFFFFF");
  };

  applyTickTextLayout(tickRotation);

  // Standardlayout for datoer prøver først vandret visning. Hvis etiketterne
  // overlapper, drejes alle datoer lodret. applyTickTextLayout nulstiller
  // display-stilen, så etiketter skjult ved en tidligere optegning genskabes.
  if (useDateHierarchy && xAxisProperties.tick_rotation === 0) {
    hideOverlappingTickLabels(tickText.nodes());
    const hasOverlappingLabels: boolean = tickText.nodes()
      .some(label => label.style.display === "none");
    if (hasOverlappingLabels) {
      tickRotation = -90;
      applyTickTextLayout(tickRotation);
    }
  } else if (tickRotation === 0) {
    hideOverlappingTickLabels(tickText.nodes());
  }

  currentXAxisGroup.selectAll<SVGGElement, unknown>(".tick").each(function () {
    const text: SVGTextElement | null = this.querySelector("text");
    const line: SVGLineElement | null = this.querySelector("line");
    if (!line) {
      return;
    }
    const hasLabel: boolean = !!text && !!text.textContent && text.style.display !== "none";
    line.style.display = hasLabel ? "" : "none";
    line.style.stroke = xAxisProperties.grid_colour;
    line.style.strokeWidth = String(xAxisProperties.grid_width);
  });

  if (useDateHierarchy) {
    addDateHierarchy(currentXAxisGroup, dateHierarchyTicks, visualObj, xAxisProperties, tickRotation);
  }

  const textX: number = visualObj.viewModel.svgWidth / 2;
  let textY: number;

  if (visualObj.viewModel.frontend) {
    textY = plotHeight - (visualObj.plotProperties.yAxis.start_padding / 3);
  } else {
    const xAxisNode: SVGGElement = selection.selectAll(".xaxisgroup").node() as SVGGElement;
    if (!xAxisNode) {
      selection.select(".xaxislabel")
        .style("fill", displayPlot ? xAxisProperties.label_colour : "#FFFFFF");
      return;
    }
    const xAxisCoordinates: DOMRect = xAxisNode.getBoundingClientRect() as DOMRect;
    textY = plotHeight - ((plotHeight - xAxisCoordinates.bottom) / 2);
  }

  selection.select(".xaxislabel")
    .attr("x", textX)
    .attr("y", textY)
    .style("text-anchor", "middle")
    .text(xAxisProperties.label)
    .style("font-size", xAxisProperties.label_size)
    .style("font-family", xAxisProperties.label_font)
    .style("fill", displayPlot ? xAxisProperties.label_colour : "#FFFFFF");
}
