import type { LeaderboardEntry } from "@/types";

/**
 * Scoring rules (2026 research-aligned, Option B):
 * - 2 pts per team placed in correct finishing position (1st, 2nd, 3rd, or 4th)
 * - +5 pt bonus when all 4 positions are correct (perfect group)
 * - Max per group: 4×2 + 5 = 13 pts
 * - Max total: 12 groups × 13 = 156 pts
 */

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface GroupPickData {
  groupId: number;
  firstPlace: string;
  secondPlace: string;
  thirdPlace: string | null;
  fourthPlace: string | null;
}

export interface GroupResultData {
  groupId: number;
  teams: { teamName: string; finalPosition: number }[];
}

export interface GroupScoringConfig {
  pointsGroupPosition: number; // default 2
  pointsGroupPerfect: number;  // default 5
}

export interface CombinedLeaderboardEntry {
  userId: number;
  username: string;
  bracketScore: number;
  groupScore: number;
  combinedScore: number;
  rank: number;
}

export const DEFAULT_GROUP_CONFIG: GroupScoringConfig = {
  pointsGroupPosition: 2,
  pointsGroupPerfect: 5,
};

// ──────────────────────────────────────────────────────────────
// calculateGroupScore
// ──────────────────────────────────────────────────────────────

/**
 * Calculate the score for a single group pick against the actual result.
 * Awards pointsGroupPosition per team in correct position, plus pointsGroupPerfect
 * bonus if all 4 positions are correct.
 * Null 3rd/4th picks score 0 for those slots (backwards compat with pre-Option-B picks).
 * Pure function — no database access, no side effects.
 */
export function calculateGroupScore(
  pick: GroupPickData,
  result: GroupResultData,
  config: GroupScoringConfig
): number {
  const pickedByPosition: (string | null)[] = [
    pick.firstPlace,
    pick.secondPlace,
    pick.thirdPlace,
    pick.fourthPlace,
  ];

  let score = 0;
  let correctCount = 0;

  for (let i = 0; i < 4; i++) {
    const picked = pickedByPosition[i];
    if (!picked) continue;
    const teamResult = result.teams.find((t) => t.teamName === picked);
    if (teamResult && teamResult.finalPosition === i + 1) {
      score += config.pointsGroupPosition;
      correctCount++;
    }
  }

  if (correctCount === 4) {
    score += config.pointsGroupPerfect;
  }

  return score;
}

// ──────────────────────────────────────────────────────────────
// calculateGroupStageScore
// ──────────────────────────────────────────────────────────────

/**
 * Calculate the total group stage score across all groups.
 * Pure function — no database access, no side effects.
 */
export function calculateGroupStageScore(
  picks: GroupPickData[],
  results: GroupResultData[],
  config: GroupScoringConfig
): number {
  let total = 0;

  for (const pick of picks) {
    const result = results.find((r) => r.groupId === pick.groupId);
    if (!result) continue;
    total += calculateGroupScore(pick, result, config);
  }

  return total;
}

// ──────────────────────────────────────────────────────────────
// buildCombinedLeaderboard
// ──────────────────────────────────────────────────────────────

interface CombinedLeaderboardUser {
  id: number;
  username: string;
  topScorerPick: string | null;
}

/**
 * Build a combined leaderboard merging bracket scores and group stage scores.
 * Sort order:
 *   1. combinedScore DESC
 *   2. Golden Boot correctness (correct picks rank above incorrect)
 *   3. Champion pick correctness (correct picks rank above incorrect)
 *   4. username ASC
 * Tied users share the same rank; the next rank skips accordingly.
 * Pure function — no database access, no side effects.
 */
export function buildCombinedLeaderboard(input: {
  users: CombinedLeaderboardUser[];
  bracketEntries: LeaderboardEntry[];
  groupPicks: { userId: number; picks: GroupPickData[] }[];
  groupResults: GroupResultData[];
  groupConfig: GroupScoringConfig;
  actualTopScorer: string | null;
  actualChampion: string | null;
}): CombinedLeaderboardEntry[] {
  const {
    users,
    bracketEntries,
    groupPicks,
    groupResults,
    groupConfig,
    actualTopScorer,
    actualChampion,
  } = input;

  interface ScratchEntry extends CombinedLeaderboardEntry {
    goldenBootCorrect: boolean;
    championCorrect: boolean;
  }

  const scratch: ScratchEntry[] = users.map((user) => {
    const bracketEntry = bracketEntries.find((e) => e.userId === user.id);
    const bracketScore = bracketEntry?.score ?? 0;

    const userGroupPicks = groupPicks.find((gp) => gp.userId === user.id)?.picks ?? [];
    const groupScore = calculateGroupStageScore(userGroupPicks, groupResults, groupConfig);

    const goldenBootCorrect =
      actualTopScorer !== null &&
      user.topScorerPick !== null &&
      user.topScorerPick === actualTopScorer;

    const championCorrect =
      actualChampion !== null &&
      bracketEntry?.championPick !== null &&
      bracketEntry?.championPick === actualChampion;

    return {
      userId: user.id,
      username: user.username,
      bracketScore,
      groupScore,
      combinedScore: bracketScore + groupScore,
      rank: 0,
      goldenBootCorrect,
      championCorrect,
    };
  });

  scratch.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
    if (actualTopScorer !== null && a.goldenBootCorrect !== b.goldenBootCorrect) {
      return a.goldenBootCorrect ? -1 : 1;
    }
    if (actualChampion !== null && a.championCorrect !== b.championCorrect) {
      return a.championCorrect ? -1 : 1;
    }
    return a.username.localeCompare(b.username);
  });

  if (scratch.length > 0) {
    scratch[0].rank = 1;
    for (let i = 1; i < scratch.length; i++) {
      const prev = scratch[i - 1];
      const curr = scratch[i];
      const tied =
        curr.combinedScore === prev.combinedScore &&
        curr.goldenBootCorrect === prev.goldenBootCorrect &&
        curr.championCorrect === prev.championCorrect;
      curr.rank = tied ? prev.rank : i + 1;
    }
  }

  return scratch.map(({ goldenBootCorrect: _gb, championCorrect: _cc, ...entry }) => {
    void _gb;
    void _cc;
    return entry;
  });
}
