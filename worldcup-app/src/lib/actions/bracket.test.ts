import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the session — bracket actions now resolve the user from the signed
// session rather than accepting a userId parameter.
vi.mock("@/lib/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/actions/admin", () => ({
  checkBracketLock: vi.fn().mockResolvedValue(false),
}));

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
    __mocks: { mockGet, mockAll, mockReturning, mockValues, mockSet, mockDeleteWhere },
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
import { requireUser } from "@/lib/session";

type MockFn = ReturnType<typeof vi.fn>;

const getDbMocks = async () => {
  const mod = (await import("@/db")) as {
    __mocks: {
      mockGet: MockFn; mockAll: MockFn; mockReturning: MockFn;
      mockValues: MockFn; mockSet: MockFn; mockDeleteWhere: MockFn;
    };
  };
  return mod.__mocks;
};

const mockUser = { id: 1, username: "chris", bracketSubmitted: false };
const mockSubmittedUser = { ...mockUser, bracketSubmitted: true };
const mockR32Match = { id: 10, teamA: "Brazil", teamB: "Germany", round: 1, position: 1 };
const mockLaterMatch = { id: 20, teamA: "", teamB: "", round: 2, position: 1 };

describe("savePick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkBracketLock as MockFn).mockResolvedValue(false);
    (requireUser as MockFn).mockResolvedValue(mockUser);
  });

  it("returns Unauthenticated when session is missing", async () => {
    (requireUser as MockFn).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
    const result = await savePick({ matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: false, error: "Unauthenticated" });
  });

  it("returns error when brackets are locked", async () => {
    (checkBracketLock as MockFn).mockResolvedValueOnce(true);
    const result = await savePick({ matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: false, error: "Brackets are locked" });
  });

  it("returns error when bracket already submitted", async () => {
    (requireUser as MockFn).mockResolvedValueOnce(mockSubmittedUser);
    const result = await savePick({ matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: false, error: "Bracket already submitted" });
  });

  it("returns error when match not found", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // match
    const result = await savePick({ matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: false, error: "Match not found" });
  });

  it("returns error for invalid team in R32 match", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockR32Match);
    const result = await savePick({ matchId: 10, selectedTeam: "France" });
    expect(result).toEqual({ success: false, error: "Invalid team selection" });
  });

  it("rejects empty selectedTeam", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockLaterMatch);
    const result = await savePick({ matchId: 20, selectedTeam: "" });
    expect(result).toEqual({ success: false, error: "Invalid team selection" });
  });

  it("rejects selectedTeam over 60 chars", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockLaterMatch);
    const result = await savePick({ matchId: 20, selectedTeam: "A".repeat(61) });
    expect(result).toEqual({ success: false, error: "Invalid team selection" });
  });

  it("inserts new pick when no existing pick", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockR32Match);
    mockGet.mockResolvedValueOnce(undefined); // no existing pick
    mockReturning.mockResolvedValueOnce([{ id: 100 }]);

    const result = await savePick({ matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: true, data: { pickId: 100 } });
  });

  it("updates existing pick when pick already exists for this match", async () => {
    const { mockGet, mockSet } = await getDbMocks();
    const existingPick = { id: 55, userId: 1, matchId: 10, selectedTeam: "Germany", createdAt: "" };
    mockGet.mockResolvedValueOnce(mockR32Match);
    mockGet.mockResolvedValueOnce(existingPick);

    const result = await savePick({ matchId: 10, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: true, data: { pickId: 55 } });
    expect(mockSet).toHaveBeenCalledWith({ selectedTeam: "Brazil" });
  });

  it("allows any team for later-round match without R32 teamA/teamB validation", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockLaterMatch); // round 2
    mockGet.mockResolvedValueOnce(undefined);       // no existing pick
    mockReturning.mockResolvedValueOnce([{ id: 200 }]);

    const result = await savePick({ matchId: 20, selectedTeam: "Brazil" });
    expect(result).toEqual({ success: true, data: { pickId: 200 } });
  });
});

describe("deletePicks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkBracketLock as MockFn).mockResolvedValue(false);
    (requireUser as MockFn).mockResolvedValue(mockUser);
  });

  it("returns Unauthenticated when session is missing", async () => {
    (requireUser as MockFn).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
    const result = await deletePicks({ matchIds: [10] });
    expect(result).toEqual({ success: false, error: "Unauthenticated" });
  });

  it("returns error when brackets are locked", async () => {
    (checkBracketLock as MockFn).mockResolvedValueOnce(true);
    const result = await deletePicks({ matchIds: [10, 11] });
    expect(result).toEqual({ success: false, error: "Brackets are locked" });
  });

  it("returns error when bracket already submitted", async () => {
    (requireUser as MockFn).mockResolvedValueOnce(mockSubmittedUser);
    const result = await deletePicks({ matchIds: [10] });
    expect(result).toEqual({ success: false, error: "Bracket already submitted" });
  });

  it("returns error when matchIds array exceeds 30", async () => {
    const matchIds = Array.from({ length: 31 }, (_, i) => i + 1);
    const result = await deletePicks({ matchIds });
    expect(result).toEqual({ success: false, error: "Invalid request" });
  });

  it("returns success and no-op when matchIds is empty", async () => {
    const result = await deletePicks({ matchIds: [] });
    expect(result).toEqual({ success: true, data: null });
  });

  it("deletes picks for provided matchIds", async () => {
    const { mockDeleteWhere } = await getDbMocks();
    const result = await deletePicks({ matchIds: [10, 11, 12] });
    expect(result).toEqual({ success: true, data: null });
    expect(mockDeleteWhere).toHaveBeenCalled();
  });
});

describe("submitBracket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkBracketLock as MockFn).mockResolvedValue(false);
    (requireUser as MockFn).mockResolvedValue(mockUser);
  });

  it("returns Unauthenticated when session is missing", async () => {
    (requireUser as MockFn).mockRejectedValueOnce(new Error("UNAUTHENTICATED"));
    const result = await submitBracket();
    expect(result).toEqual({ success: false, error: "Unauthenticated" });
  });

  it("returns error when brackets are locked", async () => {
    (checkBracketLock as MockFn).mockResolvedValueOnce(true);
    const result = await submitBracket();
    expect(result).toEqual({ success: false, error: "Brackets are locked" });
  });

  it("returns error when bracket already submitted", async () => {
    (requireUser as MockFn).mockResolvedValueOnce(mockSubmittedUser);
    const result = await submitBracket();
    expect(result).toEqual({ success: false, error: "Bracket already submitted" });
  });

  it("returns error when fewer than 31 picks", async () => {
    const { mockAll } = await getDbMocks();
    mockAll.mockResolvedValueOnce(Array.from({ length: 20 }, () => ({ id: 1 })));
    const result = await submitBracket();
    expect(result).toEqual({
      success: false,
      error: "Only 20 of 31 picks made. Complete your bracket first.",
    });
  });

  it("succeeds when user has 31 picks", async () => {
    const { mockAll } = await getDbMocks();
    mockAll.mockResolvedValueOnce(Array.from({ length: 31 }, () => ({ id: 1 })));
    const result = await submitBracket();
    expect(result).toEqual({ success: true, data: null });
  });
});
