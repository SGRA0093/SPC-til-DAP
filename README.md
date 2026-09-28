# SPC til DAP

Power BI-visual til SPC-diagrammer (statistisk proceskontrol) med automatisk
signaldetektion efter den danske metode, som implementeret i R-pakken
[`qicharts2`](https://github.com/anhoej/qicharts2). Udgivet af Bispebjerg og
Frederiksberg Hospital.

## Hvad den gør

- **Seriediagrammer og kontrolkort**, inkl. I′-kortet (normaliseret
  individkort) til målinger med varierende nævner.
- **Signaler:** usædvanligt lange serier og for få kryds stipler centerlinjen;
  punkter uden for kontrolgrænserne fremhæves.
- **Signalpanel** ved siden af diagrammet med de faktiske tal over for de
  forventede. Samme tal står i tooltippet.
- **Dansk brugerflade** med decimalkomma. Diagramtypen vælges efter typen af tal,
  og en advarsel på lærredet fanger en nævner, som diagramtypen ikke bruger.

## Installation

Hent `.pbiviz`-filen fra [Releases](https://github.com/johanreventlow/SPC-til-DAP/releases).
I Power BI: **Visualiseringer → ⋯ → Importér en visual fra en fil**.

Læg felter i **Værdi/Tæller**, **X akse** og eventuelt **Nævner**.
**Gruppering (oversigtstabel)** viser flere indikatorer som en tabel.

## Byg og test

```
npm install
npx pbiviz package   # → dist/
npm test             # Vitest i headless Chromium
```

En udgivelse skæres fra et tag (`v1.0.0.1`), når versionen er rettet i både
`pbiviz.json` og `package.json`; release-noterne hentes fra `NEWS.md`.

## Licens og kreditering

GPL-3.0, se `LICENSE.md`. Visualen bygger på
[AUS-DOH-Safety-and-Quality/PowerBI-SPC](https://github.com/AUS-DOH-Safety-and-Quality/PowerBI-SPC)
ved commit `7fc0f5f` (13. august 2026), udviklet af Safety and Quality-teamet i
Western Australias sundhedsministerium.

Fejl og ønsker: [Issues](https://github.com/johanreventlow/SPC-til-DAP/issues).
