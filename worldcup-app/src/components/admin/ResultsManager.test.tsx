import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ResultsManager } from "./ResultsManager";
import type { Match, Result } from "@/types";

vi.mock("@/lib/actions/admin", () => ({
  enterResult: vi.fn(),
}));

import { enterResult } from "@/lib/actions/admin";

const makeMatch = (
  id: number,
  round: number,
  position: number,
  teamA = "Brazil",
  teamB = "Mexico"
): Match => ({
  id,
  teamA,
  teamB,
  round,
  position,
  winner: null,
  createdAt: "2026-02-21T00:00:00Z",
});

describe("ResultsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders round header for matches that exist", () => {
    render(<ResultsManager matches={[makeMatch(1, 1, 1)]} initialResults={[]} />);
    expect(screen.getByText("Round of 32")).toBeTruthy();
  });

  it("does not render headers for empty rounds", () => {
    render(
      <ResultsManager matches={[makeMatch(1, 3, 1, "France", "England")]} initialResults={[]} />
    );
    expect(screen.queryByText("Round of 32")).toBeNull();
    expect(screen.getByText("Quarterfinals")).toBeTruthy();
  });

  it("renders all five round names when matches exist in each", () => {
    const matches = [1, 2, 3, 4, 5].map((r) => makeMatch(r, r, 1));
    render(<ResultsManager matches={matches} initialResults={[]} />);
    expect(screen.getByText("Round of 32")).toBeTruthy();
    expect(screen.getByText("Round of 16")).toBeTruthy();
    expect(screen.getByText("Quarterfinals")).toBeTruthy();
    expect(screen.getByText("Semifinals")).toBeTruthy();
    expect(screen.getByText("Final")).toBeTruthy();
  });

  it("renders team names from matches", () => {
    render(
      <ResultsManager matches={[makeMatch(1, 1, 1, "Argentina", "France")]} initialResults={[]} />
    );
    expect(screen.getByText("Argentina")).toBeTruthy();
    expect(screen.getByText("France")).toBeTruthy();
  });

  it("shows 'Result saved' for matches with an initial result", () => {
    const match = makeMatch(1, 1, 1);
    const result: Result = { id: 1, matchId: 1, winner: "Brazil", createdAt: "" };
    render(<ResultsManager matches={[match]} initialResults={[result]} />);
    expect(screen.getByText(/Result saved/)).toBeTruthy();
  });

  it("shows error message when enterResult returns failure", async () => {
    vi.mocked(enterResult).mockResolvedValue({ success: false, error: "Server error" });
    render(<ResultsManager matches={[makeMatch(1, 1, 1)]} initialResults={[]} />);
    fireEvent.click(screen.getByText("Brazil"));
    fireEvent.click(screen.getByText("Confirm Result"));
    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeTruthy();
    });
  });

  it("shows fallback error message when error field is missing", async () => {
    vi.mocked(enterResult).mockResolvedValue({ success: false, error: undefined });
    render(<ResultsManager matches={[makeMatch(1, 1, 1)]} initialResults={[]} />);
    fireEvent.click(screen.getByText("Brazil"));
    fireEvent.click(screen.getByText("Confirm Result"));
    await waitFor(() => {
      expect(screen.getByText(/Failed to save result/)).toBeTruthy();
    });
  });

  it("updates to resolved state optimistically on success", async () => {
    vi.mocked(enterResult).mockResolvedValue({ success: true, data: null });
    render(<ResultsManager matches={[makeMatch(1, 1, 1)]} initialResults={[]} />);
    fireEvent.click(screen.getByText("Brazil"));
    fireEvent.click(screen.getByText("Confirm Result"));
    await waitFor(() => {
      expect(screen.getByText(/Result saved/)).toBeTruthy();
    });
  });

  it("calls enterResult with correct matchId and winner", async () => {
    vi.mocked(enterResult).mockResolvedValue({ success: true, data: null });
    render(<ResultsManager matches={[makeMatch(5, 2, 1, "Germany", "Spain")]} initialResults={[]} />);
    fireEvent.click(screen.getByText("Spain"));
    fireEvent.click(screen.getByText("Confirm Result"));
    await waitFor(() => {
      expect(enterResult).toHaveBeenCalledWith({ matchId: 5, winner: "Spain" });
    });
  });

  it("clears error on the next successful confirm attempt", async () => {
    vi.mocked(enterResult)
      .mockResolvedValueOnce({ success: false, error: "Network error" })
      .mockResolvedValueOnce({ success: true, data: null });
    render(<ResultsManager matches={[makeMatch(1, 1, 1)]} initialResults={[]} />);

    // First attempt fails
    fireEvent.click(screen.getByText("Brazil"));
    fireEvent.click(screen.getByText("Confirm Result"));
    await waitFor(() => expect(screen.getByText("Network error")).toBeTruthy());

    // Re-select and confirm again
    fireEvent.click(screen.getByText("Brazil"));
    fireEvent.click(screen.getByText("Confirm Result"));
    await waitFor(() => expect(screen.queryByText("Network error")).toBeNull());
  });

  it("sorts matches within a round by position", () => {
    const matches = [
      makeMatch(2, 1, 2, "France", "England"),
      makeMatch(1, 1, 1, "Brazil", "Mexico"),
    ];
    render(<ResultsManager matches={matches} initialResults={[]} />);
    const buttons = screen.getAllByRole("button");
    // Brazil (position 1) should appear before France (position 2)
    const brazilIndex = buttons.findIndex((b) => b.textContent === "Brazil");
    const franceIndex = buttons.findIndex((b) => b.textContent === "France");
    expect(brazilIndex).toBeLessThan(franceIndex);
  });
});
