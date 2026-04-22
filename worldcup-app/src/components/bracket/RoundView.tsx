"use client";

import { useEffect, useState } from "react";
import { MatchCard } from "./MatchCard";
import { cn } from "@/lib/utils";
import type { BracketState, MatchCardMode, PickClassification } from "@/types";

interface RoundViewProps {
  bracketState: BracketState;
  onSelect: (matchId: number, team: string) => void;
  disabled: boolean;
  mode: MatchCardMode;
  classifications?: Map<number, PickClassification>;
  progressBar?: React.ReactNode;
  submitSection?: React.ReactNode;
}

function findActiveRoundIndex(bracketState: BracketState): number {
  for (let i = 0; i < bracketState.rounds.length; i += 1) {
    const round = bracketState.rounds[i];
    const openSlot = round.matches.find(
      (m) => m.teamA && m.teamB && !m.selectedTeam
    );
    if (openSlot) return i;
  }
  return Math.max(0, bracketState.rounds.length - 1);
}

/**
 * Mobile round-by-round view. On first mount we center on the "active" round
 * (first round with an open pick) so users don't have to page through the
 * already-completed R32 every time. Left/right chevrons + swipable tabs
 * switch between rounds; a progress rail shows overall position.
 */
export function RoundView({
  bracketState,
  onSelect,
  disabled,
  mode,
  classifications,
  progressBar,
  submitSection,
}: RoundViewProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(() =>
    findActiveRoundIndex(bracketState)
  );

  // Keep the view centered on the active round when bracketState changes
  // dramatically (e.g., initial R32 completion pushes the user to R16). We
  // only auto-advance — never pull the user backwards — so a user browsing
  // a later round isn't yanked back.
  useEffect(() => {
    const active = findActiveRoundIndex(bracketState);
    setCurrentRoundIndex((prev) => (active > prev ? active : prev));
  }, [bracketState]);

  const round = bracketState.rounds[currentRoundIndex];
  const isFirst = currentRoundIndex === 0;
  const isLast = currentRoundIndex === bracketState.rounds.length - 1;
  const isFinal = isLast;

  const filled = round.matches.filter((m) => m.selectedTeam).length;
  const roundTotal = round.matches.filter((m) => m.teamA && m.teamB).length;

  return (
    <div className="md:hidden px-4 py-4 space-y-4">
      {/* Tab strip — each round a pill, current filled, others muted */}
      <div
        className="flex gap-1 overflow-x-auto rounded-full bg-surface-sunken p-1"
        role="tablist"
        aria-label="Bracket rounds"
      >
        {bracketState.rounds.map((r, i) => {
          const label = r.round === 5 ? "Final" : r.name.replace("Round of ", "R");
          const isCurrent = i === currentRoundIndex;
          return (
            <button
              key={r.round}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => setCurrentRoundIndex(i)}
              className={cn(
                "min-w-0 flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isCurrent
                  ? "bg-brand text-text-on-brand shadow-[var(--shadow-card)]"
                  : "text-text-muted hover:text-text"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Prev / round title / next */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentRoundIndex((i) => i - 1)}
          disabled={isFirst}
          aria-label="Previous round"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isFirst
              ? "cursor-not-allowed text-text-subtle opacity-40"
              : "text-text hover:bg-surface-2"
          )}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <h3
            className={cn(
              "font-display text-lg font-bold",
              isFinal ? "text-accent-strong" : "text-text"
            )}
          >
            {round.name}
          </h3>
          <p className="text-xs font-medium text-text-muted">
            {filled} of {roundTotal} picked
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCurrentRoundIndex((i) => i + 1)}
          disabled={isLast}
          aria-label="Next round"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isLast
              ? "cursor-not-allowed text-text-subtle opacity-40"
              : "text-text hover:bg-surface-2"
          )}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Progress bar: below navigation, above MatchCards */}
      {progressBar && <div>{progressBar}</div>}

      {/* Match cards — animate-fade-in keys off the current round so switching
          rounds gives the new set a gentle entry */}
      <div
        key={`round-${round.round}`}
        className="flex flex-col items-stretch gap-3 animate-fade-in"
      >
        {round.matches.map((slot) => (
          <div
            key={`${round.round}-${slot.position}`}
            className="flex justify-center"
          >
            <MatchCard
              matchId={slot.matchId}
              teamA={slot.teamA}
              teamB={slot.teamB}
              selectedTeam={slot.selectedTeam}
              disabled={disabled || !slot.teamA || !slot.teamB}
              mode={mode}
              classification={classifications?.get(slot.matchId)}
              onSelect={onSelect}
              emphasis={isFinal ? "hero" : "active"}
            />
          </div>
        ))}
      </div>

      {/* Submit section: below MatchCards */}
      {submitSection && <div className="pt-2">{submitSection}</div>}
    </div>
  );
}
