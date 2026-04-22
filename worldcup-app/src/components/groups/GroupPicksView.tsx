"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GroupCard } from "./GroupCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  saveGroupPick,
  saveTopScorerPick,
  submitGroupPicks,
} from "@/lib/actions/group-stage";

interface GroupData {
  id: number;
  name: string;
  teams: string[];
}

type GroupPickEntry = {
  groupId: number;
  firstPlace: string;
  secondPlace: string;
  thirdPlace: string | null;
  fourthPlace: string | null;
};

interface GroupPicksViewProps {
  groups: GroupData[];
  existingPicks: GroupPickEntry[];
  initialTopScorer: string | null;
  isSubmitted: boolean;
  isLocked: boolean;
}

export function GroupPicksView({
  groups,
  existingPicks,
  initialTopScorer,
  isSubmitted,
  isLocked,
}: GroupPicksViewProps) {
  const router = useRouter();
  const [picks, setPicks] = useState<GroupPickEntry[]>(existingPicks);
  const [topScorer, setTopScorer] = useState(initialTopScorer ?? "");
  const [topScorerSaved, setTopScorerSaved] = useState(initialTopScorer ?? "");
  const [savingScorer, setSavingScorer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const completePicks = picks.filter(
    (p) => p.firstPlace && p.secondPlace && p.thirdPlace && p.fourthPlace
  );
  const pickedCount = completePicks.length;
  const totalGroups = groups.length;
  const allPicked = pickedCount === totalGroups && totalGroups > 0;
  const hasScorer = topScorerSaved.trim() !== "";
  const disabled = isSubmitted || isLocked;
  const readyToSubmit = allPicked && hasScorer;
  const scorerClean =
    topScorer.trim() !== "" && topScorer.trim() === topScorerSaved;

  async function handleSave(
    groupId: number,
    firstPlace: string,
    secondPlace: string,
    thirdPlace: string,
    fourthPlace: string
  ) {
    const result = await saveGroupPick({
      groupId,
      firstPlace,
      secondPlace,
      thirdPlace,
      fourthPlace,
    });
    if (result.success) {
      setPicks((prev) => {
        const filtered = prev.filter((p) => p.groupId !== groupId);
        return [
          ...filtered,
          { groupId, firstPlace, secondPlace, thirdPlace, fourthPlace },
        ];
      });
      // M9: clear any previous view-level error on a successful save.
      setError("");
    } else {
      // M9: surface the actual server error at the view level in addition to
      // the per-card generic message. Messages like "Group picks are locked"
      // or "Group picks already submitted" are actionable and shouldn't be
      // swallowed.
      setError(result.error);
      throw new Error(result.error);
    }
  }

  async function handleSaveScorer() {
    const trimmed = topScorer.trim();
    if (!trimmed || trimmed === topScorerSaved || disabled) return;
    setSavingScorer(true);
    setError("");
    const result = await saveTopScorerPick({ topScorerPick: trimmed });
    if (result.success) {
      setTopScorerSaved(trimmed);
    } else {
      setError(result.error);
    }
    setSavingScorer(false);
  }

  async function handleSubmit() {
    if (!readyToSubmit || disabled) return;
    setSubmitting(true);
    setError("");
    const result = await submitGroupPicks();
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  }

  const submitDisabled = !readyToSubmit || submitting;

  // Progress summary for the header strip.
  const progressLabel = `${pickedCount} of ${totalGroups} groups ranked`;

  return (
    <div>
      {/* Status header — progress + submission/lock state */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-muted">{progressLabel}</p>
        <div className="flex items-center gap-2">
          {isSubmitted && (
            <Badge variant="accent" shape="pill" size="md">
              Submitted
            </Badge>
          )}
          {isLocked && !isSubmitted && (
            <Badge variant="warning" shape="pill" size="md">
              Locked
            </Badge>
          )}
          {readyToSubmit && !disabled && (
            <Badge variant="success" shape="pill" size="md">
              Ready to submit
            </Badge>
          )}
        </div>
      </div>

      {isLocked && !isSubmitted && (
        <div
          className="mb-4 rounded-xl border border-warning/30 bg-warning-bg p-4 text-sm text-warning"
          role="status"
        >
          Group picks are locked.
        </div>
      )}

      {/* Golden Boot — hero moment. Gradient gold card with distinct visual weight. */}
      <div
        className={`mb-6 overflow-hidden rounded-xl border border-accent/30 shadow-[var(--shadow-card)] ${
          disabled ? "opacity-80" : ""
        }`}
      >
        <div className="bg-accent-gradient px-5 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold text-text-on-accent">
                Golden Boot
              </p>
              <p className="text-xs text-text-on-accent/80">
                Tournament top scorer — tiebreaker pick
              </p>
            </div>
            {hasScorer && (
              <Badge variant="brand" size="sm" shape="pill">
                Saved
              </Badge>
            )}
          </div>
        </div>
        <div className="bg-surface p-4">
          <label
            htmlFor="top-scorer"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-muted"
          >
            Your pick
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="top-scorer"
              type="text"
              value={topScorer}
              onChange={(e) => setTopScorer(e.target.value)}
              disabled={disabled}
              placeholder="e.g. Kylian Mbappé"
              autoComplete="off"
              className="h-11 flex-1 rounded-lg border border-border bg-surface px-3 text-sm text-text placeholder:text-text-subtle focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-subtle"
            />
            <Button
              type="button"
              onClick={handleSaveScorer}
              disabled={
                disabled ||
                savingScorer ||
                !topScorer.trim() ||
                topScorer.trim() === topScorerSaved
              }
              className="h-11 sm:w-28"
            >
              {savingScorer
                ? "Saving…"
                : scorerClean
                ? "Saved"
                : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => {
          const pick = picks.find((p) => p.groupId === group.id);
          return (
            <GroupCard
              key={group.id}
              groupId={group.id}
              groupName={group.name}
              teams={group.teams}
              currentPick={pick}
              onSave={handleSave}
              disabled={disabled}
            />
          );
        })}
      </div>

      {error && (
        <p
          className="mt-4 rounded-lg bg-error-bg px-3 py-2 text-center text-sm text-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {!disabled && totalGroups > 0 && (
        <div className="mt-6">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className={`h-12 w-full rounded-xl text-base font-semibold transition-colors ${
              readyToSubmit
                ? "bg-success text-white hover:bg-success/90"
                : ""
            }`}
          >
            {submitting
              ? "Submitting…"
              : !hasScorer
              ? "Enter Golden Boot pick to submit"
              : !allPicked
              ? `Submit Group Picks (${pickedCount}/${totalGroups})`
              : "Submit Group Picks"}
          </Button>
        </div>
      )}
    </div>
  );
}
