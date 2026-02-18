"use client";

interface MatchCardProps {
  matchId: number;
  teamA: string | null;
  teamB: string | null;
  selectedTeam: string | null;
  disabled: boolean;
  onSelect: (matchId: number, team: string) => void;
}

function TeamRow({
  team,
  isSelected,
  isTop,
  disabled,
  onClick,
}: {
  team: string | null;
  isSelected: boolean;
  isTop: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  if (!team) {
    return (
      <div
        className={`flex min-h-[44px] items-center px-3 py-2 ${
          isTop ? "rounded-t-lg" : "rounded-b-lg"
        } bg-slate-50`}
      >
        <span className="text-sm text-slate-300">TBD</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${team} wins`}
      aria-pressed={isSelected}
      className={`flex min-h-[44px] w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
        isTop ? "rounded-t-lg" : "rounded-b-lg"
      } ${
        disabled
          ? "cursor-not-allowed bg-slate-100 text-slate-400"
          : isSelected
            ? "bg-emerald-50 font-medium text-slate-900"
            : "bg-white text-slate-900 hover:bg-slate-50"
      }`}
    >
      <span className="truncate">{team}</span>
      {isSelected && (
        <svg
          className="ml-2 h-4 w-4 shrink-0 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

export function MatchCard({
  matchId,
  teamA,
  teamB,
  selectedTeam,
  disabled,
  onSelect,
}: MatchCardProps) {
  const isEmpty = !teamA && !teamB;

  return (
    <div
      className={`w-40 overflow-hidden rounded-lg border ${
        isEmpty ? "border-slate-100" : "border-slate-200"
      }`}
    >
      <TeamRow
        team={teamA}
        isSelected={selectedTeam === teamA && teamA !== null}
        isTop={true}
        disabled={disabled || !teamA}
        onClick={() => teamA && onSelect(matchId, teamA)}
      />
      {!isEmpty && <div className="border-t border-slate-200" />}
      <TeamRow
        team={teamB}
        isSelected={selectedTeam === teamB && teamB !== null}
        isTop={false}
        disabled={disabled || !teamB}
        onClick={() => teamB && onSelect(matchId, teamB)}
      />
    </div>
  );
}
