/**
 * Udvider en lineær akses domæne, så datapunkterne ligger et antal pixels
 * inde fra aksens kanter, mens aksen selv stadig fylder hele sit område.
 *
 * Bruges til at give datoetiketterne ved første og sidste punkt plads inden
 * for grafen. Et punkt på kanten har en etiket, der står delvist uden for
 * grafen; med luft ind fra kanten ligger den inde.
 *
 * Sammenhængen: skal data fylde `rangeWidth - left - right` pixels, er der
 * `ppu` pixels pr. enhed, og domænet udvides med `left / ppu` og
 * `right / ppu`. Så ligger det laveste punkt præcis `left` pixels fra
 * venstre kant og det højeste `right` pixels fra højre.
 *
 * @param lower - Laveste datavværdi
 * @param upper - Højeste datavværdi
 * @param rangeWidth - Aksens bredde i pixels
 * @param insetLeft - Luft i pixels mellem venstre kant og laveste punkt
 * @param insetRight - Luft i pixels mellem højeste punkt og højre kant
 * @returns Det udvidede domæne. Uændret, hvis der ikke er noget at udvide
 *   med, eller aksen er degenereret.
 */
export default function insetDomain(lower: number,
                                    upper: number,
                                    rangeWidth: number,
                                    insetLeft: number,
                                    insetRight: number): [number, number] {
  const span: number = upper - lower;
  let left: number = Number.isFinite(insetLeft) ? Math.max(0, insetLeft) : 0;
  let right: number = Number.isFinite(insetRight) ? Math.max(0, insetRight) : 0;

  if (!(span > 0) || !(rangeWidth > 0) || (left === 0 && right === 0)) {
    return [lower, upper];
  }

  // Data skal beholde mindst halvdelen af aksen. På et meget smalt diagram
  // ville luften ellers æde hele plottet.
  const total: number = left + right;
  const maxTotal: number = rangeWidth * 0.5;
  if (total > maxTotal) {
    left *= maxTotal / total;
    right *= maxTotal / total;
  }

  const pixelsPerUnit: number = (rangeWidth - left - right) / span;
  return [lower - left / pixelsPerUnit, upper + right / pixelsPerUnit];
}
