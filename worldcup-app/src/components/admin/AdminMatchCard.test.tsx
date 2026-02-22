import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminMatchCard } from "./AdminMatchCard";
import type { Match, Result } from "@/types";

const baseMatch: Match = {
  id: 1,
  teamA: "Brazil",
  teamB: "Mexico",
  round: 1,
  position: 1,
  winner: null,
  createdAt: "2026-02-21T00:00:00Z",
};

const resolvedResult: Result = {
  id: 1,
  matchId: 1,
  winner: "Brazil",
  createdAt: "2026-02-21T00:00:00Z",
};

describe("AdminMatchCard", () => {
  it("renders both team names", () => {
    render(<AdminMatchCard match={baseMatch} result={null} onConfirm={vi.fn()} />);
    expect(screen.getByText("Brazil")).toBeTruthy();
    expect(screen.getByText("Mexico")).toBeTruthy();
  });

  it("shows 'vs' separator", () => {
    render(<AdminMatchCard match={baseMatch} result={null} onConfirm={vi.fn()} />);
    expect(screen.getByText("vs")).toBeTruthy();
  });

  it("shows 'No result' badge for unresolved match with teams", () => {
    render(<AdminMatchCard match={baseMatch} result={null} onConfirm={vi.fn()} />);
    expect(screen.getByText("No result")).toBeTruthy();
  });

  it("hides 'No result' badge once a team is selected", () => {
    render(<AdminMatchCard match={baseMatch} result={null} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByText("Brazil"));
    expect(screen.queryByText("No result")).toBeNull();
  });

  it("does not show confirm/cancel buttons initially", () => {
    render(<AdminMatchCard match={baseMatch} result={null} onConfirm={vi.fn()} />);
    expect(screen.queryByText("Confirm Result")).toBeNull();
    expect(screen.queryByText("Cancel")).toBeNull();
  });

  it("clicking a team shows confirm/cancel buttons", () => {
    render(<AdminMatchCard match={baseMatch} result={null} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByText("Brazil"));
    expect(screen.getByText("Confirm Result")).toBeTruthy();
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("clicking the same team again deselects it", () => {
    render(<AdminMatchCard match={baseMatch} result={null} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByText("Brazil"));
    fireEvent.click(screen.getByText("Brazil"));
    expect(screen.queryByText("Confirm Result")).toBeNull();
  });

  it("clicking confirm calls onConfirm with matchId and winner", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<AdminMatchCard match={baseMatch} result={null} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Brazil"));
    fireEvent.click(screen.getByText("Confirm Result"));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(1, "Brazil");
    });
  });

  it("clicking cancel clears selection", () => {
    const onCancel = vi.fn();
    render(<AdminMatchCard match={baseMatch} result={null} onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Brazil"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Confirm Result")).toBeNull();
    expect(onCancel).toHaveBeenCalled();
  });

  it("resolved state shows 'Result saved' indicator", () => {
    render(<AdminMatchCard match={baseMatch} result={resolvedResult} onConfirm={vi.fn()} />);
    expect(screen.getByText(/Result saved/)).toBeTruthy();
  });

  it("resolved state: winner has emerald-100 style", () => {
    render(<AdminMatchCard match={baseMatch} result={resolvedResult} onConfirm={vi.fn()} />);
    const brazilBtn = screen.getByText("Brazil").closest("button");
    expect(brazilBtn?.className).toContain("bg-emerald-100");
  });

  it("in correction mode, stored winner loses its highlight when a different team is selected", () => {
    render(<AdminMatchCard match={baseMatch} result={resolvedResult} onConfirm={vi.fn()} />);
    // Click the non-winner team to enter correction mode
    fireEvent.click(screen.getByText("Mexico"));
    const brazilBtn = screen.getByText("Brazil").closest("button");
    const mexicoBtn = screen.getByText("Mexico").closest("button");
    // Stored winner (Brazil) should NOT be highlighted green during correction
    expect(brazilBtn?.className ?? "").not.toContain("bg-emerald-100");
    // Newly selected team should be highlighted
    expect(mexicoBtn?.className).toContain("bg-emerald-50");
  });

  it("in correction mode, shows 'Update Result' button instead of 'Confirm Result'", () => {
    render(<AdminMatchCard match={baseMatch} result={resolvedResult} onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByText("Mexico"));
    expect(screen.getByText("Update Result")).toBeTruthy();
    expect(screen.queryByText("Confirm Result")).toBeNull();
    expect(screen.getByText("Cancel")).toBeTruthy();
  });

  it("does not call onConfirm when re-confirming the same winner", async () => {
    const onConfirm = vi.fn();
    render(<AdminMatchCard match={baseMatch} result={resolvedResult} onConfirm={onConfirm} />);
    // Click the already-stored winner (Brazil)
    fireEvent.click(screen.getByText("Brazil"));
    fireEvent.click(screen.getByText("Update Result"));
    // onConfirm should NOT be called — same winner, no-op
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows TBD names and info text when teams are not set", () => {
    const noTeamMatch = { ...baseMatch, teamA: "", teamB: "" };
    render(<AdminMatchCard match={noTeamMatch} result={null} onConfirm={vi.fn()} />);
    expect(screen.getByText(/Teams TBD/)).toBeTruthy();
  });

  it("team buttons are disabled when teams are not set", () => {
    const noTeamMatch = { ...baseMatch, teamA: "", teamB: "" };
    render(<AdminMatchCard match={noTeamMatch} result={null} onConfirm={vi.fn()} />);
    const [tbdA, tbdB] = screen.getAllByRole("button");
    expect((tbdA as HTMLButtonElement).disabled).toBe(true);
    expect((tbdB as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not show 'No result' badge when teams are not set", () => {
    const noTeamMatch = { ...baseMatch, teamA: "", teamB: "" };
    render(<AdminMatchCard match={noTeamMatch} result={null} onConfirm={vi.fn()} />);
    expect(screen.queryByText("No result")).toBeNull();
  });
});
