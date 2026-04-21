import { describe, it, expect, vi, beforeEach } from "vitest";

// Session mock — tracks save() / destroy() calls and the mutable session state.
vi.mock("@/lib/session", () => {
  const sessionState: { userId?: number; username?: string } = {};
  const save = vi.fn(async () => {});
  const destroy = vi.fn(() => {
    delete sessionState.userId;
    delete sessionState.username;
  });
  const getSession = vi.fn(async () => ({
    get userId() { return sessionState.userId; },
    set userId(v: number | undefined) { sessionState.userId = v; },
    get username() { return sessionState.username; },
    set username(v: string | undefined) { sessionState.username = v; },
    save,
    destroy,
  }));
  const isAdminUsername = (name: string | null | undefined) => {
    const admin = process.env.ADMIN_USERNAME?.toLowerCase();
    return !!admin && !!name && name.toLowerCase() === admin;
  };
  const requireUser = vi.fn();
  const getSessionUser = vi.fn();
  return {
    getSession,
    getSessionUser,
    isAdminUsername,
    requireUser,
    __sessionMocks: { save, destroy, sessionState, requireUser, getSessionUser },
  };
});

// Mock next/headers — the rate-limit helper reads it to fingerprint the caller.
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (_name: string) => null,
  })),
}));

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
    __mocks: { mockGet, mockReturning, mockValues, mockWhere, mockFrom, mockSet },
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
  validatePasswordStrength: vi.fn((password: string) => {
    if (password.length < 10) {
      return { valid: false, reason: "Password must be at least 10 characters" };
    }
    return { valid: true };
  }),
  MIN_PASSWORD_LENGTH: 10,
}));

import { registerUser, loginUser, logoutUser, changePassword } from "@/lib/actions/auth";
import { verifyPassword } from "@/lib/password";
import { __resetRateLimitForTests } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/session";

type MockFn = ReturnType<typeof vi.fn>;

const getDbMocks = async () => {
  const mod = (await import("@/db")) as {
    __mocks: {
      mockGet: MockFn; mockReturning: MockFn; mockValues: MockFn;
      mockWhere: MockFn; mockFrom: MockFn; mockSet: MockFn;
    };
  };
  return mod.__mocks;
};

const getSessionMocks = async () => {
  const mod = (await import("@/lib/session")) as unknown as {
    __sessionMocks: {
      save: MockFn;
      destroy: MockFn;
      sessionState: { userId?: number; username?: string };
    };
  };
  return mod.__sessionMocks;
};

describe("registerUser", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
    __resetRateLimitForTests();
    const s = await getSessionMocks();
    delete s.sessionState.userId;
    delete s.sessionState.username;
  });

  it("rejects empty username", async () => {
    const result = await registerUser("   ", "password12");
    expect(result).toEqual({ success: false, error: "Username is required" });
  });

  it("rejects username over 30 characters", async () => {
    const result = await registerUser("x".repeat(31), "password12");
    expect(result).toEqual({ success: false, error: "Username must be 30 characters or less" });
  });

  it("rejects password shorter than 10 characters", async () => {
    const result = await registerUser("newuser", "short");
    expect(result).toEqual({ success: false, error: "Password must be at least 10 characters" });
  });

  it("rejects registration with the reserved admin username", async () => {
    process.env.ADMIN_USERNAME = "admin";
    const result = await registerUser("admin", "password12");
    expect(result).toEqual({ success: false, error: "That username is reserved. Choose another." });
  });

  it("rejects duplicate username", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, username: "existing" });
    const result = await registerUser("existing", "password12");
    expect(result).toEqual({ success: false, error: "Username already taken" });
  });

  it("creates user and saves session on success", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined); // no existing user
    mockReturning.mockResolvedValueOnce([{ id: 42, username: "newuser" }]);
    mockGet.mockResolvedValueOnce({ isLocked: false }); // config

    const result = await registerUser("newuser", "password12");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe(42);
      expect(result.data.username).toBe("newuser");
      expect(result.data.isAdmin).toBe(false);
    }

    const s = await getSessionMocks();
    expect(s.save).toHaveBeenCalled();
    expect(s.sessionState.userId).toBe(42);
    expect(s.sessionState.username).toBe("newuser");
  });

  it("trims and lowercases username", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);
    mockReturning.mockResolvedValueOnce([{ id: 10, username: "mixedcase" }]);
    mockGet.mockResolvedValueOnce({ isLocked: false });

    const result = await registerUser("  MixedCase  ", "password12");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.username).toBe("mixedcase");
  });
});

describe("loginUser", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.ADMIN_USERNAME;
    __resetRateLimitForTests();
    const s = await getSessionMocks();
    delete s.sessionState.userId;
    delete s.sessionState.username;
    (verifyPassword as MockFn).mockResolvedValue(true);
  });

  it("rejects empty username with generic error", async () => {
    const result = await loginUser("   ", "password");
    expect(result).toEqual({ success: false, error: "Invalid username or password" });
  });

  it("rejects when user does not exist with generic error", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);
    const result = await loginUser("ghost", "password");
    expect(result).toEqual({ success: false, error: "Invalid username or password" });
  });

  it("rejects when user has null passwordHash with generic error", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, username: "nouser", passwordHash: null });
    const result = await loginUser("nouser", "password");
    expect(result).toEqual({ success: false, error: "Invalid username or password" });
  });

  it("rejects on wrong password", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, username: "user1", passwordHash: "s:h" });
    (verifyPassword as MockFn).mockResolvedValueOnce(false);
    const result = await loginUser("user1", "wrong");
    expect(result).toEqual({ success: false, error: "Invalid username or password" });
  });

  it("saves session on success", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({
      id: 7, username: "user1", passwordHash: "s:h", bracketSubmitted: false,
    });
    mockGet.mockResolvedValueOnce({ isLocked: false });

    const result = await loginUser("user1", "password");
    expect(result.success).toBe(true);

    const s = await getSessionMocks();
    expect(s.save).toHaveBeenCalled();
    expect(s.sessionState.userId).toBe(7);
    expect(s.sessionState.username).toBe("user1");
  });

  it("marks admin when username matches ADMIN_USERNAME", async () => {
    process.env.ADMIN_USERNAME = "chris";
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({
      id: 1, username: "chris", passwordHash: "s:h", bracketSubmitted: false,
    });
    mockGet.mockResolvedValueOnce({ isLocked: false });

    const result = await loginUser("chris", "password");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isAdmin).toBe(true);
  });
});

describe("logoutUser", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const s = await getSessionMocks();
    s.sessionState.userId = 1;
    s.sessionState.username = "user1";
  });

  it("destroys the session", async () => {
    const result = await logoutUser();
    expect(result).toEqual({ success: true, data: null });
    const s = await getSessionMocks();
    expect(s.destroy).toHaveBeenCalled();
    expect(s.sessionState.userId).toBeUndefined();
  });
});

describe("auth rate limiting", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    __resetRateLimitForTests();
    delete process.env.ADMIN_USERNAME;
    const s = await getSessionMocks();
    delete s.sessionState.userId;
    delete s.sessionState.username;
  });

  it("rate-limits registerUser after 5 attempts per IP", async () => {
    const { mockGet, mockReturning } = await getDbMocks();

    // Let the first 5 succeed. Each consumes a "username taken" path to avoid
    // persisting any real session state.
    for (let i = 0; i < 5; i++) {
      mockGet.mockResolvedValueOnce(undefined);
      mockReturning.mockResolvedValueOnce([{ id: i, username: `user${i}` }]);
      mockGet.mockResolvedValueOnce({ isLocked: false });
      const r = await registerUser(`user${i}`, "password12");
      expect(r.success).toBe(true);
    }

    const blocked = await registerUser("user6", "password12");
    expect(blocked.success).toBe(false);
    if (!blocked.success) expect(blocked.error).toMatch(/too many/i);
  });

  it("rate-limits loginUser by username", async () => {
    const { mockGet } = await getDbMocks();
    (verifyPassword as MockFn).mockResolvedValue(false);

    for (let i = 0; i < 5; i++) {
      mockGet.mockResolvedValueOnce({
        id: 1, username: "victim", passwordHash: "s:h", bracketSubmitted: false,
      });
      const r = await loginUser("victim", "wrong");
      expect(r.success).toBe(false);
    }

    const blocked = await loginUser("victim", "wrong");
    expect(blocked.success).toBe(false);
    if (!blocked.success) expect(blocked.error).toMatch(/too many/i);
  });
});

describe("changePassword", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    __resetRateLimitForTests();
    const s = await getSessionMocks();
    delete s.sessionState.userId;
    delete s.sessionState.username;
    (verifyPassword as MockFn).mockResolvedValue(true);
  });

  it("rejects when user is not signed in", async () => {
    (getSessionUser as MockFn).mockResolvedValueOnce(null);
    const r = await changePassword({
      currentPassword: "old-passwd-1",
      newPassword: "NewPass-1234",
    });
    expect(r).toEqual({ success: false, error: "Not signed in" });
  });

  it("rejects when current password is wrong", async () => {
    (getSessionUser as MockFn).mockResolvedValueOnce({
      id: 1, username: "u", passwordHash: "s:h", sessionVersion: 1,
    });
    (verifyPassword as MockFn).mockResolvedValueOnce(false);
    const r = await changePassword({
      currentPassword: "wrong-pass1",
      newPassword: "NewPass-1234",
    });
    expect(r).toEqual({ success: false, error: "Current password is incorrect" });
  });

  it("rejects when new password is weak", async () => {
    (getSessionUser as MockFn).mockResolvedValueOnce({
      id: 1, username: "u", passwordHash: "s:h", sessionVersion: 1,
    });
    const r = await changePassword({
      currentPassword: "old-passwd-1",
      newPassword: "short",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/at least 10/);
  });

  it("rejects when new password equals current", async () => {
    (getSessionUser as MockFn).mockResolvedValueOnce({
      id: 1, username: "u", passwordHash: "s:h", sessionVersion: 1,
    });
    const r = await changePassword({
      currentPassword: "SamePass-12",
      newPassword: "SamePass-12",
    });
    expect(r).toEqual({
      success: false,
      error: "New password must be different",
    });
  });

  it("updates password, bumps sessionVersion, preserves current session", async () => {
    (getSessionUser as MockFn).mockResolvedValueOnce({
      id: 42, username: "alice", passwordHash: "s:h", sessionVersion: 3,
    });
    const { mockSet } = await getDbMocks();

    const r = await changePassword({
      currentPassword: "old-passwd-1",
      newPassword: "NewPass-1234",
    });

    expect(r).toEqual({ success: true, data: null });
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordHash: "salt:hash",
        sessionVersion: 4,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      })
    );

    const s = await getSessionMocks();
    expect(s.save).toHaveBeenCalled();
    expect(s.sessionState.userId).toBe(42);
    expect(s.sessionState.username).toBe("alice");
  });

  it("rate-limits per user after 5 attempts", async () => {
    for (let i = 0; i < 5; i++) {
      (getSessionUser as MockFn).mockResolvedValueOnce({
        id: 99, username: "z", passwordHash: "s:h", sessionVersion: 1,
      });
      (verifyPassword as MockFn).mockResolvedValueOnce(false);
      await changePassword({
        currentPassword: "wrong-pass1",
        newPassword: "NewPass-1234",
      });
    }

    (getSessionUser as MockFn).mockResolvedValueOnce({
      id: 99, username: "z", passwordHash: "s:h", sessionVersion: 1,
    });
    const r = await changePassword({
      currentPassword: "wrong-pass1",
      newPassword: "NewPass-1234",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/too many/i);
  });
});
