"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

    if (isWinner)
      return "bg-success-bg text-success border border-success/40";
    if (isSelected)
      return "bg-success-bg/70 border-2 border-success text-success";
    return "bg-surface-2 border border-border text-text hover:bg-surface-sunken";
  };

  return (
    <div
      className={cn(
        "mb-2 rounded-lg border bg-surface p-3 transition-colors",
        isResolved ? "border-border" : "border-border-strong"
      )}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleTeamClick(match.teamA)}
          disabled={!hasTeams || isSubmitting}
          className={cn(
            "flex-1 rounded-md py-2 px-3 text-center text-sm font-medium transition-colors disabled:cursor-default",
            getTeamStyle(match.teamA)
          )}
        >
          {teamAName}
        </button>
        <span className="text-xs font-medium text-text-subtle">vs</span>
        <button
          onClick={() => handleTeamClick(match.teamB)}
          disabled={!hasTeams || isSubmitting}
          className={cn(
            "flex-1 rounded-md py-2 px-3 text-center text-sm font-medium transition-colors disabled:cursor-default",
            getTeamStyle(match.teamB)
          )}
        >
          {teamBName}
        </button>
      </div>

      {isResolved && !selectedTeam && (
        <p className="mt-2 text-center text-xs text-text-muted">
          Result saved — tap a team to correct
        </p>
      )}

      {!isResolved && !selectedTeam && hasTeams && (
        <p className="mt-2 text-center">
          <Badge variant="default" size="sm">
            No result
          </Badge>
        </p>
      )}

      {!hasTeams && (
        <p className="mt-2 text-center text-xs text-text-subtle">
          Teams TBD — advance winners from previous rounds
        </p>
      )}

      {selectedTeam && (
        <div className="mt-3 flex gap-2">
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Saving…" : isResolved ? "Update Result" : "Confirm Result"}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isSubmitting}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
