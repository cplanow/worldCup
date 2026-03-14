import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashPassword returns a string with salt:hash format", async () => {
    const result = await hashPassword("mypassword");

    expect(result).toContain(":");
    const [salt, hash] = result.split(":");
    expect(salt).toMatch(/^[0-9a-f]{32}$/); // 16 bytes = 32 hex chars
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // 256 bits = 64 hex chars
  });

  it("verifyPassword returns true for correct password", async () => {
    const hashed = await hashPassword("correctpassword");
    const result = await verifyPassword("correctpassword", hashed);

    expect(result).toBe(true);
  });

  it("verifyPassword returns false for wrong password", async () => {
    const hashed = await hashPassword("correctpassword");
    const result = await verifyPassword("wrongpassword", hashed);

    expect(result).toBe(false);
  });

  it("two hashes of the same password produce different salts", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");

    const salt1 = hash1.split(":")[0];
    const salt2 = hash2.split(":")[0];

    expect(salt1).not.toBe(salt2);
  });

  it("empty password still works without crashing", async () => {
    const hashed = await hashPassword("");
    expect(hashed).toContain(":");

    const result = await verifyPassword("", hashed);
    expect(result).toBe(true);

    const wrongResult = await verifyPassword("notempty", hashed);
    expect(wrongResult).toBe(false);
  });
});
