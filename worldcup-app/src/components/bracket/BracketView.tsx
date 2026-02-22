"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BracketTree } from "./BracketTree";
import { RoundView } from "./RoundView";
import { ProgressBar } from "./ProgressBar";
import { Button } from "@/components/ui/button";
import { computeBracketState, getCascadingClears, validatePick, classifyAllPicks, MAX_PICKS } from "@/lib/bracket-utils";
import { savePick, deletePicks, submitBracket } from "@/lib/actions/bracket";
import type { Match, Pick } from "@/types";

interface BracketViewProps {
  matches: Match[];
  picks: Pick[];
  isReadOnly: boolean;
  userId: number;
  results?: { matchId: number; winner: string }[];
  score?: number;
  maxPossible?: number;
}

export function BracketView({ matches, picks: initialPicks, isReadOnly, userId, results, score, maxPossible }: BracketViewProps) {
  const router = useRouter();
  const [localPicks, setLocalPicks] = useState<Pick[]>(initialPicks);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const bracketState = useMemo(
    () => computeBracketState(matches, localPicks),
    [matches, localPicks]
  );

  const pickCount = localPicks.length;
  const isComplete = pickCount === MAX_PICKS;
  const hasResults = (results?.length ?? 0) > 0;
  const mode = isReadOnly ? (hasResults ? "results" : "readonly") : "entry";

  const classifications = useMemo(() => {
    if (mode !== "results" || !results) return undefined;
    return classifyAllPicks(localPicks, results, matches);
  }, [mode, localPicks, results, matches]);

  function handleSelect(matchId: number, team: string) {
    if (isReadOnly) return;

    const currentPick = localPicks.find((p) => p.matchId === matchId);

    // No-op: tapping the already-selected team
    if (currentPick && currentPick.selectedTeam === team) return;

    // Guard: pick must be legal (team in match, match available)
    if (!validatePick(matchId, team, matches, localPicks)) return;

    // Compute cascade clears before updating state
    let clearIds: number[] = [];
    if (currentPick) {
      clearIds = getCascadingClears(matchId, currentPick.selectedTeam, localPicks, matches);
    }

    // Optimistic state update
    setLocalPicks((prev) => {
      const updated = prev.filter((p) => !clearIds.includes(p.matchId));
      const existingIdx = updated.findIndex((p) => p.matchId === matchId);
      const newPick: Pick = { id: -1, userId, matchId, selectedTeam: team, createdAt: "" };

      if (existingIdx >= 0) {
        return [...updated.slice(0, existingIdx), newPick, ...updated.slice(existingIdx + 1)];
      }
      return [...updated, newPick];
    });

    // Fire-and-forget server saves
    void savePick({ userId, matchId, selectedTeam: team });
    if (clearIds.length > 0) {
      void deletePicks({ userId, matchIds: clearIds });
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await submitBracket(userId);

    if (result.success) {
      router.push("/leaderboard");
    } else {
      setSubmitError(result.error);
      setIsSubmitting(false);
    }
  }

  const submitSection = !isReadOnly ? (
    <div className="space-y-3">
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!isComplete || isSubmitting}
        className={`w-full font-semibold text-base ${
          isComplete && !isSubmitting
            ? "bg-slate-900 text-white hover:bg-slate-800"
            : "bg-slate-100 text-slate-400 cursor-not-allowed"
        }`}
      >
        {isSubmitting ? "Submitting..." : "Submit Bracket"}
      </Button>
      {submitError && (
        <p className="text-sm text-red-500">{submitError}</p>
      )}
    </div>
  ) : null;

  const scoreSummary =
    isReadOnly && hasResults && score !== undefined && maxPossible !== undefined ? (
      <p className="text-sm text-slate-500">
        Score:{" "}
        <span className="font-semibold text-slate-900">{score} pts</span>
        {" - Max: "}
        <span className="font-semibold text-slate-900">{maxPossible} pts</span>
      </p>
    ) : null;

  return (
    <div>
      <BracketTree
        bracketState={bracketState}
        onSelect={handleSelect}
        disabled={isReadOnly}
        mode={mode}
        classifications={classifications}
      />
      {/* Desktop: progress + submit below the bracket tree (entry mode) */}
      {!isReadOnly && (
        <div className="hidden md:block px-4 mt-6 max-w-sm space-y-3">
          <ProgressBar current={pickCount} total={MAX_PICKS} />
          {submitSection}
        </div>
      )}
      {/* Score summary (results mode) — desktop visible, also passed to mobile RoundView */}
      {scoreSummary && (
        <div className="hidden md:block px-4 mt-6 max-w-sm" data-testid="score-summary-desktop">
          {scoreSummary}
        </div>
      )}
      <RoundView
        bracketState={bracketState}
        onSelect={handleSelect}
        disabled={isReadOnly}
        mode={mode}
        classifications={classifications}
        progressBar={
          !isReadOnly ? (
            <ProgressBar current={pickCount} total={MAX_PICKS} />
          ) : scoreSummary
        }
        submitSection={submitSection}
      />
    </div>
  );
}
