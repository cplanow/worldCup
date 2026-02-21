import { describe, it, expect } from "vitest";
import {
  calculateScore,
  calculateAllScores,
  getPointsPerRound,
  isTeamAlive,
  maxPossiblePoints,
  isChampionEliminated,
  isEliminated,
  getChampionPick,
  buildLeaderboardEntries,
  getLatestCompletedRound,
  getCorrectPicksInRound,
  applyTiebreakers,
} from "./scoring-engine";

const DEFAULT_POINTS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

function makeMatch(id: number, round: number) {
  return { id, round };
}

/** Build a complete 31-match bracket where every pick is correct */
function buildPerfectBracket() {
  const matches = [];
  const picks = [];
  const results = [];

  // Round 1: 16 matches (ids 1–16)
  for (let i = 1; i <= 16; i++) {
    matches.push(makeMatch(i, 1));
    picks.push({ matchId: i, selectedTeam: `team_R32_${i}` });
    results.push({ matchId: i, winner: `team_R32_${i}` });
  }
  // Round 2: 8 matches (ids 17–24)
  for (let i = 17; i <= 24; i++) {
    matches.push(makeMatch(i, 2));
    picks.push({ matchId: i, selectedTeam: `team_R16_${i}` });
    results.push({ matchId: i, winner: `team_R16_${i}` });
  }
  // Round 3: 4 matches (ids 25–28)
  for (let i = 25; i <= 28; i++) {
    matches.push(makeMatch(i, 3));
    picks.push({ matchId: i, selectedTeam: `team_QF_${i}` });
    results.push({ matchId: i, winner: `team_QF_${i}` });
  }
  // Round 4: 2 matches (ids 29–30)
  for (let i = 29; i <= 30; i++) {
    matches.push(makeMatch(i, 4));
    picks.push({ matchId: i, selectedTeam: `team_SF_${i}` });
    results.push({ matchId: i, winner: `team_SF_${i}` });
  }
  // Round 5: 1 match (id 31)
  matches.push(makeMatch(31, 5));
  picks.push({ matchId: 31, selectedTeam: "team_Final" });
  results.push({ matchId: 31, winner: "team_Final" });

  return { matches, picks, results };
}

// ──────────────────────────────────────────────────────────────
// calculateScore
// ──────────────────────────────────────────────────────────────
describe("calculateScore", () => {
  it("returns 0 when no results have been entered", () => {
    expect(
      calculateScore({
        picks: [{ matchId: 1, selectedTeam: "Brazil" }],
        results: [],
        matches: [makeMatch(1, 1)],
        pointsPerRound: DEFAULT_POINTS,
      })
    ).toBe(0);
  });

  it("scores 1 point for a correct R32 pick", () => {
    expect(
      calculateScore({
        picks: [{ matchId: 1, selectedTeam: "Brazil" }],
        results: [{ matchId: 1, winner: "Brazil" }],
        matches: [makeMatch(1, 1)],
        pointsPerRound: DEFAULT_POINTS,
      })
    ).toBe(1);
  });

  it("scores 0 for a wrong pick", () => {
    expect(
      calculateScore({
        picks: [{ matchId: 1, selectedTeam: "Mexico" }],
        results: [{ matchId: 1, winner: "Brazil" }],
        matches: [makeMatch(1, 1)],
        pointsPerRound: DEFAULT_POINTS,
      })
    ).toBe(0);
  });

  it("applies the correct point value for each round (1, 2, 4, 8, 16)", () => {
    const picks = [
      { matchId: 1, selectedTeam: "A" },
      { matchId: 17, selectedTeam: "B" },
      { matchId: 25, selectedTeam: "C" },
      { matchId: 29, selectedTeam: "D" },
      { matchId: 31, selectedTeam: "E" },
    ];
    const results = [
      { matchId: 1, winner: "A" },
      { matchId: 17, winner: "B" },
      { matchId: 25, winner: "C" },
      { matchId: 29, winner: "D" },
      { matchId: 31, winner: "E" },
    ];
    const matches = [
      makeMatch(1, 1), makeMatch(17, 2), makeMatch(25, 3),
      makeMatch(29, 4), makeMatch(31, 5),
    ];
    expect(calculateScore({ picks, results, matches, pointsPerRound: DEFAULT_POINTS })).toBe(31);
  });

  it("scores 80 for a perfect bracket", () => {
    const { matches, picks, results } = buildPerfectBracket();
    expect(calculateScore({ picks, results, matches, pointsPerRound: DEFAULT_POINTS })).toBe(80);
  });

  it("scores 0 when no picks are correct", () => {
    expect(
      calculateScore({
        picks: [
          { matchId: 1, selectedTeam: "Mexico" },
          { matchId: 2, selectedTeam: "Spain" },
        ],
        results: [
          { matchId: 1, winner: "Brazil" },
          { matchId: 2, winner: "France" },
        ],
        matches: [makeMatch(1, 1), makeMatch(2, 1)],
        pointsPerRound: DEFAULT_POINTS,
      })
    ).toBe(0);
  });

  it("handles partial correct picks across rounds", () => {
    // Correct: R32 (1pt) + R16 (2pt) + SF (8pt) = 11
    const picks = [
      { matchId: 1, selectedTeam: "A" },   // correct  +1
      { matchId: 17, selectedTeam: "B" },  // correct  +2
      { matchId: 25, selectedTeam: "C" },  // wrong
      { matchId: 29, selectedTeam: "D" },  // correct  +8
      { matchId: 31, selectedTeam: "E" },  // wrong
    ];
    const results = [
      { matchId: 1, winner: "A" },
      { matchId: 17, winner: "B" },
      { matchId: 25, winner: "X" },
      { matchId: 29, winner: "D" },
      { matchId: 31, winner: "Y" },
    ];
    const matches = [
      makeMatch(1, 1), makeMatch(17, 2), makeMatch(25, 3),
      makeMatch(29, 4), makeMatch(31, 5),
    ];
    expect(calculateScore({ picks, results, matches, pointsPerRound: DEFAULT_POINTS })).toBe(11);
  });

  it("uses custom point values", () => {
    const customPoints: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 10, 5: 20 };
    expect(
      calculateScore({
        picks: [{ matchId: 1, selectedTeam: "A" }],
        results: [{ matchId: 1, winner: "A" }],
        matches: [makeMatch(1, 1)],
        pointsPerRound: customPoints,
      })
    ).toBe(2);
  });

  it("returns 0 for an empty picks array", () => {
    expect(
      calculateScore({
        picks: [],
        results: [{ matchId: 1, winner: "Brazil" }],
        matches: [makeMatch(1, 1)],
        pointsPerRound: DEFAULT_POINTS,
      })
    ).toBe(0);
  });

  it("does not crash when a result has no corresponding pick", () => {
    expect(
      calculateScore({
        picks: [{ matchId: 2, selectedTeam: "France" }],  // pick is for a different match
        results: [{ matchId: 1, winner: "Brazil" }],
        matches: [makeMatch(1, 1), makeMatch(2, 1)],
        pointsPerRound: DEFAULT_POINTS,
      })
    ).toBe(0);
  });

  it("is deterministic: same inputs always produce the same output", () => {
    const input = {
      picks: [
        { matchId: 1, selectedTeam: "Brazil" },
        { matchId: 2, selectedTeam: "Spain" },
      ],
      results: [
        { matchId: 1, winner: "Brazil" },
        { matchId: 2, winner: "France" },
      ],
      matches: [makeMatch(1, 1), makeMatch(2, 1)],
      pointsPerRound: DEFAULT_POINTS,
    };
    expect(calculateScore(input)).toBe(1);
    expect(calculateScore(input)).toBe(1);
  });

  it("returns 0 for a match with a round not present in pointsPerRound (unknown round)", () => {
    expect(
      calculateScore({
        picks: [{ matchId: 1, selectedTeam: "Brazil" }],
        results: [{ matchId: 1, winner: "Brazil" }],
        matches: [{ id: 1, round: 99 }],
        pointsPerRound: DEFAULT_POINTS,
      })
    ).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────
// calculateAllScores
// ──────────────────────────────────────────────────────────────
describe("calculateAllScores", () => {
  const matches = [makeMatch(1, 1), makeMatch(2, 2)];
  const results = [
    { matchId: 1, winner: "Brazil" },
    { matchId: 2, winner: "France" },
  ];

  it("returns an empty array when there are no users", () => {
    expect(calculateAllScores([], [], results, matches, DEFAULT_POINTS)).toEqual([]);
  });

  it("sorts users by score descending", () => {
    const users = [
      { id: 1, username: "alice" },
      { id: 2, username: "bob" },
    ];
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "Brazil" },   // +1
      { userId: 1, matchId: 2, selectedTeam: "France" },   // +2  → alice = 3
      { userId: 2, matchId: 1, selectedTeam: "Mexico" },   // +0
      { userId: 2, matchId: 2, selectedTeam: "France" },   // +2  → bob = 2
    ];
    const scores = calculateAllScores(users, allPicks, results, matches, DEFAULT_POINTS);
    expect(scores[0]).toMatchObject({ username: "alice", score: 3 });
    expect(scores[1]).toMatchObject({ username: "bob", score: 2 });
  });

  it("gives score 0 to a user with no picks", () => {
    const users = [{ id: 1, username: "alice" }];
    const scores = calculateAllScores(users, [], results, matches, DEFAULT_POINTS);
    expect(scores).toHaveLength(1);
    expect(scores[0]).toMatchObject({ userId: 1, username: "alice", score: 0 });
  });

  it("gives score 0 to all users when no results have been entered", () => {
    const users = [
      { id: 1, username: "alice" },
      { id: 2, username: "bob" },
    ];
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "Brazil" },
      { userId: 2, matchId: 1, selectedTeam: "Mexico" },
    ];
    const scores = calculateAllScores(users, allPicks, [], [makeMatch(1, 1)], DEFAULT_POINTS);
    expect(scores.every((s) => s.score === 0)).toBe(true);
  });

  it("breaks ties alphabetically by username", () => {
    const users = [
      { id: 1, username: "zara" },
      { id: 2, username: "alice" },
    ];
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "Brazil" },
      { userId: 2, matchId: 1, selectedTeam: "Brazil" },
    ];
    const scores = calculateAllScores(
      users, allPicks, [{ matchId: 1, winner: "Brazil" }], [makeMatch(1, 1)], DEFAULT_POINTS
    );
    expect(scores[0].username).toBe("alice");
    expect(scores[1].username).toBe("zara");
  });

  it("calculates scores for multiple users independently", () => {
    const users = [
      { id: 1, username: "alice" },
      { id: 2, username: "bob" },
      { id: 3, username: "carol" },
    ];
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "Brazil" },  // alice +1
      { userId: 2, matchId: 2, selectedTeam: "France" },  // bob +2
      // carol: no picks → 0
    ];
    const scores = calculateAllScores(users, allPicks, results, matches, DEFAULT_POINTS);
    expect(scores).toHaveLength(3);
    expect(scores[0]).toMatchObject({ username: "bob", score: 2 });
    expect(scores[1]).toMatchObject({ username: "alice", score: 1 });
    expect(scores[2]).toMatchObject({ username: "carol", score: 0 });
  });
});

// ──────────────────────────────────────────────────────────────
// getPointsPerRound
// ──────────────────────────────────────────────────────────────
describe("getPointsPerRound", () => {
  it("maps TournamentConfig point fields to round number keys", () => {
    expect(
      getPointsPerRound({
        pointsR32: 1,
        pointsR16: 2,
        pointsQf: 4,
        pointsSf: 8,
        pointsFinal: 16,
      })
    ).toEqual({ 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 });
  });

  it("handles custom point values correctly", () => {
    expect(
      getPointsPerRound({
        pointsR32: 5,
        pointsR16: 10,
        pointsQf: 20,
        pointsSf: 40,
        pointsFinal: 80,
      })
    ).toEqual({ 1: 5, 2: 10, 3: 20, 4: 40, 5: 80 });
  });
});

// ──────────────────────────────────────────────────────────────
// Helpers for elimination / max-possible tests
// ──────────────────────────────────────────────────────────────

/** Build a full 31-match bracket with teamA/teamB names populated */
function buildFullBracketWithTeams() {
  const matches: { id: number; round: number; position: number; teamA: string | null; teamB: string | null }[] = [];
  const picks: { matchId: number; selectedTeam: string }[] = [];

  for (let i = 1; i <= 16; i++) {
    matches.push({ id: i, round: 1, position: i, teamA: `R32A_${i}`, teamB: `R32B_${i}` });
    picks.push({ matchId: i, selectedTeam: `R32A_${i}` });
  }
  for (let i = 17; i <= 24; i++) {
    matches.push({ id: i, round: 2, position: i - 16, teamA: `R16A_${i}`, teamB: `R16B_${i}` });
    picks.push({ matchId: i, selectedTeam: `R16A_${i}` });
  }
  for (let i = 25; i <= 28; i++) {
    matches.push({ id: i, round: 3, position: i - 24, teamA: `QFA_${i}`, teamB: `QFB_${i}` });
    picks.push({ matchId: i, selectedTeam: `QFA_${i}` });
  }
  for (let i = 29; i <= 30; i++) {
    matches.push({ id: i, round: 4, position: i - 28, teamA: `SFA_${i}`, teamB: `SFB_${i}` });
    picks.push({ matchId: i, selectedTeam: `SFA_${i}` });
  }
  matches.push({ id: 31, round: 5, position: 1, teamA: "ChampA", teamB: "ChampB" });
  picks.push({ matchId: 31, selectedTeam: "ChampA" });

  return { matches, picks };
}

// ──────────────────────────────────────────────────────────────
// isTeamAlive
// ──────────────────────────────────────────────────────────────
describe("isTeamAlive", () => {
  const matches = [
    { id: 1, round: 1, teamA: "Brazil", teamB: "Mexico" },
    { id: 17, round: 2, teamA: "Brazil", teamB: "France" },
  ];

  it("returns true when no results have been entered", () => {
    expect(isTeamAlive("Brazil", [], matches)).toBe(true);
  });

  it("returns true when the team has won all their matches", () => {
    const results = [{ matchId: 1, winner: "Brazil" }];
    expect(isTeamAlive("Brazil", results, matches)).toBe(true);
  });

  it("returns false when the team has lost a match", () => {
    const results = [{ matchId: 1, winner: "Mexico" }];
    expect(isTeamAlive("Brazil", results, matches)).toBe(false);
  });

  it("returns true for a team not in any result match", () => {
    const results = [{ matchId: 1, winner: "Mexico" }];
    expect(isTeamAlive("France", results, matches)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// maxPossiblePoints
// ──────────────────────────────────────────────────────────────
describe("maxPossiblePoints", () => {
  it("returns 80 when no results have been entered (perfect score still achievable)", () => {
    const { matches, picks } = buildFullBracketWithTeams();
    expect(
      maxPossiblePoints({ picks, results: [], matches, pointsPerRound: DEFAULT_POINTS, currentScore: 0 })
    ).toBe(80);
  });

  it("decreases when a picked team has been eliminated", () => {
    // User picks Brazil (R32) and France (R16). Brazil loses.
    const picks = [
      { matchId: 1, selectedTeam: "Brazil" },   // wrong pick → no points, Brazil eliminated
      { matchId: 17, selectedTeam: "France" },  // alive, unplayed → +2pts
    ];
    const results = [{ matchId: 1, winner: "Mexico" }];
    const matches = [
      { id: 1, round: 1, teamA: "Brazil", teamB: "Mexico" },
      { id: 17, round: 2, teamA: "France", teamB: "Spain" },
    ];
    // currentScore = 0 (Brazil pick was wrong); France alive for R16 (+2)
    expect(
      maxPossiblePoints({ picks, results, matches, pointsPerRound: DEFAULT_POINTS, currentScore: 0 })
    ).toBe(2);
  });

  it("does not count points for a pick whose team was eliminated", () => {
    // User picked Brazil for BOTH R32 (match 1) and R16 (match 17). Brazil loses in R32.
    const picks = [
      { matchId: 1, selectedTeam: "Brazil" },   // played, Brazil lost
      { matchId: 17, selectedTeam: "Brazil" },  // unplayed, but Brazil is eliminated
    ];
    const results = [{ matchId: 1, winner: "Mexico" }];
    const matches = [
      { id: 1, round: 1, teamA: "Brazil", teamB: "Mexico" },
      { id: 17, round: 2, teamA: "Brazil", teamB: "France" },
    ];
    expect(
      maxPossiblePoints({ picks, results, matches, pointsPerRound: DEFAULT_POINTS, currentScore: 0 })
    ).toBe(0);
  });

  it("equals current score when all matches have results", () => {
    const picks = [
      { matchId: 1, selectedTeam: "Brazil" },
      { matchId: 17, selectedTeam: "France" },
    ];
    const results = [
      { matchId: 1, winner: "Brazil" },
      { matchId: 17, winner: "France" },
    ];
    const matches = [
      { id: 1, round: 1, teamA: "Brazil", teamB: "Mexico" },
      { id: 17, round: 2, teamA: "France", teamB: "Spain" },
    ];
    // All matches played → no remaining possible, max = currentScore
    expect(
      maxPossiblePoints({ picks, results, matches, pointsPerRound: DEFAULT_POINTS, currentScore: 3 })
    ).toBe(3);
  });

  it("re-derives correctly after a result correction", () => {
    const picks = [
      { matchId: 1, selectedTeam: "Brazil" },
      { matchId: 17, selectedTeam: "Brazil" },
    ];
    const matchesData = [
      { id: 1, round: 1, teamA: "Brazil", teamB: "Mexico" },
      { id: 17, round: 2, teamA: "Brazil", teamB: "France" },
    ];

    // Before correction: Mexico wins → Brazil eliminated
    const maxBefore = maxPossiblePoints({
      picks,
      results: [{ matchId: 1, winner: "Mexico" }],
      matches: matchesData,
      pointsPerRound: DEFAULT_POINTS,
      currentScore: 0,
    });
    expect(maxBefore).toBe(0);

    // After correction: Brazil wins → Brazil alive for R16
    const maxAfter = maxPossiblePoints({
      picks,
      results: [{ matchId: 1, winner: "Brazil" }],
      matches: matchesData,
      pointsPerRound: DEFAULT_POINTS,
      currentScore: 1, // Brazil R32 pick now correct
    });
    expect(maxAfter).toBe(3); // 1 (current) + 2 (Brazil alive in unplayed R16)
  });
});

// ──────────────────────────────────────────────────────────────
// isChampionEliminated
// ──────────────────────────────────────────────────────────────
describe("isChampionEliminated", () => {
  const matches = [
    { id: 1, round: 1, teamA: "Brazil", teamB: "Mexico" },
    { id: 17, round: 2, teamA: "Brazil", teamB: "France" },
  ];

  it("returns false when the champion pick team is still alive", () => {
    const results = [{ matchId: 1, winner: "Brazil" }];
    expect(isChampionEliminated("Brazil", results, matches)).toBe(false);
  });

  it("returns true when the champion pick team has been eliminated", () => {
    const results = [{ matchId: 1, winner: "Mexico" }];
    expect(isChampionEliminated("Brazil", results, matches)).toBe(true);
  });

  it("returns false when no results have been entered", () => {
    expect(isChampionEliminated("Brazil", [], matches)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// isEliminated
// ──────────────────────────────────────────────────────────────
describe("isEliminated", () => {
  it("returns true when max possible is less than the leader score", () => {
    expect(isEliminated(5, 10)).toBe(true);
  });

  it("returns false when max possible equals the leader score (tied — not eliminated)", () => {
    expect(isEliminated(10, 10)).toBe(false);
  });

  it("returns false when max possible exceeds the leader score", () => {
    expect(isEliminated(15, 10)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// getChampionPick
// ──────────────────────────────────────────────────────────────
describe("getChampionPick", () => {
  const matches = [
    { id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Mexico" },
    { id: 31, round: 5, position: 1, teamA: "Brazil", teamB: "Argentina" },
  ];

  it("returns the team picked for the Final match (round 5, position 1)", () => {
    const picks = [
      { matchId: 1, selectedTeam: "Brazil" },
      { matchId: 31, selectedTeam: "Brazil" },
    ];
    expect(getChampionPick(picks, matches)).toBe("Brazil");
  });

  it("returns null when the user has no pick for the Final match", () => {
    const picks = [{ matchId: 1, selectedTeam: "Brazil" }];
    expect(getChampionPick(picks, matches)).toBeNull();
  });

  it("returns null when no Final match exists", () => {
    const noFinal = [{ id: 1, round: 1, position: 1, teamA: "A", teamB: "B" }];
    expect(getChampionPick([{ matchId: 1, selectedTeam: "A" }], noFinal)).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────
// buildLeaderboardEntries
// ──────────────────────────────────────────────────────────────
describe("buildLeaderboardEntries", () => {
  const matches = [
    { id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Mexico" },
    { id: 2, round: 2, position: 1, teamA: "Brazil", teamB: "France" },
    { id: 3, round: 5, position: 1, teamA: "Brazil", teamB: "Argentina" },
  ];
  const results = [{ matchId: 1, winner: "Brazil" }];
  const users = [
    { id: 1, username: "alice" },
    { id: 2, username: "bob" },
  ];

  it("returns entries sorted by score descending with sequential ranks", () => {
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "Brazil" },   // alice: +1
      { userId: 2, matchId: 1, selectedTeam: "Mexico" },   // bob: 0
    ];
    const entries = buildLeaderboardEntries({
      users, allPicks, results, matches, pointsPerRound: DEFAULT_POINTS,
    });
    expect(entries[0]).toMatchObject({ username: "alice", score: 1, rank: 1 });
    expect(entries[1]).toMatchObject({ username: "bob", score: 0, rank: 2 });
  });

  it("correctly sets isChampionEliminated for each user", () => {
    // Match 1 (R32) result: Brazil wins → Brazil alive
    // alice's champion pick: Brazil (alive → not eliminated)
    // bob's champion pick: Mexico (Mexico just lost → eliminated)
    const allPicks = [
      { userId: 1, matchId: 3, selectedTeam: "Brazil" },  // alice champion = Brazil
      { userId: 2, matchId: 3, selectedTeam: "Mexico" },  // bob champion = Mexico
    ];
    const matchesWithResults = [
      ...matches,
    ];
    const entries = buildLeaderboardEntries({
      users, allPicks, results, matches: matchesWithResults, pointsPerRound: DEFAULT_POINTS,
    });
    const alice = entries.find((e) => e.username === "alice")!;
    const bob = entries.find((e) => e.username === "bob")!;
    expect(alice.isChampionEliminated).toBe(false);  // Brazil still alive
    expect(bob.isChampionEliminated).toBe(true);     // Mexico was eliminated
  });

  it("correctly sets isEliminated when max possible < leader score", () => {
    // alice has 1pt (correct pick), bob has 0pt (wrong pick, team eliminated)
    // Bob's only remaining pick is for Brazil (match 2, R16) — but Mexico lost, not Bob's pick
    // Bob picked Mexico for match 1 (result: Brazil wins) → Mexico eliminated
    // Bob has no other picks → max = 0 < alice's score of 1 → bob is eliminated
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "Brazil" },  // alice: correct +1
      { userId: 2, matchId: 1, selectedTeam: "Mexico" },  // bob: wrong, Mexico eliminated
    ];
    const entries = buildLeaderboardEntries({
      users, allPicks, results, matches, pointsPerRound: DEFAULT_POINTS,
    });
    const alice = entries.find((e) => e.username === "alice")!;
    const bob = entries.find((e) => e.username === "bob")!;
    expect(alice.isEliminated).toBe(false);
    expect(bob.isEliminated).toBe(true);
  });

  it("returns an empty array when no users are provided", () => {
    const entries = buildLeaderboardEntries({
      users: [],
      allPicks: [],
      results: [],
      matches,
      pointsPerRound: DEFAULT_POINTS,
    });
    expect(entries).toEqual([]);
  });

  it("sets championPick to null and isChampionEliminated to false when user has no Final pick", () => {
    // alice only picks match 1 (R32) — no pick for match 3 (Final, round 5, position 1)
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "Brazil" },
    ];
    const entries = buildLeaderboardEntries({
      users: [{ id: 1, username: "alice" }],
      allPicks,
      results: [],
      matches,
      pointsPerRound: DEFAULT_POINTS,
    });
    expect(entries[0].championPick).toBeNull();
    expect(entries[0].isChampionEliminated).toBe(false);
  });

  it("assigns same rank to truly tied users (tiebreakers do not differentiate them)", () => {
    // Both alice and bob pick Brazil correctly for match 1 → same score, same round picks → shared rank
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "Brazil" },
      { userId: 2, matchId: 1, selectedTeam: "Brazil" },
    ];
    const entries = buildLeaderboardEntries({
      users, allPicks, results, matches, pointsPerRound: DEFAULT_POINTS,
    });
    expect(entries[0]).toMatchObject({ username: "alice", score: 1, rank: 1 });
    expect(entries[1]).toMatchObject({ username: "bob", score: 1, rank: 1 });
  });

  it("flips isEliminated for all users after a result correction changes the leader", () => {
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "Brazil" }, // alice
      { userId: 2, matchId: 1, selectedTeam: "Mexico" }, // bob
    ];

    // Before correction: Mexico wins → bob leads (1pt), alice has 0 and Brazil eliminated
    // alice has no remaining picks → maxPossible=0 < leaderScore=1 → alice eliminated
    const resultsBefore = [{ matchId: 1, winner: "Mexico" }];
    const before = buildLeaderboardEntries({
      users, allPicks, results: resultsBefore, matches, pointsPerRound: DEFAULT_POINTS,
    });
    expect(before.find((e) => e.username === "alice")!.isEliminated).toBe(true);
    expect(before.find((e) => e.username === "bob")!.isEliminated).toBe(false);

    // After correction: Brazil wins → alice leads (1pt), bob has 0 and Mexico eliminated
    const resultsAfter = [{ matchId: 1, winner: "Brazil" }];
    const after = buildLeaderboardEntries({
      users, allPicks, results: resultsAfter, matches, pointsPerRound: DEFAULT_POINTS,
    });
    expect(after.find((e) => e.username === "alice")!.isEliminated).toBe(false);
    expect(after.find((e) => e.username === "bob")!.isEliminated).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// getLatestCompletedRound (Story 4.3)
// ──────────────────────────────────────────────────────────────
describe("getLatestCompletedRound", () => {
  const matches = [
    { id: 1, round: 1, position: 1, teamA: "A", teamB: "B" },
    { id: 2, round: 1, position: 2, teamA: "C", teamB: "D" },
    { id: 3, round: 2, position: 1, teamA: "E", teamB: "F" },
    { id: 4, round: 3, position: 1, teamA: "G", teamB: "H" },
    { id: 5, round: 5, position: 1, teamA: "I", teamB: "J" },
  ];

  it("returns 0 when no results have been entered", () => {
    expect(getLatestCompletedRound([], matches)).toBe(0);
  });

  it("returns the highest round that has any result", () => {
    const results = [{ matchId: 4, winner: "G" }];
    expect(getLatestCompletedRound(results, matches)).toBe(3);
  });

  it("returns round 5 when the Final has a result", () => {
    const results = [{ matchId: 5, winner: "I" }];
    expect(getLatestCompletedRound(results, matches)).toBe(5);
  });

  it("prefers higher rounds even when lower rounds are fully complete", () => {
    // Round 1 is fully complete, Round 2 also has a result
    const results = [
      { matchId: 1, winner: "A" },
      { matchId: 2, winner: "C" },
      { matchId: 3, winner: "E" },
    ];
    expect(getLatestCompletedRound(results, matches)).toBe(2);
  });

  it("returns 0 when matches array is empty", () => {
    expect(getLatestCompletedRound([{ matchId: 1, winner: "X" }], [])).toBe(0);
  });

  it("prefers fully-completed lower round over partially-completed higher round", () => {
    // Round 1: 2 matches, both have results (fully complete)
    // Round 2: 4 matches, only 1 has a result (partially complete)
    // Expected: round 1 (highest fully-completed), NOT round 2 (partial)
    const mixedMatches = [
      { id: 1, round: 1, position: 1, teamA: "A", teamB: "B" },
      { id: 2, round: 1, position: 2, teamA: "C", teamB: "D" },
      { id: 3, round: 2, position: 1, teamA: "E", teamB: "F" },
      { id: 4, round: 2, position: 2, teamA: "G", teamB: "H" },
      { id: 5, round: 2, position: 3, teamA: "I", teamB: "J" },
      { id: 6, round: 2, position: 4, teamA: "K", teamB: "L" },
    ];
    const results = [
      { matchId: 1, winner: "A" }, // round 1 complete
      { matchId: 2, winner: "C" }, // round 1 complete — all of round 1 done
      { matchId: 3, winner: "E" }, // round 2 partial — only 1 of 4
    ];
    expect(getLatestCompletedRound(results, mixedMatches)).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────
// getCorrectPicksInRound (Story 4.3)
// ──────────────────────────────────────────────────────────────
describe("getCorrectPicksInRound", () => {
  const matches = [
    { id: 1, round: 1, position: 1, teamA: "A", teamB: "B" },
    { id: 2, round: 1, position: 2, teamA: "C", teamB: "D" },
    { id: 3, round: 2, position: 1, teamA: "E", teamB: "F" },
  ];

  it("returns 0 when user has no picks in the target round", () => {
    const picks = [{ matchId: 3, selectedTeam: "E" }];
    const results = [{ matchId: 1, winner: "A" }, { matchId: 2, winner: "C" }];
    expect(getCorrectPicksInRound({ picks, results, matches, targetRound: 1 })).toBe(0);
  });

  it("returns correct count for all-correct picks in a round", () => {
    const picks = [
      { matchId: 1, selectedTeam: "A" },
      { matchId: 2, selectedTeam: "C" },
    ];
    const results = [
      { matchId: 1, winner: "A" },
      { matchId: 2, winner: "C" },
    ];
    expect(getCorrectPicksInRound({ picks, results, matches, targetRound: 1 })).toBe(2);
  });

  it("returns partial count when some picks are correct", () => {
    const picks = [
      { matchId: 1, selectedTeam: "A" }, // correct
      { matchId: 2, selectedTeam: "D" }, // wrong
    ];
    const results = [
      { matchId: 1, winner: "A" },
      { matchId: 2, winner: "C" },
    ];
    expect(getCorrectPicksInRound({ picks, results, matches, targetRound: 1 })).toBe(1);
  });

  it("returns 0 when no results exist for the target round", () => {
    const picks = [{ matchId: 1, selectedTeam: "A" }];
    expect(getCorrectPicksInRound({ picks, results: [], matches, targetRound: 1 })).toBe(0);
  });

  it("ignores picks from other rounds", () => {
    const picks = [
      { matchId: 1, selectedTeam: "A" }, // round 1 — correct
      { matchId: 3, selectedTeam: "E" }, // round 2 — not counted when targetRound=1
    ];
    const results = [
      { matchId: 1, winner: "A" },
      { matchId: 3, winner: "E" },
    ];
    expect(getCorrectPicksInRound({ picks, results, matches, targetRound: 1 })).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────
// applyTiebreakers (Story 4.3)
// ──────────────────────────────────────────────────────────────
describe("applyTiebreakers", () => {
  /** Build minimal match set: round 1 (2 matches), round 5 final */
  const matches = [
    { id: 1, round: 1, position: 1, teamA: "TeamA", teamB: "TeamB" },
    { id: 2, round: 1, position: 2, teamA: "TeamC", teamB: "TeamD" },
    { id: 3, round: 5, position: 1, teamA: "TeamA", teamB: "TeamC" },
  ];

  function makeEntry(userId: number, username: string, score: number, championPick: string | null): import("@/types").LeaderboardEntry {
    return { userId, username, score, maxPossible: score, championPick, isChampionEliminated: false, isEliminated: false, rank: 0 };
  }

  it("no tie: ranks users by score alone", () => {
    const entries = [
      makeEntry(1, "alice", 10, null),
      makeEntry(2, "bob", 5, null),
    ];
    const result = applyTiebreakers(entries, { allPicks: [], results: [], matches });
    expect(result[0]).toMatchObject({ username: "alice", rank: 1 });
    expect(result[1]).toMatchObject({ username: "bob", rank: 2 });
  });

  it("tie broken by champion pick: user with correct champion ranks higher", () => {
    const entries = [
      makeEntry(1, "alice", 10, "TeamB"), // wrong champion
      makeEntry(2, "bob", 10, "TeamA"),   // correct champion
    ];
    const results = [{ matchId: 3, winner: "TeamA" }]; // TeamA wins Final
    const allPicks = [
      { userId: 1, matchId: 3, selectedTeam: "TeamB" },
      { userId: 2, matchId: 3, selectedTeam: "TeamA" },
    ];
    const result = applyTiebreakers(entries, { allPicks, results, matches });
    expect(result[0]).toMatchObject({ username: "bob", rank: 1 });
    expect(result[1]).toMatchObject({ username: "alice", rank: 2 });
  });

  it("tie broken by latest-round correct picks when no champion is known", () => {
    // No final result → champion tiebreaker skipped
    // Latest round with any result is round 1
    // alice has 2 correct R1 picks, bob has 1
    const entries = [
      makeEntry(1, "alice", 10, "TeamA"),
      makeEntry(2, "bob", 10, "TeamA"),
    ];
    const results = [
      { matchId: 1, winner: "TeamA" },
      { matchId: 2, winner: "TeamC" },
    ];
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "TeamA" }, // correct
      { userId: 1, matchId: 2, selectedTeam: "TeamC" }, // correct
      { userId: 2, matchId: 1, selectedTeam: "TeamA" }, // correct
      { userId: 2, matchId: 2, selectedTeam: "TeamD" }, // wrong
    ];
    const result = applyTiebreakers(entries, { allPicks, results, matches });
    expect(result[0]).toMatchObject({ username: "alice", rank: 1 });
    expect(result[1]).toMatchObject({ username: "bob", rank: 2 });
  });

  it("three-way tie: latest-round tiebreaker assigns all three different ranks", () => {
    // Tournament in progress — Final not yet played, so champion tiebreaker is skipped.
    // Latest round with results is round 1. Users are differentiated by R1 correct picks.
    const entries = [
      makeEntry(1, "alice", 10, "TeamA"), // 2 correct R1 picks
      makeEntry(2, "bob", 10, "TeamA"),   // 1 correct R1 pick
      makeEntry(3, "carol", 10, "TeamA"), // 0 correct R1 picks
    ];
    const results = [
      { matchId: 1, winner: "TeamA" },
      { matchId: 2, winner: "TeamC" },
      // No Final result → actualChampion is null → champion tiebreaker skipped
    ];
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "TeamA" }, // alice: correct R1
      { userId: 1, matchId: 2, selectedTeam: "TeamC" }, // alice: correct R1
      { userId: 2, matchId: 1, selectedTeam: "TeamA" }, // bob: correct R1
      { userId: 2, matchId: 2, selectedTeam: "TeamD" }, // bob: wrong R1
      { userId: 3, matchId: 1, selectedTeam: "TeamB" }, // carol: wrong R1
      { userId: 3, matchId: 2, selectedTeam: "TeamD" }, // carol: wrong R1
    ];
    const result = applyTiebreakers(entries, { allPicks, results, matches });
    expect(result[0]).toMatchObject({ username: "alice", rank: 1 });
    expect(result[1]).toMatchObject({ username: "bob", rank: 2 });
    expect(result[2]).toMatchObject({ username: "carol", rank: 3 });
  });

  it("unresolved tie: both users share the same rank", () => {
    const entries = [
      makeEntry(1, "alice", 10, "TeamA"),
      makeEntry(2, "bob", 10, "TeamA"),
    ];
    const results = [
      { matchId: 1, winner: "TeamA" },
      { matchId: 2, winner: "TeamC" },
      { matchId: 3, winner: "TeamA" }, // Final known
    ];
    // Both users have same score, same champion (TeamA = correct), same R1 picks
    const allPicks = [
      { userId: 1, matchId: 1, selectedTeam: "TeamA" }, // correct
      { userId: 1, matchId: 2, selectedTeam: "TeamC" }, // correct
      { userId: 2, matchId: 1, selectedTeam: "TeamA" }, // correct
      { userId: 2, matchId: 2, selectedTeam: "TeamC" }, // correct
    ];
    const result = applyTiebreakers(entries, { allPicks, results, matches });
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(1);
  });

  it("champion tiebreaker takes precedence over latest-round picks", () => {
    // User A: correct champion, fewer R1 picks → still ranks higher (champion goes first)
    const entries = [
      makeEntry(1, "alice", 10, "TeamA"), // correct champion, 0 R1 correct
      makeEntry(2, "bob", 10, "TeamB"),   // wrong champion, 2 R1 correct
    ];
    const results = [
      { matchId: 1, winner: "TeamA" },
      { matchId: 2, winner: "TeamC" },
      { matchId: 3, winner: "TeamA" }, // Final: TeamA wins
    ];
    const allPicks = [
      // alice: no R1 picks
      { userId: 2, matchId: 1, selectedTeam: "TeamA" }, // bob: correct
      { userId: 2, matchId: 2, selectedTeam: "TeamC" }, // bob: correct
    ];
    const result = applyTiebreakers(entries, { allPicks, results, matches });
    expect(result[0]).toMatchObject({ username: "alice", rank: 1 });
    expect(result[1]).toMatchObject({ username: "bob", rank: 2 });
  });

  it("returns empty array when entries is empty", () => {
    expect(applyTiebreakers([], { allPicks: [], results: [], matches })).toEqual([]);
  });
});
