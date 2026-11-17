import { describe, expect, test } from "vitest";
import toFixedGrouped from "../../src/Functions/toFixedGrouped";

describe("toFixedGrouped", () => {
  test("grupperer med punktum fra fire cifre og op", () => {
    expect(toFixedGrouped(999, 0)).toBe("999");
    expect(toFixedGrouped(2000, 0)).toBe("2.000");
    expect(toFixedGrouped(1234567, 0)).toBe("1.234.567");
  });

  test("bruger komma som decimalmarkør", () => {
    expect(toFixedGrouped(1250.5, 1)).toBe("1.250,5");
    expect(toFixedGrouped(0.25, 2)).toBe("0,25");
  });

  test("negative tal får minus foran gruppen", () => {
    expect(toFixedGrouped(-200, 0)).toBe("-200");
    expect(toFixedGrouped(-1500, 0)).toBe("-1.500");
  });

  test("et tal, der afrundes til nul, får ikke minus", () => {
    expect(toFixedGrouped(-0.04, 1)).toBe("0,0");
    expect(toFixedGrouped(0, 0)).toBe("0");
  });
});
