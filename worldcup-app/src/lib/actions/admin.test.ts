import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
  }),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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
  const mockSelectOrderBy = vi.fn(() => ({ all: mockAll }));
  const mockSelectFrom = vi.fn(() => ({
    where: mockSelectWhere,
    orderBy: mockSelectOrderBy,
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
  matches: {
    id: "id",
    teamA: "team_a",
    teamB: "team_b",
    round: "round",
    position: "position",
    winner: "winner",
    createdAt: "created_at",
  },
  tournamentConfig: {
    id: "id",
    isLocked: "is_locked",
    pointsR32: "points_r32",
    pointsR16: "points_r16",
    pointsQf: "points_qf",
    pointsSf: "points_sf",
    pointsFinal: "points_final",
    createdAt: "created_at",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  asc: vi.fn((col) => ({ type: "asc", col })),
}));

import { setupMatchup, getMatches, deleteMatchup, getTournamentConfig, toggleLock, checkBracketLock, initializeBracketStructure } from "./admin";
import { cookies } from "next/headers";

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

function mockAdmin() {
  process.env.ADMIN_USERNAME = "admin";
  const cookieGet = vi.fn().mockReturnValue({ value: "admin" });
  (cookies as MockFn).mockResolvedValue({ get: cookieGet });
}

function mockNonAdmin() {
  process.env.ADMIN_USERNAME = "admin";
  const cookieGet = vi.fn().mockReturnValue({ value: "player1" });
  (cookies as MockFn).mockResolvedValue({ get: cookieGet });
}

function mockNoCookie() {
  process.env.ADMIN_USERNAME = "admin";
  const cookieGet = vi.fn().mockReturnValue(undefined);
  (cookies as MockFn).mockResolvedValue({ get: cookieGet });
}

describe("setupMatchup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin users", async () => {
    mockNonAdmin();
    const result = await setupMatchup({ teamA: "Brazil", teamB: "Germany", position: 1 });
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects when no cookie present", async () => {
    mockNoCookie();
    const result = await setupMatchup({ teamA: "Brazil", teamB: "Germany", position: 1 });
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects empty team A name", async () => {
    mockAdmin();
    const result = await setupMatchup({ teamA: "  ", teamB: "Germany", position: 1 });
    expect(result).toEqual({ success: false, error: "Both team names are required" });
  });

  it("rejects empty team B name", async () => {
    mockAdmin();
    const result = await setupMatchup({ teamA: "Brazil", teamB: "", position: 1 });
    expect(result).toEqual({ success: false, error: "Both team names are required" });
  });

  it("rejects position less than 1", async () => {
    mockAdmin();
    const result = await setupMatchup({ teamA: "Brazil", teamB: "Germany", position: 0 });
    expect(result).toEqual({ success: false, error: "Position must be between 1 and 16" });
  });

  it("rejects position greater than 16", async () => {
    mockAdmin();
    const result = await setupMatchup({ teamA: "Brazil", teamB: "Germany", position: 17 });
    expect(result).toEqual({ success: false, error: "Position must be between 1 and 16" });
  });

  it("rejects non-integer position", async () => {
    mockAdmin();
    const result = await setupMatchup({ teamA: "Brazil", teamB: "Germany", position: 1.5 });
    expect(result).toEqual({ success: false, error: "Position must be between 1 and 16" });
  });

  it("inserts new match when no existing match at position", async () => {
    mockAdmin();
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);
    mockReturning.mockResolvedValueOnce([{ id: 1 }]);

    const result = await setupMatchup({ teamA: "Brazil", teamB: "Germany", position: 1 });
    expect(result).toEqual({ success: true, data: { matchId: 1 } });
  });

  it("updates existing match at same position", async () => {
    mockAdmin();
    const { mockGet, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 5, teamA: "OldA", teamB: "OldB", round: 1, position: 3 });

    const result = await setupMatchup({ teamA: "Brazil", teamB: "Germany", position: 3 });

    expect(result).toEqual({ success: true, data: { matchId: 5 } });
    expect(mockSet).toHaveBeenCalledWith({ teamA: "Brazil", teamB: "Germany" });
  });

  it("trims team names before saving", async () => {
    mockAdmin();
    const { mockGet, mockReturning, mockValues } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);
    mockReturning.mockResolvedValueOnce([{ id: 2 }]);

    await setupMatchup({ teamA: "  Brazil  ", teamB: "  Germany  ", position: 1 });

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ teamA: "Brazil", teamB: "Germany" })
    );
  });
});

describe("getMatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin users", async () => {
    mockNonAdmin();
    const result = await getMatches();
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns all matches wrapped in ActionResult for admin", async () => {
    mockAdmin();
    const { mockAll } = await getDbMocks();
    const mockMatches = [
      { id: 1, teamA: "Brazil", teamB: "Germany", round: 1, position: 1, winner: null, createdAt: "2026-01-01" },
      { id: 2, teamA: "France", teamB: "Spain", round: 1, position: 2, winner: null, createdAt: "2026-01-01" },
    ];
    mockAll.mockResolvedValueOnce(mockMatches);

    const result = await getMatches();
    expect(result).toEqual({ success: true, data: mockMatches });
  });
});

describe("deleteMatchup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin users", async () => {
    mockNonAdmin();
    const result = await deleteMatchup(1);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects invalid match ID (non-integer)", async () => {
    mockAdmin();
    const result = await deleteMatchup(1.5);
    expect(result).toEqual({ success: false, error: "Invalid match ID" });
  });

  it("rejects invalid match ID (zero)", async () => {
    mockAdmin();
    const result = await deleteMatchup(0);
    expect(result).toEqual({ success: false, error: "Invalid match ID" });
  });

  it("rejects invalid match ID (negative)", async () => {
    mockAdmin();
    const result = await deleteMatchup(-1);
    expect(result).toEqual({ success: false, error: "Invalid match ID" });
  });

  it("deletes match for admin user", async () => {
    mockAdmin();
    const result = await deleteMatchup(5);
    expect(result).toEqual({ success: true, data: null });
  });
});

const mockConfigRow = {
  id: 1,
  isLocked: false,
  pointsR32: 1,
  pointsR16: 2,
  pointsQf: 4,
  pointsSf: 8,
  pointsFinal: 16,
  createdAt: "2026-02-18T00:00:00.000Z",
};

describe("getTournamentConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("returns existing config when row exists", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockConfigRow);

    const result = await getTournamentConfig();
    expect(result).toEqual(mockConfigRow);
  });

  it("creates default config row when none exists and re-queries canonical row", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // first query: no row
    mockReturning.mockResolvedValueOnce([mockConfigRow]); // insert
    mockGet.mockResolvedValueOnce(mockConfigRow); // re-query after insert

    const result = await getTournamentConfig();
    expect(result).toEqual(mockConfigRow);
  });
});

describe("toggleLock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin users", async () => {
    mockNonAdmin();
    const result = await toggleLock(true);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects non-boolean lock value", async () => {
    mockAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await toggleLock("yes" as any);
    expect(result).toEqual({ success: false, error: "Invalid lock value" });
  });

  it("locks brackets when admin toggles to locked", async () => {
    mockAdmin();
    const { mockGet, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockConfigRow);

    const result = await toggleLock(true);
    expect(result).toEqual({ success: true, data: { isLocked: true } });
    expect(mockSet).toHaveBeenCalledWith({ isLocked: true });
  });

  it("unlocks brackets when admin toggles to unlocked", async () => {
    mockAdmin();
    const { mockGet, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ ...mockConfigRow, isLocked: true });

    const result = await toggleLock(false);
    expect(result).toEqual({ success: true, data: { isLocked: false } });
    expect(mockSet).toHaveBeenCalledWith({ isLocked: false });
  });
});

describe("checkBracketLock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("returns false when brackets are unlocked", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockConfigRow);

    const result = await checkBracketLock();
    expect(result).toBe(false);
  });

  it("returns true when brackets are locked", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ ...mockConfigRow, isLocked: true });

    const result = await checkBracketLock();
    expect(result).toBe(true);
  });
});

describe("initializeBracketStructure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin users", async () => {
    mockNonAdmin();
    const result = await initializeBracketStructure();
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects when fewer than 16 R32 matches exist", async () => {
    mockAdmin();
    const { mockAll } = await getDbMocks();
    mockAll.mockResolvedValueOnce(Array(10).fill({ id: 1, round: 1 }));

    const result = await initializeBracketStructure();
    expect(result).toEqual({
      success: false,
      error: "Need all 16 R32 matches before initializing bracket structure (found 10)",
    });
  });

  it("returns created: 0 when later-round matches already exist", async () => {
    mockAdmin();
    const { mockAll } = await getDbMocks();
    mockAll.mockResolvedValueOnce(Array(16).fill({ id: 1, round: 1 })); // R32 matches
    mockAll.mockResolvedValueOnce([{ id: 17, round: 2 }]); // existing round 2

    const result = await initializeBracketStructure();
    expect(result).toEqual({ success: true, data: { created: 0 } });
  });

  it("creates 15 placeholder matches for rounds 2-5", async () => {
    mockAdmin();
    const { mockAll, mockValues } = await getDbMocks();
    mockAll.mockResolvedValueOnce(Array(16).fill({ id: 1, round: 1 })); // R32 matches
    mockAll.mockResolvedValueOnce([]); // no existing later rounds

    const result = await initializeBracketStructure();
    expect(result).toEqual({ success: true, data: { created: 15 } });
    expect(mockValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ round: 2, position: 1, teamA: "", teamB: "" }),
        expect.objectContaining({ round: 5, position: 1, teamA: "", teamB: "" }),
      ])
    );
  });
});
