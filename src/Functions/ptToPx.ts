/**
 * Omregn point til CSS-pixels.
 *
 * Power BI angiver skriftstørrelser i point (12 i formateringsruden er
 * 12 pt = 16 px). Bruges størrelsen ufortolket som `px`, bliver teksten
 * en fjerdedel mindre end i Power BI's egne visuals.
 *
 * Bruges til pladsberegninger i pixels, hvor en størrelse i punkter skal
 * lægges sammen med en margen. Selve teksten får enheden `pt` direkte.
 *
 * @param points - Størrelse i point
 */
export default function ptToPx(points: number): number {
  return points * 4 / 3;
}
