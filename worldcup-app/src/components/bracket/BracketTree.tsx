"use client";

import { MatchCard } from "./MatchCard";
import { ROUND_NAMES } from "@/lib/bracket-utils";
import type { BracketState } from "@/types";

interface BracketTreeProps {
  bracketState: BracketState;
  onSelect: (matchId: number, team: string) => void;
  disabled: boolean;
}

function ConnectorLines({ matchCount }: { matchCount: number }) {
  // Draws pairs of horizontal lines converging into one output line per pair
  const pairs = matchCount / 2;
  return (
    <div className="flex flex-col justify-around flex-1">
      {Array.from({ length: pairs }, (_, i) => (
        <div key={i} className="flex flex-col items-stretch" style={{ flex: 1 }}>
          <div className="flex flex-col justify-center flex-1">
            {/* Top horizontal line */}
            <div className="flex items-end flex-1">
              <div className="w-4 border-b-2 border-r-2 border-slate-200" style={{ height: "50%" }} />
            </div>
            {/* Bottom horizontal line */}
            <div className="flex items-start flex-1">
              <div className="w-4 border-t-2 border-r-2 border-slate-200" style={{ height: "50%" }} />
            </div>
          </div>
          {/* Output horizontal line to next round */}
          <div className="absolute" />
        </div>
      ))}
    </div>
  );
}

export function BracketTree({ bracketState, onSelect, disabled }: BracketTreeProps) {
  return (
    <div className="hidden md:block overflow-x-auto pb-4">
      <div className="flex px-4 py-4" style={{ minWidth: "fit-content" }}>
        {bracketState.rounds.map((round) => (
          <div key={round.round} className="flex">
            <div className="flex flex-col">
              <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                {round.name}
              </h3>
              <div
                className="flex flex-1 flex-col justify-around"
                style={{ gap: `${Math.pow(2, round.round - 1) * 8 - 8}px` }}
              >
                {round.matches.map((slot) => (
                  <div key={`${round.round}-${slot.position}`} className="flex items-center">
                    <MatchCard
                      matchId={slot.matchId}
                      teamA={slot.teamA}
                      teamB={slot.teamB}
                      selectedTeam={slot.selectedTeam}
                      disabled={disabled}
                      onSelect={onSelect}
                    />
                  </div>
                ))}
              </div>
            </div>
            {round.round < 5 && (
              <div className="flex flex-col w-6">
                <div className="mb-3" />
                <ConnectorLines matchCount={round.matches.length} />
              </div>
            )}
          </div>
        ))}

        {/* Champion display */}
        <div className="flex flex-col">
          <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
            Champion
          </h3>
          <div className="flex flex-1 items-center">
            <div className="ml-2 flex min-h-[44px] w-40 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              {bracketState.rounds[4]?.matches[0]?.selectedTeam ? (
                <span className="text-sm font-bold text-amber-800">
                  {bracketState.rounds[4].matches[0].selectedTeam}
                </span>
              ) : (
                <span className="text-sm text-slate-300">TBD</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
