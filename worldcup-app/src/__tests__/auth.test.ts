import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
  }),
}));

// Mock database
vi.mock("@/db", () => {
  const mockGet = vi.fn();
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockWhere = vi.fn(() => ({ get: mockGet }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));

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
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { createUser } from "@/lib/actions/auth";
import { cookies } from "next/headers";

// Access the mock internals
const getDbMocks = async () => {
  const mod = await import("@/db") as { __mocks: { mockGet: ReturnType<typeof vi.fn>; mockReturning: ReturnType<typeof vi.fn> } };
  return mod.__mocks;
};

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for empty username", async () => {
    const result = await createUser("");
    expect(result).toEqual({
      success: false,
      error: "Username is required",
    });
  });

  it("returns error for whitespace-only username", async () => {
    const result = await createUser("   ");
    expect(result).toEqual({
      success: false,
      error: "Username is required",
    });
  });

  it("returns error when username already exists", async () => {
    const { mockGet } = await getDbMocks();
    mockGet.mockResolvedValueOnce({ id: 1, username: "Chris" });

    const result = await createUser("Chris");
    expect(result).toEqual({
      success: false,
      error: "That name is already taken",
    });
  });

  it("creates user and sets cookie when username is available", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);
    mockReturning.mockResolvedValueOnce([{ id: 42 }]);

    const result = await createUser("NewUser");

    expect(result).toEqual({
      success: true,
      data: { userId: 42 },
    });

    const cookieStore = await (cookies as ReturnType<typeof vi.fn>)();
    expect(cookieStore.set).toHaveBeenCalledWith("username", "NewUser", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  });

  it("trims whitespace from username before processing", async () => {
    const { mockGet, mockReturning } = await getDbMocks();
    mockGet.mockResolvedValueOnce(undefined);
    mockReturning.mockResolvedValueOnce([{ id: 5 }]);

    const result = await createUser("  trimmed  ");

    expect(result).toEqual({
      success: true,
      data: { userId: 5 },
    });

    const cookieStore = await (cookies as ReturnType<typeof vi.fn>)();
    expect(cookieStore.set).toHaveBeenCalledWith(
      "username",
      "trimmed",
      expect.any(Object)
    );
  });
});
