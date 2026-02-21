import type { ScoreInput, PlayerScore, MaxPointsInput, LeaderboardEntry } from "@/types";

export type { ScoreInput, PlayerScore, MaxPointsInput, LeaderboardEntry };

/**
 * Calculate a single participant's score.
 * Pure function — no database access, no side effects.
 */
export function calculateScore(input: ScoreInput): number {
  const { picks, results, matches, pointsPerRound } = input;
  let score = 0;

  for (const result of results) {
    const pick = picks.find((p) => p.matchId === result.matchId);
    if (!pick) continue;

    if (pick.selectedTeam === result.winner) {
      const match = matches.find((m) => m.id === result.matchId);
      if (!match) continue;
      score += pointsPerRound[match.round] ?? 0;
    }
  }

  return score;
}

/**
 * Calculate scores for all participants and return them sorted descending.
 * Pure function — no database access, no side effects.
 */
export function calculateAllScores(
  users: { id: number; username: string }[],
  allPicks: { userId: number; matchId: number; selectedTeam: string }[],
  results: { matchId: number; winner: string }[],
  matches: { id: number; round: number }[],
  pointsPerRound: Record<number, number>
): PlayerScore[] {
  return users
    .map((user) => ({
      userId: user.id,
      username: user.username,
      score: calculateScore({
        picks: allPicks.filter((p) => p.userId === user.id),
        results,
        matches,
        pointsPerRound,
      }),
    }))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
}

/**
 * Convert a TournamentConfig's point fields to a round-number → points map.
 */
export function getPointsPerRound(config: {
  pointsR32: number;
  pointsR16: number;
  pointsQf: number;
  pointsSf: number;
  pointsFinal: number;
}): Record<number, number> {
  return {
    1: config.pointsR32,
    2: config.pointsR16,
    3: config.pointsQf,
    4: config.pointsSf,
    5: config.pointsFinal,
  };
}

// ──────────────────────────────────────────────────────────────
// Elimination & max-possible helpers (Story 4.2)
// ──────────────────────────────────────────────────────────────

/**
 * Returns true if the team has not lost any match where a result exists.
 * Pure function — no database access.
 */
export function isTeamAlive(
  team: string,
  results: { matchId: number; winner: string }[],
  matches: { id: number; teamA: string | null; teamB: string | null }[]
): boolean {
  for (const result of results) {
    const match = matches.find((m) => m.id === result.matchId);
    if (!match) continue;
    const teamWasInMatch = match.teamA === team || match.teamB === team;
    if (teamWasInMatch && result.winner !== team) return false;
  }
  return true;
}

/**
 * Calculate the maximum points a participant could still earn.
 * Adds current score to the points remaining from unplayed matches with alive picks.
 * Pure function — no database access.
 */
export function maxPossiblePoints(input: MaxPointsInput): number {
  const { picks, results, matches, pointsPerRound, currentScore } = input;

  // Build set of teams eliminated by actual results
  const eliminatedTeams = new Set<string>();
  for (const result of results) {
    const match = matches.find((m) => m.id === result.matchId);
    if (!match) continue;
    if (match.teamA && match.teamA !== result.winner) eliminatedTeams.add(match.teamA);
    if (match.teamB && match.teamB !== result.winner) eliminatedTeams.add(match.teamB);
  }

  // For each unplayed match, check if user's pick is still alive
  const resultMatchIds = new Set(results.map((r) => r.matchId));
  let remainingPossible = 0;

  for (const pick of picks) {
    if (resultMatchIds.has(pick.matchId)) continue; // already scored
    if (!eliminatedTeams.has(pick.selectedTeam)) {
      const match = matches.find((m) => m.id === pick.matchId);
      if (match) remainingPossible += pointsPerRound[match.round] ?? 0;
    }
  }

  return currentScore + remainingPossible;
}

/**
 * Returns true if the champion pick team has been eliminated from the tournament.
 * Pure function — no database access.
 */
export function isChampionEliminated(
  championTeam: string,
  results: { matchId: number; winner: string }[],
  matches: { id: number; teamA: string | null; teamB: string | null }[]
): boolean {
  return !isTeamAlive(championTeam, results, matches);
}

/**
 * Returns true if the user cannot possibly beat the current leader (strict less-than).
 * A user tied with the leader is NOT eliminated.
 */
export function isEliminated(maxPossible: number, leaderScore: number): boolean {
  return maxPossible < leaderScore;
}

/**
 * Returns the team the user picked for the Final match (round 5, position 1).
 * Returns null if no pick exists for the Final.
 */
export function getChampionPick(
  picks: { matchId: number; selectedTeam: string }[],
  matches: { id: number; round: number; position: number }[]
): string | null {
  const finalMatch = matches.find((m) => m.round === 5 && m.position === 1);
  if (!finalMatch) return null;
  return picks.find((p) => p.matchId === finalMatch.id)?.selectedTeam ?? null;
}

/**
 * Find the highest round number where all matches have results.
 * Falls back to the highest round with any results if no round is fully complete.
 * Returns 0 if no results exist.
 * Pure function — no database access.
 */
export function getLatestCompletedRound(
  results: { matchId: number }[],
  matches: { id: number; round: number }[]
): number {
  const resultMatchIds = new Set(results.map((r) => r.matchId));

  // First pass: find highest round where every match has a result (fully completed)
  for (let round = 5; round >= 1; round--) {
    const roundMatches = matches.filter((m) => m.round === round);
    if (roundMatches.length === 0) continue;
    if (roundMatches.every((m) => resultMatchIds.has(m.id))) return round;
  }

  // Fallback: find highest round with any results (partially in progress)
  for (let round = 5; round >= 1; round--) {
    const roundMatches = matches.filter((m) => m.round === round);
    if (roundMatches.length === 0) continue;
    if (roundMatches.some((m) => resultMatchIds.has(m.id))) return round;
  }

  return 0;
}

/**
 * Count how many of a user's picks were correct in a specific round.
 * Pure function — no database access.
 */
export function getCorrectPicksInRound(params: {
  picks: { matchId: number; selectedTeam: string }[];
  results: { matchId: number; winner: string }[];
  matches: { id: number; round: number }[];
  targetRound: number;
}): number {
  const { picks, results, matches, targetRound } = params;
  let count = 0;

  const roundMatches = matches.filter((m) => m.round === targetRound);
  for (const match of roundMatches) {
    const result = results.find((r) => r.matchId === match.id);
    if (!result) continue;
    const pick = picks.find((p) => p.matchId === match.id);
    if (pick && pick.selectedTeam === result.winner) count++;
  }

  return count;
}

/**
 * Sort leaderboard entries by score (desc), then champion pick correctness, then latest-round picks.
 * Truly tied participants share the same rank; the next rank skips accordingly.
 * Pure function — no database access.
 */
export function applyTiebreakers(
  entries: LeaderboardEntry[],
  input: {
    allPicks: { userId: number; matchId: number; selectedTeam: string }[];
    results: { matchId: number; winner: string }[];
    matches: { id: number; round: number; position: number; teamA: string | null; teamB: string | null }[];
  }
): LeaderboardEntry[] {
  if (entries.length === 0) return [];

  const latestRound = getLatestCompletedRound(input.results, input.matches);

  const finalMatch = input.matches.find((m) => m.round === 5 && m.position === 1);
  const finalResult = finalMatch ? input.results.find((r) => r.matchId === finalMatch.id) : null;
  const actualChampion = finalResult?.winner ?? null;

  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    if (actualChampion) {
      const aChampCorrect = a.championPick === actualChampion;
      const bChampCorrect = b.championPick === actualChampion;
      if (aChampCorrect !== bChampCorrect) return aChampCorrect ? -1 : 1;
    }

    if (latestRound > 0) {
      const aRoundPicks = getCorrectPicksInRound({
        picks: input.allPicks.filter((p) => p.userId === a.userId),
        results: input.results,
        matches: input.matches,
        targetRound: latestRound,
      });
      const bRoundPicks = getCorrectPicksInRound({
        picks: input.allPicks.filter((p) => p.userId === b.userId),
        results: input.results,
        matches: input.matches,
        targetRound: latestRound,
      });
      if (bRoundPicks !== aRoundPicks) return bRoundPicks - aRoundPicks;
    }

    return 0;
  });

  // Assign ranks — truly tied entries share the same rank
  sorted[0].rank = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (curr.score !== prev.score) {
      curr.rank = i + 1;
      continue;
    }

    let champTied = true;
    if (actualChampion) {
      champTied = (curr.championPick === actualChampion) === (prev.championPick === actualChampion);
    }

    if (!champTied) {
      curr.rank = i + 1;
      continue;
    }

    let roundTied = true;
    if (latestRound > 0) {
      const prevRoundPicks = getCorrectPicksInRound({
        picks: input.allPicks.filter((p) => p.userId === prev.userId),
        results: input.results,
        matches: input.matches,
        targetRound: latestRound,
      });
      const currRoundPicks = getCorrectPicksInRound({
        picks: input.allPicks.filter((p) => p.userId === curr.userId),
        results: input.results,
        matches: input.matches,
        targetRound: latestRound,
      });
      roundTied = prevRoundPicks === currRoundPicks;
    }

    curr.rank = roundTied ? prev.rank : i + 1;
  }

  return sorted;
}

/**
 * Build a sorted leaderboard with scores, max possible, champion pick, and elimination flags.
 * Pure function — no database access.
 */
export function buildLeaderboardEntries(input: {
  users: { id: number; username: string }[];
  allPicks: { userId: number; matchId: number; selectedTeam: string }[];
  results: { matchId: number; winner: string }[];
  matches: { id: number; round: number; position: number; teamA: string | null; teamB: string | null }[];
  pointsPerRound: Record<number, number>;
}): LeaderboardEntry[] {
  const { users, allPicks, results, matches, pointsPerRound } = input;

  // Compute all scores first to find leader
  const scores = calculateAllScores(users, allPicks, results, matches, pointsPerRound);
  const leaderScore = scores[0]?.score ?? 0;

  const entries = users.map((user) => {
    const userPicks = allPicks.filter((p) => p.userId === user.id);
    const score = scores.find((s) => s.userId === user.id)?.score ?? 0;
    const maxPossible = maxPossiblePoints({ picks: userPicks, results, matches, pointsPerRound, currentScore: score });
    const championPick = getChampionPick(userPicks, matches);
    const championEliminated = championPick !== null
      ? isChampionEliminated(championPick, results, matches)
      : false;

    return {
      userId: user.id,
      username: user.username,
      score,
      maxPossible,
      championPick,
      isChampionEliminated: championEliminated,
      isEliminated: isEliminated(maxPossible, leaderScore),
      rank: 0, // assigned by applyTiebreakers
    };
  });

  return applyTiebreakers(entries, { allPicks, results, matches });
}
