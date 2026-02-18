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
