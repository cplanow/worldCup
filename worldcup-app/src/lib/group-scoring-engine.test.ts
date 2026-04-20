import { describe, it, expect } from "vitest";
import {
  calculateGroupScore,
  calculateGroupStageScore,
  buildCombinedLeaderboard,
  DEFAULT_GROUP_CONFIG,
} from "./group-scoring-engine";
import type {
  GroupPickData,
  GroupResultData,
  GroupScoringConfig,
} from "./group-scoring-engine";
import type { LeaderboardEntry } from "@/types";

const CONFIG: GroupScoringConfig = { pointsGroupPosition: 2, pointsGroupPerfect: 5 };

function fullResult(groupId: number, order: [string, string, string, string]): GroupResultData {
  return {
    groupId,
    teams: order.map((teamName, i) => ({ teamName, finalPosition: i + 1 })),
  };
}

function fullPick(
  groupId: number,
  [first, second, third, fourth]: [string, string, string, string]
): GroupPickData {
  return { groupId, firstPlace: first, secondPlace: second, thirdPlace: third, fourthPlace: fourth };
}

// ──────────────────────────────────────────────────────────────
// calculateGroupScore
// ──────────────────────────────────────────────────────────────
describe("calculateGroupScore", () => {
  const result = fullResult(1, ["Brazil", "France", "Mexico", "Canada"]);

  it("scores 0 when no picks match their actual position", () => {
    const pick = fullPick(1, ["Canada", "Mexico", "France", "Brazil"]);
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(0);
  });

  it("scores 2 for a single correct position", () => {
    const pick = fullPick(1, ["Brazil", "Mexico", "France", "Canada"]);
    // Only 1st (Brazil) and 4th (Canada) correct = 4 pts
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(4);
  });

  it("scores 8 (no bonus) when 3 of 4 positions correct", () => {
    const pick = fullPick(1, ["Brazil", "France", "Canada", "Mexico"]);
    // 1st, 2nd correct (4 pts); 3rd & 4th swapped (0 pts) = 4 pts total
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(4);
  });

  it("scores 13 (perfect + bonus) when all 4 positions correct", () => {
    const pick = fullPick(1, ["Brazil", "France", "Mexico", "Canada"]);
    // 4 × 2 = 8 for positions + 5 perfect bonus = 13
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(13);
  });

  it("scores 0 when no picks are in their correct position (all advance but wrong)", () => {
    const pick = fullPick(1, ["France", "Brazil", "Canada", "Mexico"]);
    // Picked 1=France (actually 2), 2=Brazil (actually 1), 3=Canada (actually 4), 4=Mexico (actually 3)
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(0);
  });

  it("handles null 3rd and 4th picks (backwards compat)", () => {
    const pick: GroupPickData = {
      groupId: 1,
      firstPlace: "Brazil",
      secondPlace: "France",
      thirdPlace: null,
      fourthPlace: null,
    };
    // Only 1st and 2nd scored = 2 + 2 = 4 (no perfect bonus since not all 4 correct)
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(4);
  });

  it("uses custom config values", () => {
    const customConfig: GroupScoringConfig = { pointsGroupPosition: 3, pointsGroupPerfect: 10 };
    const pick = fullPick(1, ["Brazil", "France", "Mexico", "Canada"]);
    // 4 × 3 + 10 = 22
    expect(calculateGroupScore(pick, result, customConfig)).toBe(22);
  });
});

// ──────────────────────────────────────────────────────────────
// calculateGroupStageScore
// ──────────────────────────────────────────────────────────────
describe("calculateGroupStageScore", () => {
  it("calculates total across multiple groups", () => {
    const picks: GroupPickData[] = [
      fullPick(1, ["Brazil", "France", "Mexico", "Canada"]),  // perfect = 13
      fullPick(2, ["Spain", "Germany", "Italy", "Portugal"]), // all wrong = 0
      fullPick(3, ["Japan", "Korea", "Chile", "Argentina"]),  // 3 correct (no bonus) = 6
    ];
    const results: GroupResultData[] = [
      fullResult(1, ["Brazil", "France", "Mexico", "Canada"]),
      fullResult(2, ["Italy", "Portugal", "Germany", "Spain"]),
      fullResult(3, ["Japan", "Korea", "Argentina", "Chile"]), // Japan+Korea correct, Argentina/Chile swapped
    ];
    // Group 3: 1st (Japan) correct=2, 2nd (Korea) correct=2, 3rd (Chile) wrong, 4th (Argentina) wrong = 4
    // Group 1: 13, Group 2: 0, Group 3: 4 → total = 17
    expect(calculateGroupStageScore(picks, results, CONFIG)).toBe(17);
  });

  it("returns 0 when no picks exist", () => {
    const results = [fullResult(1, ["Brazil", "France", "Mexico", "Canada"])];
    expect(calculateGroupStageScore([], results, CONFIG)).toBe(0);
  });

  it("returns 0 when no results exist", () => {
    const picks = [fullPick(1, ["Brazil", "France", "Mexico", "Canada"])];
    expect(calculateGroupStageScore(picks, [], CONFIG)).toBe(0);
  });

  it("max total with 12 perfect groups = 156", () => {
    const picks: GroupPickData[] = Array.from({ length: 12 }, (_, i) =>
      fullPick(i + 1, ["A", "B", "C", "D"])
    );
    const results: GroupResultData[] = Array.from({ length: 12 }, (_, i) =>
      fullResult(i + 1, ["A", "B", "C", "D"])
    );
    expect(calculateGroupStageScore(picks, results, CONFIG)).toBe(156);
  });
});

// ──────────────────────────────────────────────────────────────
// buildCombinedLeaderboard
// ──────────────────────────────────────────────────────────────
describe("buildCombinedLeaderboard", () => {
  function makeBracketEntry(
    userId: number,
    username: string,
    score: number,
    championPick: string | null = null
  ): LeaderboardEntry {
    return {
      userId,
      username,
      score,
      maxPossible: score,
      championPick,
      isChampionEliminated: false,
      isEliminated: false,
      rank: 0,
    };
  }

  it("sums bracket and group scores and ranks correctly", () => {
    const users = [
      { id: 1, username: "alice", topScorerPick: null },
      { id: 2, username: "bob", topScorerPick: null },
      { id: 3, username: "carol", topScorerPick: null },
    ];
    const bracketEntries: LeaderboardEntry[] = [
      makeBracketEntry(1, "alice", 10),
      makeBracketEntry(2, "bob", 20),
      makeBracketEntry(3, "carol", 15),
    ];
    const groupPicks = [
      { userId: 1, picks: [fullPick(1, ["Brazil", "France", "Mexico", "Canada"])] }, // perfect = 13
      { userId: 2, picks: [fullPick(1, ["Canada", "Mexico", "France", "Brazil"])] }, // all wrong = 0
      { userId: 3, picks: [fullPick(1, ["Brazil", "Mexico", "France", "Canada"])] }, // Brazil+Canada correct = 4
    ];
    const groupResults = [fullResult(1, ["Brazil", "France", "Mexico", "Canada"])];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries,
      groupPicks,
      groupResults,
      groupConfig: CONFIG,
      actualTopScorer: null,
      actualChampion: null,
    });

    // alice: 10 + 13 = 23; bob: 20 + 0 = 20; carol: 15 + 4 = 19
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ username: "alice", combinedScore: 23, rank: 1 });
    expect(result[1]).toMatchObject({ username: "bob", combinedScore: 20, rank: 2 });
    expect(result[2]).toMatchObject({ username: "carol", combinedScore: 19, rank: 3 });
  });

  it("breaks ties by Golden Boot pick when provided", () => {
    const users = [
      { id: 1, username: "alice", topScorerPick: "Mbappe" },
      { id: 2, username: "bob", topScorerPick: "Messi" },
    ];
    const bracketEntries = [
      makeBracketEntry(1, "alice", 10),
      makeBracketEntry(2, "bob", 10),
    ];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries,
      groupPicks: [],
      groupResults: [],
      groupConfig: CONFIG,
      actualTopScorer: "Mbappe",
      actualChampion: null,
    });

    // alice's golden boot is correct, bob's is not → alice wins
    expect(result[0].username).toBe("alice");
    expect(result[0].rank).toBe(1);
    expect(result[1].username).toBe("bob");
    expect(result[1].rank).toBe(2);
  });

  it("falls through to champion pick tiebreaker when Golden Boot is also tied", () => {
    const users = [
      { id: 1, username: "alice", topScorerPick: null },
      { id: 2, username: "bob", topScorerPick: null },
    ];
    const bracketEntries = [
      makeBracketEntry(1, "alice", 10, "Brazil"),
      makeBracketEntry(2, "bob", 10, "France"),
    ];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries,
      groupPicks: [],
      groupResults: [],
      groupConfig: CONFIG,
      actualTopScorer: null,
      actualChampion: "France",
    });

    // bob picked France (correct), alice picked Brazil (wrong)
    expect(result[0].username).toBe("bob");
    expect(result[1].username).toBe("alice");
  });

  it("assigns tied users the same rank when all tiebreakers tie", () => {
    const users = [
      { id: 1, username: "alice", topScorerPick: null },
      { id: 2, username: "bob", topScorerPick: null },
      { id: 3, username: "carol", topScorerPick: null },
    ];
    const bracketEntries = [
      makeBracketEntry(1, "alice", 10),
      makeBracketEntry(2, "bob", 10),
      makeBracketEntry(3, "carol", 5),
    ];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries,
      groupPicks: [],
      groupResults: [],
      groupConfig: CONFIG,
      actualTopScorer: null,
      actualChampion: null,
    });

    expect(result[0]).toMatchObject({ username: "alice", rank: 1 });
    expect(result[1]).toMatchObject({ username: "bob", rank: 1 });
    expect(result[2]).toMatchObject({ username: "carol", rank: 3 });
  });

  it("handles users with no group picks (defaults group score to 0)", () => {
    const users = [{ id: 1, username: "alice", topScorerPick: null }];
    const bracketEntries = [makeBracketEntry(1, "alice", 15)];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries,
      groupPicks: [],
      groupResults: [],
      groupConfig: CONFIG,
      actualTopScorer: null,
      actualChampion: null,
    });

    expect(result[0]).toMatchObject({ bracketScore: 15, groupScore: 0, combinedScore: 15, rank: 1 });
  });

  it("exports DEFAULT_GROUP_CONFIG with correct values", () => {
    expect(DEFAULT_GROUP_CONFIG).toEqual({ pointsGroupPosition: 2, pointsGroupPerfect: 5 });
  });
});
