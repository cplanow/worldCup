"use client";

import { useMemo } from "react";
import { BracketTree } from "./BracketTree";
import { RoundView } from "./RoundView";
import { computeBracketState } from "@/lib/bracket-utils";
import type { Match, Pick } from "@/types";

interface BracketViewProps {
  matches: Match[];
  picks: Pick[];
  isReadOnly: boolean;
  userId: number;
}

export function BracketView({ matches, picks, isReadOnly }: BracketViewProps) {
  const bracketState = useMemo(
    () => computeBracketState(matches, picks),
    [matches, picks]
  );

  // Display-only for Story 3.1 — onSelect is a no-op placeholder
  const handleSelect = (_matchId: number, _team: string) => {
    // Pick saving will be implemented in Story 3.2
  };

  return (
    <div>
      <BracketTree
        bracketState={bracketState}
        onSelect={handleSelect}
        disabled={isReadOnly}
      />
      <RoundView
        bracketState={bracketState}
        onSelect={handleSelect}
        disabled={isReadOnly}
      />
    </div>
  );
}
