"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BracketTree } from "./BracketTree";
import { RoundView } from "./RoundView";
import { ProgressBar } from "./ProgressBar";
import { Button } from "@/components/ui/button";
import { computeBracketState, getCascadingClears, validatePick, classifyAllPicks, MAX_PICKS } from "@/lib/bracket-utils";
import { savePick, submitBracket } from "@/lib/actions/bracket";
import type { Match, Pick } from "@/types";

interface BracketViewProps {
  matches: Match[];
  picks: Pick[];
  isReadOnly: boolean;
  results?: { matchId: number; winner: string }[];
  score?: number;
  maxPossible?: number;
}

export function BracketView({ matches, picks: initialPicks, isReadOnly, results, score, maxPossible }: BracketViewProps) {
  const router = useRouter();
  const [localPicks, setLocalPicks] = useState<Pick[]>(initialPicks);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // M9: surface server-side savePick failures. Cleared on the next successful
  // pick so stale errors don't linger after the user recovers.
  const [saveError, setSaveError] = useState<string | null>(null);

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

  async function handleSelect(matchId: number, team: string) {
    if (isReadOnly) return;

    const currentPick = localPicks.find((p) => p.matchId === matchId);

    // No-op: tapping the already-selected team
    if (currentPick && currentPick.selectedTeam === team) return;

    // Guard: pick must be legal (team in match, match available)
    if (!validatePick(matchId, team, matches, localPicks)) return;

    // Compute cascade clears for the optimistic UI. The server recomputes
    // the cascade authoritatively, so if the two diverge the server wins and
    // a refresh will reconcile — but in practice they agree because both
    // sides run the same pure getCascadingClears.
    let clearIds: number[] = [];
    if (currentPick) {
      clearIds = getCascadingClears(matchId, currentPick.selectedTeam, localPicks, matches);
    }

    // Snapshot the pre-tap state so we can roll back if the server rejects.
    const previousPicks = localPicks;

    // Optimistic state update
    setLocalPicks((prev) => {
      const updated = prev.filter((p) => !clearIds.includes(p.matchId));
      const existingIdx = updated.findIndex((p) => p.matchId === matchId);
      // userId is resolved server-side from the session; placeholder here
      // is only used while waiting for the server round-trip.
      const newPick: Pick = { id: -1, userId: 0, matchId, selectedTeam: team, createdAt: "" };

      if (existingIdx >= 0) {
        return [...updated.slice(0, existingIdx), newPick, ...updated.slice(existingIdx + 1)];
      }
      return [...updated, newPick];
    });

    // M9: await the server call so we can roll back the optimistic UI if it
    // rejects (e.g. "Bracket already submitted", "Brackets are locked"). The
    // server now cascades the clears in the same transaction, so we only
    // need one round-trip.
    try {
      const result = await savePick({ matchId, selectedTeam: team });
      if (!result.success) {
        setLocalPicks(previousPicks);
        setSaveError(result.error);
        return;
      }
      // Clear any previously shown error on successful save.
      setSaveError(null);
    } catch {
      setLocalPicks(previousPicks);
      setSaveError("Unable to save pick. Check your connection and try again.");
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    const result = await submitBracket();

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
      {saveError && (
        <div
          data-testid="save-error-banner"
          className="mx-4 mt-2 mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <span>{saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="font-semibold text-red-700 hover:text-red-900"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}
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
