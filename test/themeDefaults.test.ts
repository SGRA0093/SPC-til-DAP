import { describe, expect, it } from "vitest";
import settingsClass from "../src/Classes/settingsClass";
import { defaultSettings } from "../src/settings";
import buildDataView from "./helpers/buildDataView";

const themePrimary = "#123456";
const runtimeDefaults = {
  lines: { colour_main: themePrimary },
  scatter: { colour: themePrimary, colour_outline: themePrimary }
};

function colourValue(settings: settingsClass, cardUid: string, propertyName: string): string {
  const card = settings.getFormattingModel().cards.find(item => item.uid === cardUid);
  const slice = card?.groups.flatMap(group => group.slices ?? []).find((item: any) =>
    item.control?.properties?.descriptor?.propertyName === propertyName
  ) as any;
  return slice?.control?.properties?.value?.value;
}

describe("Theme-aware colour defaults", () => {
  it("uses the active theme colour when no saved colour exists", () => {
    const settings = new settingsClass();
    const dataView = buildDataView({ key: ["A", "B", "C"], numerators: [1, 2, 3] });

    settings.update(dataView, [[0, 1, 2]], runtimeDefaults);

    expect(colourValue(settings, "lines_card_uid", "colour_main")).toBe(themePrimary);
    expect(colourValue(settings, "scatter_card_uid", "colour")).toBe(themePrimary);
    expect(colourValue(settings, "scatter_card_uid", "colour_outline")).toBe(themePrimary);
  });

  it("preserves colours explicitly saved in the report", () => {
    const savedSettings = JSON.parse(JSON.stringify(defaultSettings));
    savedSettings.lines.colour_main = "#AA0000";
    savedSettings.scatter.colour = "#00AA00";
    savedSettings.scatter.colour_outline = "#0000AA";
    const settings = new settingsClass();
    const dataView = buildDataView(
      { key: ["A", "B", "C"], numerators: [1, 2, 3] },
      savedSettings
    );

    settings.update(dataView, [[0, 1, 2]], runtimeDefaults);

    expect(colourValue(settings, "lines_card_uid", "colour_main")).toBe("#AA0000");
    expect(colourValue(settings, "scatter_card_uid", "colour")).toBe("#00AA00");
    expect(colourValue(settings, "scatter_card_uid", "colour_outline")).toBe("#0000AA");
  });
});
