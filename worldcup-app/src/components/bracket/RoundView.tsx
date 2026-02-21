"use client";

import { useState } from "react";
import { MatchCard } from "./MatchCard";
import type { BracketState, MatchCardMode } from "@/types";

interface RoundViewProps {
  bracketState: BracketState;
  onSelect: (matchId: number, team: string) => void;
  disabled: boolean;
  mode: MatchCardMode;
  progressBar?: React.ReactNode;
  submitSection?: React.ReactNode;
}

export function RoundView({ bracketState, onSelect, disabled, mode, progressBar, submitSection }: RoundViewProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const round = bracketState.rounds[currentRoundIndex];
  const isFirst = currentRoundIndex === 0;
  const isLast = currentRoundIndex === bracketState.rounds.length - 1;

  return (
    <div className="md:hidden px-4 py-4">
      {/* Round navigation header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentRoundIndex((i) => i - 1)}
          disabled={isFirst}
          aria-label="Previous round"
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isFirst
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
          {round.name}
        </h3>

        <button
          type="button"
          onClick={() => setCurrentRoundIndex((i) => i + 1)}
          disabled={isLast}
          aria-label="Next round"
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isLast
              ? "text-slate-300 cursor-not-allowed"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Round indicator dots */}
      <div className="flex justify-center gap-1.5 mb-4">
        {bracketState.rounds.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i === currentRoundIndex ? "bg-slate-700" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Progress bar: below navigation, above MatchCards */}
      {progressBar && <div className="mb-4">{progressBar}</div>}

      {/* Match cards */}
      <div className="flex flex-col items-center gap-3">
        {round.matches.map((slot) => (
          <MatchCard
            key={`${round.round}-${slot.position}`}
            matchId={slot.matchId}
            teamA={slot.teamA}
            teamB={slot.teamB}
            selectedTeam={slot.selectedTeam}
            disabled={disabled || !slot.teamA || !slot.teamB}
            mode={mode}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Submit section: below MatchCards */}
      {submitSection && <div className="mt-4">{submitSection}</div>}
    </div>
  );
}
