import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
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

// The component now renders both a desktop <table> and a mobile <ul> list.
// Tests scope to one surface at a time to keep assertions unambiguous.
function renderTable(currentUsername: string, entries: LeaderboardEntry[] = ENTRIES) {
  const result = render(
    <LeaderboardTable entries={entries} currentUsername={currentUsername} />
  );
  const table = result.container.querySelector("table") as HTMLTableElement;
  const mobileList = result.container.querySelector("ul[role='list']") as HTMLUListElement;
  return { ...result, table, mobileList };
}

describe("LeaderboardTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a row in the desktop table for every entry", () => {
    const { table } = renderTable("carol");
    expect(within(table).getByText("alice")).toBeTruthy();
    expect(within(table).getByText("bob")).toBeTruthy();
    expect(within(table).getByText("carol")).toBeTruthy();
  });

  it("renders a stacked mobile card for every entry", () => {
    const { mobileList } = renderTable("carol");
    expect(mobileList.querySelectorAll(":scope > li").length).toBe(3);
  });

  it("displays rank pills for ranks 2 and 3", () => {
    const { table } = renderTable("carol");
    const rankTwo = within(table).getByTestId("rank-pill-2");
    const rankThree = within(table).getByTestId("rank-pill-3");
    expect(rankTwo.textContent).toBe("2");
    expect(rankThree.textContent).toBe("3");
  });

  it("shows rank 1 with the accent gradient pill", () => {
    const { table } = renderTable("carol");
    const rankOne = within(table).getByTestId("rank-pill-1");
    expect(rankOne.className).toContain("bg-accent-gradient");
    expect(rankOne.className).toContain("rounded-full");
    expect(rankOne.textContent).toBe("1");
  });

  it("renders rank 2 with silver (info) tokens and rank 3 with bronze (warning) tokens", () => {
    const { table } = renderTable("carol");
    const rankTwo = within(table).getByTestId("rank-pill-2");
    const rankThree = within(table).getByTestId("rank-pill-3");
    expect(rankTwo.className).toContain("bg-info-bg");
    expect(rankTwo.className).toContain("text-info");
    expect(rankThree.className).toContain("bg-warning-bg");
    expect(rankThree.className).toContain("text-warning");
  });

  it("highlights the current user row with an accent tint", () => {
    const { table } = renderTable("alice");
    const aliceRow = within(table).getByText("alice").closest("tr");
    expect(aliceRow?.className).toContain("bg-accent/8");
  });

  it("does not highlight other users' rows", () => {
    const { table } = renderTable("alice");
    const bobRow = within(table).getByText("bob").closest("tr");
    expect(bobRow?.className ?? "").not.toContain("bg-accent/8");
  });

  it("shows eliminated user's max points with subtle text styling", () => {
    const { table } = renderTable("alice");
    const carolRow = within(table).getByText("carol").closest("tr");
    const cells = carolRow?.querySelectorAll("td");
    // cells: [rank, name, total/score, max, champion]
    const maxCell = cells?.[3];
    expect(maxCell?.className).toContain("text-text-subtle");
  });

  it("shows non-eliminated user's max points without the subtle modifier", () => {
    const { table } = renderTable("alice");
    const aliceRow = within(table).getByText("alice").closest("tr");
    const cells = aliceRow?.querySelectorAll("td");
    const maxCell = cells?.[3];
    expect(maxCell?.className).toContain("text-text-muted");
    expect(maxCell?.className).not.toContain("text-text-subtle");
  });

  it("renders champion pick with strikethrough + error tokens when eliminated", () => {
    const { table } = renderTable("alice");
    const franceSpan = within(table).getByText("France");
    expect(franceSpan.className).toContain("line-through");
    expect(franceSpan.className).toContain("bg-error-bg");
  });

  it("renders champion pick with success tokens when alive", () => {
    const { table } = renderTable("alice");
    const brazilSpan = within(table).getByText("Brazil");
    expect(brazilSpan.className).toContain("bg-success-bg");
    expect(brazilSpan.className).not.toContain("line-through");
  });

  it("renders a dash when the user has no champion pick", () => {
    const { table } = renderTable("alice");
    expect(within(table).getByText("—")).toBeTruthy();
  });

  it("uses semantic table elements", () => {
    const { container } = renderTable("alice");
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("thead")).toBeTruthy();
    expect(container.querySelector("tbody")).toBeTruthy();
    expect(container.querySelectorAll("th").length).toBeGreaterThan(0);
  });

  it("renders column headers with scope=col for accessibility", () => {
    const { container } = renderTable("alice");
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

  it("displays scores for all users in the desktop table", () => {
    const { table } = renderTable("alice");
    expect(within(table).getByText("30")).toBeTruthy();
    expect(within(table).getByText("20")).toBeTruthy();
    expect(within(table).getByText("10")).toBeTruthy();
  });

  it("clicking another user's row navigates to /bracket/[username]", () => {
    const { table } = renderTable("alice");
    const bobRow = within(table).getByText("bob").closest("tr");
    fireEvent.click(bobRow!);
    expect(mockPush).toHaveBeenCalledWith("/bracket/bob");
  });

  it("clicking current user's row navigates to /bracket (own bracket)", () => {
    const { table } = renderTable("alice");
    const aliceRow = within(table).getByText("alice").closest("tr");
    fireEvent.click(aliceRow!);
    expect(mockPush).toHaveBeenCalledWith("/bracket");
  });

  it("pressing Enter on a row triggers navigation", () => {
    const { table } = renderTable("alice");
    const bobRow = within(table).getByText("bob").closest("tr");
    fireEvent.keyDown(bobRow!, { key: "Enter" });
    expect(mockPush).toHaveBeenCalledWith("/bracket/bob");
  });

  it("pressing Space on a row triggers navigation", () => {
    const { table } = renderTable("alice");
    const bobRow = within(table).getByText("bob").closest("tr");
    fireEvent.keyDown(bobRow!, { key: " " });
    expect(mockPush).toHaveBeenCalledWith("/bracket/bob");
  });

  it("desktop rows have cursor-pointer class for clickability", () => {
    const { table } = renderTable("alice");
    const bobRow = within(table).getByText("bob").closest("tr");
    expect(bobRow?.className).toContain("cursor-pointer");
  });

  it("encodes special characters in username for URL", () => {
    const specialEntry = makeEntry(4, "user name", 5, 4);
    const { table } = renderTable("alice", [specialEntry]);
    const row = within(table).getByText("user name").closest("tr");
    fireEvent.click(row!);
    expect(mockPush).toHaveBeenCalledWith("/bracket/user%20name");
  });

  it("renders a rank delta indicator when previousRank differs from rank", () => {
    const entry = makeEntry(5, "dave", 12, 2, {});
    render(
      <LeaderboardTable
        entries={[{ ...entry, previousRank: 5 }]}
        currentUsername="alice"
      />
    );
    // Moved up 3 spots (from 5 to 2)
    const deltas = screen.getAllByLabelText("up 3");
    expect(deltas.length).toBeGreaterThan(0);
  });

  it("does not render a rank delta when previousRank is undefined", () => {
    const { container } = render(
      <LeaderboardTable entries={ENTRIES} currentUsername="alice" />
    );
    expect(container.querySelector("[aria-label^='up ']")).toBeNull();
    expect(container.querySelector("[aria-label^='down ']")).toBeNull();
  });
});
