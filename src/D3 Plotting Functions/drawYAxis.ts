import * as d3 from "./D3 Modules";
import yAxisDecimals from "../Functions/yAxisDecimals";
import toFixedGrouped from "../Functions/toFixedGrouped";
import type { axisProperties } from "../Classes/plotPropertiesClass";
import type { svgBaseType, Visual } from "../visual";

export default function drawYAxis(selection: svgBaseType, visualObj: Visual) {
  const yAxisGroup = selection.select(".yaxisgroup") as d3.Selection<SVGGElement, unknown, null, undefined>;
  const yAxisLabel = selection.select(".yaxislabel") as d3.Selection<SVGTextElement, unknown, null, undefined>;
  if (!visualObj.viewModel.inputSettings.settings[0].y_axis.ylimit_show) {
    // Y Axis plotting is disabled, so remove any existing axis and return early
    yAxisGroup.remove();
    yAxisLabel.remove();
    return;
  }
  // If the groups have been removed, re-add them
  if (yAxisGroup.empty()) {
    selection.append('g').classed("yaxisgroup", true);
  }
  if (yAxisLabel.empty()) {
    selection.append('text').classed('yaxislabel', true);
  }

  const yAxisProperties: axisProperties = visualObj.plotProperties.yAxis;
  const yAxis: d3.Axis<number> = d3.axisLeft(visualObj.plotProperties.yScale);
  const sig_figs: number = yAxisDecimals(visualObj);
  const displayPlot: boolean = visualObj.plotProperties.displayPlot;

  if (yAxisProperties.ticks) {
    if (yAxisProperties.tick_count) {
      yAxis.ticks(yAxisProperties.tick_count)
    }
    if (visualObj.viewModel.inputData.length > 0 && visualObj.viewModel.inputData[0]) {
      const derivedSettings = visualObj.viewModel.inputSettings.derivedSettings[0];
      yAxis.tickFormat(
        (d: number) => {
          return derivedSettings.percentLabels
            ? toFixedGrouped(d.valueOf(), sig_figs) + "%"
            : toFixedGrouped(d.valueOf(), sig_figs);
        }
      );
    }
  } else {
    yAxis.tickValues([]);
  }

  // Gitterlinjer: aksemærkerne tegnes over hele plotbredden i stedet for som
  // små streger ved aksen. Uden gitter er der ingen mærkestreger, som i
  // Power BI's egne diagrammer.
  const gridWidth: number = visualObj.viewModel.svgWidth
                            - visualObj.plotProperties.xAxis.end_padding
                            - visualObj.plotProperties.xAxis.start_padding;
  yAxis.tickSizeOuter(0)
       .tickSizeInner(yAxisProperties.grid && displayPlot && yAxisProperties.ticks ? -gridWidth : 0);

  yAxisGroup
      .call(yAxis)
      .attr("color", displayPlot ? yAxisProperties.colour : "#FFFFFF")
      .attr("transform", `translate(${visualObj.plotProperties.xAxis.start_padding}, 0)`)
      .selectAll(".tick text")
      // Right-align
      .style("text-anchor", "right")
      // Rotate tick labels
      .attr("transform", `rotate(${yAxisProperties.tick_rotation})`)
      // Scale font
      .style("font-size", yAxisProperties.tick_size)
      .style("font-family", yAxisProperties.tick_font)
      .style("fill", displayPlot ? yAxisProperties.tick_colour : "#FFFFFF");

  // Remove only the vertical axis baseline; horizontal grid lines and labels remain.
  yAxisGroup.select(".domain").style("display", "none");

  yAxisGroup.selectAll(".tick line")
            .style("stroke", yAxisProperties.grid_colour)
            .style("stroke-width", yAxisProperties.grid_width);

    let textX: number;
    const textY: number = visualObj.viewModel.svgHeight / 2;
    if (visualObj.viewModel.frontend) {
      // Non-PBI fronted doesn't have good bbox/boundingClientRect support
      // so use padding as best approximation
      textX = visualObj.plotProperties.xAxis.start_padding / 2;
    } else {
      const yAxisNode: SVGGElement = selection.selectAll(".yaxisgroup").node() as SVGGElement;
      if (!yAxisNode) {
        selection.select(".yaxislabel")
                  .style("fill", displayPlot ? yAxisProperties.label_colour : "#FFFFFF");
        return;
      }
      const yAxisCoordinates: DOMRect = yAxisNode.getBoundingClientRect() as DOMRect;
      textX = yAxisCoordinates.x * 0.7;
    }

    selection.select(".yaxislabel")
        .attr("x", textX)
        .attr("y", textY)
        .attr("transform", `rotate(-90, ${textX}, ${textY})`)
        .text(yAxisProperties.label)
        .style("text-anchor", "middle")
        .style("font-size", yAxisProperties.label_size)
        .style("font-family", yAxisProperties.label_font)
        .style("fill", displayPlot ? yAxisProperties.label_colour : "#FFFFFF");
}
