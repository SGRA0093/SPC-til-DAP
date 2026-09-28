# AppSource

Det, der skal til for at udgive SPC til DAP i AppSource. Indsendelsen sker i
Microsoft Partner Center. Tjek de aktuelle krav dér — de ændrer sig.

## Klar i repoet

- [x] Visual-pakken: `pbiviz package` → `dist/DAPSPC.<version>.pbiviz`
- [x] Stort ikon (300 × 300 px): `assets/large-icon.png`
- [x] Privatlivspolitik: `privacy-policy.md` (brug linket til filen på GitHub)
- [x] Support-link: <https://github.com/johanreventlow/SPC-til-DAP/issues>

## Mangler — laves i Power BI Desktop

- [ ] Skærmbilleder (1–5, 1366 × 768 px, PNG) af visualen i en rigtig rapport
- [ ] Eksempelrapport (`.pbix`) med data, der viser visualen og dens signaler

## Beslutninger

- **Licens (EULA):** Microsofts standardkontrakt anbefales frem for en egen
  PDF. Koden er GPL-3.0 (`LICENSE.md`), hvilket standardkontrakten ikke ændrer.
- **Konto:** kræver en Partner Center-konto for udgiveren.

## Udkast til butikstekst

**Kort beskrivelse:** SPC-diagrammer med automatisk signaldetektion efter den
danske metode til statistisk proceskontrol.

**Beskrivelse:** SPC til DAP viser seriediagrammer og kontrolkort med
automatisk signaldetektion: usædvanligt lange serier, for få kryds og
observationer uden for kontrolgrænserne. Brugerfladen er på dansk, diagramtypen
vælges efter typen af tal (måling, procent, rate, antal), og en advarsel på
lærredet fanger nævnere, som diagramtypen ikke bruger. Udgivet af Bispebjerg og
Frederiksberg Hospital. Bygger på AUS-DOH-Safety-and-Quality/PowerBI-SPC.
