import { describe, it, expect } from "vitest";
import {
  getNextRoundPosition,
  getFeederPositions,
  getMatchSlot,
  computeBracketState,
  getCascadingClears,
  validatePick,
  getAvailableMatches,
  classifyPick,
  classifyAllPicks,
  ROUND_NAMES,
  MATCHES_PER_ROUND,
  MAX_PICKS,
} from "./bracket-utils";
import type { Match, Pick } from "@/types";

function makeMatch(overrides: Partial<Match> & { id: number; round: number; position: number }): Match {
  return {
    teamA: "Team A",
    teamB: "Team B",
    winner: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePick(overrides: Partial<Pick> & { matchId: number; selectedTeam: string }): Pick {
  return {
    id: 1,
    userId: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("constants", () => {
  it("has 5 round names", () => {
    expect(Object.keys(ROUND_NAMES)).toHaveLength(5);
    expect(ROUND_NAMES[1]).toBe("Round of 32");
    expect(ROUND_NAMES[5]).toBe("Final");
  });

  it("has correct matches per round", () => {
    expect(MATCHES_PER_ROUND[1]).toBe(16);
    expect(MATCHES_PER_ROUND[2]).toBe(8);
    expect(MATCHES_PER_ROUND[3]).toBe(4);
    expect(MATCHES_PER_ROUND[4]).toBe(2);
    expect(MATCHES_PER_ROUND[5]).toBe(1);
  });

  it("MAX_PICKS is 31", () => {
    expect(MAX_PICKS).toBe(31);
  });
});

describe("getNextRoundPosition", () => {
  it("maps R32 position 1 to R16 position 1", () => {
    expect(getNextRoundPosition(1, 1)).toEqual({ round: 2, position: 1 });
  });

  it("maps R32 position 2 to R16 position 1", () => {
    expect(getNextRoundPosition(1, 2)).toEqual({ round: 2, position: 1 });
  });

  it("maps R32 position 3 to R16 position 2", () => {
    expect(getNextRoundPosition(1, 3)).toEqual({ round: 2, position: 2 });
  });

  it("maps R32 position 16 to R16 position 8", () => {
    expect(getNextRoundPosition(1, 16)).toEqual({ round: 2, position: 8 });
  });

  it("maps R16 position 1 to QF position 1", () => {
    expect(getNextRoundPosition(2, 1)).toEqual({ round: 3, position: 1 });
  });

  it("maps SF position 2 to Final position 1", () => {
    expect(getNextRoundPosition(4, 2)).toEqual({ round: 5, position: 1 });
  });
});

describe("getFeederPositions", () => {
  it("R16 position 1 fed by R32 positions 1 and 2", () => {
    expect(getFeederPositions(2, 1)).toEqual({
      teamAFeeder: { round: 1, position: 1 },
      teamBFeeder: { round: 1, position: 2 },
    });
  });

  it("R16 position 4 fed by R32 positions 7 and 8", () => {
    expect(getFeederPositions(2, 4)).toEqual({
      teamAFeeder: { round: 1, position: 7 },
      teamBFeeder: { round: 1, position: 8 },
    });
  });

  it("QF position 2 fed by R16 positions 3 and 4", () => {
    expect(getFeederPositions(3, 2)).toEqual({
      teamAFeeder: { round: 2, position: 3 },
      teamBFeeder: { round: 2, position: 4 },
    });
  });

  it("Final position 1 fed by SF positions 1 and 2", () => {
    expect(getFeederPositions(5, 1)).toEqual({
      teamAFeeder: { round: 4, position: 1 },
      teamBFeeder: { round: 4, position: 2 },
    });
  });
});

describe("getMatchSlot", () => {
  const r32Matches: Match[] = [
    makeMatch({ id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Germany" }),
    makeMatch({ id: 2, round: 1, position: 2, teamA: "France", teamB: "Spain" }),
  ];

  it("returns teams from R32 match", () => {
    const result = getMatchSlot(1, 1, [], r32Matches);
    expect(result).toEqual({ teamA: "Brazil", teamB: "Germany" });
  });

  it("returns nulls for R32 position with no match", () => {
    const result = getMatchSlot(1, 3, [], r32Matches);
    expect(result).toEqual({ teamA: null, teamB: null });
  });

  it("returns nulls for R16 when no picks exist", () => {
    const result = getMatchSlot(2, 1, [], r32Matches);
    expect(result).toEqual({ teamA: null, teamB: null });
  });

  it("derives R16 teams from picks", () => {
    const picks: Pick[] = [
      makePick({ id: 1, matchId: 1, selectedTeam: "Brazil" }),
      makePick({ id: 2, matchId: 2, selectedTeam: "Spain" }),
    ];
    const result = getMatchSlot(2, 1, picks, r32Matches);
    expect(result).toEqual({ teamA: "Brazil", teamB: "Spain" });
  });

  it("returns partial teams when only one feeder has a pick", () => {
    const picks: Pick[] = [
      makePick({ id: 1, matchId: 1, selectedTeam: "Germany" }),
    ];
    const result = getMatchSlot(2, 1, picks, r32Matches);
    expect(result).toEqual({ teamA: "Germany", teamB: null });
  });
});

describe("computeBracketState", () => {
  it("returns 5 rounds with correct match counts", () => {
    const state = computeBracketState([], []);
    expect(state.rounds).toHaveLength(5);
    expect(state.rounds[0].matches).toHaveLength(16);
    expect(state.rounds[1].matches).toHaveLength(8);
    expect(state.rounds[2].matches).toHaveLength(4);
    expect(state.rounds[3].matches).toHaveLength(2);
    expect(state.rounds[4].matches).toHaveLength(1);
  });

  it("has correct round names", () => {
    const state = computeBracketState([], []);
    expect(state.rounds.map((r) => r.name)).toEqual([
      "Round of 32",
      "Round of 16",
      "Quarterfinals",
      "Semifinals",
      "Final",
    ]);
  });

  it("populates R32 teams from matches", () => {
    const matches: Match[] = [
      makeMatch({ id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Germany" }),
    ];
    const state = computeBracketState(matches, []);
    const slot = state.rounds[0].matches[0];
    expect(slot.teamA).toBe("Brazil");
    expect(slot.teamB).toBe("Germany");
    expect(slot.matchId).toBe(1);
    expect(slot.selectedTeam).toBeNull();
  });

  it("returns null teams for empty R32 positions", () => {
    const state = computeBracketState([], []);
    const slot = state.rounds[0].matches[0];
    expect(slot.teamA).toBeNull();
    expect(slot.teamB).toBeNull();
    expect(slot.matchId).toBe(0);
  });

  it("counts total picks", () => {
    const matches: Match[] = [
      makeMatch({ id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Germany" }),
    ];
    const picks: Pick[] = [
      makePick({ id: 1, matchId: 1, selectedTeam: "Brazil" }),
    ];
    const state = computeBracketState(matches, picks);
    expect(state.totalPicks).toBe(1);
    expect(state.maxPicks).toBe(31);
  });

  it("marks selected team on R32 match slot", () => {
    const matches: Match[] = [
      makeMatch({ id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Germany" }),
    ];
    const picks: Pick[] = [
      makePick({ id: 1, matchId: 1, selectedTeam: "Brazil" }),
    ];
    const state = computeBracketState(matches, picks);
    expect(state.rounds[0].matches[0].selectedTeam).toBe("Brazil");
  });
});

// ---------------------------------------------------------------------------
// Fixture helpers for cascade tests
// ---------------------------------------------------------------------------
// Minimal 5-round bracket: R32 pos 1&2, R16 pos 1, QF pos 1, SF pos 1, Final pos 1
function makeCascadeFixture() {
  const allMatches: Match[] = [
    makeMatch({ id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Mexico" }),
    makeMatch({ id: 2, round: 1, position: 2, teamA: "Argentina", teamB: "Australia" }),
    makeMatch({ id: 17, round: 2, position: 1, teamA: "", teamB: "" }),
    makeMatch({ id: 25, round: 3, position: 1, teamA: "", teamB: "" }),
    makeMatch({ id: 29, round: 4, position: 1, teamA: "", teamB: "" }),
    makeMatch({ id: 31, round: 5, position: 1, teamA: "", teamB: "" }),
  ];
  return allMatches;
}

describe("getCascadingClears", () => {
  it("returns empty array when no downstream picks exist", () => {
    const allMatches = makeCascadeFixture();
    const result = getCascadingClears(1, "Brazil", [], allMatches);
    expect(result).toEqual([]);
  });

  it("clears one downstream match when picked team was selected in next round", () => {
    const allMatches = makeCascadeFixture();
    const picks: Pick[] = [
      makePick({ id: 10, matchId: 1, selectedTeam: "Brazil" }),
      makePick({ id: 11, matchId: 2, selectedTeam: "Argentina" }),
      makePick({ id: 12, matchId: 17, selectedTeam: "Brazil" }),
    ];
    // Changing R32 pos1 away from Brazil — R16 pos1 pick (Brazil) should clear
    const result = getCascadingClears(1, "Brazil", picks, allMatches);
    expect(result).toContain(17);
  });

  it("cascades through multiple rounds", () => {
    const allMatches = makeCascadeFixture();
    const picks: Pick[] = [
      makePick({ id: 10, matchId: 1,  selectedTeam: "Brazil" }),
      makePick({ id: 11, matchId: 2,  selectedTeam: "Argentina" }),
      makePick({ id: 12, matchId: 17, selectedTeam: "Brazil" }),
      makePick({ id: 13, matchId: 25, selectedTeam: "Brazil" }),
      makePick({ id: 14, matchId: 29, selectedTeam: "Brazil" }),
    ];
    const result = getCascadingClears(1, "Brazil", picks, allMatches);
    expect(result).toEqual([17, 25, 29]);
  });

  it("stops cascade when team was not picked in next round", () => {
    const allMatches = makeCascadeFixture();
    const picks: Pick[] = [
      makePick({ id: 10, matchId: 1,  selectedTeam: "Brazil" }),
      makePick({ id: 11, matchId: 2,  selectedTeam: "Argentina" }),
      makePick({ id: 12, matchId: 17, selectedTeam: "Argentina" }), // Argentina picked, not Brazil
    ];
    // Brazil cleared from R32 pos1 — R16 pos1 has Argentina picked, so cascade stops
    const result = getCascadingClears(1, "Brazil", picks, allMatches);
    expect(result).toEqual([]);
  });

  it("returns empty array for unknown match id", () => {
    const allMatches = makeCascadeFixture();
    const result = getCascadingClears(999, "Brazil", [], allMatches);
    expect(result).toEqual([]);
  });

  it("cascades all the way through to the Final round", () => {
    const allMatches = makeCascadeFixture();
    const picks: Pick[] = [
      makePick({ id: 10, matchId: 1,  selectedTeam: "Brazil" }),
      makePick({ id: 11, matchId: 2,  selectedTeam: "Argentina" }),
      makePick({ id: 12, matchId: 17, selectedTeam: "Brazil" }),
      makePick({ id: 13, matchId: 25, selectedTeam: "Brazil" }),
      makePick({ id: 14, matchId: 29, selectedTeam: "Brazil" }),
      makePick({ id: 15, matchId: 31, selectedTeam: "Brazil" }), // Final pick
    ];
    const result = getCascadingClears(1, "Brazil", picks, allMatches);
    expect(result).toEqual([17, 25, 29, 31]);
  });

  it("stops when no next-round match exists in data", () => {
    // Only R32 and R16 matches — no QF
    const limitedMatches: Match[] = [
      makeMatch({ id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Mexico" }),
      makeMatch({ id: 2, round: 1, position: 2, teamA: "Argentina", teamB: "Australia" }),
      makeMatch({ id: 17, round: 2, position: 1, teamA: "", teamB: "" }),
    ];
    const picks: Pick[] = [
      makePick({ id: 10, matchId: 1,  selectedTeam: "Brazil" }),
      makePick({ id: 11, matchId: 17, selectedTeam: "Brazil" }),
    ];
    const result = getCascadingClears(1, "Brazil", picks, limitedMatches);
    // R16 pos 1 should be cleared; no QF match exists, so stops there
    expect(result).toEqual([17]);
  });
});

describe("validatePick", () => {
  const allMatches = makeCascadeFixture();

  it("returns true for valid R32 teamA pick", () => {
    expect(validatePick(1, "Brazil", allMatches, [])).toBe(true);
  });

  it("returns true for valid R32 teamB pick", () => {
    expect(validatePick(1, "Mexico", allMatches, [])).toBe(true);
  });

  it("returns false for invalid R32 team", () => {
    expect(validatePick(1, "France", allMatches, [])).toBe(false);
  });

  it("returns false for unknown matchId", () => {
    expect(validatePick(999, "Brazil", allMatches, [])).toBe(false);
  });

  it("returns false for later-round match when feeders not picked", () => {
    expect(validatePick(17, "Brazil", allMatches, [])).toBe(false);
  });

  it("returns true for later-round match when both feeders are picked", () => {
    const picks: Pick[] = [
      makePick({ id: 10, matchId: 1, selectedTeam: "Brazil" }),
      makePick({ id: 11, matchId: 2, selectedTeam: "Argentina" }),
    ];
    expect(validatePick(17, "Brazil", allMatches, picks)).toBe(true);
    expect(validatePick(17, "Argentina", allMatches, picks)).toBe(true);
  });

  it("returns false for later-round when only one feeder is picked", () => {
    const picks: Pick[] = [
      makePick({ id: 10, matchId: 1, selectedTeam: "Brazil" }),
    ];
    expect(validatePick(17, "Brazil", allMatches, picks)).toBe(false);
  });
});

describe("classifyPick", () => {
  it("returns 'pending' when no result exists", () => {
    expect(classifyPick({ selectedTeam: "Brazil" }, null)).toBe("pending");
  });

  it("returns 'correct' when pick matches result winner", () => {
    expect(classifyPick({ selectedTeam: "Brazil" }, { winner: "Brazil" })).toBe("correct");
  });

  it("returns 'wrong' when pick does not match result winner", () => {
    expect(classifyPick({ selectedTeam: "Mexico" }, { winner: "Brazil" })).toBe("wrong");
  });
});

describe("classifyAllPicks", () => {
  const classifyMatches: Match[] = [
    makeMatch({ id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Mexico" }),
    makeMatch({ id: 2, round: 1, position: 2, teamA: "France", teamB: "Spain" }),
    makeMatch({ id: 17, round: 2, position: 1, teamA: "", teamB: "" }),
  ];

  it("returns 'pending' for picks with no result", () => {
    const picks = [{ matchId: 1, selectedTeam: "Brazil" }];
    const map = classifyAllPicks(picks, [], classifyMatches);
    expect(map.get(1)).toBe("pending");
  });

  it("returns 'correct' when pick matches result", () => {
    const picks = [{ matchId: 1, selectedTeam: "Brazil" }];
    const results = [{ matchId: 1, winner: "Brazil" }];
    const map = classifyAllPicks(picks, results, classifyMatches);
    expect(map.get(1)).toBe("correct");
  });

  it("returns 'wrong' when pick does not match result", () => {
    const picks = [{ matchId: 1, selectedTeam: "Mexico" }];
    const results = [{ matchId: 1, winner: "Brazil" }];
    const map = classifyAllPicks(picks, results, classifyMatches);
    expect(map.get(1)).toBe("wrong");
  });

  it("marks downstream picks 'wrong' when picked team is eliminated (cascading)", () => {
    const picks = [
      { matchId: 1, selectedTeam: "Brazil" },   // Brazil loses → wrong
      { matchId: 17, selectedTeam: "Brazil" },  // cascading wrong (Brazil eliminated)
    ];
    const results = [{ matchId: 1, winner: "Mexico" }];
    const map = classifyAllPicks(picks, results, classifyMatches);
    expect(map.get(1)).toBe("wrong");
    expect(map.get(17)).toBe("wrong");
  });

  it("returns 'pending' for downstream picks when picked team is still alive", () => {
    const picks = [
      { matchId: 1, selectedTeam: "Brazil" },
      { matchId: 17, selectedTeam: "Brazil" },
    ];
    const map = classifyAllPicks(picks, [], classifyMatches);
    expect(map.get(17)).toBe("pending");
  });

  it("does not include matchIds not in picks", () => {
    const picks = [{ matchId: 1, selectedTeam: "Brazil" }];
    const map = classifyAllPicks(picks, [], classifyMatches);
    expect(map.has(17)).toBe(false);
  });

  it("handles mixed correct, wrong, pending picks", () => {
    const picks = [
      { matchId: 1, selectedTeam: "Brazil" },   // wrong (Mexico wins)
      { matchId: 2, selectedTeam: "France" },   // correct (France wins)
      { matchId: 17, selectedTeam: "Brazil" },  // cascading wrong
    ];
    const results = [
      { matchId: 1, winner: "Mexico" },
      { matchId: 2, winner: "France" },
    ];
    const map = classifyAllPicks(picks, results, classifyMatches);
    expect(map.get(1)).toBe("wrong");
    expect(map.get(2)).toBe("correct");
    expect(map.get(17)).toBe("wrong");
  });
});

describe("getAvailableMatches", () => {
  it("returns all R32 match ids when no picks exist (teams present)", () => {
    const r32: Match[] = [
      makeMatch({ id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Germany" }),
      makeMatch({ id: 2, round: 1, position: 2, teamA: "France", teamB: "Spain" }),
    ];
    const result = getAvailableMatches(r32, []);
    expect(result).toContain(1);
    expect(result).toContain(2);
  });

  it("excludes R32 matches where both teams are empty", () => {
    const matches: Match[] = [
      makeMatch({ id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Germany" }),
      makeMatch({ id: 2, round: 1, position: 2, teamA: "", teamB: "" }),
    ];
    const result = getAvailableMatches(matches, []);
    expect(result).toContain(1);
    expect(result).not.toContain(2);
  });

  it("excludes later-round match when feeders not picked", () => {
    const allMatches = makeCascadeFixture();
    const result = getAvailableMatches(allMatches, []);
    expect(result).toContain(1);
    expect(result).toContain(2);
    expect(result).not.toContain(17); // R16 — no feeder picks
  });

  it("includes later-round match when both feeders are picked", () => {
    const allMatches = makeCascadeFixture();
    const picks: Pick[] = [
      makePick({ id: 10, matchId: 1, selectedTeam: "Brazil" }),
      makePick({ id: 11, matchId: 2, selectedTeam: "Argentina" }),
    ];
    const result = getAvailableMatches(allMatches, picks);
    expect(result).toContain(17);
    expect(result).not.toContain(25); // QF — R16 picks not made
  });
});
