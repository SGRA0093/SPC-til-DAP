import type powerbi from "powerbi-visuals-api"
type DataViewValueColumn = powerbi.DataViewValueColumn;
type DataViewCategorical = powerbi.DataViewCategorical;
type VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
import type { settingsValueType } from "../settings";
import formatPrimitiveValue from "../Functions/formatPrimitiveValue";
import dateSettingsToFormatOptions from "../Functions/dateSettingsToFormatOptions";
import parseInputDates from "../Functions/parseInputDates";
import rep from "../Functions/rep";
import isNullOrUndefined from "../Functions/isNullOrUndefined";
import formatDateParts from "../Functions/formatDateParts";
type TargetT = number[] | string[] | VisualTooltipDataItem[][];

function formatKeys(col: powerbi.DataViewCategoryColumn[], inputSettings: settingsValueType, idxs: number[]): (string | undefined)[] {
  const n_keys: number = idxs.length;
  let ret = new Array<string | undefined>(n_keys);
  // If only one input is passed and it is not a date type then just return the string values
  if (col.length === 1 && !(col[0].source.type?.temporal)) {
    for (let i = 0; i < n_keys; i++) {
      ret[i] = isNullOrUndefined(col[0].values[idxs[i]]) ? undefined : String(col[0].values[idxs[i]]);
    }
    return ret;
  }
  const delim: string = inputSettings.dates.date_format_delim;
  // If multiple inputs are passed but not as a 'Date Hierarchy' type then
  // just concatenate and do not attempt to format
  if (!(col.every(d => d.source?.type?.temporal))) {
    const blankKey: string = rep("", col.length).join(delim)
    for (let i = 0; i < n_keys; i++) {
      const currKey: string = col.map(keyCol => keyCol.values[idxs[i]]).join(delim)
      ret[i] = currKey === blankKey ? undefined : currKey
    }
    return ret;
  }
  const inputDates = parseInputDates(col, idxs);
  const formatOptions = dateSettingsToFormatOptions(inputSettings.dates);
  const locale = inputSettings.dates.date_format_locale as "en-GB" | "en-US";
  let day_elem: string = locale === "en-GB" ? "day" : "month";
  let month_elem: string = locale === "en-GB" ? "month" : "day";

  for (let i = 0; i < n_keys; i++) {
    if (isNullOrUndefined(inputDates.dates[i])) {
      ret[i] = undefined
    } else {
      const datePartsRecord = formatDateParts(inputDates.dates[i], locale, formatOptions);
      const datePartStrings: string[] = [datePartsRecord.weekday + " " + datePartsRecord[day_elem as keyof typeof datePartsRecord],
                                          datePartsRecord[month_elem as keyof typeof datePartsRecord],
                                          inputDates.quarters?.[i] ?? "",
                                          datePartsRecord.year];
      ret[i] = datePartStrings.filter(d => String(d).trim()).join(delim)
    }
  }
  return ret
}

function extractKeys(inputView: DataViewCategorical, inputSettings: settingsValueType, idxs: number[]): (string | undefined)[] {
  const col: powerbi.DataViewCategoryColumn[] = inputView.categories!.filter(viewColumn => viewColumn.source?.roles?.["key"]);

  // To handle separately formatting multiple 'key' columns that may come from different
  // queries (e.g., Date Hierarchy + string) we first group the columns by their query name
  // then format each group separately before combining the results
  // Group the columns by their query name
  const groupedCols: { [key: string]: powerbi.DataViewCategoryColumn[] } = {};
  let queryNames: string[] = col.map(d => d.source?.queryName ?? "");
  // If any query names are duplicates (i.e., the same column passed multiple times),
  // prepend the index to the query name to make it unique
  const uniqueQueryNames: Set<string> = new Set();
  queryNames = queryNames.map((queryName, idx) => {
    if (uniqueQueryNames.has(queryName)) {
      // If the query name is already in the set, prepend the index to make it unique
      queryName = `${idx}_${queryName}`;
    }
    uniqueQueryNames.add(queryName);
    return queryName;
  });

  col.forEach((d, idx) => {
    let queryName: string = queryNames[idx];
    if (queryName.includes("Date Hierarchy")) {
      // If the query is a 'Date Hierarchy', remove the element after the last '.' (the element of the hierarchy)
      // so that we can group by the base query name
      // i.e., "source_table.source_column.Variation.Date Hierarchy.Year" becomes "source_table.source_column.Variation.Date Hierarchy"
      // So that we can capture all the date hierarchy elements in the same group
      const lastDotIndex: number = queryName.lastIndexOf(".");
      if (lastDotIndex !== -1) {
        queryName = queryName.substring(0, lastDotIndex);
      }
    }
    if (!groupedCols[queryName]) {
      groupedCols[queryName] = [];
    }
    groupedCols[queryName].push(d);
  });

  // Format the keys for each query group
  const formattedKeys: (string | undefined)[][] = [];
  for (const queryName in groupedCols) {
    const group = groupedCols[queryName];
    const groupKeys = formatKeys(group, inputSettings, idxs);
    formattedKeys.push(groupKeys);
  }
  // Combine the formatted keys from all groups
  const combinedKeys: (string | undefined)[] = [];
  const n_keys: number = idxs.length;
  for (let i = 0; i < n_keys; i++) {
    const keyParts = formattedKeys.map(keys => keys[i]).filter(k => !isNullOrUndefined(k));
    combinedKeys.push(keyParts.length > 0 ? keyParts.join(" ") : undefined);
  }
  return combinedKeys;
}

function extractTooltips(inputView: DataViewCategorical, inputSettings: settingsValueType, idxs: number[]): VisualTooltipDataItem[][] {
  const tooltipColumns = inputView.values!.filter(viewColumn => viewColumn.source.roles!.tooltips);
  const n_keys: number = idxs.length;
  let ret: VisualTooltipDataItem[][] = new Array<VisualTooltipDataItem[]>(n_keys);
  for (let i = 0; i < n_keys; i++) {
    ret[i] = tooltipColumns.map(viewColumn => {
      const config = { valueType: viewColumn.source.type!, dateSettings: inputSettings.dates };
      const tooltipValueFormatted: string = formatPrimitiveValue(viewColumn?.values?.[idxs[i]], config)
      return <VisualTooltipDataItem>{
        displayName: viewColumn.source.displayName,
        value: tooltipValueFormatted
      }
    })
  }
  return ret;
}

type ArrayUndefined<T> = T extends (infer U)[] ? Array<U | undefined> : T;

/**
 * Henter de faktiske datoværdier for x-aksen, uafhængigt af den viste
 * datotekst. Det gør det muligt at vise datoer og måned/år-grupper på samme
 * måde som Power BI's almindelige linjediagram.
 */
export function extractKeyDates(inputView: DataViewCategorical, idxs: number[]): (Date | undefined)[] | undefined {
  const columns: powerbi.DataViewCategoryColumn[] = (inputView.categories ?? [])
    .filter(column => column.source?.roles?.key && column.source?.type?.temporal);
  if (columns.length === 0) {
    return undefined;
  }

  // Date Hierarchy-kolonner deler query-navn, når det sidste niveau
  // (Year/Quarter/Month/Day) fjernes. Andre datofelter holdes adskilt.
  const groupedColumns: Record<string, powerbi.DataViewCategoryColumn[]> = {};
  const seenQueryNames = new Set<string>();
  columns.forEach((column, index) => {
    let queryName: string = column.source?.queryName ?? `date-${index}`;
    if (queryName.includes("Date Hierarchy")) {
      const lastDotIndex: number = queryName.lastIndexOf(".");
      if (lastDotIndex !== -1) {
        queryName = queryName.substring(0, lastDotIndex);
      }
    }
    if (seenQueryNames.has(queryName)) {
      queryName = `${index}_${queryName}`;
    }
    seenQueryNames.add(queryName);
    (groupedColumns[queryName] ??= []).push(column);
  });

  // Vælg den første komplette datogruppering. Hvis x-aksen også indeholder
  // andre nøgler, påvirker de ikke datoernes placering eller gruppering.
  const dateGroup: powerbi.DataViewCategoryColumn[] = Object.values(groupedColumns)[0];
  return parseInputDates(dateGroup, idxs).dates;
}

export type dateHierarchyGranularity = "date" | "month" | "week";

export type dateHierarchyData = {
  granularity: dateHierarchyGranularity;
  dates: (Date | undefined)[];
  periodLabels: (string | undefined)[];
  years: (number | undefined)[];
};

type dateHierarchyLevel = "year" | "month" | "week" | "date" | "day" | undefined;

function normalizeHierarchyToken(candidate: string): string {
  return candidate.toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "oe")
    .replace(/[å]/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

function hierarchyLevelFromToken(candidate: string): dateHierarchyLevel {
  const value: string = normalizeHierarchyToken(candidate);
  if (["year", "years", "aar", "aars", "kalenderaar"].includes(value) || value.startsWith("year")) {
    return "year";
  }
  if (["month", "months", "monthofyear", "monthname", "maaned", "maaneder", "maanedsnummer"].includes(value)
    || value.startsWith("month")) {
    return "month";
  }
  if (["week", "weeks", "weekofyear", "weekofmonth", "uge", "uger", "ugenummer"].includes(value)
    || value.startsWith("week")) {
    return "week";
  }
  if (["day", "days", "dayofmonth", "dayofyear", "dayofweek", "dag", "dage"].includes(value)
    || value.startsWith("day")) {
    return "day";
  }
  if (["date", "dates", "paddeddatabledates", "dato", "datoer"].includes(value)
    || value.startsWith("date")) {
    return "date";
  }
  return undefined;
}

/**
 * Identifies the selected hierarchy level using both semantic category and
 * query/display names. Power BI can localize display names (e.g. År, Måned,
 * Uge), while its query names are often English and may vary by connector.
 */
function getDateHierarchyLevel(column: powerbi.DataViewCategoryColumn): dateHierarchyLevel {
  const sourceType = column.source.type as unknown as { category?: string };
  const queryLevel: string = (column.source.queryName ?? "").split(/[./\s:_-]/).pop() ?? "";
  const candidates: string[] = [sourceType?.category ?? "", queryLevel, column.source.displayName ?? ""];
  for (const candidate of candidates) {
    const level: dateHierarchyLevel = hierarchyLevelFromToken(candidate);
    if (level) return level;
  }
  return undefined;
}

function getHierarchyBaseName(column: powerbi.DataViewCategoryColumn, index: number): string {
  const queryName: string = column.source.queryName ?? `date-${index}`;
  const level: dateHierarchyLevel = getDateHierarchyLevel(column);
  if (level) {
    // Query names usually append the hierarchy level to the underlying date
    // column. Remove that suffix regardless of whether Power BI separates it
    // with a dot, space, colon, slash or underscore.
    const segments: string[] = queryName.split(/[./\s:_-]+/);
    const lastSegment: string = segments[segments.length - 1] ?? "";
    if (hierarchyLevelFromToken(lastSegment) === level) {
      const suffixIndex: number = queryName.toLowerCase().lastIndexOf(lastSegment.toLowerCase());
      if (suffixIndex > 0) {
        return queryName.slice(0, suffixIndex).replace(/[./\s:_-]+$/, "");
      }
    }

    // When the connector uses an opaque query name, Power BI's source
    // expression identifies the underlying column shared by all hierarchy
    // levels. This avoids relying on localized display names for grouping.
    const sourceExpression: unknown = (column.source as unknown as { expr?: unknown }).expr;
    if (sourceExpression !== undefined) {
      return `expr:${JSON.stringify(sourceExpression)}`;
    }
  }
  return queryName;
}

function getMonthNumber(value: powerbi.PrimitiveValue): number | undefined {
  if (typeof value === "number" && value >= 1 && value <= 12) return Math.floor(value) - 1;
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.getMonth();
  if (typeof value !== "string") return undefined;
  const normalized: string = value.trim().toLowerCase().replace(/[.]/g, "");
  const numericMonth: number = Number(normalized);
  if (Number.isFinite(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
    return Math.floor(numericMonth) - 1;
  }
  const monthNames: string[] = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ];
  const englishIndex: number = monthNames.findIndex(name => name === normalized);
  if (englishIndex >= 0) return englishIndex;
  const monthAliases: string[][] = [
    ["jan", "januar"], ["feb", "february", "februar"], ["mar", "march", "marts"],
    ["apr", "april"], ["may", "maj"], ["jun", "june", "juni"],
    ["jul", "july", "juli"], ["aug", "august"], ["sep", "sept", "september"],
    ["oct", "okt", "oktober", "october"], ["nov", "november"], ["dec", "december"]
  ];
  const aliasIndex: number = monthAliases.findIndex(aliases => aliases.includes(normalized));
  return aliasIndex >= 0 ? aliasIndex : undefined;
}

function parseHierarchyDate(value: powerbi.PrimitiveValue): Date | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Date(value.getTime());
  }
  if (typeof value === "string") {
    const match: RegExpMatchArray | null = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      const parsed: Date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      return Number.isFinite(parsed.getTime()) ? parsed : undefined;
    }
  }
  return undefined;
}

/**
 * Extracts the actual selected date-hierarchy grain in addition to its date
 * representation. This lets the x-axis distinguish Year-Month and Year-Week
 * from a hierarchy that still includes individual dates.
 */
export function extractDateHierarchy(
  inputView: DataViewCategorical,
  idxs: number[]
): dateHierarchyData | undefined {
  const keyColumns: powerbi.DataViewCategoryColumn[] = (inputView.categories ?? [])
    .filter(column => column.source?.roles?.["key"]);
  const groups: Record<string, { column: powerbi.DataViewCategoryColumn; level: dateHierarchyLevel }[]> = {};

  keyColumns.forEach((column, index) => {
    const level: dateHierarchyLevel = getDateHierarchyLevel(column);
    if (!level) return;
    const baseName: string = getHierarchyBaseName(column, index);
    (groups[baseName] ??= []).push({ column, level });
  });

  let hierarchy: { column: powerbi.DataViewCategoryColumn; level: dateHierarchyLevel }[] | undefined =
    Object.values(groups).find(group =>
      group.some(item => item.level === "year")
        && group.some(item => ["month", "week", "date", "day"].includes(item.level ?? ""))
    );

  // Some Power BI connectors expose hierarchy levels with opaque and
  // unrelated query names even though the semantic categories/display names
  // clearly identify them. Accept only an unambiguous calendar shape: one
  // Year plus one Month/Week, optionally followed by one Date/Day level.
  if (!hierarchy) {
    const identified = keyColumns.map(column => ({
      column,
      level: getDateHierarchyLevel(column)
    }));
    const years = identified.filter(item => item.level === "year");
    const periods = identified.filter(item => item.level === "month" || item.level === "week");
    const dayLevels = identified.filter(item => item.level === "date" || item.level === "day");
    if (years.length === 1 && periods.length === 1 && dayLevels.length <= 1) {
      hierarchy = identified.filter(item =>
        item === years[0] || item === periods[0] || item === dayLevels[0]
      );
    }
  }
  if (!hierarchy) return undefined;

  const yearColumn = hierarchy.find(item => item.level === "year")?.column;
  const monthColumn = hierarchy.find(item => item.level === "month")?.column;
  const periodColumns = hierarchy.filter(item => item.level !== "year");
  const period = periodColumns[periodColumns.length - 1];
  if (!period) return undefined;

  const granularity: dateHierarchyGranularity = period.level === "month"
    ? "month"
    : period.level === "week" ? "week" : "date";
  const rawYears: (number | undefined)[] = yearColumn
    ? idxs.map(index => {
      const value = yearColumn.values[index];
      if (value === null || value === undefined) return undefined;
      if (value instanceof Date && Number.isFinite(value.getTime())) {
        return value.getFullYear();
      }
      const year = Number(value);
      return Number.isFinite(year) ? year : undefined;
    })
    : idxs.map(() => undefined);
  const periodLabels: (string | undefined)[] = idxs.map(index => {
    const value = period.column.values[index];
    return value === null || value === undefined ? undefined : String(value);
  });

  // Keep the existing parser for genuine temporal hierarchy columns. For
  // numeric/text date-table levels (common for Year-Week), synthesize a date
  // from the selected Year and Month/Week values.
  let dates: (Date | undefined)[] | undefined;
  // For month/week we deliberately synthesize from the actual selected level:
  // parseInputDates only understands Power BI's English temporal categories,
  // while semantic models can expose localized or numeric category values.
  if (granularity === "date"
    && hierarchy.every(item => (item.column.source.type as unknown as { temporal?: boolean })?.temporal)) {
    dates = parseInputDates(hierarchy.map(item => item.column), idxs).dates;
  }
  if (!dates || dates.length !== idxs.length || dates.some(date => !(date instanceof Date) || !Number.isFinite(date.getTime()))) {
    dates = idxs.map((index, row) => {
      const year = rawYears[row];
      const value = period.column.values[index];
      if (year === undefined || value === null || value === undefined) return undefined;
      if (granularity === "month") {
        const month = getMonthNumber(value);
        return month === undefined ? undefined : new Date(year, month, 1);
      }
      if (granularity === "week") {
        const week = Number(String(value).match(/\d+/)?.[0]);
        return Number.isFinite(week) ? new Date(year, 0, (week - 1) * 7 + 1) : undefined;
      }
      const directDate: Date | undefined = parseHierarchyDate(value);
      if (directDate) return directDate;
      const day: number = Number(String(value).match(/^\s*(\d{1,2})\s*$/)?.[1]);
      const month: number | undefined = monthColumn
        ? getMonthNumber(monthColumn.values[index])
        : undefined;
      return Number.isFinite(day) && day >= 1 && day <= 31 && month !== undefined
        ? new Date(year, month, day)
        : undefined;
    });
  }

  // Some connectors mark the day level as non-temporal even though it belongs
  // to the same date hierarchy. In that case parseInputDates can return a valid
  // first-of-month placeholder; rebuild from the selected Year, Month and Day
  // values so the date labels do not collapse onto the first day of each month.
  if (granularity === "date" && monthColumn) {
    dates = idxs.map((index, row) => {
      const value: powerbi.PrimitiveValue = period.column.values[index];
      const directDate: Date | undefined = parseHierarchyDate(value);
      if (directDate) return directDate;
      const day: number = Number(String(value).match(/^\s*(\d{1,2})\s*$/)?.[1]);
      const month: number | undefined = getMonthNumber(monthColumn.values[index]);
      const year: number | undefined = rawYears[row];
      if (year !== undefined && month !== undefined && Number.isFinite(day) && day >= 1 && day <= 31) {
        return new Date(year, month, day);
      }
      return dates?.[row];
    });
  }

  const years: (number | undefined)[] = rawYears.map((year, index) =>
    year ?? (dates?.[index] instanceof Date ? dates[index]!.getFullYear() : undefined)
  );

  return { granularity, dates, periodLabels, years };
}

export default function extractDataColumn<T extends TargetT>(inputView: DataViewCategorical,
                                              name: string,
                                              inputSettings: settingsValueType,
                                              idxs: number[]): ArrayUndefined<T> | undefined {
  if (name === "key") {
    return extractKeys(inputView, inputSettings, idxs) as ArrayUndefined<T>;
  }
  if (name === "tooltips") {
    return extractTooltips(inputView, inputSettings, idxs) as ArrayUndefined<T>;
  }

  const columnRaw = inputView.values!.filter(viewColumn => viewColumn?.source?.roles?.[name]) as DataViewValueColumn[];
  if (columnRaw.length === 0) {
    return undefined;
  }
  const n_keys: number = idxs.length;
  if (name === "groupings" || name === "labels") {
    let ret = new Array<string | undefined>(n_keys);
    for (let i = 0; i < n_keys; i++) {
      ret[i] = isNullOrUndefined(columnRaw?.[0]?.values?.[idxs[i]]) ? undefined : String(columnRaw[0].values[idxs[i]]);
    }
    return ret as ArrayUndefined<T>;
  }
  // Assumed that any other requested columns are numeric columns for plotting
  let ret = new Array<number | undefined>(n_keys);
  for (let i = 0; i < n_keys; i++) {
    ret[i] = isNullOrUndefined(columnRaw?.[0]?.values?.[idxs[i]]) ? undefined : Number(columnRaw[0].values[idxs[i]]);
  }
  return ret as ArrayUndefined<T>;
}
