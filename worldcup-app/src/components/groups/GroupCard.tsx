"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

/**
 * Position styles — metallic podium metaphor re-expressed in the new token system.
 *   1st → gold (accent)
 *   2nd → silver (info blue-grey)
 *   3rd → bronze (warning amber)
 *   4th → muted slate (surface-2)
 *
 * Each row uses a 2px colored ring + tinted background so the ranking reads at a glance.
 * Color transitions (200ms) are driven by the `transition-colors` utility so moving a
 * team across positions fades the color rather than snapping.
 */
const POSITION_STYLES: Record<number, string> = {
  1: "bg-accent/15 text-accent-strong ring-2 ring-accent",
  2: "bg-info-bg text-info ring-2 ring-info",
  3: "bg-warning-bg text-warning ring-2 ring-warning",
  4: "bg-surface-2 text-text-muted ring-2 ring-border-strong",
};

const UNPICKED_STYLE =
  "bg-surface hover:bg-surface-2 text-text ring-1 ring-border";

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

export function GroupCard({
  groupId,
  groupName,
  teams,
  currentPick,
  onSave,
  disabled,
}: GroupCardProps) {
  const [picks, setPicks] = useState<PositionPicks>(() =>
    buildInitialPicks(currentPick)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filledPositions = [1, 2, 3, 4].filter((p) => !!picks[p]);
  const isComplete = filledPositions.length === 4;

  const savedSignature = `${currentPick?.firstPlace ?? ""}|${
    currentPick?.secondPlace ?? ""
  }|${currentPick?.thirdPlace ?? ""}|${currentPick?.fourthPlace ?? ""}`;
  const currentSignature = `${picks[1] ?? ""}|${picks[2] ?? ""}|${
    picks[3] ?? ""
  }|${picks[4] ?? ""}`;
  const hasChanged = currentSignature !== savedSignature;
  const isSavedAndClean = isComplete && !hasChanged;

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

  const progress = filledPositions.length;

  return (
    <div
      className={`animate-lift overflow-hidden rounded-xl border bg-surface shadow-[var(--shadow-card)] transition-colors ${
        disabled ? "border-border opacity-80" : "border-border"
      }`}
    >
      {/* Header — brand-colored strip with group name and progress pill */}
      <div className="flex items-center justify-between gap-2 bg-brand px-4 py-3">
        <h3 className="font-display text-base font-bold text-text-on-brand">
          Group {groupName}
        </h3>
        {isSavedAndClean ? (
          <Badge
            key={savedSignature}
            variant="accent"
            size="sm"
            shape="pill"
            className="animate-slide-up"
          >
            Saved
          </Badge>
        ) : (
          <span className="font-display text-xs font-semibold text-text-on-brand/70">
            {progress}/4
          </span>
        )}
      </div>

      {/* Team list — tap/click to rank. Each row is ≥44px for mobile touch. */}
      <ul className="space-y-2 p-4">
        {teams.map((team) => {
          const pos = positionOfTeam(team);
          const positionStyle = pos ? POSITION_STYLES[pos] : UNPICKED_STYLE;
          return (
            <li key={team}>
              <button
                type="button"
                onClick={() => handleTeamClick(team)}
                disabled={disabled}
                aria-pressed={pos !== null}
                aria-label={
                  pos
                    ? `${team}, ranked ${POSITION_LABELS[pos]}. Click to clear.`
                    : `Rank ${team}.`
                }
                className={`flex w-full min-h-[44px] items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface ${positionStyle} ${
                  disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                }`}
              >
                <span className="truncate">{team}</span>
                {pos ? (
                  <span
                    key={pos}
                    className="animate-slide-up inline-flex min-w-[2.25rem] justify-center font-display text-xs font-bold"
                  >
                    {POSITION_LABELS[pos]}
                  </span>
                ) : (
                  <span className="text-[11px] font-medium uppercase tracking-wide text-text-subtle">
                    tap to rank
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="px-4 pb-2 text-xs text-error" role="alert">
          {error}
        </p>
      )}

      {isComplete && hasChanged && !disabled && (
        <div className="px-4 pb-4">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-11 w-full rounded-lg"
          >
            {saving ? "Saving…" : "Save Pick"}
          </Button>
        </div>
      )}
    </div>
  );
}
