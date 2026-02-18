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
  const mockSelectWhere = vi.fn(() => ({ get: mockGet }));
  const mockSelectOrderBy = vi.fn(() => ({ all: mockAll }));
  const mockSelectFrom = vi.fn(() => ({
    where: mockSelectWhere,
    orderBy: mockSelectOrderBy,
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
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  asc: vi.fn((col) => ({ type: "asc", col })),
}));

import { setupMatchup, getMatches, deleteMatchup } from "./admin";
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
