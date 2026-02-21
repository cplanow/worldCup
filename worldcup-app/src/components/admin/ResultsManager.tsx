"use client";

import { useState } from "react";
import { enterResult } from "@/lib/actions/admin";
import { AdminMatchCard } from "./AdminMatchCard";
import type { Match, Result } from "@/types";

const ROUND_NAMES: Record<number, string> = {
  1: "Round of 32",
  2: "Round of 16",
  3: "Quarterfinals",
  4: "Semifinals",
  5: "Final",
};

interface ResultsManagerProps {
  matches: Match[];
  initialResults: Result[];
}

export function ResultsManager({ matches, initialResults }: ResultsManagerProps) {
  const [results, setResults] = useState<Result[]>(initialResults);
  const [error, setError] = useState<string | null>(null);

  const resultByMatchId = new Map(results.map((r) => [r.matchId, r]));

  const handleConfirm = async (matchId: number, winner: string) => {
    setError(null);
    const response = await enterResult({ matchId, winner });
    if (response.success) {
      setResults((prev) => {
        const exists = prev.some((r) => r.matchId === matchId);
        if (exists) {
          return prev.map((r) => (r.matchId === matchId ? { ...r, winner } : r));
        }
        return [
          ...prev,
          { id: Date.now(), matchId, winner, createdAt: new Date().toISOString() },
        ];
      });
    } else {
      setError(response.error ?? "Failed to save result. Please try again.");
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
