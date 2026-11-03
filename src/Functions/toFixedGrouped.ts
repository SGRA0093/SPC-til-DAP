/**
 * Formatér et tal på dansk: punktum som tusindtalsseparator, komma som
 * decimalmarkør. Svarer til det, Power BI's egne akser viser i en dansk
 * rapport (2.000, 1.250,5).
 *
 * Bruges til aksemærker. `toFixedComma` grupperer ikke og bruges stadig
 * til værdietiketter, så de er uændrede.
 *
 * @param value - Tallet der skal formateres
 * @param decimals - Antal decimaler
 */
export default function toFixedGrouped(value: number, decimals: number): string {
  const fixed: string = Math.abs(value).toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split(".");
  const grouped: string = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // Et tal, der afrundes til nul, må ikke få et minus (fx -0,0).
  const sign: string = value < 0 && Number(fixed) !== 0 ? "-" : "";
  return sign + grouped + (decimalPart === undefined ? "" : "," + decimalPart);
}
