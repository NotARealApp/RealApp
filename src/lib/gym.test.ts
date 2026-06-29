import { describe, expect, it } from "vitest";
import { occLevel, isMcfit, quietestUpcoming, type Occupancy } from "./gym";

const occ = (current: number, hours: [number, number, boolean][]): Occupancy => ({
  current,
  level: occLevel(current),
  hours: hours.map(([hour, pct, cur]) => ({ hour, pct, current: cur })),
});

describe("occLevel", () => {
  it("bands by capacity", () => {
    expect(occLevel(10)).toBe("low");
    expect(occLevel(40)).toBe("med");
    expect(occLevel(70)).toBe("high");
  });
});

describe("isMcfit", () => {
  it("matches the chain name in a label, case-insensitive", () => {
    expect(isMcfit("McFit, Leopoldstr. 1, Munich")).toBe(true);
    expect(isMcfit("mcfit schwabing")).toBe(true);
    expect(isMcfit("Some Gym, Munich")).toBe(false);
  });
});

describe("quietestUpcoming", () => {
  it("finds the quietest hour after now", () => {
    const o = occ(55, [[20, 80, false], [21, 55, true], [22, 30, false], [23, 5, false]]);
    expect(quietestUpcoming(o)?.hour).toBe(23);
  });
  it("returns null when nothing ahead is quieter than now", () => {
    const o = occ(20, [[21, 20, true], [22, 40, false], [23, 60, false]]);
    expect(quietestUpcoming(o)).toBeNull();
  });
  it("returns null at the last hour of the day", () => {
    const o = occ(5, [[22, 30, false], [23, 5, true]]);
    expect(quietestUpcoming(o)).toBeNull();
  });
});
