import type { LeaderboardEntry } from "@/types";

/**
 * Scoring rules:
 * - Correctly picking a team that advances (finishes 1st or 2nd): 2 pts (pointsGroupAdvance)
 * - Correctly picking the exact position (1st as 1st, 2nd as 2nd): +1 bonus pt (pointsGroupExact)
 * - Max per group: 6 pts (2+2+1+1)
 * - Max total: 12 groups x 6 = 72 pts
 */

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface GroupPickData {
  groupId: number;
  firstPlace: string;
  secondPlace: string;
}

export interface GroupResultData {
  groupId: number;
  teams: { teamName: string; finalPosition: number }[];
}

export interface GroupScoringConfig {
  pointsGroupAdvance: number; // default 2
  pointsGroupExact: number;   // default 1
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
  pointsGroupAdvance: 2,
  pointsGroupExact: 1,
};

// ──────────────────────────────────────────────────────────────
// calculateGroupScore
// ──────────────────────────────────────────────────────────────

/**
 * Calculate the score for a single group pick against the actual result.
 * Pure function — no database access, no side effects.
 */
export function calculateGroupScore(
  pick: GroupPickData,
  result: GroupResultData,
  config: GroupScoringConfig
): number {
  let score = 0;

  const firstPlaceResult = result.teams.find((t) => t.teamName === pick.firstPlace);
  if (firstPlaceResult) {
    const advanced = firstPlaceResult.finalPosition === 1 || firstPlaceResult.finalPosition === 2;
    if (advanced) {
      score += config.pointsGroupAdvance;
      if (firstPlaceResult.finalPosition === 1) {
        score += config.pointsGroupExact;
      }
    }
  }

  const secondPlaceResult = result.teams.find((t) => t.teamName === pick.secondPlace);
  if (secondPlaceResult) {
    const advanced = secondPlaceResult.finalPosition === 1 || secondPlaceResult.finalPosition === 2;
    if (advanced) {
      score += config.pointsGroupAdvance;
      if (secondPlaceResult.finalPosition === 2) {
        score += config.pointsGroupExact;
      }
    }
  }

  return score;
}

// ──────────────────────────────────────────────────────────────
// calculateGroupStageScore
// ──────────────────────────────────────────────────────────────

/**
 * Calculate the total group stage score across all groups.
 * Sums calculateGroupScore for each pick that has a matching result.
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

/**
 * Build a combined leaderboard merging bracket scores and group stage scores.
 * Sorted by combined score descending, then username ascending.
 * Tied users share the same rank; the next rank skips accordingly.
 * Pure function — no database access, no side effects.
 */
export function buildCombinedLeaderboard(input: {
  users: { id: number; username: string }[];
  bracketEntries: LeaderboardEntry[];
  groupPicks: { userId: number; picks: GroupPickData[] }[];
  groupResults: GroupResultData[];
  groupConfig: GroupScoringConfig;
}): CombinedLeaderboardEntry[] {
  const { users, bracketEntries, groupPicks, groupResults, groupConfig } = input;

  const entries: CombinedLeaderboardEntry[] = users.map((user) => {
    const bracketEntry = bracketEntries.find((e) => e.userId === user.id);
    const bracketScore = bracketEntry?.score ?? 0;

    const userGroupPicks = groupPicks.find((gp) => gp.userId === user.id)?.picks ?? [];
    const groupScore = calculateGroupStageScore(userGroupPicks, groupResults, groupConfig);

    return {
      userId: user.id,
      username: user.username,
      bracketScore,
      groupScore,
      combinedScore: bracketScore + groupScore,
      rank: 0,
    };
  });

  // Sort by combined score descending, then username ascending
  entries.sort((a, b) =>
    b.combinedScore - a.combinedScore || a.username.localeCompare(b.username)
  );

  // Assign ranks — tied entries share the same rank
  if (entries.length > 0) {
    entries[0].rank = 1;
    for (let i = 1; i < entries.length; i++) {
      entries[i].rank =
        entries[i].combinedScore === entries[i - 1].combinedScore
          ? entries[i - 1].rank
          : i + 1;
    }
  }

  return entries;
}
