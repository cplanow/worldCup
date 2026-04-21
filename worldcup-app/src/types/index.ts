export type Match = {
  id: number;
  teamA: string;
  teamB: string;
  round: number;
  position: number;
  winner: string | null;
  createdAt: string;
};

export type TournamentConfig = {
  id: number;
  isLocked: boolean;
  groupStageLocked: boolean;
  pointsGroupAdvance: number;
  pointsGroupExact: number;
  pointsR32: number;
  pointsR16: number;
  pointsQf: number;
  pointsSf: number;
  pointsFinal: number;
  pointsGroupPosition: number;
  pointsGroupPerfect: number;
  actualTopScorer: string | null;
  createdAt: string;
};

export type Pick = {
  id: number;
  userId: number;
  matchId: number;
  selectedTeam: string;
  createdAt: string;
};

export type MatchSlot = {
  matchId: number;
  round: number;
  position: number;
  teamA: string | null;
  teamB: string | null;
  selectedTeam: string | null;
};

export type BracketState = {
  rounds: {
    round: number;
    name: string;
    matches: MatchSlot[];
  }[];
  totalPicks: number;
  maxPicks: number;
};

export type Result = {
  id: number;
  matchId: number;
  winner: string;
  createdAt: string;
};

export type MatchCardMode = "entry" | "readonly" | "results";

export type PickClassification = "correct" | "wrong" | "pending";

export interface MaxPointsInput {
  picks: { matchId: number; selectedTeam: string }[];
  results: { matchId: number; winner: string }[];
  matches: { id: number; round: number; teamA: string | null; teamB: string | null }[];
  pointsPerRound: Record<number, number>;
  currentScore: number;
}

export interface LeaderboardEntry {
  userId: number;
  username: string;
  score: number;
  maxPossible: number;
  championPick: string | null;
  isChampionEliminated: boolean;
  isEliminated: boolean;
  rank: number;
}

export interface ScoreInput {
  picks: { matchId: number; selectedTeam: string }[];
  results: { matchId: number; winner: string }[];
  matches: { id: number; round: number }[];
  pointsPerRound: Record<number, number>;
}

export interface PlayerScore {
  userId: number;
  username: string;
  score: number;
}

export type GroupPick = {
  id: number;
  userId: number;
  groupId: number;
  firstPlace: string;
  secondPlace: string;
  thirdPlace: string | null;
  fourthPlace: string | null;
  createdAt: string;
};
