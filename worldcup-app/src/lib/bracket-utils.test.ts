import { describe, it, expect } from "vitest";
import {
  getNextRoundPosition,
  getFeederPositions,
  getMatchSlot,
  computeBracketState,
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
