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

const CONFIG: GroupScoringConfig = { pointsGroupAdvance: 2, pointsGroupExact: 1 };

// ──────────────────────────────────────────────────────────────
// calculateGroupScore
// ──────────────────────────────────────────────────────────────
describe("calculateGroupScore", () => {
  it("scores 0 when pick is completely wrong", () => {
    const pick: GroupPickData = { groupId: 1, firstPlace: "Mexico", secondPlace: "Canada" };
    const result: GroupResultData = {
      groupId: 1,
      teams: [
        { teamName: "Brazil", finalPosition: 1 },
        { teamName: "France", finalPosition: 2 },
        { teamName: "Mexico", finalPosition: 3 },
        { teamName: "Canada", finalPosition: 4 },
      ],
    };
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(0);
  });

  it("scores advance points for team in top 2 but wrong position", () => {
    // Picked Brazil 1st, but Brazil finished 2nd → advance (2 pts), no exact bonus
    const pick: GroupPickData = { groupId: 1, firstPlace: "Brazil", secondPlace: "Canada" };
    const result: GroupResultData = {
      groupId: 1,
      teams: [
        { teamName: "France", finalPosition: 1 },
        { teamName: "Brazil", finalPosition: 2 },
        { teamName: "Mexico", finalPosition: 3 },
        { teamName: "Canada", finalPosition: 4 },
      ],
    };
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(2);
  });

  it("scores advance + exact for correct position", () => {
    // Picked Brazil 1st, Brazil finished 1st → advance (2) + exact (1) = 3
    const pick: GroupPickData = { groupId: 1, firstPlace: "Brazil", secondPlace: "Canada" };
    const result: GroupResultData = {
      groupId: 1,
      teams: [
        { teamName: "Brazil", finalPosition: 1 },
        { teamName: "France", finalPosition: 2 },
        { teamName: "Mexico", finalPosition: 3 },
        { teamName: "Canada", finalPosition: 4 },
      ],
    };
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(3);
  });

  it("scores max 6 for perfect group pick", () => {
    // Both teams correct position: (2+1) + (2+1) = 6
    const pick: GroupPickData = { groupId: 1, firstPlace: "Brazil", secondPlace: "France" };
    const result: GroupResultData = {
      groupId: 1,
      teams: [
        { teamName: "Brazil", finalPosition: 1 },
        { teamName: "France", finalPosition: 2 },
        { teamName: "Mexico", finalPosition: 3 },
        { teamName: "Canada", finalPosition: 4 },
      ],
    };
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(6);
  });

  it("scores 4 when both teams advance but positions are swapped", () => {
    // Picked Brazil 1st (finished 2nd) + France 2nd (finished 1st) → 2 + 2 = 4
    const pick: GroupPickData = { groupId: 1, firstPlace: "Brazil", secondPlace: "France" };
    const result: GroupResultData = {
      groupId: 1,
      teams: [
        { teamName: "France", finalPosition: 1 },
        { teamName: "Brazil", finalPosition: 2 },
        { teamName: "Mexico", finalPosition: 3 },
        { teamName: "Canada", finalPosition: 4 },
      ],
    };
    expect(calculateGroupScore(pick, result, CONFIG)).toBe(4);
  });

  it("scores 5 when both advance and one position is exact", () => {
    // Picked Brazil 1st (finished 1st = 2+1) + France 2nd (finished 1st? No...)
    // Picked Brazil 1st (finished 1st = 3) + Mexico 2nd (finished 2nd = 3) would be 6...
    // Better: Picked Brazil 1st (correct = 3) + France 2nd (advanced as 1st = 2) = 5
    const pick: GroupPickData = { groupId: 1, firstPlace: "Brazil", secondPlace: "France" };
    const result: GroupResultData = {
      groupId: 1,
      teams: [
        { teamName: "Brazil", finalPosition: 1 },
        { teamName: "France", finalPosition: 2 },
        { teamName: "Mexico", finalPosition: 3 },
        { teamName: "Canada", finalPosition: 4 },
      ],
    };
    // This is a perfect pick (6 pts). Let me adjust to get 5:
    // Brazil 1st (exact = 3) + France 2nd but France finished 1st (advance only = 2) = 5
    const pick5: GroupPickData = { groupId: 1, firstPlace: "Brazil", secondPlace: "France" };
    const result5: GroupResultData = {
      groupId: 1,
      teams: [
        { teamName: "Brazil", finalPosition: 1 },
        { teamName: "France", finalPosition: 1 }, // Not realistic but tests the logic
        { teamName: "Mexico", finalPosition: 3 },
        { teamName: "Canada", finalPosition: 4 },
      ],
    };
    // Actually let me use a cleaner scenario:
    // Picked Brazil 1st (finished 1st = 3) + Mexico 2nd (finished 1st = 2, no exact bonus) = 5
    const pickClean: GroupPickData = { groupId: 1, firstPlace: "Brazil", secondPlace: "Mexico" };
    const resultClean: GroupResultData = {
      groupId: 1,
      teams: [
        { teamName: "Brazil", finalPosition: 1 },
        { teamName: "Mexico", finalPosition: 1 },
        { teamName: "France", finalPosition: 3 },
        { teamName: "Canada", finalPosition: 4 },
      ],
    };
    // Mexico finalPosition=1, not 2, so advance=yes (pos 1), exact for 2nd pick = no → 2 pts
    // Brazil finalPosition=1, exact for 1st pick = yes → 3 pts
    // Total = 5
    expect(calculateGroupScore(pickClean, resultClean, CONFIG)).toBe(5);
  });

  it("uses custom config values", () => {
    const customConfig: GroupScoringConfig = { pointsGroupAdvance: 3, pointsGroupExact: 2 };
    // Perfect pick: (3+2) + (3+2) = 10
    const pick: GroupPickData = { groupId: 1, firstPlace: "Brazil", secondPlace: "France" };
    const result: GroupResultData = {
      groupId: 1,
      teams: [
        { teamName: "Brazil", finalPosition: 1 },
        { teamName: "France", finalPosition: 2 },
      ],
    };
    expect(calculateGroupScore(pick, result, customConfig)).toBe(10);
  });
});

// ──────────────────────────────────────────────────────────────
// calculateGroupStageScore
// ──────────────────────────────────────────────────────────────
describe("calculateGroupStageScore", () => {
  it("calculates total across multiple groups", () => {
    const picks: GroupPickData[] = [
      { groupId: 1, firstPlace: "Brazil", secondPlace: "France" },   // perfect = 6
      { groupId: 2, firstPlace: "Germany", secondPlace: "Spain" },   // both wrong = 0
      { groupId: 3, firstPlace: "Japan", secondPlace: "Argentina" }, // 1 advance only = 2
    ];
    const results: GroupResultData[] = [
      {
        groupId: 1,
        teams: [
          { teamName: "Brazil", finalPosition: 1 },
          { teamName: "France", finalPosition: 2 },
          { teamName: "Mexico", finalPosition: 3 },
          { teamName: "Canada", finalPosition: 4 },
        ],
      },
      {
        groupId: 2,
        teams: [
          { teamName: "Italy", finalPosition: 1 },
          { teamName: "Portugal", finalPosition: 2 },
          { teamName: "Germany", finalPosition: 3 },
          { teamName: "Spain", finalPosition: 4 },
        ],
      },
      {
        groupId: 3,
        teams: [
          { teamName: "Japan", finalPosition: 1 },
          { teamName: "Korea", finalPosition: 2 },
          { teamName: "Argentina", finalPosition: 3 },
          { teamName: "Chile", finalPosition: 4 },
        ],
      },
    ];
    // Group 1: 6, Group 2: 0, Group 3: Japan picked 1st finished 1st = 3, Argentina picked 2nd finished 3rd = 0 → 3
    expect(calculateGroupStageScore(picks, results, CONFIG)).toBe(9);
  });

  it("handles group with no result yet (scores 0)", () => {
    const picks: GroupPickData[] = [
      { groupId: 1, firstPlace: "Brazil", secondPlace: "France" },
      { groupId: 2, firstPlace: "Germany", secondPlace: "Spain" },
    ];
    // Only group 1 has a result
    const results: GroupResultData[] = [
      {
        groupId: 1,
        teams: [
          { teamName: "Brazil", finalPosition: 1 },
          { teamName: "France", finalPosition: 2 },
        ],
      },
    ];
    // Group 1: perfect = 6, Group 2: no result = 0
    expect(calculateGroupStageScore(picks, results, CONFIG)).toBe(6);
  });

  it("returns 0 when no picks exist", () => {
    const results: GroupResultData[] = [
      {
        groupId: 1,
        teams: [
          { teamName: "Brazil", finalPosition: 1 },
          { teamName: "France", finalPosition: 2 },
        ],
      },
    ];
    expect(calculateGroupStageScore([], results, CONFIG)).toBe(0);
  });

  it("returns 0 when no results exist", () => {
    const picks: GroupPickData[] = [
      { groupId: 1, firstPlace: "Brazil", secondPlace: "France" },
    ];
    expect(calculateGroupStageScore(picks, [], CONFIG)).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────
// buildCombinedLeaderboard
// ──────────────────────────────────────────────────────────────
describe("buildCombinedLeaderboard", () => {
  function makeBracketEntry(
    userId: number,
    username: string,
    score: number
  ): LeaderboardEntry {
    return {
      userId,
      username,
      score,
      maxPossible: score,
      championPick: null,
      isChampionEliminated: false,
      isEliminated: false,
      rank: 0,
    };
  }

  it("sums bracket and group scores and ranks correctly", () => {
    const users = [
      { id: 1, username: "alice" },
      { id: 2, username: "bob" },
      { id: 3, username: "carol" },
    ];
    const bracketEntries: LeaderboardEntry[] = [
      makeBracketEntry(1, "alice", 10),
      makeBracketEntry(2, "bob", 20),
      makeBracketEntry(3, "carol", 15),
    ];
    const groupPicks = [
      {
        userId: 1,
        picks: [{ groupId: 1, firstPlace: "Brazil", secondPlace: "France" }] as GroupPickData[],
      },
      {
        userId: 2,
        picks: [{ groupId: 1, firstPlace: "Mexico", secondPlace: "Canada" }] as GroupPickData[],
      },
      {
        userId: 3,
        picks: [{ groupId: 1, firstPlace: "Brazil", secondPlace: "Mexico" }] as GroupPickData[],
      },
    ];
    const groupResults: GroupResultData[] = [
      {
        groupId: 1,
        teams: [
          { teamName: "Brazil", finalPosition: 1 },
          { teamName: "France", finalPosition: 2 },
          { teamName: "Mexico", finalPosition: 3 },
          { teamName: "Canada", finalPosition: 4 },
        ],
      },
    ];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries,
      groupPicks,
      groupResults,
      groupConfig: CONFIG,
    });

    // alice: bracket 10 + group 6 (perfect) = 16
    // bob: bracket 20 + group 0 (wrong) = 20
    // carol: bracket 15 + group 3 (Brazil 1st correct = 3, Mexico 2nd finished 3rd = 0) = 18
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ username: "bob", bracketScore: 20, groupScore: 0, combinedScore: 20, rank: 1 });
    expect(result[1]).toMatchObject({ username: "carol", bracketScore: 15, groupScore: 3, combinedScore: 18, rank: 2 });
    expect(result[2]).toMatchObject({ username: "alice", bracketScore: 10, groupScore: 6, combinedScore: 16, rank: 3 });
  });

  it("assigns tied users the same rank", () => {
    const users = [
      { id: 1, username: "alice" },
      { id: 2, username: "bob" },
      { id: 3, username: "carol" },
    ];
    const bracketEntries: LeaderboardEntry[] = [
      makeBracketEntry(1, "alice", 10),
      makeBracketEntry(2, "bob", 10),
      makeBracketEntry(3, "carol", 5),
    ];
    const groupPicks = [
      { userId: 1, picks: [] as GroupPickData[] },
      { userId: 2, picks: [] as GroupPickData[] },
      { userId: 3, picks: [] as GroupPickData[] },
    ];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries,
      groupPicks,
      groupResults: [],
      groupConfig: CONFIG,
    });

    // alice and bob tied at 10, carol at 5
    expect(result[0]).toMatchObject({ username: "alice", combinedScore: 10, rank: 1 });
    expect(result[1]).toMatchObject({ username: "bob", combinedScore: 10, rank: 1 });
    expect(result[2]).toMatchObject({ username: "carol", combinedScore: 5, rank: 3 });
  });

  it("sorts alphabetically by username when scores are tied", () => {
    const users = [
      { id: 1, username: "zara" },
      { id: 2, username: "alice" },
    ];
    const bracketEntries: LeaderboardEntry[] = [
      makeBracketEntry(1, "zara", 10),
      makeBracketEntry(2, "alice", 10),
    ];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries,
      groupPicks: [],
      groupResults: [],
      groupConfig: CONFIG,
    });

    expect(result[0].username).toBe("alice");
    expect(result[1].username).toBe("zara");
  });

  it("returns an empty array when no users are provided", () => {
    const result = buildCombinedLeaderboard({
      users: [],
      bracketEntries: [],
      groupPicks: [],
      groupResults: [],
      groupConfig: CONFIG,
    });
    expect(result).toEqual([]);
  });

  it("handles users with no bracket entry (defaults bracket score to 0)", () => {
    const users = [{ id: 1, username: "alice" }];
    const groupPicks = [
      {
        userId: 1,
        picks: [{ groupId: 1, firstPlace: "Brazil", secondPlace: "France" }] as GroupPickData[],
      },
    ];
    const groupResults: GroupResultData[] = [
      {
        groupId: 1,
        teams: [
          { teamName: "Brazil", finalPosition: 1 },
          { teamName: "France", finalPosition: 2 },
        ],
      },
    ];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries: [], // no bracket entries
      groupPicks,
      groupResults,
      groupConfig: CONFIG,
    });

    expect(result[0]).toMatchObject({ bracketScore: 0, groupScore: 6, combinedScore: 6, rank: 1 });
  });

  it("handles users with no group picks (defaults group score to 0)", () => {
    const users = [{ id: 1, username: "alice" }];
    const bracketEntries: LeaderboardEntry[] = [makeBracketEntry(1, "alice", 15)];

    const result = buildCombinedLeaderboard({
      users,
      bracketEntries,
      groupPicks: [], // no group picks
      groupResults: [],
      groupConfig: CONFIG,
    });

    expect(result[0]).toMatchObject({ bracketScore: 15, groupScore: 0, combinedScore: 15, rank: 1 });
  });

  it("exports DEFAULT_GROUP_CONFIG with correct values", () => {
    expect(DEFAULT_GROUP_CONFIG).toEqual({ pointsGroupAdvance: 2, pointsGroupExact: 1 });
  });
});
