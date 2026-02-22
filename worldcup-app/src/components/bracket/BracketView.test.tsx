import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { BracketView } from "./BracketView";
import type { Match, Pick as BracketPick } from "@/types";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/lib/actions/bracket", () => ({
  savePick: vi.fn().mockResolvedValue({ success: true, data: { pickId: 1 } }),
  deletePicks: vi.fn().mockResolvedValue({ success: true, data: null }),
  submitBracket: vi.fn().mockResolvedValue({ success: true, data: null }),
}));

// BracketTree mock: captures the onSelect callback and mode for inspection
const onSelectRef: { current: ((matchId: number, team: string) => void) | null } = {
  current: null,
};
const bracketTreeModeRef: { current: string | null } = { current: null };
vi.mock("./BracketTree", () => ({
  BracketTree: ({ onSelect, mode }: { onSelect: (matchId: number, team: string) => void; mode: string; [key: string]: unknown }) => {
    onSelectRef.current = onSelect;
    bracketTreeModeRef.current = mode;
    return <div data-testid="bracket-tree" />;
  },
}));

const roundViewProgressBarRef: { current: React.ReactNode } = { current: null };
vi.mock("./RoundView", () => ({
  RoundView: ({ progressBar }: { progressBar?: React.ReactNode; [key: string]: unknown }) => {
    roundViewProgressBarRef.current = progressBar ?? null;
    return null;
  },
}));

vi.mock("./ProgressBar", () => ({
  ProgressBar: ({ current }: { current: number; total: number }) => (
    <span data-testid="pick-count">{current}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button data-testid="submit-btn" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
import { savePick, deletePicks } from "@/lib/actions/bracket";

const mockSavePick = vi.mocked(savePick);
const mockDeletePicks = vi.mocked(deletePicks);

// Minimal 3-match fixture: R32 pos1, R32 pos2, R16 pos1 (placeholder)
const matches: Match[] = [
  { id: 1, round: 1, position: 1, teamA: "Brazil", teamB: "Germany", winner: null, createdAt: "" },
  { id: 2, round: 1, position: 2, teamA: "France", teamB: "Spain", winner: null, createdAt: "" },
  { id: 17, round: 2, position: 1, teamA: "", teamB: "", winner: null, createdAt: "" },
];

function makePick(matchId: number, team: string, id = matchId): BracketPick {
  return { id, userId: 1, matchId, selectedTeam: team, createdAt: "" };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("BracketView results mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSelectRef.current = null;
    bracketTreeModeRef.current = null;
    roundViewProgressBarRef.current = null;
  });

  it("uses 'results' mode when isReadOnly=true and results are provided", () => {
    const results = [{ matchId: 1, winner: "Brazil" }];
    render(<BracketView matches={matches} picks={[]} isReadOnly={true} userId={1} results={results} />);
    expect(bracketTreeModeRef.current).toBe("results");
  });

  it("uses 'readonly' mode when isReadOnly=true but no results provided", () => {
    render(<BracketView matches={matches} picks={[]} isReadOnly={true} userId={1} />);
    expect(bracketTreeModeRef.current).toBe("readonly");
  });

  it("uses 'entry' mode when not read-only", () => {
    render(<BracketView matches={matches} picks={[]} isReadOnly={false} userId={1} />);
    expect(bracketTreeModeRef.current).toBe("entry");
  });

  it("shows score summary when results, score, and maxPossible are provided", () => {
    const results = [{ matchId: 1, winner: "Brazil" }];
    render(
      <BracketView matches={matches} picks={[]} isReadOnly={true} userId={1}
        results={results} score={5} maxPossible={20} />
    );
    const summary = screen.getByTestId("score-summary-desktop");
    expect(summary.textContent).toContain("Score:");
    expect(summary.textContent).toContain("5 pts");
    expect(summary.textContent).toContain("Max:");
    expect(summary.textContent).toContain("20 pts");
  });

  it("does not show score summary when not in results mode", () => {
    render(
      <BracketView matches={matches} picks={[]} isReadOnly={true} userId={1}
        score={5} maxPossible={20} />
    );
    expect(screen.queryByText(/Score:/)).toBeNull();
  });

  it("passes scoreSummary (not ProgressBar) as progressBar prop to RoundView in results mode", () => {
    const results = [{ matchId: 1, winner: "Brazil" }];
    render(
      <BracketView matches={matches} picks={[]} isReadOnly={true} userId={1}
        results={results} score={5} maxPossible={20} />
    );
    // RoundView should receive a non-null progressBar (the score summary), not a ProgressBar counter
    expect(roundViewProgressBarRef.current).not.toBeNull();
    // No pick-count testid means ProgressBar was NOT passed
    expect(screen.queryByTestId("pick-count")).toBeNull();
  });

  it("score summary uses spec format: Score X pts - Max Y pts", () => {
    const results = [{ matchId: 1, winner: "Brazil" }];
    render(
      <BracketView matches={matches} picks={[]} isReadOnly={true} userId={1}
        results={results} score={7} maxPossible={22} />
    );
    const summary = screen.getByTestId("score-summary-desktop");
    expect(summary.textContent).toContain("7 pts");
    expect(summary.textContent).toContain("22 pts");
  });
});

describe("BracketView handleSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onSelectRef.current = null;
  });

  it("adds a new pick and calls savePick on first tap", () => {
    render(<BracketView matches={matches} picks={[]} isReadOnly={false} userId={1} />);
    act(() => { onSelectRef.current!(1, "Brazil"); });

    expect(screen.getByTestId("pick-count").textContent).toBe("1");
    expect(mockSavePick).toHaveBeenCalledWith({ userId: 1, matchId: 1, selectedTeam: "Brazil" });
    expect(mockDeletePicks).not.toHaveBeenCalled();
  });

  it("is a no-op when tapping the already-selected team (no server call)", () => {
    render(
      <BracketView matches={matches} picks={[makePick(1, "Brazil")]} isReadOnly={false} userId={1} />
    );
    act(() => { onSelectRef.current!(1, "Brazil"); }); // same team — should no-op

    expect(screen.getByTestId("pick-count").textContent).toBe("1"); // count unchanged
    expect(mockSavePick).not.toHaveBeenCalled();
  });

  it("blocks pick on unavailable match and does not call savePick", () => {
    // R16 match (id:17) has no feeder picks — validatePick returns false
    render(<BracketView matches={matches} picks={[]} isReadOnly={false} userId={1} />);
    act(() => { onSelectRef.current!(17, "Brazil"); });

    expect(screen.getByTestId("pick-count").textContent).toBe("0");
    expect(mockSavePick).not.toHaveBeenCalled();
  });

  it("clears cascade picks and calls deletePicks when changing a pick", () => {
    const initialPicks: BracketPick[] = [
      makePick(1, "Brazil", 10),  // R32 pos1 → Brazil
      makePick(2, "France", 11),  // R32 pos2 → France
      makePick(17, "Brazil", 12), // R16 pos1 → Brazil (will cascade-clear)
    ];
    render(
      <BracketView matches={matches} picks={initialPicks} isReadOnly={false} userId={1} />
    );
    act(() => { onSelectRef.current!(1, "Germany"); }); // change R32 pos1: Brazil → Germany

    // R16 pick for Brazil cleared: 3 - 1 = 2 picks remain
    expect(screen.getByTestId("pick-count").textContent).toBe("2");
    expect(mockSavePick).toHaveBeenCalledWith({ userId: 1, matchId: 1, selectedTeam: "Germany" });
    expect(mockDeletePicks).toHaveBeenCalledWith({ userId: 1, matchIds: [17] });
  });

  it("does not call deletePicks when changing pick causes no cascade", () => {
    // Only one R32 pick, no downstream picks
    render(
      <BracketView matches={matches} picks={[makePick(1, "Brazil")]} isReadOnly={false} userId={1} />
    );
    act(() => { onSelectRef.current!(1, "Germany"); }); // change pick but no R16 pick exists

    expect(mockSavePick).toHaveBeenCalledOnce();
    expect(mockDeletePicks).not.toHaveBeenCalled();
  });

  it("does not call savePick when isReadOnly is true", () => {
    render(<BracketView matches={matches} picks={[]} isReadOnly={true} userId={1} />);
    act(() => { onSelectRef.current!(1, "Brazil"); });

    expect(mockSavePick).not.toHaveBeenCalled();
  });
});
