"use client";

import { useState } from "react";

type PositionPicks = { [position: number]: string };

interface GroupCardProps {
  groupId: number;
  groupName: string;
  teams: string[];
  currentPick?: {
    firstPlace: string;
    secondPlace: string;
    thirdPlace: string | null;
    fourthPlace: string | null;
  } | null;
  onSave: (
    groupId: number,
    firstPlace: string,
    secondPlace: string,
    thirdPlace: string,
    fourthPlace: string
  ) => Promise<void>;
  disabled?: boolean;
}

const POSITION_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
};

const POSITION_STYLES: Record<number, string> = {
  1: "bg-[#D4AF37]/15 text-[#8B7A2E] ring-2 ring-[#D4AF37]",
  2: "bg-blue-100 text-blue-800 ring-2 ring-blue-500",
  3: "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500",
  4: "bg-slate-200 text-slate-700 ring-2 ring-slate-400",
};

function buildInitialPicks(
  currentPick: GroupCardProps["currentPick"]
): PositionPicks {
  if (!currentPick) return {};
  const result: PositionPicks = {};
  if (currentPick.firstPlace) result[1] = currentPick.firstPlace;
  if (currentPick.secondPlace) result[2] = currentPick.secondPlace;
  if (currentPick.thirdPlace) result[3] = currentPick.thirdPlace;
  if (currentPick.fourthPlace) result[4] = currentPick.fourthPlace;
  return result;
}

export function GroupCard({ groupId, groupName, teams, currentPick, onSave, disabled }: GroupCardProps) {
  const [picks, setPicks] = useState<PositionPicks>(() => buildInitialPicks(currentPick));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filledPositions = [1, 2, 3, 4].filter((p) => !!picks[p]);
  const isComplete = filledPositions.length === 4;

  const savedSignature =
    `${currentPick?.firstPlace ?? ""}|${currentPick?.secondPlace ?? ""}|${currentPick?.thirdPlace ?? ""}|${currentPick?.fourthPlace ?? ""}`;
  const currentSignature =
    `${picks[1] ?? ""}|${picks[2] ?? ""}|${picks[3] ?? ""}|${picks[4] ?? ""}`;
  const hasChanged = currentSignature !== savedSignature;

  function positionOfTeam(team: string): number | null {
    for (const pos of [1, 2, 3, 4]) {
      if (picks[pos] === team) return pos;
    }
    return null;
  }

  function handleTeamClick(team: string) {
    if (disabled) return;
    const existingPos = positionOfTeam(team);
    if (existingPos) {
      const next = { ...picks };
      delete next[existingPos];
      setPicks(next);
      return;
    }
    for (const pos of [1, 2, 3, 4]) {
      if (!picks[pos]) {
        setPicks({ ...picks, [pos]: team });
        return;
      }
    }
  }

  async function handleSave() {
    if (!isComplete || !hasChanged) return;
    setSaving(true);
    setError("");
    try {
      await onSave(groupId, picks[1], picks[2], picks[3], picks[4]);
    } catch {
      setError("Failed to save pick");
    }
    setSaving(false);
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
          const pos = positionOfTeam(team);
          const positionStyle = pos ? POSITION_STYLES[pos] : "bg-slate-50 text-slate-700 hover:bg-slate-100";
          return (
            <button
              key={team}
              onClick={() => handleTeamClick(team)}
              disabled={disabled}
              className={`w-full rounded px-3 py-2 text-left text-sm font-medium transition-colors ${positionStyle} ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              <span className="flex items-center justify-between">
                <span>{team}</span>
                {pos && <span className="text-xs font-bold">{POSITION_LABELS[pos]}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}
      {isComplete && hasChanged && (
        <div className="px-4 pb-4">
          <button
            onClick={handleSave}
            disabled={saving || disabled}
            className="w-full rounded-lg bg-[#0F2E23] py-2 text-sm font-semibold text-white hover:bg-[#1A4A38] disabled:bg-slate-200 disabled:text-slate-400"
          >
            {saving ? "Saving..." : "Save Pick"}
          </button>
        </div>
      )}
    </div>
  );
}
