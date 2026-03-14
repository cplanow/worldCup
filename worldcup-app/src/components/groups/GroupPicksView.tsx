"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GroupCard } from "./GroupCard";
import { Button } from "@/components/ui/button";
import { saveGroupPick, submitGroupPicks } from "@/lib/actions/group-stage";

interface GroupData {
  id: number;
  name: string;
  teams: string[];
}

interface GroupPicksViewProps {
  userId: number;
  groups: GroupData[];
  existingPicks: { groupId: number; firstPlace: string; secondPlace: string }[];
  isSubmitted: boolean;
  isLocked: boolean;
}

export function GroupPicksView({ userId, groups, existingPicks, isSubmitted, isLocked }: GroupPicksViewProps) {
  const router = useRouter();
  const [picks, setPicks] = useState(existingPicks);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const pickedCount = picks.length;
  const totalGroups = groups.length;
  const allPicked = pickedCount === totalGroups && totalGroups > 0;
  const disabled = isSubmitted || isLocked;

  async function handleSave(groupId: number, firstPlace: string, secondPlace: string) {
    const result = await saveGroupPick({ userId, groupId, firstPlace, secondPlace });
    if (result.success) {
      setPicks((prev) => {
        const filtered = prev.filter((p) => p.groupId !== groupId);
        return [...filtered, { groupId, firstPlace, secondPlace }];
      });
    } else {
      throw new Error(result.error);
    }
  }

  async function handleSubmit() {
    if (!allPicked || disabled) return;
    setSubmitting(true);
    setError("");
    const result = await submitGroupPicks(userId);
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {pickedCount} of {totalGroups} groups picked
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
            disabled={!allPicked || submitting}
            className="w-full h-12 bg-[#0F2E23] text-base font-semibold text-white hover:bg-[#1A4A38] disabled:bg-slate-100 disabled:text-slate-400 rounded-xl"
          >
            {submitting ? "Submitting..." : `Submit Group Picks (${pickedCount}/${totalGroups})`}
          </Button>
        </div>
      )}
    </div>
  );
}
