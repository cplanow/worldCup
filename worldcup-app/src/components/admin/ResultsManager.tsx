"use client";

import { useState } from "react";
import { enterResult, correctResult } from "@/lib/actions/admin";
import { AdminMatchCard } from "./AdminMatchCard";
import { ROUND_NAMES } from "@/lib/bracket-utils";
import type { Match, Result } from "@/types";

interface ResultsManagerProps {
  matches: Match[];
  initialResults: Result[];
}

export function ResultsManager({ matches, initialResults }: ResultsManagerProps) {
  const [results, setResults] = useState<Result[]>(initialResults);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const resultByMatchId = new Map(results.map((r) => [r.matchId, r]));

  const handleConfirm = async (matchId: number, winner: string) => {
    setError(null);
    setSuccessMsg(null);
    setWarning(null);

    if (resultByMatchId.has(matchId)) {
      const response = await correctResult({ matchId, winner });
      if (response.success) {
        setResults((prev) =>
          prev.map((r) => (r.matchId === matchId ? { ...r, winner } : r))
        );
        setSuccessMsg("Result updated");
        if (response.data.warning) {
          setWarning(response.data.warning);
        }
      } else {
        setError(response.error ?? "Failed to save result. Please try again.");
      }
    } else {
      const response = await enterResult({ matchId, winner });
      if (response.success) {
        setResults((prev) => [
          ...prev,
          { id: Date.now(), matchId, winner, createdAt: new Date().toISOString() },
        ]);
        setSuccessMsg("Result saved");
      } else {
        setError(response.error ?? "Failed to save result. Please try again.");
      }
    }
  };

  const rounds = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}
      {warning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {warning}
        </div>
      )}
      {rounds.map((round) => {
        const roundMatches = matches
          .filter((m) => m.round === round)
          .sort((a, b) => a.position - b.position);
        if (roundMatches.length === 0) return null;
        return (
          <div key={round}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              {ROUND_NAMES[round] ?? `Round ${round}`}
            </h3>
            {roundMatches.map((match) => (
              <AdminMatchCard
                key={match.id}
                match={match}
                result={resultByMatchId.get(match.id) ?? null}
                onConfirm={handleConfirm}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
