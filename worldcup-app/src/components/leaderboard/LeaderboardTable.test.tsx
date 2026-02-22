import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeaderboardTable } from "./LeaderboardTable";
import type { LeaderboardEntry } from "@/types";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeEntry(
  userId: number,
  username: string,
  score: number,
  rank: number,
  overrides: Partial<LeaderboardEntry> = {}
): LeaderboardEntry {
  return {
    userId,
    username,
    score,
    maxPossible: 80,
    championPick: null,
    isChampionEliminated: false,
    isEliminated: false,
    rank,
    ...overrides,
  };
}

const ENTRIES: LeaderboardEntry[] = [
  makeEntry(1, "alice", 30, 1, { maxPossible: 50, championPick: "Brazil", isChampionEliminated: false }),
  makeEntry(2, "bob", 20, 2, { maxPossible: 40, championPick: "France", isChampionEliminated: true }),
  makeEntry(3, "carol", 10, 3, { maxPossible: 15, championPick: null, isEliminated: true }),
];

describe("LeaderboardTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a row for every entry", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="carol" />);
    expect(screen.getByText("alice")).toBeTruthy();
    expect(screen.getByText("bob")).toBeTruthy();
    expect(screen.getByText("carol")).toBeTruthy();
  });

  it("displays rank numbers in the rank column", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="carol" />);
    // rank 2 and 3 are plain numbers
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("shows crown emoji next to rank 1", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="carol" />);
    expect(screen.getByText("👑 1")).toBeTruthy();
  });

  it("highlights the current user row with emerald background", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const aliceCell = screen.getByText("alice").closest("tr");
    expect(aliceCell?.className).toContain("bg-emerald-50");
  });

  it("does not highlight other users rows", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const bobCell = screen.getByText("bob").closest("tr");
    expect(bobCell?.className ?? "").not.toContain("bg-emerald-50");
  });

  it("shows eliminated user max points with muted (slate-400) styling", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const carolRow = screen.getByText("carol").closest("tr");
    // carol is eliminated — find the max-points cell in her row
    const cells = carolRow?.querySelectorAll("td");
    const maxCell = cells?.[3]; // 4th cell: Max column
    expect(maxCell?.className).toContain("text-slate-400");
  });

  it("shows non-eliminated user max points without muted styling", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const aliceRow = screen.getByText("alice").closest("tr");
    const cells = aliceRow?.querySelectorAll("td");
    const maxCell = cells?.[3];
    expect(maxCell?.className ?? "").not.toContain("text-slate-400");
  });

  it("renders champion pick with strikethrough when champion is eliminated", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const franceSpan = screen.getByText("France");
    expect(franceSpan.className).toContain("line-through");
    expect(franceSpan.className).toContain("bg-red-100");
  });

  it("renders champion pick with emerald accent when champion is alive", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const brazilSpan = screen.getByText("Brazil");
    expect(brazilSpan.className).toContain("bg-emerald-100");
    expect(brazilSpan.className).not.toContain("line-through");
  });

  it("renders a dash when the user has no champion pick", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    // carol has no champion pick → should render "—"
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("uses semantic table elements", () => {
    const { container } = render(
      <LeaderboardTable entries={ENTRIES} currentUsername="alice" />
    );
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("thead")).toBeTruthy();
    expect(container.querySelector("tbody")).toBeTruthy();
    expect(container.querySelectorAll("th").length).toBeGreaterThan(0);
  });

  it("renders column headers with scope=col for accessibility", () => {
    const { container } = render(
      <LeaderboardTable entries={ENTRIES} currentUsername="alice" />
    );
    const headers = container.querySelectorAll("th");
    headers.forEach((th) => {
      expect(th.getAttribute("scope")).toBe("col");
    });
  });

  it("renders an empty table body when entries is empty", () => {
    const { container } = render(
      <LeaderboardTable entries={[]} currentUsername="alice" />
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(0);
  });

  it("displays scores for all users", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    expect(screen.getByText("30")).toBeTruthy();
    expect(screen.getByText("20")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
  });

  it("clicking another user's row navigates to /bracket/[username]", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const bobRow = screen.getByText("bob").closest("tr");
    fireEvent.click(bobRow!);
    expect(mockPush).toHaveBeenCalledWith("/bracket/bob");
  });

  it("clicking current user's row navigates to /bracket (own bracket)", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const aliceRow = screen.getByText("alice").closest("tr");
    fireEvent.click(aliceRow!);
    expect(mockPush).toHaveBeenCalledWith("/bracket");
  });

  it("pressing Enter on a row triggers navigation", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const bobRow = screen.getByText("bob").closest("tr");
    fireEvent.keyDown(bobRow!, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/bracket/bob");
  });

  it("pressing Space on a row triggers navigation", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const bobRow = screen.getByText("bob").closest("tr");
    fireEvent.keyDown(bobRow!, { key: " " });
    expect(mockPush).toHaveBeenCalledWith("/bracket/bob");
  });

  it("rows have cursor-pointer class for clickability", () => {
    render(<LeaderboardTable entries={ENTRIES} currentUsername="alice" />);
    const bobRow = screen.getByText("bob").closest("tr");
    expect(bobRow?.className).toContain("cursor-pointer");
  });

  it("encodes special characters in username for URL", () => {
    const specialEntry = makeEntry(4, "user name", 5, 4);
    render(<LeaderboardTable entries={[specialEntry]} currentUsername="alice" />);
    const row = screen.getByText("user name").closest("tr");
    fireEvent.click(row!);
    expect(mockPush).toHaveBeenCalledWith("/bracket/user%20name");
  });
});
