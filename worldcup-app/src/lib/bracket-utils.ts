import type { Match, Pick, MatchSlot, BracketState } from "@/types";

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
