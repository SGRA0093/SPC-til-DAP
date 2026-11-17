import { describe, expect, test } from "vitest";
import ptToPx from "../../src/Functions/ptToPx";

describe("ptToPx", () => {
  test("12 pt er 16 px", () => {
    expect(ptToPx(12)).toBeCloseTo(16, 10);
  });

  test("0 pt er 0 px", () => {
    expect(ptToPx(0)).toBe(0);
  });
});
