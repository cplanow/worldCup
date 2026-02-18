import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Mock database
vi.mock("@/db", () => {
  const mockGet = vi.fn();
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockWhere = vi.fn(() => ({ get: mockGet }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, get: mockGet }));

  return {
    db: {
      select: vi.fn(() => ({ from: mockFrom })),
      insert: vi.fn(() => ({ values: mockValues })),
    },
    __mocks: { mockGet, mockReturning, mockValues, mockWhere, mockFrom },
  };
});

vi.mock("@/db/schema", () => ({
  users: { username: "username" },
  tournamentConfig: { isLocked: "is_locked" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { enterApp } from "@/lib/actions/auth";
import { cookies } from "next/headers";

// Access the mock internals
const getDbMocks = async () => {
  const mod = (await import("@/db")) as {
    __mocks: {
      mockGet: ReturnType<typeof vi.fn>;
      mockReturning: ReturnType<typeof vi.fn>;
      mockValues: ReturnType<typeof vi.fn>;
    };
  };
  return mod.__mocks;
};

describe("enterApp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("returns error for empty username", async () => {
    const result = await enterApp("");
    expect(result).toEqual({
      success: false,
      error: "Username is required",
    });
  });

  it("returns error for whitespace-only username", async () => {
    const result = await enterApp("   ");
    expect(result).toEqual({
      success: false,
      error: "Username is required",
    });
  });

  it("returns error when username exceeds max length", async () => {
    const longName = "a".repeat(31);
    const result = await enterApp(longName);
    expect(result).toEqual({
      success: false,
      error: "Username must be 30 characters or less",
    });
  });

  it("creates new user when username not found", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config: no row → defaults unlocked
    mockGet.mockResolvedValueOnce(undefined); // users: not found
    mockReturning.mockResolvedValueOnce([{ id: 42 }]);

    const result = await enterApp("NewUser");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNewUser).toBe(true);
      expect(result.data.username).toBe("newuser");
      expect(result.data.userId).toBe(42);
      expect(result.data.bracketSubmitted).toBe(false);
      expect(result.data.isLocked).toBe(false);
    }
  });

  it("returns existing user when username found", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config
    mockGet.mockResolvedValueOnce({
      id: 5,
      username: "chris",
      bracketSubmitted: true,
      createdAt: "2026-01-01",
    });

    const result = await enterApp("Chris");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNewUser).toBe(false);
      expect(result.data.userId).toBe(5);
      expect(result.data.bracketSubmitted).toBe(true);
      expect(result.data.username).toBe("chris");
    }
  });

  it("sets session cookie on successful login", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config
    mockGet.mockResolvedValueOnce({
      id: 1,
      username: "user1",
      bracketSubmitted: false,
      createdAt: "2026-01-01",
    });

    await enterApp("user1");

    const cookieStore = await (cookies as ReturnType<typeof vi.fn>)();
    expect(cookieStore.set).toHaveBeenCalledWith("username", "user1", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  });

  it("sets session cookie on new user creation", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config
    mockGet.mockResolvedValueOnce(undefined); // users: not found
    mockReturning.mockResolvedValueOnce([{ id: 1 }]);

    await enterApp("brand_new");

    const cookieStore = await (cookies as ReturnType<typeof vi.fn>)();
    expect(cookieStore.set).toHaveBeenCalledWith(
      "username",
      "brand_new",
      expect.objectContaining({ httpOnly: true })
    );
  });

  it("trims and lowercases username", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config
    mockGet.mockResolvedValueOnce(undefined); // users: not found
    mockReturning.mockResolvedValueOnce([{ id: 3 }]);

    const result = await enterApp("  TestUser  ");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("testuser");
    }
  });

  it("identifies admin user correctly (case-insensitive)", async () => {
    process.env.ADMIN_USERNAME = "Admin";
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config
    mockGet.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      bracketSubmitted: false,
      createdAt: "2026-01-01",
    });

    const result = await enterApp("Admin");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAdmin).toBe(true);
    }
  });

  it("non-admin user is not flagged as admin", async () => {
    process.env.ADMIN_USERNAME = "admin";
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config
    mockGet.mockResolvedValueOnce({
      id: 2,
      username: "player1",
      bracketSubmitted: false,
      createdAt: "2026-01-01",
    });

    const result = await enterApp("player1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAdmin).toBe(false);
    }
  });

  it("defaults isLocked to false when no tournament config exists", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config: no row
    mockGet.mockResolvedValueOnce({
      id: 1,
      username: "user1",
      bracketSubmitted: false,
      createdAt: "2026-01-01",
    });

    const result = await enterApp("user1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isLocked).toBe(false);
    }
  });

  it("returns isLocked true when tournament config is locked", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ isLocked: true }); // tournament_config: locked
    mockGet.mockResolvedValueOnce({
      id: 1,
      username: "user1",
      bracketSubmitted: false,
      createdAt: "2026-01-01",
    });

    const result = await enterApp("user1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isLocked).toBe(true);
    }
  });

  it("handles unique constraint race condition gracefully", async () => {
    const { mockGet, mockValues } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config
    // First call: user not found
    mockGet.mockResolvedValueOnce(undefined);
    // Insert fails with UNIQUE constraint
    mockValues.mockImplementationOnce(() => ({
      returning: vi
        .fn()
        .mockRejectedValueOnce(
          new Error("UNIQUE constraint failed: users.username")
        ),
    }));
    // Retry lookup finds the user
    mockGet.mockResolvedValueOnce({
      id: 10,
      username: "raceuser",
      bracketSubmitted: false,
      createdAt: "2026-01-01",
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await enterApp("RaceUser");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(10);
      expect(result.data.isNewUser).toBe(false);
    }
  });

  it("returns generic error for unexpected database failures", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // tournament_config
    mockGet.mockRejectedValueOnce(new Error("Connection refused"));

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const result = await enterApp("FailUser");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
