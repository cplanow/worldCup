"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { enterGroupResult } from "@/lib/actions/admin";

interface GroupForResults {
  id: number;
  name: string;
  teams: { teamName: string; finalPosition: number | null }[];
}

interface GroupResultsEntryProps {
  groups: GroupForResults[];
}

export function GroupResultsEntry({ groups }: GroupResultsEntryProps) {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [positions, setPositions] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleSelectGroup(groupId: number) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    setSelectedGroup(groupId);
    const sorted = [...group.teams].sort(
      (a, b) => (a.finalPosition ?? 99) - (b.finalPosition ?? 99)
    );
    if (sorted.every((t) => t.finalPosition != null)) {
      setPositions(sorted.map((t) => t.teamName));
    } else {
      setPositions(["", "", "", ""]);
    }
    setError("");
  }

  async function handleSave() {
    if (selectedGroup === null) return;
    const filtered = positions.map((p) => p.trim()).filter(Boolean);
    if (filtered.length !== 4 || new Set(filtered).size !== 4) {
      setError("Enter all 4 unique teams in finishing order");
      return;
    }
    setSaving(true);
    setError("");

    const result = await enterGroupResult({
      groupId: selectedGroup,
      positions: filtered.map((teamName, i) => ({ teamName, position: i + 1 })),
    });

    if (result.success) {
      setSelectedGroup(null);
      setPositions(["", "", "", ""]);
      router.refresh();
    } else {
      setError(result.error);
    }
    setSaving(false);
  }

  const group = groups.find((g) => g.id === selectedGroup);

  return (
    <div>
      <h3 className="mb-3 font-display text-base font-semibold text-text">
        Enter group results
      </h3>
      <div className="mb-4 flex flex-wrap gap-2">
        {groups.map((g) => {
          const hasResults = g.teams.every((t) => t.finalPosition != null);
          const isSelected = selectedGroup === g.id;
          return (
            <button
              key={g.id}
              onClick={() => handleSelectGroup(g.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                isSelected
                  ? "bg-brand text-text-on-brand"
                  : hasResults
                  ? "bg-success-bg text-success hover:bg-success-bg/70"
                  : "bg-surface-2 text-text hover:bg-surface-sunken"
              )}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {group && (
        <div className="space-y-3 rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-sm text-text-muted">
            Enter teams in finishing order (1st to 4th). Available:{" "}
            <span className="text-text">
              {group.teams.map((t) => t.teamName).join(", ")}
            </span>
          </p>
          <div className="space-y-2">
            {positions.map((pos, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-8 shrink-0 font-display text-sm font-semibold text-text-subtle">
                  {i + 1}.
                </span>
                <select
                  value={pos}
                  onChange={(e) => {
                    const newPos = [...positions];
                    newPos[i] = e.target.value;
                    setPositions(newPos);
                  }}
                  aria-label={`Position ${i + 1}`}
                  className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="">Select team</option>
                  {group.teams.map((t) => (
                    <option key={t.teamName} value={t.teamName}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save results"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
