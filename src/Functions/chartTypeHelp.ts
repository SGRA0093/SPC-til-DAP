/** General explanation shown from the panel's help icon for the selected chart. */
const chartTypeHelpText: Record<string, string> = {
  run: "Et seriediagram viser målingerne over tid med medianen som centerlinje. Det bruges til at vurdere, om variationen er tilfældig, eller om der er tegn på særlige mønstre, fx lange forløb eller for få kryds af medianen.",
  i: "I-kort viser individuelle målinger over tid. Centerlinje og kontrolgrænser bruges til at skelne almindelig procesvariation fra signaler om særlige årsager.",
  ip: "I'-kort viser individuelle målinger som proportioner eller rater, når observationerne beregnes i forhold til en nævner. Kontrolgrænser hjælper med at vurdere, om variationen er forventelig.",
  i_m: "I-kort (median) viser individuelle målinger med medianen som centerlinje. Medianen er mindre følsom over for ekstreme observationer end gennemsnittet.",
  i_mm: "I-kort (median, median-MR) viser individuelle målinger og bruger medianbaserede estimater til at beregne kontrolgrænserne.",
  mr: "MR-kort viser den bevægelige spændvidde mellem på hinanden følgende målinger. Det bruges til at følge den kortsigtede variation i processen.",
  p: "P-kort følger andelen af enheder med en bestemt hændelse eller fejl. Det tager højde for, at stikprøvestørrelsen kan variere.",
  pp: "P'-kort følger andelen med justerede kontrolgrænser, når almindelige P-kort-grænser ikke er hensigtsmæssige, fx ved meget små eller store andele.",
  u: "U-kort følger antal hændelser pr. enhed, når antallet af undersøgte enheder kan variere fra periode til periode.",
  up: "U'-kort følger hændelsesraten pr. enhed med justerede kontrolgrænser, når almindelige U-kort-grænser ikke er hensigtsmæssige.",
  c: "C-kort følger antallet af hændelser eller fejl pr. fast enhed. Det forudsætter en ensartet mulighed for hændelser fra måling til måling.",
  xbar: "Xbar-kort følger gennemsnittet af grupperede målinger over tid og bruges til at overvåge processens niveau.",
  s: "S-kort følger spredningen inden for grupper af målinger over tid og bruges til at overvåge processens variation.",
  g: "G-kort følger antallet af muligheder eller enheder mellem sjældne hændelser. Det kan synliggøre ændringer i, hvor ofte hændelser opstår.",
  t: "T-kort følger tiden eller antallet af dage mellem sjældne hændelser. Det kan synliggøre, om tiden mellem hændelser ændrer sig."
};


export default function chartTypeHelp(chartType: string): string {
  return chartTypeHelpText[chartType] ?? "Diagrammet viser målingerne over tid. Se diagramtype og datagrundlag for, hvordan variation og signaler fortolkes.";
}
