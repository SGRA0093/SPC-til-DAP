import type powerbi from "powerbi-visuals-api";
type VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import type { svgBaseType } from "../visual";
import initialiseSVG from "./initialiseSVG";
import { type colourPaletteType } from "../Classes/viewModelClass";

export default function drawErrors(selection: svgBaseType,
                                    options: VisualUpdateOptions,
                                    colourPalette: colourPaletteType,
                                    message: string,
                                    type: string) {
  selection.call(initialiseSVG, true);
  const errMessageSVG = selection.append("g").classed("errormessage", true);

  if (type !== "") {
    const preamble: Record<string, string> = {
      // Den interne fejl er en fejl i visualen, ikke i brugerens data, og
      // peger derfor på, hvor den skal rapporteres.
      "internal": "Intern fejl. Rapportér den på github.com/johanreventlow/SPC-til-DAP/issues med denne tekst:",
      "settings": "Ugyldige indstillinger for alle observationer. Første fejl:"
    }
    errMessageSVG.append('text')
                .attr("x",options.viewport.width / 2)
                .attr("y",options.viewport.height / 3)
                .style("text-anchor", "middle")
                .text(preamble[type])
                .style("font-size", "10px")
                .style("fill", colourPalette.foregroundColour)
  }

  errMessageSVG.append('text')
                .attr("x",options.viewport.width / 2)
                .attr("y",options.viewport.height / 2)
                .style("text-anchor", "middle")
                .text(message)
                .style("font-size", "10px")
                .style("fill", colourPalette.foregroundColour);
}
