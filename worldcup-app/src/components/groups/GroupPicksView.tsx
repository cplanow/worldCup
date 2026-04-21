"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GroupCard } from "./GroupCard";
import { Button } from "@/components/ui/button";
import { saveGroupPick, saveTopScorerPick, submitGroupPicks } from "@/lib/actions/group-stage";

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
        return [...filtered, { groupId, firstPlace, secondPlace, thirdPlace, fourthPlace }];
      });
      // M9: clear any previous view-level error on a successful save.
      setError("");
    } else {
      // M9: surface the actual server error at the view level in addition
      // to the per-card generic message. Messages like "Group picks are
      // locked" or "Group picks already submitted" are actionable and
      // shouldn't be swallowed.
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
    if (!allPicked || !hasScorer || disabled) return;
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

  const submitDisabled = !allPicked || !hasScorer || submitting;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {pickedCount} of {totalGroups} groups ranked (1st–4th)
        </p>
        {isSubmitted && (
          <span className="rounded-full bg-[#D4AF37]/15 px-3 py-1 text-xs font-semibold text-[#8B7A2E]">
            Submitted
          </span>
        )}
      </div>

      {isLocked && !isSubmitted && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          Group picks are locked.
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <label htmlFor="top-scorer" className="block text-sm font-bold text-slate-900 mb-1">
          Golden Boot pick
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Tournament top scorer — used as a tiebreaker. Required before submitting.
        </p>
        <div className="flex gap-2">
          <input
            id="top-scorer"
            type="text"
            value={topScorer}
            onChange={(e) => setTopScorer(e.target.value)}
            disabled={disabled}
            placeholder="e.g. Kylian Mbappé"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] disabled:bg-slate-50 disabled:text-slate-400"
          />
          <button
            onClick={handleSaveScorer}
            disabled={disabled || savingScorer || !topScorer.trim() || topScorer.trim() === topScorerSaved}
            className="rounded-lg bg-[#0F2E23] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1A4A38] disabled:bg-slate-200 disabled:text-slate-400"
          >
            {savingScorer ? "Saving..." : topScorerSaved && topScorer.trim() === topScorerSaved ? "Saved" : "Save"}
          </button>
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

      {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}

      {!disabled && totalGroups > 0 && (
        <div className="mt-6">
          <Button
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="w-full h-12 bg-[#0F2E23] text-base font-semibold text-white hover:bg-[#1A4A38] disabled:bg-slate-100 disabled:text-slate-400 rounded-xl"
          >
            {submitting
              ? "Submitting..."
              : !hasScorer
              ? "Enter Golden Boot pick to submit"
              : `Submit Group Picks (${pickedCount}/${totalGroups})`}
          </Button>
        </div>
      )}
    </div>
  );
}
