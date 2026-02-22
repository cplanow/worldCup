"use client";

import type { MatchCardMode, PickClassification } from "@/types";

interface MatchCardProps {
  matchId: number;
  teamA: string | null;
  teamB: string | null;
  selectedTeam: string | null;
  disabled: boolean;
  mode: MatchCardMode;
  classification?: PickClassification;
  onSelect: (matchId: number, team: string) => void;
}

function TeamRow({
  team,
  isSelected,
  isTop,
  disabled,
  onClick,
  mode,
  classification,
}: {
  team: string | null;
  isSelected: boolean;
  isTop: boolean;
  disabled: boolean;
  onClick: () => void;
  mode: MatchCardMode;
  classification?: PickClassification;
}) {
  const cornerClass = isTop ? "rounded-t-lg" : "rounded-b-lg";
  const baseClass = `flex min-h-[44px] items-center px-3 py-2 text-sm ${cornerClass}`;

  if (!team) {
    return (
      <div className={`${baseClass} bg-slate-50`}>
        <span className="text-sm text-slate-300">TBD</span>
      </div>
    );
  }

  if (mode === "readonly") {
    return (
      <div
        className={`${baseClass} ${isSelected ? "bg-slate-100 text-slate-900" : "bg-white text-slate-900"}`}
        aria-label={isSelected ? `${team} — your pick` : team}
      >
        <span className="truncate">{team}</span>
        {isSelected && (
          <svg
            className="ml-2 h-4 w-4 shrink-0 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    );
  }

  if (mode === "results") {
    if (!isSelected) {
      return (
        <div className={`${baseClass} bg-white text-slate-900`} aria-label={team}>
          <span className="truncate">{team}</span>
        </div>
      );
    }

    const cls = classification ?? "pending";
    const resultStyles = {
      correct: {
        bg: "bg-emerald-500 text-white",
        icon: "✓",
        strikethrough: false,
        ariaLabel: `${team} — correct pick`,
      },
      wrong: {
        bg: "bg-red-500 text-white",
        icon: "✗",
        strikethrough: true,
        ariaLabel: `${team} — wrong pick`,
      },
      pending: {
        bg: "bg-slate-300 text-slate-600",
        icon: null,
        strikethrough: false,
        ariaLabel: `${team} — pending`,
      },
    }[cls];

    return (
      <div
        className={`${baseClass} ${resultStyles.bg} justify-between`}
        aria-label={resultStyles.ariaLabel}
      >
        <span className={resultStyles.strikethrough ? "truncate line-through" : "truncate"}>
          {team}
        </span>
        {resultStyles.icon && (
          <span className="ml-2 shrink-0">{resultStyles.icon}</span>
        )}
      </div>
    );
  }

  // entry mode
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${team} wins`}
      aria-pressed={isSelected}
      className={`${baseClass} w-full text-left transition-colors justify-between ${
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
  mode,
  classification,
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
        mode={mode}
        classification={selectedTeam === teamA ? classification : undefined}
      />
      {!isEmpty && <div className="border-t border-slate-200" />}
      <TeamRow
        team={teamB}
        isSelected={selectedTeam === teamB && teamB !== null}
        isTop={false}
        disabled={disabled || !teamB}
        onClick={() => teamB && onSelect(matchId, teamB)}
        mode={mode}
        classification={selectedTeam === teamB ? classification : undefined}
      />
    </div>
  );
}
