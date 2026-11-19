import { describe, it, expect } from "vitest";
import {
  assessProcess, improvementDirection, MIN_POINTS_FOR_ASSESSMENT,
  type assessmentInput
} from "../../src/Outlier Flagging/processAssessment";
import { buildAssessmentText } from "../../src/Functions/assessmentText";

// Fire tilfælde fra "Specifikation til SPC Oversigtsvisning" plus kanterne,
// spec'en ikke afgør: manglende retning, punkt på centerlinjen, for kort serie.

const stableBase: assessmentInput = {
  n_points: 24, long_run_signal: false, few_crossings_signal: false,
  n_beyond_limits: 0, centerline: 80, latest: 82, target: 85, operator: ">="
};
const unstableBase: assessmentInput = { ...stableBase, few_crossings_signal: true };

describe("improvementDirection", () => {
  it("læser retningen fra udviklingsmålets operator", () => {
    expect(improvementDirection(">=")).toBe("higher");
    expect(improvementDirection(">")).toBe("higher");
    expect(improvementDirection("<=")).toBe("lower");
    expect(improvementDirection("<")).toBe("lower");
    expect(improvementDirection("none")).toBe("unknown");
  });
});

describe("assessProcess — ustabil proces", () => {
  it("Reagér når udsvinget går i uønsket retning (høj er god, seneste punkt under medianen)", () => {
    const a = assessProcess({ ...unstableBase, latest: 70 })!;
    expect(a.status).toBe("reagér");
    expect(a.case).toBe("unstable_undesired");
  });

  it("Studér når udsvinget går i ønsket retning (høj er god, seneste punkt over medianen)", () => {
    const a = assessProcess({ ...unstableBase, latest: 90 })!;
    expect(a.status).toBe("studér");
    expect(a.case).toBe("unstable_desired");
  });

  it("vender retningen om, når lav er god", () => {
    expect(assessProcess({ ...unstableBase, operator: "<=", latest: 90 })!.status).toBe("reagér");
    expect(assessProcess({ ...unstableBase, operator: "<=", latest: 70 })!.status).toBe("studér");
  });

  it("udløses af en lang serie lige så vel som af for få kryds", () => {
    const a = assessProcess({ ...stableBase, long_run_signal: true, latest: 70 })!;
    expect(a.status).toBe("reagér");
    expect(a.reasons).toEqual({ few_crossings: false, long_run: true, beyond_limits: false });
  });

  it("falder tilbage til Studér uden retning, frem for at gætte", () => {
    const a = assessProcess({ ...unstableBase, operator: "none", latest: 70 })!;
    expect(a.status).toBe("studér");
    expect(a.case).toBe("unstable_unknown_direction");
  });

  it("falder tilbage til Studér, når seneste punkt ligger på centerlinjen", () => {
    const a = assessProcess({ ...unstableBase, latest: 80 })!;
    expect(a.case).toBe("unstable_unknown_direction");
  });

  it("behandler punkter uden for kontrolgrænserne som et ustabilitetssignal", () => {
    const a = assessProcess({ ...stableBase, n_beyond_limits: 2 })!;
    expect(a.stable).toBe(false);
    expect(a.status).toBe("studér");
    expect(a.case).toBe("unstable_beyond_limits");
    expect(a.reasons.beyond_limits).toBe(true);
  });
});

describe("assessProcess — stabil proces", () => {
  it("Studér når medianen ikke opfylder målet", () => {
    const a = assessProcess({ ...stableBase, centerline: 80, target: 85 })!;
    expect(a.status).toBe("studér");
    expect(a.case).toBe("stable_target_missed");
  });

  it("Observér når medianen opfylder målet", () => {
    const a = assessProcess({ ...stableBase, centerline: 90, target: 85 })!;
    expect(a.status).toBe("observér");
    expect(a.case).toBe("stable_target_met");
  });

  it("skelner mellem ≥ og > når medianen er lig målet", () => {
    expect(assessProcess({ ...stableBase, centerline: 85, target: 85, operator: ">=" })!.case).toBe("stable_target_met");
    expect(assessProcess({ ...stableBase, centerline: 85, target: 85, operator: ">" })!.case).toBe("stable_target_missed");
  });

  it("vender sammenligningen, når lav er god", () => {
    expect(assessProcess({ ...stableBase, operator: "<=", centerline: 10, target: 12 })!.case).toBe("stable_target_met");
    expect(assessProcess({ ...stableBase, operator: "<=", centerline: 14, target: 12 })!.case).toBe("stable_target_missed");
  });

  it("Observér uden mål", () => {
    const a = assessProcess({ ...stableBase, target: undefined })!;
    expect(a.status).toBe("observér");
    expect(a.case).toBe("stable_no_target");
  });

  it("behandler et mål uden retning som intet mål", () => {
    expect(assessProcess({ ...stableBase, operator: "none" })!.case).toBe("stable_no_target");
  });
});

describe("assessProcess — for kort serie", () => {
  it("giver ingen vurdering under grænsen", () => {
    expect(assessProcess({ ...stableBase, n_points: MIN_POINTS_FOR_ASSESSMENT - 1 })).toBeNull();
    expect(assessProcess({ ...stableBase, n_points: MIN_POINTS_FOR_ASSESSMENT })).not.toBeNull();
  });
});

describe("buildAssessmentText", () => {
  const ctx = {
    n_points: 24, longest_run: 12, longest_run_max: 7, n_crossings: 3, n_crossings_min: 8,
    n_beyond_limits: 0, centerline_text: "80,0%", target_text: "85,0%"
  };

  it("nævner begge årsager, når begge regler er brudt", () => {
    const a = assessProcess({ ...unstableBase, long_run_signal: true, latest: 70 })!;
    const text = buildAssessmentText(a, ctx);
    expect(text).toContain("VURDERING: REAGÉR");
    expect(text).toContain("for få (3) kryds på tværs af medianen og mindst ét langt forløb på (12) enkeltmålinger");
  });

  it("fletter median og mål ind, når målet ikke er nået", () => {
    const a = assessProcess({ ...stableBase })!;
    const text = buildAssessmentText(a, ctx);
    expect(text).toContain("VURDERING: STUDÉR");
    expect(text).toContain("median (80,0%) opnår imidlertid ikke udviklingsmålet på (85,0%)");
  });

  it("udelader statistikblokken med faktisk mod forventet naturlig variation", () => {
    const text = buildAssessmentText(assessProcess({ ...stableBase })!, ctx);
    expect(text).not.toContain("Faktisk / Forventet v. naturlig variation");
    expect(text).not.toContain("Længste forløb:");
    expect(text).not.toContain("Antal kryds:");
  });

  it("nævner antal punkter uden for 99%-grænserne i vurderingen", () => {
    const a = assessProcess({ ...stableBase, n_beyond_limits: 2 })!;
    const text = buildAssessmentText(a, { ...ctx, n_beyond_limits: 2 });
    expect(text).toContain("(2) punkter ligger uden for 99%-kontrolgrænserne");
    expect(text).toContain("Punkter uden for 99%-kontrolgrænserne");
  });

  it("sætter altid tal i diagramforklaringen i parentes", () => {
    const runAssessment = assessProcess({ ...unstableBase, long_run_signal: true, latest: 70 })!;
    const runText = buildAssessmentText(runAssessment, ctx);
    expect(runText).toContain("for få (3) kryds");
    expect(runText).toContain("langt forløb på (12) enkeltmålinger");

    const beyondAssessment = assessProcess({ ...stableBase, n_beyond_limits: 2 })!;
    const beyondText = buildAssessmentText(beyondAssessment, { ...ctx, n_beyond_limits: 2 });
    expect(beyondText).toContain("da (2) punkter ligger uden for 99%-kontrolgrænserne");

    const targetText = buildAssessmentText(assessProcess({ ...stableBase })!, ctx);
    expect(targetText).toContain("udviklingsmålet på (85,0%)");
  });

  it("bruger en generisk diagramformulering frem for altid at nævne Run-chart", () => {
    const text = buildAssessmentText(assessProcess({ ...stableBase })!, ctx);
    expect(text).toContain("Diagrammet viser en stabil proces");
    expect(text).not.toContain("Run-charten");
  });

  it("udelader kontrolgrænsetallet for et seriediagram uden kontrolgrænser", () => {
    const text = buildAssessmentText(assessProcess({ ...stableBase, n_beyond_limits: null })!,
      { ...ctx, n_beyond_limits: null });
    expect(text).not.toContain("99%-kontrolgrænserne");
  });

  it("bruger 'centerlinjen' i stedet for 'medianen' uden for seriediagrammer", () => {
    const a = assessProcess({ ...unstableBase, latest: 70 })!;
    const text = buildAssessmentText(a, { ...ctx, centerline_noun: "centerlinje" });
    expect(text).toContain("kryds på tværs af centerlinjen");
  });

  it("skelner mellem mål og intet mål i Observér", () => {
    const met = buildAssessmentText(assessProcess({ ...stableBase, centerline: 90 })!, ctx);
    const none = buildAssessmentText(assessProcess({ ...stableBase, target: undefined })!, ctx);
    expect(met).toContain("opfylder udviklingsmålet på (85,0%)");
    expect(none).toContain("Da der ikke er opsat et udviklingsmål");
  });
});
