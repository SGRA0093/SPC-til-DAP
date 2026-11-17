import type { processAssessment } from "../Outlier Flagging/processAssessment";

/**
 * Teksten bag en vurdering, ordret efter "Specifikation til SPC
 * Oversigtsvisning". Tallene og de formaterede værdier leveres udefra, så
 * funktionen ikke selv kender til decimaler eller procenttegn.
 */

export type assessmentTextContext = {
  /** Antal målinger i serien. */
  n_points: number;
  longest_run: number | null;
  longest_run_max: number | null;
  n_crossings: number | null;
  n_crossings_min: number | null;
  /** Centerlinjen, formateret som på y-aksen. */
  centerline_text: string;
  /** Udviklingsmålet, formateret som på y-aksen. Tomt, hvis der intet mål er. */
  target_text: string;
  /** "median" på et seriediagram, ellers "centerlinje". */
  centerline_noun?: string;
};

const NL: string = "\n";

const RUN_CHART_FOOTER: string =
  "OM RUN-CHARTS" + NL +
  "Ud fra antallet af enkeltmålinger i grafen beregnes, hvor mange kryds af medianen, " +
  "man som minimum vil se i en proces der udviser naturlig (tilfældig) variation. " +
  "På samme måde beregnes hvad det maksimale antal af fortløbende enkeltmålinger " +
  "(forløb/runs), der ikke krydser medianen, vil være i en proces, der udviser " +
  "naturlig variation. Er der enten for få kryds af medianen eller for lange forløb, " +
  "er det et signal om en ustabil proces, altså en proces der udviser ikke-tilfældig variation.";

function countText(value: number | null): string {
  return value === null ? "–" : `${value}`;
}

function statsBlock(ctx: assessmentTextContext): string {
  return "Faktisk / Forventet v. naturlig variation *" + NL +
    `• Længste forløb: ${countText(ctx.longest_run)} (forventet <= ${countText(ctx.longest_run_max)})` + NL +
    `• Antal kryds: ${countText(ctx.n_crossings)} (forventet >= ${countText(ctx.n_crossings_min)})` + NL +
    `* ved en tidsserie på ${ctx.n_points} målinger.`;
}

function reasonText(assessment: processAssessment, ctx: assessmentTextContext, definite: string): string {
  const kryds: string = `for få (${countText(ctx.n_crossings)}) kryds på tværs af ${definite}`;
  const forloeb: string = `mindst ét langt forløb på ${countText(ctx.longest_run)} enkeltmålinger i træk over/under ${definite}`;
  if (assessment.reasons.few_crossings && assessment.reasons.long_run) {
    return `${kryds} og ${forloeb}`;
  }
  return assessment.reasons.few_crossings ? kryds : forloeb;
}

export function buildAssessmentText(assessment: processAssessment, ctx: assessmentTextContext): string {
  const noun: string = ctx.centerline_noun ?? "median";
  const definite: string = noun.endsWith("e") ? `${noun}n` : `${noun}en`;
  const header = (status: string, subtitle: string): string =>
    `VURDERING: ${status}` + NL + subtitle + NL + NL;
  const tail: string = NL + NL + statsBlock(ctx) + NL + NL + RUN_CHART_FOOTER;
  const unstable: string = "Run-charten viser en ustabil proces, da der ses " +
                           reasonText(assessment, ctx, definite) + ".";
  const stable: string = "Run-charten viser en stabil proces med naturlig variation.";
  const capDefinite: string = definite.charAt(0).toUpperCase() + definite.slice(1);

  switch (assessment.case) {
    case "unstable_undesired":
      return header("REAGÉR", "Ustabil proces i uønsket udvikling") + unstable +
        " I bør derfor undersøge, hvad der forårsager forringelsen, for at stoppe faldet i kvalitet." + tail;
    case "unstable_desired":
      return header("STUDÉR", "Ustabil proces i positiv udvikling") + unstable +
        " Udviklingen trækker resultatet i en ønsket retning. I bør derfor studere processen " +
        "for at finde ud af, præcis hvad der har skabt denne forbedring." + tail;
    case "unstable_unknown_direction":
      return header("STUDÉR", "Ustabil proces") + unstable +
        " Det kan ikke afgøres, om udsvinget går i en ønsket eller uønsket retning, fordi udviklingsmålets " +
        "retning ikke er angivet, eller fordi det seneste punkt ligger på " + definite + ". " +
        "I bør studere processen for at afgøre årsagen til det ikke-tilfældige udsving." + tail;
    case "stable_target_missed":
      return header("STUDÉR", "Stabil proces, men udviklingsmål ikke nået") + stable +
        ` Indikatorens ${noun} (${ctx.centerline_text}) opnår imidlertid ikke udviklingsmålet på ${ctx.target_text}. ` +
        "I bør derfor studere arbejdsgangene nærmere for at identificere årsager for at løfte niveauet." + tail;
    case "stable_target_met":
      return header("OBSERVÉR", "Stabil proces og udviklingsmål opnået") + stable +
        ` ${capDefinite} (${ctx.centerline_text}) opfylder udviklingsmålet på ${ctx.target_text}. ` +
        "Man bør derfor fortsætte den løbende overvågning." + tail;
    case "stable_no_target":
      return header("OBSERVÉR", "Stabil proces (intet udviklingsmål angivet)") + stable +
        ` ${capDefinite} ligger på ${ctx.centerline_text}. ` +
        "Da der ikke er opsat et udviklingsmål, bør man fortsætte den løbende overvågning." + tail;
  }
}
