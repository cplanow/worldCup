"use client";

import { useState } from "react";
import type { Match, Result } from "@/types";

interface AdminMatchCardProps {
  match: Match;
  result: Result | null;
  onConfirm: (matchId: number, winner: string) => Promise<void>;
  onCancel?: () => void;
}

export function AdminMatchCard({ match, result, onConfirm, onCancel }: AdminMatchCardProps) {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasTeams = match.teamA.trim() !== "" && match.teamB.trim() !== "";
  const isResolved = result !== null;

  const handleTeamClick = (team: string) => {
    if (!hasTeams) return;
    setSelectedTeam((prev) => (prev === team ? null : team));
  };

  const handleConfirm = async () => {
    if (!selectedTeam) return;
    // Skip server call when re-confirming the same winner
    if (isResolved && result?.winner === selectedTeam) {
      setSelectedTeam(null);
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirm(match.id, selectedTeam);
      setSelectedTeam(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedTeam(null);
    onCancel?.();
  };

  const teamAName = match.teamA || "TBD";
  const teamBName = match.teamB || "TBD";

  const getTeamStyle = (team: string) => {
    const isSelected = selectedTeam === team;
    // Suppress winner highlight when in correction mode (selectedTeam is set)
    const isWinner = isResolved && !selectedTeam && result!.winner === team;

    if (isWinner) return "bg-emerald-100 text-emerald-800 border border-emerald-300";
    if (isSelected) return "bg-emerald-50 border-2 border-emerald-400 text-emerald-800";
    return "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100";
  };

  return (
    <div
      className={`mb-2 rounded-lg p-3 ${
        isResolved ? "border border-slate-200" : "border-2 border-slate-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleTeamClick(match.teamA)}
          disabled={!hasTeams || isSubmitting}
          className={`flex-1 rounded py-2 px-3 text-center text-sm font-medium transition-colors disabled:cursor-default ${getTeamStyle(match.teamA)}`}
        >
          {teamAName}
        </button>
        <span className="text-xs font-medium text-slate-400">vs</span>
        <button
          onClick={() => handleTeamClick(match.teamB)}
          disabled={!hasTeams || isSubmitting}
          className={`flex-1 rounded py-2 px-3 text-center text-sm font-medium transition-colors disabled:cursor-default ${getTeamStyle(match.teamB)}`}
        >
          {teamBName}
        </button>
      </div>

      {isResolved && !selectedTeam && (
        <p className="mt-1.5 text-center text-xs text-slate-500">
          ✓ Result saved — tap a team to correct
        </p>
      )}

      {!isResolved && !selectedTeam && hasTeams && (
        <p className="mt-1.5 text-center">
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
            No result
          </span>
        </p>
      )}

      {!hasTeams && (
        <p className="mt-1.5 text-center text-xs text-slate-400">
          Teams TBD — advance winners from previous rounds
        </p>
      )}

      {selectedTeam && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 rounded bg-slate-900 py-2 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : isResolved ? "Update Result" : "Confirm Result"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 rounded border border-slate-200 bg-white py-2 px-4 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
