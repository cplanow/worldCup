import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the session helpers — admin.ts now gates on the signed session, not a raw cookie.
vi.mock("@/lib/session", () => {
  const getSessionUser = vi.fn();
  const isAdminUsername = (username: string | undefined | null) => {
    const admin = process.env.ADMIN_USERNAME?.toLowerCase();
    return !!admin && !!username && username.toLowerCase() === admin;
  };
  return { getSessionUser, isAdminUsername };
});

// Mock next/headers cookies (still imported by some indirect paths)
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
    all: mockAll,
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
  results: {
    id: "id",
    matchId: "match_id",
    winner: "winner",
    createdAt: "created_at",
  },
  users: {
    id: "id",
    username: "username",
    passwordHash: "password_hash",
    sessionVersion: "session_version",
    resetTokenHash: "reset_token_hash",
    resetTokenExpiresAt: "reset_token_expires_at",
  },
  groups: { id: "id", name: "name" },
  groupTeams: { id: "id", groupId: "group_id" },
  picks: { id: "id", userId: "user_id", matchId: "match_id" },
  thirdPlaceAdvancers: { id: "id", groupId: "group_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  asc: vi.fn((col) => ({ type: "asc", col })),
  inArray: vi.fn((col, vals) => ({ type: "inArray", col, vals })),
}));

import {
  setupMatchup,
  setupGroup,
  getMatches,
  deleteMatchup,
  getTournamentConfig,
  toggleLock,
  checkBracketLock,
  initializeBracketStructure,
  enterResult,
  correctResult,
  adminGenerateResetToken,
  autoSeedR32,
} from "./admin";
import { getSessionUser } from "@/lib/session";

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

const getDb = async () => {
  const mod = (await import("@/db")) as unknown as {
    db: {
      delete: MockFn;
      insert: MockFn;
    };
  };
  return mod.db;
};

function mockAdmin() {
  process.env.ADMIN_USERNAME = "admin";
  (getSessionUser as MockFn).mockResolvedValue({ id: 1, username: "admin" });
}

function mockNonAdmin() {
  process.env.ADMIN_USERNAME = "admin";
  (getSessionUser as MockFn).mockResolvedValue({ id: 2, username: "player1" });
}

function mockNoCookie() {
  process.env.ADMIN_USERNAME = "admin";
  (getSessionUser as MockFn).mockResolvedValue(null);
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
  groupStageLocked: false,
  pointsGroupAdvance: 2,
  pointsGroupExact: 1,
  pointsR32: 2,
  pointsR16: 4,
  pointsQf: 8,
  pointsSf: 16,
  pointsFinal: 32,
  pointsGroupPosition: 2,
  pointsGroupPerfect: 5,
  actualTopScorer: null,
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

describe("correctResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin users", async () => {
    mockNonAdmin();
    const result = await correctResult({ matchId: 1, winner: "Brazil" });
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns error when no existing result found", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // no existing result
    const result = await correctResult({ matchId: 1, winner: "Brazil" });
    expect(result).toEqual({
      success: false,
      error: "No existing result to correct. Use enter result instead.",
    });
  });

  it("returns error when match not found", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, matchId: 1, winner: "Brazil" }); // existing result
    mockGet.mockResolvedValueOnce(undefined); // match not found
    const result = await correctResult({ matchId: 1, winner: "Brazil" });
    expect(result).toEqual({ success: false, error: "Match not found" });
  });

  it("returns error when winner is not one of the teams", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, matchId: 1, winner: "Brazil" }); // existing result
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "Brazil", teamB: "Mexico", round: 1, position: 1 }); // match
    const result = await correctResult({ matchId: 1, winner: "Argentina" });
    expect(result).toEqual({ success: false, error: "Winner must be one of the teams" });
  });

  it("successfully corrects result with no downstream warning when next round has no result", async () => {
    mockAdmin();
    const { mockGet, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, matchId: 1, winner: "Brazil" }); // existing result
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "Brazil", teamB: "Mexico", round: 1, position: 1 }); // match
    mockGet.mockResolvedValueOnce({ id: 17, teamA: "", teamB: "", round: 2, position: 1 }); // advanceWinner nextMatch
    mockGet.mockResolvedValueOnce({ id: 17, teamA: "", teamB: "", round: 2, position: 1 }); // downstream nextMatch
    mockGet.mockResolvedValueOnce(undefined); // no downstream result

    const result = await correctResult({ matchId: 1, winner: "Mexico" });
    expect(result).toEqual({ success: true, data: { warning: undefined } });
    expect(mockSet).toHaveBeenCalledWith({ winner: "Mexico" });
  });

  it("returns warning message when downstream round already has a result", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, matchId: 1, winner: "Brazil" }); // existing result
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "Brazil", teamB: "Mexico", round: 1, position: 1 }); // match
    mockGet.mockResolvedValueOnce({ id: 17, teamA: "Brazil", teamB: "France", round: 2, position: 1 }); // advanceWinner nextMatch
    mockGet.mockResolvedValueOnce({ id: 17, teamA: "Brazil", teamB: "France", round: 2, position: 1 }); // downstream nextMatch
    mockGet.mockResolvedValueOnce({ id: 2, matchId: 17, winner: "Brazil" }); // downstream result exists

    const result = await correctResult({ matchId: 1, winner: "Mexico" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.warning).toContain("Round of 16");
    }
  });

  it("skips downstream check when correcting the Final (round 5)", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 5, matchId: 5, winner: "Brazil" }); // existing result
    mockGet.mockResolvedValueOnce({ id: 5, teamA: "Brazil", teamB: "Mexico", round: 5, position: 1 }); // final match

    const result = await correctResult({ matchId: 5, winner: "Mexico" });
    expect(result).toEqual({ success: true, data: { warning: undefined } });
  });

  it("returns error when match teams are not yet determined", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, matchId: 1, winner: "Brazil" }); // existing result
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "", teamB: "", round: 2, position: 1 }); // match with no teams
    const result = await correctResult({ matchId: 1, winner: "Brazil" });
    expect(result).toEqual({ success: false, error: "Match teams are not yet determined" });
  });

  it("succeeds when re-confirming the same winner (no-op correction)", async () => {
    mockAdmin();
    const { mockGet, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, matchId: 1, winner: "Brazil" }); // existing result
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "Brazil", teamB: "Mexico", round: 1, position: 1 }); // match
    mockGet.mockResolvedValueOnce({ id: 17, teamA: "Brazil", teamB: "", round: 2, position: 1 }); // advanceWinner nextMatch
    mockGet.mockResolvedValueOnce({ id: 17, teamA: "Brazil", teamB: "", round: 2, position: 1 }); // downstream nextMatch
    mockGet.mockResolvedValueOnce(undefined); // no downstream result

    const result = await correctResult({ matchId: 1, winner: "Brazil" }); // same winner
    expect(result).toEqual({ success: true, data: { warning: undefined } });
    expect(mockSet).toHaveBeenCalledWith({ winner: "Brazil" }); // still updates (server is source of truth)
  });
});

describe("enterResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin users", async () => {
    mockNonAdmin();
    const result = await enterResult({ matchId: 1, winner: "Brazil" });
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns error when match not found", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // match not found
    const result = await enterResult({ matchId: 99, winner: "Brazil" });
    expect(result).toEqual({ success: false, error: "Match not found" });
  });

  it("returns error when match teams are not yet determined", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "", teamB: "", round: 2, position: 1 }); // placeholder match
    const result = await enterResult({ matchId: 1, winner: "Brazil" });
    expect(result).toEqual({ success: false, error: "Match teams are not yet determined" });
  });

  it("returns error when winner is not one of the teams", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "Brazil", teamB: "Mexico", round: 1, position: 1 });
    const result = await enterResult({ matchId: 1, winner: "Argentina" });
    expect(result).toEqual({ success: false, error: "Winner must be one of the teams in this match" });
  });

  it("inserts new result when no existing result", async () => {
    mockAdmin();
    const { mockGet, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "Brazil", teamB: "Mexico", round: 1, position: 1 }); // match
    mockGet.mockResolvedValueOnce(undefined); // no existing result
    mockGet.mockResolvedValueOnce(null);       // advanceWinner: no next match (round 1, skip)

    const result = await enterResult({ matchId: 1, winner: "Brazil" });
    expect(result).toEqual({ success: true, data: null });
    expect(mockSet).toHaveBeenCalledWith({ winner: "Brazil" }); // matches.winner updated
  });

  it("updates existing result on re-entry (upsert path)", async () => {
    mockAdmin();
    const { mockGet, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "Brazil", teamB: "Mexico", round: 1, position: 1 }); // match
    mockGet.mockResolvedValueOnce({ id: 5, matchId: 1, winner: "Brazil" }); // existing result
    mockGet.mockResolvedValueOnce(null); // advanceWinner: no next match

    const result = await enterResult({ matchId: 1, winner: "Mexico" });
    expect(result).toEqual({ success: true, data: null });
    expect(mockSet).toHaveBeenCalledWith({ winner: "Mexico" });
  });

  it("advances winner to next-round match slot", async () => {
    mockAdmin();
    const { mockGet, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, teamA: "Brazil", teamB: "Mexico", round: 1, position: 1 }); // match
    mockGet.mockResolvedValueOnce(undefined); // no existing result
    mockGet.mockResolvedValueOnce({ id: 17, teamA: "", teamB: "", round: 2, position: 1 }); // next round match

    await enterResult({ matchId: 1, winner: "Brazil" });
    // Position 1 (odd) → teamA slot of next match
    expect(mockSet).toHaveBeenCalledWith({ teamA: "Brazil" });
  });
});

describe("setupGroup (L7 name regex)", () => {
  const validTeams = ["Brazil", "Croatia", "Cameroon", "Serbia"];

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin", async () => {
    mockNonAdmin();
    const r = await setupGroup({ name: "A", teams: validTeams });
    expect(r).toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects empty name before regex check", async () => {
    mockAdmin();
    const r = await setupGroup({ name: "   ", teams: validTeams });
    expect(r).toEqual({ success: false, error: "Group name is required" });
  });

  it.each([
    ["AA"],
    ["a"],
    ["Group A"],
    ["M"],
    ["1"],
  ])("rejects invalid group name %s", async (name) => {
    mockAdmin();
    const r = await setupGroup({ name, teams: validTeams });
    expect(r).toEqual({
      success: false,
      error: "Group name must be a single letter A through L",
    });
  });

  it.each([["A"], ["L"]])("accepts valid group letter %s", async (name) => {
    mockAdmin();
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // no existing group
    mockReturning.mockResolvedValueOnce([{ id: 1, name }]);
    const r = await setupGroup({ name, teams: validTeams });
    expect(r).toEqual({ success: true, data: { groupId: 1 } });
  });
});

describe("autoSeedR32 clearBracketMatchesIfSafe (L8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin", async () => {
    mockNonAdmin();
    const r = await autoSeedR32();
    expect(r).toEqual({ success: false, error: "Unauthorized" });
  });

  it("rejects when bracket is locked (via helper guard)", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    // getTournamentConfig → returns locked config
    mockGet.mockResolvedValueOnce({ ...mockConfigRow, isLocked: true });

    const r = await autoSeedR32();
    expect(r).toEqual({
      success: false,
      error: "Cannot auto-seed while bracket is locked",
    });
  });

  it("rejects when results already exist (via helper guard)", async () => {
    mockAdmin();
    const { mockGet, mockAll } = await getDbMocks();
    mockGet.mockResolvedValueOnce(mockConfigRow); // unlocked config
    mockAll.mockResolvedValueOnce([{ id: 1, matchId: 1, winner: "Brazil" }]); // results exist

    const r = await autoSeedR32();
    expect(r).toEqual({
      success: false,
      error: "Cannot auto-seed after match results have been entered",
    });
  });

  it("clears ALL matches (not just round 1) and all picks, including orphan later-round rows", async () => {
    // This is the core L8 behavior: a stale prior seed may have left orphan
    // round 2-5 placeholders. The helper wipes the whole matches table
    // unconditionally (within the lock + no-results guards) so nothing stale
    // survives into the fresh seed.
    mockAdmin();
    const { mockGet, mockAll } = await getDbMocks();
    const db = await getDb();

    mockGet.mockResolvedValueOnce(mockConfigRow); // unlocked config
    mockAll.mockResolvedValueOnce([]); // no results
    // Matches table has both R32 AND orphan later-round rows
    const priorMatches = [
      { id: 1, round: 1, position: 1 },
      { id: 17, round: 2, position: 1 }, // orphan
      { id: 31, round: 5, position: 1 }, // orphan final placeholder
    ];
    mockAll.mockResolvedValueOnce(priorMatches);
    // After clear, autoSeedR32 fetches groups — we short-circuit with 0 groups
    mockAll.mockResolvedValueOnce([]); // groups query returns empty
    mockAll.mockResolvedValueOnce([]); // groupTeams
    mockAll.mockResolvedValueOnce([]); // thirdPlaceAdvancers

    const r = await autoSeedR32();

    // Short-circuit error from the group count check confirms we got past
    // the cleanup step.
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toMatch(/Need all 12 groups/);
    }

    // Delete was called twice: once for picks, once for the whole matches
    // table (no .where() on matches → deletes orphan later-round rows too).
    expect(db.delete).toHaveBeenCalledTimes(2);
    // One of the calls uses the `matches` schema symbol; one uses `picks`.
    const deleteArgs = db.delete.mock.calls.map((c: unknown[]) => c[0]);
    // matches schema mock → { id: "id", teamA: "team_a", ... }
    // picks schema mock   → { id: "id", userId: "user_id", matchId: "match_id" }
    const hitPicks = deleteArgs.some(
      (a) => (a as { userId?: string }).userId === "user_id"
    );
    const hitMatches = deleteArgs.some(
      (a) => (a as { teamA?: string }).teamA === "team_a"
    );
    expect(hitPicks).toBe(true);
    expect(hitMatches).toBe(true);
  });

  it("skips delete when no prior matches exist", async () => {
    mockAdmin();
    const { mockGet, mockAll } = await getDbMocks();
    const db = await getDb();

    mockGet.mockResolvedValueOnce(mockConfigRow); // unlocked config
    mockAll.mockResolvedValueOnce([]); // no results
    mockAll.mockResolvedValueOnce([]); // no existing matches
    mockAll.mockResolvedValueOnce([]); // groups (trigger the 12-group error)
    mockAll.mockResolvedValueOnce([]);
    mockAll.mockResolvedValueOnce([]);

    await autoSeedR32();

    expect(db.delete).not.toHaveBeenCalled();
  });
});

describe("adminGenerateResetToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("rejects non-admin users", async () => {
    mockNonAdmin();
    const result = await adminGenerateResetToken(1);
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns error when user does not exist", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);
    const result = await adminGenerateResetToken(999);
    expect(result).toEqual({ success: false, error: "User not found" });
  });

  it("generates a token, hashes it, and stores hash + expiry", async () => {
    mockAdmin();
    const { mockGet, mockSet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 7, username: "bob" });

    const result = await adminGenerateResetToken(7);
    expect(result.success).toBe(true);
    if (result.success) {
      // base64url of 32 bytes → 43 chars (no padding)
      expect(result.data.token.length).toBeGreaterThanOrEqual(42);
      expect(result.data.token).toMatch(/^[A-Za-z0-9_-]+$/);

      const expiresMs = Date.parse(result.data.expiresAt);
      const nowMs = Date.now();
      expect(expiresMs - nowMs).toBeGreaterThan(59 * 60 * 1000); // ~1 hour
      expect(expiresMs - nowMs).toBeLessThan(61 * 60 * 1000);
    }

    // Set was called with a 64-char hex sha256 hash — never the plaintext.
    const args = mockSet.mock.calls[0]?.[0] as {
      resetTokenHash?: string;
      resetTokenExpiresAt?: string;
    };
    expect(args?.resetTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(args?.resetTokenExpiresAt).toMatch(/^\d{4}-/);
    // Plaintext token should NOT appear in the update payload.
    if (result.success) {
      expect(args?.resetTokenHash).not.toBe(result.data.token);
    }
  });

  it("generates a fresh token every call", async () => {
    mockAdmin();
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 7, username: "bob" });
    const a = await adminGenerateResetToken(7);
    mockGet.mockResolvedValueOnce({ id: 7, username: "bob" });
    const b = await adminGenerateResetToken(7);
    if (a.success && b.success) {
      expect(a.data.token).not.toBe(b.data.token);
    }
  });
});
