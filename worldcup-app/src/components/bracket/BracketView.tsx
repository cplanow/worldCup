"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BracketTree } from "./BracketTree";
import { RoundView } from "./RoundView";
import { ProgressBar } from "./ProgressBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  computeBracketState,
  getCascadingClears,
  validatePick,
  classifyAllPicks,
  MAX_PICKS,
} from "@/lib/bracket-utils";
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

export function BracketView({
  matches,
  picks: initialPicks,
  isReadOnly,
  results,
  score,
  maxPossible,
}: BracketViewProps) {
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
      clearIds = getCascadingClears(
        matchId,
        currentPick.selectedTeam,
        localPicks,
        matches
      );
    }

    // Snapshot the pre-tap state so we can roll back if the server rejects.
    const previousPicks = localPicks;

    // Optimistic state update
    setLocalPicks((prev) => {
      const updated = prev.filter((p) => !clearIds.includes(p.matchId));
      const existingIdx = updated.findIndex((p) => p.matchId === matchId);
      // userId is resolved server-side from the session; placeholder here
      // is only used while waiting for the server round-trip.
      const newPick: Pick = {
        id: -1,
        userId: 0,
        matchId,
        selectedTeam: team,
        createdAt: "",
      };

      if (existingIdx >= 0) {
        return [
          ...updated.slice(0, existingIdx),
          newPick,
          ...updated.slice(existingIdx + 1),
        ];
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

  // Submit CTA — uses the primitive Button (tokenized) and a token-aware
  // disabled treatment. Active: brand CTA; disabled: sunken surface.
  const submitSection = !isReadOnly ? (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!isComplete || isSubmitting}
        className={cn(
          "w-full text-base font-semibold",
          !(isComplete && !isSubmitting) &&
            "cursor-not-allowed bg-surface-sunken text-text-subtle hover:bg-surface-sunken"
        )}
      >
        {isSubmitting ? "Submitting..." : "Submit Bracket"}
      </Button>
      {!isComplete && !isSubmitting && (
        <p className="text-center text-xs text-text-muted">
          {MAX_PICKS - pickCount} picks remaining
        </p>
      )}
      {submitError && (
        <p className="text-sm text-error" role="alert">
          {submitError}
        </p>
      )}
    </div>
  ) : null;

  const scoreSummary =
    isReadOnly && hasResults && score !== undefined && maxPossible !== undefined ? (
      <div className="flex items-baseline gap-4 rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-card)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
            Score
          </p>
          <p className="font-display text-2xl font-bold text-text">
            {score}
            <span className="ml-1 text-sm font-medium text-text-muted">pts</span>
          </p>
        </div>
        <div className="h-10 w-px bg-border" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
            Max
          </p>
          <p className="font-display text-2xl font-bold text-text-muted">
            {maxPossible}
            <span className="ml-1 text-sm font-medium text-text-muted">pts</span>
          </p>
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {saveError && (
        <div
          data-testid="save-error-banner"
          className="mx-4 flex items-start justify-between gap-3 rounded-xl border border-error/30 bg-error-bg px-4 py-3 text-sm text-error shadow-[var(--shadow-card)] animate-slide-up"
          role="alert"
        >
          <span className="font-medium">{saveError}</span>
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="shrink-0 font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="px-4 md:px-0">
        <BracketTree
          bracketState={bracketState}
          onSelect={handleSelect}
          disabled={isReadOnly}
          mode={mode}
          classifications={classifications}
        />
      </div>

      {/* Desktop: progress + submit below the bracket tree (entry mode) */}
      {!isReadOnly && (
        <div className="hidden md:block px-4 max-w-sm space-y-4 pt-2">
          <ProgressBar current={pickCount} total={MAX_PICKS} />
          {submitSection}
        </div>
      )}

      {/* Score summary (results mode) — desktop visible, also passed to mobile RoundView */}
      {scoreSummary && (
        <div
          className="hidden md:block px-4 max-w-sm pt-2"
          data-testid="score-summary-desktop"
        >
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
