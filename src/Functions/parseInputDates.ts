import type powerbi from "powerbi-visuals-api"
import isNullOrUndefined from "./isNullOrUndefined";

const monthNameToNumber: { [key: string]: number } = {
  "January": 0,
  "February": 1,
  "March": 2,
  "April": 3,
  "May": 4,
  "June": 5,
  "July": 6,
  "August": 7,
  "September": 8,
  "October": 9,
  "November": 10,
  "December": 11
};


function temporalTypeToKey(
  inputType: { temporal?: boolean, category?: string },
  inputValue: powerbi.PrimitiveValue
): (string | number | Date)[] {
  const category: string = inputType?.category ?? "";

  // A Date level can be exposed as a real Date value rather than as the
  // separate Year / Month / DayOfMonth categories used by other connectors.
  if (category.toLowerCase() === "date" || category.toLowerCase() === "dates") {
    if (inputValue instanceof Date && Number.isFinite(inputValue.getTime())) {
      return ["date", new Date(inputValue.getTime())];
    }
    if (typeof inputValue === "string") {
      const match: RegExpMatchArray | null = inputValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (match) {
        const parsed: Date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (Number.isFinite(parsed.getTime())) return ["date", parsed];
      }
    }
  }

  if (!inputType.temporal) {
    return [];
  }

  if (["DayOfMonth", "Days", "Day"].includes(category)) {
    return ["day", Number(inputValue)]
  } else if (["Months", "MonthOfYear"].includes(inputType?.["category"] ?? "")) {
    const numericMonth = Number(inputValue);
    const monthValue = Number.isFinite(numericMonth) && numericMonth >= 1 && numericMonth <= 12
      ? numericMonth - 1
      : monthNameToNumber[<string>(inputValue)];
    return ["month", monthValue]
  } else if (["Weeks", "WeekOfYear", "WeekOfMonth"].includes(inputType?.["category"] ?? "")) {
    return ["week", Number(inputValue)]
  } else if (inputType?.["category"] === "Quarters") {
    return ["quarter", <string>inputValue]
  } else if (inputType?.["category"] === "Years") {
    return ["year", <number>(inputValue)]
  } else {
    return []
  }
}

type datePartsType = {
  day?: number,
  month?: number,
  week?: number,
  quarter?: string,
  year?: number,
  date?: Date
}

export default function parseInputDates(inputs: powerbi.DataViewCategoryColumn[], idxs: number[]) {
  const n_keys: number = idxs.length;
  let inputDates: (Date | undefined)[] = [];
  const inputQuarters: string[] = [];
  // If a 'Date Hierarchy' type is passed then there will be multiple 'key" entries
  if (inputs.length > 1) {
    for (let i = 0; i < n_keys; i++) {
      const datePartsArray: (string | number | Date)[][] = [];
      for (let j = 0; j < inputs.length; j++) {
        datePartsArray.push(temporalTypeToKey(inputs[j].source.type! as unknown as { temporal?: boolean, category?: string}, inputs[j].values[idxs[i]]));
      }
      const datePartsObj: datePartsType = Object.fromEntries(datePartsArray);
      if (datePartsObj?.quarter) {
        inputQuarters.push(datePartsObj.quarter)
      }
      // A week level has no native Date constructor equivalent. Use the
      // first day of the corresponding week as a stable position in the
      // year; the original week value is retained separately for its label.
      const directDate: Date | undefined = datePartsObj.date instanceof Date
        && Number.isFinite(datePartsObj.date.getTime())
        ? datePartsObj.date
        : undefined;
      inputDates[i] = directDate
        ? new Date(directDate.getTime())
        : new Date(
          datePartsObj?.year ?? 1970,
          datePartsObj?.month ?? 0,
          datePartsObj?.day ?? ((datePartsObj?.week ?? 1) - 1) * 7 + 1
        );
    }
  } else {
    for (let i = 0; i < n_keys; i++) {
      inputDates[i] = isNullOrUndefined(inputs?.[0]?.values[idxs[i]]) ? undefined : new Date(<Date>(inputs?.[0]?.values[idxs[i]]))
    }
  }
  return { dates: inputDates, quarters: inputQuarters }
}
