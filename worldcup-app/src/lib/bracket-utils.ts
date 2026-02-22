import type { Match, Pick, MatchSlot, BracketState, PickClassification } from "@/types";

export const ROUND_NAMES: Record<number, string> = {
  1: "Round of 32",
  2: "Round of 16",
  3: "Quarterfinals",
  4: "Semifinals",
  5: "Final",
};

export const MATCHES_PER_ROUND: Record<number, number> = {
  1: 16,
  2: 8,
  3: 4,
  4: 2,
  5: 1,
};

export const MAX_PICKS = 31;

export function getNextRoundPosition(
  currentRound: number,
  currentPosition: number
): { round: number; position: number } {
  return {
    round: currentRound + 1,
    position: Math.ceil(currentPosition / 2),
  };
}

export function getFeederPositions(
  round: number,
  position: number
): { teamAFeeder: { round: number; position: number }; teamBFeeder: { round: number; position: number } } {
  return {
    teamAFeeder: { round: round - 1, position: position * 2 - 1 },
    teamBFeeder: { round: round - 1, position: position * 2 },
  };
}

export function getMatchSlot(
  round: number,
  position: number,
  picks: Pick[],
  matches: Match[]
): { teamA: string | null; teamB: string | null } {
  if (round === 1) {
    const match = matches.find((m) => m.round === 1 && m.position === position);
    return {
      teamA: match?.teamA ?? null,
      teamB: match?.teamB ?? null,
    };
  }

  const { teamAFeeder, teamBFeeder } = getFeederPositions(round, position);

  const feederMatchA = matches.find(
    (m) => m.round === teamAFeeder.round && m.position === teamAFeeder.position
  );
  const feederMatchB = matches.find(
    (m) => m.round === teamBFeeder.round && m.position === teamBFeeder.position
  );

  const pickA = feederMatchA
    ? picks.find((p) => p.matchId === feederMatchA.id)
    : null;
  const pickB = feederMatchB
    ? picks.find((p) => p.matchId === feederMatchB.id)
    : null;

  return {
    teamA: pickA?.selectedTeam ?? null,
    teamB: pickB?.selectedTeam ?? null,
  };
}

/**
 * Given a pick change, returns the match IDs of all downstream picks that
 * must be cleared because they reference the removed team.
 */
export function getCascadingClears(
  changedMatchId: number,
  previousTeam: string,
  allPicks: Pick[],
  allMatches: Match[]
): number[] {
  const clearIds: number[] = [];
  const match = allMatches.find((m) => m.id === changedMatchId);
  if (!match) return clearIds;

  let currentRound = match.round;
  let currentPosition = match.position;

  while (currentRound < 5) {
    const nextRound = currentRound + 1;
    const nextPosition = Math.ceil(currentPosition / 2);

    const nextMatch = allMatches.find(
      (m) => m.round === nextRound && m.position === nextPosition
    );
    if (!nextMatch) break;

    const pickForNext = allPicks.find((p) => p.matchId === nextMatch.id);
    if (pickForNext && pickForNext.selectedTeam === previousTeam) {
      clearIds.push(nextMatch.id);
      currentRound = nextRound;
      currentPosition = nextPosition;
    } else {
      break;
    }
  }

  return clearIds;
}

/**
 * Validates whether a pick is legal: team must be one of the two teams
 * in the match, and the match must be available (both feeder picks made
 * for later rounds).
 */
export function validatePick(
  matchId: number,
  team: string,
  matches: Match[],
  picks: Pick[]
): boolean {
  const match = matches.find((m) => m.id === matchId);
  if (!match) return false;

  const slot = getMatchSlot(match.round, match.position, picks, matches);
  if (!slot.teamA || !slot.teamB) return false;

  return team === slot.teamA || team === slot.teamB;
}

/**
 * Classify a single pick as correct, wrong, or pending based on a match result.
 */
export function classifyPick(
  pick: { selectedTeam: string },
  result: { winner: string } | null
): PickClassification {
  if (!result) return "pending";
  return pick.selectedTeam === result.winner ? "correct" : "wrong";
}

/**
 * Classify all picks, including cascading wrong detection.
 * A pick is "wrong" even if no result exists for that match if the picked team
 * was already eliminated in an earlier round.
 */
export function classifyAllPicks(
  picks: { matchId: number; selectedTeam: string }[],
  results: { matchId: number; winner: string }[],
  matches: { id: number; round: number; teamA: string | null; teamB: string | null }[]
): Map<number, PickClassification> {
  const classifications = new Map<number, PickClassification>();

  // Build set of eliminated teams from actual results
  const eliminatedTeams = new Set<string>();
  for (const result of results) {
    const match = matches.find((m) => m.id === result.matchId);
    if (!match) continue;
    if (match.teamA && match.teamA !== result.winner) eliminatedTeams.add(match.teamA);
    if (match.teamB && match.teamB !== result.winner) eliminatedTeams.add(match.teamB);
  }

  const resultMap = new Map(results.map((r) => [r.matchId, r]));

  for (const pick of picks) {
    const result = resultMap.get(pick.matchId);
    if (result) {
      classifications.set(pick.matchId, classifyPick(pick, result));
    } else if (eliminatedTeams.has(pick.selectedTeam)) {
      classifications.set(pick.matchId, "wrong");
    } else {
      classifications.set(pick.matchId, "pending");
    }
  }

  return classifications;
}

/**
 * Returns match IDs where both teams are determined and the match can be
 * picked. R32 matches are always available (assuming teamA/teamB are set).
 * Later-round matches are available once both feeder picks have been made.
 */
export function getAvailableMatches(matches: Match[], picks: Pick[]): number[] {
  return matches
    .filter((match) => {
      const slot = getMatchSlot(match.round, match.position, picks, matches);
      return !!slot.teamA && !!slot.teamB;
    })
    .map((match) => match.id);
}

/**
 * Computes the full bracket state for rendering.
 * @param matches - All matches from the DB (R32 + later-round placeholders)
 * @param picks - Picks for a SINGLE user (not all users). Pass pre-filtered picks.
 */
export function computeBracketState(
  matches: Match[],
  picks: Pick[]
): BracketState {
  const rounds: BracketState["rounds"] = [];

  for (let round = 1; round <= 5; round++) {
    const matchCount = MATCHES_PER_ROUND[round];
    const matchSlots: MatchSlot[] = [];

    for (let position = 1; position <= matchCount; position++) {
      const { teamA, teamB } = getMatchSlot(round, position, picks, matches);

      const dbMatch = matches.find(
        (m) => m.round === round && m.position === position
      );

      const pick = dbMatch
        ? picks.find((p) => p.matchId === dbMatch.id)
        : null;

      matchSlots.push({
        matchId: dbMatch?.id ?? 0,
        round,
        position,
        teamA,
        teamB,
        selectedTeam: pick?.selectedTeam ?? null,
      });
    }

    rounds.push({
      round,
      name: ROUND_NAMES[round],
      matches: matchSlots,
    });
  }

  const totalPicks = picks.length;

  return { rounds, totalPicks, maxPicks: MAX_PICKS };
}
