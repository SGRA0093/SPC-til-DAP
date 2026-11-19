/**
 * Vurdering af en proces som Reagér, Studér eller Observér, efter
 * "Specifikation til SPC Oversigtsvisning".
 *
 * Funktionen er ren: ingen D3, ingen Power BI-typer. Den får tallene fra
 * Anhøj-analysen (anhojRunsAnalysis) og fra diagrammets linjer og returnerer
 * kun, hvilken vurdering der gælder og hvorfor. Teksterne bygges i
 * assessmentText.ts.
 *
 * Fire forhold afgør vurderingen:
 *   1. Er processen stabil? (Ingen lang serie og ikke for få kryds.)
 *   2. Hvad er udviklingsmålet?
 *   3. Er en høj eller en lav værdi god? (Udviklingsmålets retning.)
 *   4. Ligger det seneste punkt i en ønsket eller uønsket retning ift.
 *      centerlinjen?
 */

export type processStatus = "reagér" | "studér" | "observér";

/**
 * Hvilket af spec'ens fem tilfælde, der gælder. Teksten vælges ud fra denne,
 * ikke ud fra statusordet, fordi to tilfælde giver Studér og to giver
 * Observér/Studér med hvert sit budskab.
 */
export type assessmentCase =
  | "unstable_undesired"
  | "unstable_desired"
  | "unstable_unknown_direction"
  | "unstable_beyond_limits"
  | "stable_target_missed"
  | "stable_target_met"
  | "stable_no_target";

/** Hvilken vej der er den gode, afledt af udviklingsmålets retning. */
export type improvementDirection = "higher" | "lower" | "unknown";

/** Færrest målinger, før en vurdering giver mening (samme grænse som DAX-measuren). */
export const MIN_POINTS_FOR_ASSESSMENT: number = 6;

export type assessmentInput = {
  /** Antal målinger i serien, før punkter på centerlinjen fjernes. */
  n_points: number;
  /** Har Anhøj-reglen om lange serier slået til (og er den slået til i indstillingerne)? */
  long_run_signal: boolean;
  /** Har Anhøj-reglen om for få kryds slået til (og er den slået til i indstillingerne)? */
  few_crossings_signal: boolean;
  /** Antal punkter uden for 99%-kontrolgrænserne; null for seriediagrammer. */
  n_beyond_limits: number | null;
  /** Centerlinjen i den seneste fase: medianen på et seriediagram. */
  centerline: number | undefined;
  /** Seneste observation. */
  latest: number | undefined;
  /** Udviklingsmålets værdi, hvis det findes. */
  target: number | undefined;
  /** Udviklingsmålets retning: ">=", "<=", ">", "<" eller "none". */
  operator: string;
};

export type processAssessment = {
  status: processStatus;
  case: assessmentCase;
  stable: boolean;
  reasons: { few_crossings: boolean; long_run: boolean; beyond_limits: boolean };
};

/**
 * "Mindst" og "over" betyder, at høj er god; "højst" og "under", at lav er
 * god. Uden retning kan det ikke afgøres, og der gættes ikke.
 */
export function improvementDirection(operator: string): improvementDirection {
  if (operator === ">=" || operator === ">") {
    return "higher";
  }
  if (operator === "<=" || operator === "<") {
    return "lower";
  }
  return "unknown";
}

function isNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function targetMet(centerline: number, target: number, operator: string): boolean {
  switch (operator) {
    case ">=": return centerline >= target;
    case ">": return centerline > target;
    case "<=": return centerline <= target;
    case "<": return centerline < target;
    default: return false;
  }
}

/**
 * @returns Vurderingen, eller null når serien er for kort til, at den kan
 *   vurderes (færre end MIN_POINTS_FOR_ASSESSMENT målinger).
 */
export function assessProcess(input: assessmentInput): processAssessment | null {
  if (input.n_points < MIN_POINTS_FOR_ASSESSMENT) {
    return null;
  }

  const reasons = {
    few_crossings: input.few_crossings_signal,
    long_run: input.long_run_signal,
    beyond_limits: input.n_beyond_limits !== null && input.n_beyond_limits > 0
  };
  const stable: boolean = !reasons.few_crossings && !reasons.long_run && !reasons.beyond_limits;
  const direction: improvementDirection = improvementDirection(input.operator);

  if (!stable) {
    // Et punkt uden for kontrolgrænserne er et signal om særlig årsagsvariation.
    // Hvis det ikke samtidig er en runs-regel, kan retningen ikke udledes af
    // det seneste punkt alene (det kan være et tidligere punkt i fasen).
    if (reasons.beyond_limits && !reasons.few_crossings && !reasons.long_run) {
      return { status: "studér", case: "unstable_beyond_limits", stable, reasons };
    }
    // Udsvinget er det seneste punkts afstand til centerlinjen. Ligger det
    // præcis på linjen, eller mangler retningen, kan udsvinget ikke kaldes
    // hverken ønsket eller uønsket, og det forsigtige Studér gælder.
    const hasDeviation: boolean = isNumber(input.latest) && isNumber(input.centerline)
                                  && input.latest !== input.centerline;
    if (direction === "unknown" || !hasDeviation) {
      return { status: "studér", case: "unstable_unknown_direction", stable, reasons };
    }
    const deviation: number = (input.latest as number) - (input.centerline as number);
    const desired: boolean = direction === "higher" ? deviation > 0 : deviation < 0;
    return desired
      ? { status: "studér", case: "unstable_desired", stable, reasons }
      : { status: "reagér", case: "unstable_undesired", stable, reasons };
  }

  // Stabil proces. Et mål uden retning kan ikke vurderes og behandles som
  // intet mål, frem for at antage en retning brugeren ikke har valgt.
  const hasTarget: boolean = isNumber(input.target) && direction !== "unknown";
  if (!hasTarget || !isNumber(input.centerline)) {
    return { status: "observér", case: "stable_no_target", stable, reasons };
  }
  return targetMet(input.centerline, input.target as number, input.operator)
    ? { status: "observér", case: "stable_target_met", stable, reasons }
    : { status: "studér", case: "stable_target_missed", stable, reasons };
}

const statusLabels: Record<processStatus, string> = {
  "reagér": "Reagér",
  "studér": "Studér",
  "observér": "Observér"
};

export function statusLabel(status: processStatus): string {
  return statusLabels[status];
}
