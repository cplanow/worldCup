import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache (needed transitively via admin)
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock checkBracketLock from admin (avoids pulling in admin's full deps)
vi.mock("@/lib/actions/admin", () => ({
  checkBracketLock: vi.fn().mockResolvedValue(false),
}));

// Mock database
vi.mock("@/db", () => {
  const mockGet = vi.fn();
  const mockAll = vi.fn();
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockSet = vi.fn(() => ({ where: vi.fn() }));
  const mockDeleteWhere = vi.fn();
  const mockSelectWhere = vi.fn(() => ({ get: mockGet, all: mockAll }));
  const mockSelectFrom = vi.fn(() => ({
    where: mockSelectWhere,
    get: mockGet,
  }));

  return {
    db: {
      select: vi.fn(() => ({ from: mockSelectFrom })),
      insert: vi.fn(() => ({ values: mockValues })),
      update: vi.fn(() => ({ set: mockSet })),
      delete: vi.fn(() => ({ where: mockDeleteWhere })),
    },
    __mocks: {
      mockGet,
      mockAll,
      mockReturning,
      mockValues,
      mockSet,
      mockDeleteWhere,
      mockSelectWhere,
      mockSelectFrom,
    },
  };

});

vi.mock("@/db/schema", () => ({
  picks: { id: "id", userId: "user_id", matchId: "match_id", selectedTeam: "selected_team" },
  users: { id: "id", bracketSubmitted: "bracket_submitted" },
  matches: { id: "id", teamA: "team_a", teamB: "team_b", round: "round" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  inArray: vi.fn((col, vals) => ({ type: "inArray", col, vals })),
}));

import { savePick, deletePicks, submitBracket } from "./bracket";
import { checkBracketLock } from "@/lib/actions/admin";

type MockFn = ReturnType<typeof vi.fn>;

const getDbMocks = async () => {
  const mod = (await import("@/db")) as {
    __mocks: {
      mockGet: MockFn;
      mockAll: MockFn;
      mockReturning: MockFn;
      mockValues: MockFn;
      mockSet: MockFn;
      mockDeleteWhere: MockFn;
    };
  };
  return mod.__mocks;
};

const mockUser = { id: 1, username: "chris", bracketSubmitted: false, createdAt: "2026-01-01" };
const mockLockedUser = { ...mockUser, bracketSubmitted: true };
const mockR32Match = { id: 10, teamA: "Brazil", teamB: "Germany", round: 1, position: 1, winner: null, createdAt: "2026-01-01" };
const mockLaterMatch = { id: 20, teamA: "", teamB: "", round: 2, position: 1, winner: null, createdAt: "2026-01-01" };

describe("savePick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkBracketLock as MockFn).mockResolvedValue(false);
  });

  it("returns error when brackets are locked", async () => {
    (checkBracketLock as MockFn).mockResolvedValueOnce(true);
    const result = await savePick({ userId: 1, matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: false, error: "Brackets are locked" });
  });

  it("returns error when user not found", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // user not found
    const result = await savePick({ userId: 1, matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: false, error: "User not found" });
  });

  it("returns error when bracket already submitted", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockLockedUser);
    const result = await savePick({ userId: 1, matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: false, error: "Bracket already submitted" });
  });

  it("returns error when match not found", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);    // user
    mockGet.mockResolvedValueOnce(undefined);   // match not found
    const result = await savePick({ userId: 1, matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: false, error: "Match not found" });
  });

  it("returns error for invalid team in R32 match", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);
    mockGet.mockResolvedValueOnce(mockR32Match);
    const result = await savePick({ userId: 1, matchId: 10, selectedTeam: "France" });
    expect(result).toEqual({ success: false, error: "Invalid team selection" });
  });

  it("inserts new pick when no existing pick", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);       // user
    mockGet.mockResolvedValueOnce(mockR32Match);   // match
    mockGet.mockResolvedValueOnce(undefined);      // no existing pick
    mockReturning.mockResolvedValueOnce([{ id: 100 }]);

    const result = await savePick({ userId: 1, matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: true, data: { pickId: 100 } });
  });

  it("updates existing pick when pick already exists for this match", async () => {
    const { mockGet, mockSet } = await getDbMocks();
    const existingPick = { id: 55, userId: 1, matchId: 10, selectedTeam: "Germany", createdAt: "" };
    mockGet.mockResolvedValueOnce(mockUser);
    mockGet.mockResolvedValueOnce(mockR32Match);
    mockGet.mockResolvedValueOnce(existingPick);

    const result = await savePick({ userId: 1, matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: true, data: { pickId: 55 } });
    expect(mockSet).toHaveBeenCalledWith({ selectedTeam: "Brazil" });
  });

  it("allows any team for later-round match (round > 1) without R32 teamA/teamB validation", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);
    mockGet.mockResolvedValueOnce(mockLaterMatch); // round 2, empty teamA/teamB
    mockGet.mockResolvedValueOnce(undefined);       // no existing pick
    mockReturning.mockResolvedValueOnce([{ id: 200 }]);

    const result = await savePick({ userId: 1, matchId: 20, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: true, data: { pickId: 200 } });
  });
});

describe("deletePicks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkBracketLock as MockFn).mockResolvedValue(false);
  });

  it("returns error when brackets are locked", async () => {
    (checkBracketLock as MockFn).mockResolvedValueOnce(true);
    const result = await deletePicks({ userId: 1, matchIds: [10, 11] });
    expect(result).toEqual({ success: false, error: "Brackets are locked" });
  });

  it("returns error when user not found", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);
    const result = await deletePicks({ userId: 1, matchIds: [10] });
    expect(result).toEqual({ success: false, error: "User not found" });
  });

  it("returns error when bracket already submitted", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockLockedUser);
    const result = await deletePicks({ userId: 1, matchIds: [10] });
    expect(result).toEqual({ success: false, error: "Bracket already submitted" });
  });

  it("deletes all picks in a single bulk query", async () => {
    const { mockGet, mockDeleteWhere } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);

    const result = await deletePicks({ userId: 1, matchIds: [10, 11, 12] });
    expect(result).toEqual({ success: true, data: null });
    expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
  });

  it("succeeds with empty matchIds array (no deletes performed)", async () => {
    const { mockGet, mockDeleteWhere } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);

    const result = await deletePicks({ userId: 1, matchIds: [] });
    expect(result).toEqual({ success: true, data: null });
    expect(mockDeleteWhere).not.toHaveBeenCalled();
  });

  it("returns error when matchIds array exceeds 30 entries", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);

    const result = await deletePicks({ userId: 1, matchIds: Array.from({ length: 31 }, (_, i) => i + 1) });
    expect(result).toEqual({ success: false, error: "Invalid request" });
  });
});

describe("submitBracket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkBracketLock as MockFn).mockResolvedValue(false);
  });

  it("returns error when brackets are locked", async () => {
    (checkBracketLock as MockFn).mockResolvedValueOnce(true);
    const result = await submitBracket(1);
    expect(result).toEqual({ success: false, error: "Brackets are locked" });
  });

  it("returns error when user not found", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);
    const result = await submitBracket(1);
    expect(result).toEqual({ success: false, error: "User not found" });
  });

  it("returns error when bracket already submitted", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockLockedUser);
    const result = await submitBracket(1);
    expect(result).toEqual({ success: false, error: "Bracket already submitted" });
  });

  it("returns error when user has fewer than 31 picks", async () => {
    const { mockGet, mockAll } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);
    mockAll.mockResolvedValueOnce(Array(17).fill({ id: 1 })); // only 17 picks
    const result = await submitBracket(1);
    expect(result).toEqual({
      success: false,
      error: "Only 17 of 31 picks made. Complete your bracket first.",
    });
  });

  it("sets bracketSubmitted=true and returns success when user has 31 picks", async () => {
    const { mockGet, mockAll, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);
    mockAll.mockResolvedValueOnce(Array(31).fill({ id: 1 })); // 31 picks

    const result = await submitBracket(1);
    expect(result).toEqual({ success: true, data: null });
    expect(mockSet).toHaveBeenCalledWith({ bracketSubmitted: true });
  });

  it("also succeeds when user has more than 31 picks (server accepts >= 31)", async () => {
    const { mockGet, mockAll } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockUser);
    mockAll.mockResolvedValueOnce(Array(32).fill({ id: 1 }));

    const result = await submitBracket(1);
    expect(result).toEqual({ success: true, data: null });
  });
});
