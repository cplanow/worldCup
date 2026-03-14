"use client";

import { useState } from "react";

interface GroupCardProps {
  groupId: number;
  groupName: string;
  teams: string[];
  currentPick?: { firstPlace: string; secondPlace: string } | null;
  onSave: (groupId: number, firstPlace: string, secondPlace: string) => Promise<void>;
  disabled?: boolean;
}

export function GroupCard({ groupId, groupName, teams, currentPick, onSave, disabled }: GroupCardProps) {
  const [firstPlace, setFirstPlace] = useState(currentPick?.firstPlace || "");
  const [secondPlace, setSecondPlace] = useState(currentPick?.secondPlace || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isComplete = firstPlace !== "" && secondPlace !== "";
  const hasChanged = firstPlace !== (currentPick?.firstPlace || "") ||
                     secondPlace !== (currentPick?.secondPlace || "");

  async function handleSave() {
    if (!isComplete || !hasChanged) return;
    setSaving(true);
    setError("");
    try {
      await onSave(groupId, firstPlace, secondPlace);
    } catch {
      setError("Failed to save pick");
    }
    setSaving(false);
  }

  function handleTeamClick(team: string) {
    if (disabled) return;
    if (firstPlace === team) {
      setFirstPlace("");
      return;
    }
    if (secondPlace === team) {
      setSecondPlace("");
      return;
    }
    if (!firstPlace) {
      setFirstPlace(team);
    } else if (!secondPlace) {
      setSecondPlace(team);
    } else {
      setSecondPlace(team);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-[#0F2E23] px-4 py-2.5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Group {groupName}</h3>
        {isComplete && !hasChanged && (
          <span className="text-xs text-[#D4AF37] font-medium">Saved</span>
        )}
      </div>
      <div className="p-4 space-y-2">
        {teams.map((team) => {
          const is1st = firstPlace === team;
          const is2nd = secondPlace === team;
          return (
            <button
              key={team}
              onClick={() => handleTeamClick(team)}
              disabled={disabled}
              className={`w-full rounded px-3 py-2 text-left text-sm font-medium transition-colors ${
                is1st
                  ? "bg-[#D4AF37]/15 text-[#8B7A2E] ring-2 ring-[#D4AF37]"
                  : is2nd
                  ? "bg-blue-100 text-blue-800 ring-2 ring-blue-500"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              <span className="flex items-center justify-between">
                <span>{team}</span>
                {is1st && <span className="text-xs font-bold text-[#B8960C]">1st</span>}
                {is2nd && <span className="text-xs font-bold">2nd</span>}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {isComplete && hasChanged && (
        <button
          onClick={handleSave}
          disabled={saving || disabled}
          className="mt-3 w-full rounded-lg bg-[#0F2E23] py-2 text-sm font-semibold text-white hover:bg-[#1A4A38] disabled:bg-slate-200 disabled:text-slate-400"
        >
          {saving ? "Saving..." : "Save Pick"}
        </button>
      )}
    </div>
  );
}
