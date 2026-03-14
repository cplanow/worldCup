"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
      <h3 className="text-base font-semibold text-slate-900 mb-3">Enter Group Results</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {groups.map((g) => {
          const hasResults = g.teams.every((t) => t.finalPosition != null);
          return (
            <button
              key={g.id}
              onClick={() => handleSelectGroup(g.id)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                selectedGroup === g.id
                  ? "bg-slate-900 text-white"
                  : hasResults
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {g.name}
            </button>
          );
        })}
      </div>

      {group && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Enter teams in finishing order (1st to 4th). Available: {group.teams.map((t) => t.teamName).join(", ")}
          </p>
          {positions.map((pos, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 w-8">{i + 1}.</span>
              <select
                value={pos}
                onChange={(e) => {
                  const newPos = [...positions];
                  newPos[i] = e.target.value;
                  setPositions(newPos);
                }}
                className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300"
          >
            {saving ? "Saving..." : "Save Results"}
          </Button>
        </div>
      )}
    </div>
  );
}
