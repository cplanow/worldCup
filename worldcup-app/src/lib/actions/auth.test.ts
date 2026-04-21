import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers cookies
vi.mock("next/headers", () => {
  const mockSet = vi.fn();
  const mockDelete = vi.fn();
  return {
    cookies: vi.fn().mockResolvedValue({
      set: mockSet,
      delete: mockDelete,
    }),
    __cookieMocks: { mockSet, mockDelete },
  };
});

// Mock database
vi.mock("@/db", () => {
  const mockGet = vi.fn();
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockWhere = vi.fn(() => ({ get: mockGet }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, get: mockGet }));
  const mockSet = vi.fn(() => ({ where: mockWhere }));

  return {
    db: {
      select: vi.fn(() => ({ from: mockFrom })),
      insert: vi.fn(() => ({ values: mockValues })),
      update: vi.fn(() => ({ set: mockSet })),
    },
    __mocks: {
      mockGet,
      mockReturning,
      mockValues,
      mockWhere,
      mockFrom,
      mockSet,
    },
  };
});

vi.mock("@/db/schema", () => ({
  users: { username: "username", id: "id" },
  tournamentConfig: { isLocked: "is_locked" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

vi.mock("@/lib/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("salt:hash"),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

import {
  registerUser,
  loginUser,
  setPassword,
  logoutUser,
} from "@/lib/actions/auth";
import { verifyPassword } from "@/lib/password";

// Access the mock internals
const getDbMocks = async () => {
  const mod = (await import("@/db")) as {
    __mocks: {
      mockGet: ReturnType<typeof vi.fn>;
      mockReturning: ReturnType<typeof vi.fn>;
      mockValues: ReturnType<typeof vi.fn>;
      mockWhere: ReturnType<typeof vi.fn>;
      mockFrom: ReturnType<typeof vi.fn>;
      mockSet: ReturnType<typeof vi.fn>;
    };
  };
  return mod.__mocks;
};

const getCookieMocks = async () => {
  const mod = (await import("next/headers")) as {
    __cookieMocks: {
      mockSet: ReturnType<typeof vi.fn>;
      mockDelete: ReturnType<typeof vi.fn>;
    };
  };
  return mod.__cookieMocks;
};

describe("registerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("returns error for empty username", async () => {
    const result = await registerUser("", "password");
    expect(result).toEqual({
      success: false,
      error: "Username is required",
    });
  });

  it("returns error for whitespace-only username", async () => {
    const result = await registerUser("   ", "password");
    expect(result).toEqual({
      success: false,
      error: "Username is required",
    });
  });

  it("returns error for username exceeding max length", async () => {
    const longName = "a".repeat(31);
    const result = await registerUser(longName, "password");
    expect(result).toEqual({
      success: false,
      error: "Username must be 30 characters or less",
    });
  });

  it("returns error for short password", async () => {
    const result = await registerUser("testuser", "abc");
    expect(result).toEqual({
      success: false,
      error: "Password must be at least 4 characters",
    });
  });

  it("returns error when username already exists", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({
      id: 1,
      username: "taken",
      passwordHash: "salt:hash",
      bracketSubmitted: false,
    });

    const result = await registerUser("taken", "password");
    expect(result).toEqual({
      success: false,
      error: "Username already taken",
    });
  });

  it("creates user and sets cookie on success", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    const { mockSet: cookieSet } = await getCookieMocks();
    // users lookup: not found
    mockGet.mockResolvedValueOnce(undefined);
    // insert returning
    mockReturning.mockResolvedValueOnce([{ id: 42 }]);
    // tournament config lookup
    mockGet.mockResolvedValueOnce(undefined);

    const result = await registerUser("NewUser", "password123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(42);
      expect(result.data.username).toBe("newuser");
      expect(result.data.bracketSubmitted).toBe(false);
      expect(result.data.needsPassword).toBe(false);
      expect(result.data.isLocked).toBe(false);
    }

    expect(cookieSet).toHaveBeenCalledWith("username", "newuser", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  });

  it("trims and lowercases username", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // users lookup
    mockReturning.mockResolvedValueOnce([{ id: 3 }]);
    mockGet.mockResolvedValueOnce(undefined); // tournament config

    const result = await registerUser("  TestUser  ", "password123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("testuser");
    }
  });

  it("identifies admin user correctly", async () => {
    process.env.ADMIN_USERNAME = "Admin";
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // users lookup
    mockReturning.mockResolvedValueOnce([{ id: 1 }]);
    mockGet.mockResolvedValueOnce(undefined); // tournament config

    const result = await registerUser("admin", "password123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAdmin).toBe(true);
    }
  });

  it("returns generic error on database failure", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockRejectedValueOnce(new Error("Connection refused"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await registerUser("user1", "password123");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("loginUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("returns error for empty username", async () => {
    const result = await loginUser("", "password");
    expect(result).toEqual({
      success: false,
      error: "Username is required",
    });
  });

  it("returns error when user not found", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);

    const result = await loginUser("nonexistent", "password");
    expect(result).toEqual({
      success: false,
      error: "Invalid username or password",
    });
  });

  it("returns error for wrong password", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({
      id: 1,
      username: "user1",
      passwordHash: "salt:hash",
      bracketSubmitted: false,
    });

    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    const result = await loginUser("user1", "wrongpassword");
    expect(result).toEqual({
      success: false,
      error: "Invalid username or password",
    });
  });

  it("returns needsPassword true when passwordHash is null", async () => {
    const { mockGet } = await getDbMocks();
    const { mockSet: cookieSet } = await getCookieMocks();
    // users lookup: found with null password
    mockGet.mockResolvedValueOnce({
      id: 5,
      username: "olduser",
      passwordHash: null,
      bracketSubmitted: true,
    });
    // tournament config
    mockGet.mockResolvedValueOnce({ isLocked: false });

    const result = await loginUser("olduser", "anything");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.needsPassword).toBe(true);
      expect(result.data.userId).toBe(5);
      expect(result.data.username).toBe("olduser");
      expect(result.data.bracketSubmitted).toBe(true);
    }

    // Should NOT set cookie when needsPassword is true
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("logs in successfully with correct password", async () => {
    const { mockGet } = await getDbMocks();
    // users lookup
    mockGet.mockResolvedValueOnce({
      id: 7,
      username: "player1",
      passwordHash: "salt:realhash",
      bracketSubmitted: false,
    });
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    // tournament config
    mockGet.mockResolvedValueOnce({ isLocked: true });

    const result = await loginUser("Player1", "correctpass");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(7);
      expect(result.data.username).toBe("player1");
      expect(result.data.bracketSubmitted).toBe(false);
      expect(result.data.needsPassword).toBe(false);
      expect(result.data.isLocked).toBe(true);
    }
  });

  it("sets session cookie on success", async () => {
    const { mockGet } = await getDbMocks();
    const { mockSet: cookieSet } = await getCookieMocks();
    mockGet.mockResolvedValueOnce({
      id: 1,
      username: "user1",
      passwordHash: "salt:hash",
      bracketSubmitted: false,
    });
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    mockGet.mockResolvedValueOnce(undefined); // tournament config

    await loginUser("user1", "password123");

    expect(cookieSet).toHaveBeenCalledWith("username", "user1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  });

  it("identifies admin user correctly", async () => {
    process.env.ADMIN_USERNAME = "admin";
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({
      id: 1,
      username: "admin",
      passwordHash: "salt:hash",
      bracketSubmitted: false,
    });
    (verifyPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    mockGet.mockResolvedValueOnce(undefined); // tournament config

    const result = await loginUser("admin", "password123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAdmin).toBe(true);
    }
  });

  it("returns generic error on database failure", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockRejectedValueOnce(new Error("DB error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await loginUser("user1", "password");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    consoleSpy.mockRestore();
  });
});

describe("setPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
  });

  it("returns error for short password", async () => {
    const result = await setPassword("user1", "abc");
    expect(result).toEqual({
      success: false,
      error: "Password must be at least 4 characters",
    });
  });

  it("returns error if user not found", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);

    const result = await setPassword("nonexistent", "password123");
    expect(result).toEqual({
      success: false,
      error: "Unable to set password",
    });
  });

  it("returns error if user already has password", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({
      id: 1,
      username: "user1",
      passwordHash: "existing:hash",
      bracketSubmitted: false,
    });

    const result = await setPassword("user1", "password123");
    expect(result).toEqual({
      success: false,
      error: "Unable to set password",
    });
  });

  it("sets password hash successfully", async () => {
    const { mockGet } = await getDbMocks();
    const { mockSet: cookieSet } = await getCookieMocks();
    // users lookup: found with null password
    mockGet.mockResolvedValueOnce({
      id: 10,
      username: "migrateduser",
      passwordHash: null,
      bracketSubmitted: true,
    });
    // update().set().where() — default mockWhere returns { get: mockGet }, which is fine to await

    const result = await setPassword("MigratedUser", "newpass123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ success: true });
    }

    // Should set session cookie
    expect(cookieSet).toHaveBeenCalledWith(
      "username",
      "migrateduser",
      expect.objectContaining({ httpOnly: true })
    );
  });

  it("returns generic error on database failure", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockRejectedValueOnce(new Error("DB error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await setPassword("user1", "password123");

    expect(result).toEqual({
      success: false,
      error: "Something went wrong. Please try again.",
    });
    consoleSpy.mockRestore();
  });
});

describe("logoutUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes cookie and returns success", async () => {
    const { mockDelete: cookieDelete } = await getCookieMocks();

    const result = await logoutUser();

    expect(result).toEqual({
      success: true,
      data: null,
    });
    expect(cookieDelete).toHaveBeenCalledWith("username");
  });
});
