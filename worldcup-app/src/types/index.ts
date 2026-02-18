export type User = {
  id: number;
  username: string;
  createdAt: string;
  bracketSubmitted: boolean;
};

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
  pointsR32: number;
  pointsR16: number;
  pointsQf: number;
  pointsSf: number;
  pointsFinal: number;
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
