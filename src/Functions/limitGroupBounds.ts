/**
 * Fasegrænser i grænsernes indeks frem for i datasættets rækker.
 *
 * Faserne er dannet ud fra rækkerne, men grænserne har ikke nødvendigvis én
 * post per række: et MR-kort har én variationsbredde mindre end antallet af
 * punkter i hver fase. Alt, der slår op i grænserne per fase — signaler,
 * signaltal, stiplingen af centerlinjen og kontrolgrænse-båndet — skal derfor
 * have fasegrænserne i grænsernes indeks, ellers havner tallene i den forkerte
 * periode.
 *
 * Nøglernes x er rækkens position og bevares af grænseberegningen, også når
 * et punkt falder bort, så hver grænse kan føres tilbage til sin fase.
 *
 * @param keys - Grænsernes nøgler, i rækkefølge
 * @param rowBounds - Faserne som [start, slut) i rækker
 * @returns Faserne som [start, slut) i grænsernes indeks
 */
export default function limitGroupBounds(keys: readonly { x: number }[],
                                         rowBounds: readonly number[][]): number[][] {
  let i: number = 0;
  return rowBounds.map(([, end]) => {
    const start: number = i;
    while (i < keys.length && keys[i].x < end) {
      i++;
    }
    return [start, i];
  });
}
