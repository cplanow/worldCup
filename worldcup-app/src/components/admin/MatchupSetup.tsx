"use client";

import { useState, useTransition } from "react";
import { setupMatchup, deleteMatchup } from "@/lib/actions/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Match } from "@/types";

interface MatchupSetupProps {
  existingMatches: Match[];
}

interface SlotState {
  teamA: string;
  teamB: string;
  error: string | null;
}

export function MatchupSetup({ existingMatches }: MatchupSetupProps) {
  const [matches, setMatches] = useState<(Match | null)[]>(() => {
    const slots: (Match | null)[] = Array(16).fill(null);
    for (const match of existingMatches) {
      if (match.position >= 1 && match.position <= 16) {
        slots[match.position - 1] = match;
      }
    }
    return slots;
  });

  const savedCount = matches.filter((m) => m !== null).length;

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-600">
        {savedCount} of 16 matchups configured
      </p>
      <div className="space-y-3">
        {Array.from({ length: 16 }, (_, i) => (
          <MatchupSlot
            key={i}
            position={i + 1}
            match={matches[i]}
            onSaved={(match) => {
              setMatches((prev) => {
                const next = [...prev];
                next[match.position - 1] = match;
                return next;
              });
            }}
            onDeleted={(position) => {
              setMatches((prev) => {
                const next = [...prev];
                next[position - 1] = null;
                return next;
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface MatchupSlotProps {
  position: number;
  match: Match | null;
  onSaved: (match: Match) => void;
  onDeleted: (position: number) => void;
}

function MatchupSlot({ position, match, onSaved, onDeleted }: MatchupSlotProps) {
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<SlotState>({
    teamA: match?.teamA ?? "",
    teamB: match?.teamB ?? "",
    error: null,
  });
  const [isPending, startTransition] = useTransition();

  const isSaved = match !== null && !editing;

  function handleSave() {
    startTransition(async () => {
      const result = await setupMatchup({
        teamA: state.teamA,
        teamB: state.teamB,
        position,
      });

      if (result.success) {
        setState((s) => ({ ...s, error: null }));
        setEditing(false);
        onSaved({
          id: result.data.matchId,
          teamA: state.teamA.trim(),
          teamB: state.teamB.trim(),
          round: 1,
          position,
          winner: null,
          createdAt: new Date().toISOString(),
        });
      } else {
        setState((s) => ({ ...s, error: result.error }));
      }
    });
  }

  function handleEdit() {
    setState({
      teamA: match?.teamA ?? "",
      teamB: match?.teamB ?? "",
      error: null,
    });
    setEditing(true);
  }

  function handleDelete() {
    if (!match) return;
    startTransition(async () => {
      const result = await deleteMatchup(match.id);
      if (result.success) {
        setState({ teamA: "", teamB: "", error: null });
        setEditing(false);
        onDeleted(position);
      } else {
        setState((s) => ({ ...s, error: result.error }));
      }
    });
  }

  if (isSaved) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="w-8 text-sm font-semibold text-slate-400">{position}.</span>
        <span className="flex-1 text-base font-medium text-slate-900">{match.teamA}</span>
        <span className="text-sm text-slate-400">vs</span>
        <span className="flex-1 text-base font-medium text-slate-900">{match.teamB}</span>
        <Button variant="outline" size="sm" onClick={handleEdit} disabled={isPending}>
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="w-8 text-sm font-semibold text-slate-400">{position}.</span>
        <Input
          placeholder="Team A"
          value={state.teamA}
          onChange={(e) => setState((s) => ({ ...s, teamA: e.target.value, error: null }))}
          className="flex-1 text-base"
          disabled={isPending}
        />
        <span className="text-sm text-slate-400">vs</span>
        <Input
          placeholder="Team B"
          value={state.teamB}
          onChange={(e) => setState((s) => ({ ...s, teamB: e.target.value, error: null }))}
          className="flex-1 text-base"
          disabled={isPending}
        />
        <Button
          onClick={handleSave}
          disabled={isPending || !state.teamA.trim() || !state.teamB.trim()}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
        {editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={isPending}>
            Cancel
          </Button>
        )}
        {editing && match && (
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
            Delete
          </Button>
        )}
      </div>
      {state.error && (
        <p className="mt-2 ml-11 text-sm text-red-600">{state.error}</p>
      )}
    </div>
  );
}
