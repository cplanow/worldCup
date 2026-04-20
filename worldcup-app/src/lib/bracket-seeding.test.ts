import { describe, it, expect } from "vitest";
import { seedR32Matchups, SeedingError } from "./bracket-seeding";
import type { GroupSeedingInput } from "./bracket-seeding";

function makeGroup(
  name: string,
  thirdAdvances: boolean,
  overrides: Partial<GroupSeedingInput> = {}
): GroupSeedingInput {
  return {
    name,
    first: `${name}1`,
    second: `${name}2`,
    third: `${name}3`,
    thirdAdvances,
    ...overrides,
  };
}

/** 12 groups A-L with the first 8 flagged as advancing 3rd-placers. */
function makeStandardGroups(advancingNames: string[] = ["A", "B", "C", "D", "E", "F", "G", "H"]): GroupSeedingInput[] {
  const advancingSet = new Set(advancingNames);
  return "ABCDEFGHIJKL".split("").map((n) => makeGroup(n, advancingSet.has(n)));
}

describe("seedR32Matchups", () => {
  it("produces 16 matchups in positions 1-16", () => {
    const matchups = seedR32Matchups(makeStandardGroups());
    expect(matchups).toHaveLength(16);
    expect(matchups.map((m) => m.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    ]);
  });

  it("pairs winners against runners-up in positions 1-12", () => {
    const matchups = seedR32Matchups(makeStandardGroups());
    // Position 1: A1 vs B2
    expect(matchups[0]).toEqual({ position: 1, teamA: "A1", teamB: "B2" });
    // Position 7: B1 vs A2
    expect(matchups[6]).toEqual({ position: 7, teamA: "B1", teamB: "A2" });
    // Position 12: L1 vs K2
    expect(matchups[11]).toEqual({ position: 12, teamA: "L1", teamB: "K2" });
  });

  it("pairs 8 advancing third-placers in positions 13-16 (1v8, 2v7, 3v6, 4v5)", () => {
    const matchups = seedR32Matchups(makeStandardGroups(["A", "B", "C", "D", "E", "F", "G", "H"]));
    expect(matchups[12]).toEqual({ position: 13, teamA: "A3", teamB: "H3" });
    expect(matchups[13]).toEqual({ position: 14, teamA: "B3", teamB: "G3" });
    expect(matchups[14]).toEqual({ position: 15, teamA: "C3", teamB: "F3" });
    expect(matchups[15]).toEqual({ position: 16, teamA: "D3", teamB: "E3" });
  });

  it("uses the admin-selected subset of third-placers", () => {
    const matchups = seedR32Matchups(makeStandardGroups(["A", "C", "E", "G", "I", "K", "L", "J"]));
    const thirdPlaceMatches = matchups.slice(12);
    const teamsInThirdRound = thirdPlaceMatches.flatMap((m) => [m.teamA, m.teamB]).sort();
    expect(teamsInThirdRound).toEqual(["A3", "C3", "E3", "G3", "I3", "J3", "K3", "L3"]);
  });

  it("throws when fewer than 12 groups provided", () => {
    const groups = "ABCDEFGHIJK".split("").map((n) => makeGroup(n, false));
    expect(() => seedR32Matchups(groups)).toThrow(SeedingError);
  });

  it("throws when more than 12 groups provided", () => {
    const groups = "ABCDEFGHIJKLM".split("").map((n) => makeGroup(n, false));
    expect(() => seedR32Matchups(groups)).toThrow(SeedingError);
  });

  it("throws when group names are not unique", () => {
    const groups = makeStandardGroups();
    groups[1].name = "A";
    expect(() => seedR32Matchups(groups)).toThrow(/unique/);
  });

  it("throws when a group is missing 1st/2nd/3rd", () => {
    const groups = makeStandardGroups();
    groups[0].second = "";
    expect(() => seedR32Matchups(groups)).toThrow(/missing/);
  });

  it("throws when not exactly 8 third-placers are flagged", () => {
    // Only 7 advancing
    const advancing = ["A", "B", "C", "D", "E", "F", "G"];
    expect(() => seedR32Matchups(makeStandardGroups(advancing))).toThrow(/8/);
  });

  it("sorts groups alphabetically for deterministic pairing regardless of input order", () => {
    const groups = makeStandardGroups();
    // Shuffle
    const shuffled = [groups[5], groups[2], groups[11], groups[0], ...groups.slice(1, 2), ...groups.slice(3, 5), ...groups.slice(6, 11)];
    // Ensure all 12 still present
    expect(shuffled).toHaveLength(12);
    const matchups = seedR32Matchups(shuffled);
    expect(matchups[0]).toEqual({ position: 1, teamA: "A1", teamB: "B2" });
  });
});
