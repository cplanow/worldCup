"use client";

import { MatchCard } from "./MatchCard";
import { cn } from "@/lib/utils";
import type { BracketState, MatchCardMode, PickClassification } from "@/types";

interface BracketTreeProps {
  bracketState: BracketState;
  onSelect: (matchId: number, team: string) => void;
  disabled: boolean;
  mode: MatchCardMode;
  classifications?: Map<number, PickClassification>;
}

/**
 * Determines the "current round in play" — the first round that still has
 * open picks. In readonly/results modes we still highlight the last-filled
 * round so the viewer's eye lands on the most relevant column.
 */
function findActiveRoundIndex(bracketState: BracketState): number {
  for (let i = 0; i < bracketState.rounds.length; i += 1) {
    const round = bracketState.rounds[i];
    const openSlot = round.matches.find(
      (m) => m.teamA && m.teamB && !m.selectedTeam
    );
    if (openSlot) return i;
  }
  // Fully picked → highlight the Final
  return Math.max(0, bracketState.rounds.length - 1);
}

function connectorColor(cls?: PickClassification): string {
  if (cls === "correct") return "border-success";
  if (cls === "wrong") return "border-error";
  if (cls === "pending") return "border-border-strong";
  return "border-border";
}

/**
 * Pair of lines linking two sibling matches in a round to the single output
 * line feeding the next round. Colors reflect the downstream pick status
 * during results mode.
 */
function ConnectorLines({
  matchCount,
  classifications,
}: {
  matchCount: number;
  classifications?: (PickClassification | undefined)[];
}) {
  const pairs = matchCount / 2;
  return (
    <div className="flex flex-1 flex-col justify-around">
      {Array.from({ length: pairs }, (_, i) => {
        const color = connectorColor(classifications?.[i]);
        return (
          <div key={i} className="flex flex-1 flex-col items-stretch">
            <div className="relative flex flex-1 flex-col justify-center">
              {/* Top incoming */}
              <div className="flex flex-1 items-end">
                <div
                  className={cn("w-4 border-b-2 border-r-2", color)}
                  style={{ height: "50%" }}
                />
              </div>
              {/* Bottom incoming */}
              <div className="flex flex-1 items-start">
                <div
                  className={cn("w-4 border-t-2 border-r-2", color)}
                  style={{ height: "50%" }}
                />
              </div>
              {/* Outgoing to next round */}
              <div
                className={cn("absolute border-b-2", color)}
                style={{ left: "1rem", right: 0, top: "50%" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Desktop bracket tree. Hierarchy by round: the currently-active round gets
 * the fullest treatment; earlier/later rounds fade back via the `emphasis`
 * prop on MatchCard. The Final is rendered with a hero emphasis and followed
 * by a gold Champion panel.
 */
export function BracketTree({
  bracketState,
  onSelect,
  disabled,
  mode,
  classifications,
}: BracketTreeProps) {
  const activeIdx = findActiveRoundIndex(bracketState);
  const lastRoundIdx = bracketState.rounds.length - 1;

  return (
    <div className="hidden md:block">
      <div
        className="overflow-x-auto rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-card)]"
        data-testid="bracket-tree-desktop"
      >
        <div className="flex" style={{ minWidth: "fit-content" }}>
          {bracketState.rounds.map((round, idx) => {
            const isActive = idx === activeIdx;
            const isFinal = idx === lastRoundIdx;
            const emphasis: "active" | "muted" | "hero" = isFinal
              ? "hero"
              : isActive
                ? "active"
                : "muted";

            return (
              <div key={round.round} className="flex">
                <div className="flex flex-col">
                  {/* Round header: bold for active, faded for background rounds */}
                  <div
                    className={cn(
                      "mb-4 flex flex-col items-center gap-0.5",
                      isActive && "animate-fade-in"
                    )}
                  >
                    <h3
                      className={cn(
                        "font-display text-sm font-bold uppercase tracking-[0.16em]",
                        isActive
                          ? "text-text"
                          : isFinal
                            ? "text-accent-strong"
                            : "text-text-subtle"
                      )}
                    >
                      {round.name}
                    </h3>
                    {isActive && (
                      <span className="h-0.5 w-8 rounded-full bg-accent" />
                    )}
                  </div>

                  <div
                    className="flex flex-1 flex-col justify-around"
                    style={{
                      gap: `${Math.pow(2, round.round - 1) * 8 - 8}px`,
                    }}
                  >
                    {round.matches.map((slot) => (
                      <div
                        key={`${round.round}-${slot.position}`}
                        className="flex items-center"
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
                          emphasis={emphasis}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {round.round < 5 && (
                  <div className="flex w-6 flex-col">
                    <div className="mb-4 h-[1.5rem]" />
                    <ConnectorLines
                      matchCount={round.matches.length}
                      classifications={
                        mode === "results" && classifications
                          ? bracketState.rounds
                              .find((r) => r.round === round.round + 1)
                              ?.matches.map((slot) =>
                                classifications.get(slot.matchId)
                              )
                          : undefined
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Champion destination — gold-tinted hero panel */}
          <div className="flex flex-col">
            <div className="mb-4 flex flex-col items-center gap-0.5">
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.16em] text-accent-strong">
                Champion
              </h3>
              <span className="h-0.5 w-8 rounded-full bg-accent" />
            </div>
            <div className="flex flex-1 items-center">
              <div
                className={cn(
                  "ml-3 flex min-h-[56px] w-44 items-center justify-center rounded-xl px-4 py-3 text-center transition-colors",
                  bracketState.rounds[4]?.matches[0]?.selectedTeam
                    ? "bg-accent/15 ring-2 ring-accent shadow-[var(--shadow-card)]"
                    : "border border-dashed border-border bg-surface-sunken"
                )}
                data-testid="champion-slot"
              >
                {bracketState.rounds[4]?.matches[0]?.selectedTeam ? (
                  <span className="font-display text-base font-bold text-accent-strong">
                    {bracketState.rounds[4].matches[0].selectedTeam}
                  </span>
                ) : (
                  <span className="text-xs uppercase tracking-wider text-text-subtle">
                    TBD
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
