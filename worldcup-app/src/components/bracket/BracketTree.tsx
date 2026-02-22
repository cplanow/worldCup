"use client";

import { MatchCard } from "./MatchCard";
import type { BracketState, MatchCardMode, PickClassification } from "@/types";

interface BracketTreeProps {
  bracketState: BracketState;
  onSelect: (matchId: number, team: string) => void;
  disabled: boolean;
  mode: MatchCardMode;
  classifications?: Map<number, PickClassification>;
}

function connectorBorderColor(cls?: PickClassification): string {
  if (cls === "correct") return "border-emerald-500";
  if (cls === "wrong") return "border-red-500";
  if (cls === "pending") return "border-slate-300";
  return "border-slate-200";
}

function ConnectorLines({
  matchCount,
  classifications,
}: {
  matchCount: number;
  classifications?: (PickClassification | undefined)[];
}) {
  // Draws pairs of horizontal lines converging into one output line per pair
  const pairs = matchCount / 2;
  return (
    <div className="flex flex-col justify-around flex-1">
      {Array.from({ length: pairs }, (_, i) => {
        const color = connectorBorderColor(classifications?.[i]);
        return (
          <div key={i} className="flex flex-col items-stretch" style={{ flex: 1 }}>
            <div className="relative flex flex-col justify-center flex-1">
              {/* Top horizontal line */}
              <div className="flex items-end flex-1">
                <div className={`w-4 border-b-2 border-r-2 ${color}`} style={{ height: "50%" }} />
              </div>
              {/* Bottom horizontal line */}
              <div className="flex items-start flex-1">
                <div className={`w-4 border-t-2 border-r-2 ${color}`} style={{ height: "50%" }} />
              </div>
              {/* Output horizontal line from bracket midpoint to next round column */}
              <div
                className={`absolute border-b-2 ${color}`}
                style={{ left: "1rem", right: 0, top: "50%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BracketTree({ bracketState, onSelect, disabled, mode, classifications }: BracketTreeProps) {
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
                      disabled={disabled || !slot.teamA || !slot.teamB}
                      mode={mode}
                      classification={classifications?.get(slot.matchId)}
                      onSelect={onSelect}
                    />
                  </div>
                ))}
              </div>
            </div>
            {round.round < 5 && (
              <div className="flex flex-col w-6">
                <div className="mb-3" />
                <ConnectorLines
                  matchCount={round.matches.length}
                  classifications={
                    mode === "results" && classifications
                      ? bracketState.rounds
                          .find((r) => r.round === round.round + 1)
                          ?.matches.map((slot) => classifications.get(slot.matchId))
                      : undefined
                  }
                />
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
