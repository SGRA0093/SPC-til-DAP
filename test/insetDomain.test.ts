import insetDomain from "../src/Functions/insetDomain";
import { describe, it, expect } from "vitest";

// Samme lineære afbildning som d3: domænet [d0, d1] fylder [0, rangeWidth].
function toPixel(value: number, domain: [number, number], rangeWidth: number): number {
  return (value - domain[0]) / (domain[1] - domain[0]) * rangeWidth;
}

describe("insetDomain", () => {
  it("lægger første og sidste punkt det ønskede antal pixels fra kanterne", () => {
    const domain = insetDomain(1, 40, 800, 12, 5);
    expect(toPixel(1, domain, 800)).toBeCloseTo(12, 6);
    expect(toPixel(40, domain, 800)).toBeCloseTo(795, 6);
  });

  it("lader domænet være uændret uden luft", () => {
    expect(insetDomain(1, 40, 800, 0, 0)).toEqual([1, 40]);
  });

  it("udvider domænet på begge sider, når der er luft", () => {
    const [d0, d1] = insetDomain(1, 40, 800, 12, 5);
    expect(d0).toBeLessThan(1);
    expect(d1).toBeGreaterThan(40);
  });

  it("kan give luft på kun den ene side", () => {
    const domain = insetDomain(1, 40, 800, 0, 10);
    expect(toPixel(1, domain, 800)).toBeCloseTo(0, 6);
    expect(toPixel(40, domain, 800)).toBeCloseTo(790, 6);
  });

  it("lader data beholde mindst halvdelen af aksen", () => {
    const domain = insetDomain(1, 40, 100, 400, 400);
    const left = toPixel(1, domain, 100);
    const right = 100 - toPixel(40, domain, 100);
    expect(left + right).toBeCloseTo(50, 6);
    expect(left).toBeCloseTo(right, 6);
  });

  it("holder domænet uændret, når aksen er degenereret", () => {
    expect(insetDomain(5, 5, 800, 12, 5)).toEqual([5, 5]);
    expect(insetDomain(1, 40, 0, 12, 5)).toEqual([1, 40]);
  });

  it("ignorerer negative og ugyldige værdier", () => {
    expect(insetDomain(1, 40, 800, -5, Number.NaN)).toEqual([1, 40]);
  });
});
