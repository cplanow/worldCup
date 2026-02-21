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

// BracketTree mock: captures the onSelect callback so tests can invoke handleSelect directly
const onSelectRef: { current: ((matchId: number, team: string) => void) | null } = {
  current: null,
};
vi.mock("./BracketTree", () => ({
  BracketTree: ({ onSelect }: { onSelect: (matchId: number, team: string) => void; [key: string]: unknown }) => {
    onSelectRef.current = onSelect;
    return <div data-testid="bracket-tree" />;
  },
}));

vi.mock("./RoundView", () => ({ RoundView: () => null }));

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
