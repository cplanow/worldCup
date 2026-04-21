import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from "@/lib/password";

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

describe("validatePasswordStrength", () => {
  it("accepts a strong, mixed password", () => {
    expect(validatePasswordStrength("Tr0ubador#Ayer")).toEqual({ valid: true });
  });

  it("rejects passwords under 10 characters", () => {
    const r = validatePasswordStrength("Short1!");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/at least 10/);
  });

  it("rejects all-lowercase passwords", () => {
    const r = validatePasswordStrength("abcdefghijkl");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/lowercase/);
  });

  it("rejects all-uppercase passwords", () => {
    const r = validatePasswordStrength("ABCDEFGHIJKL");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/uppercase/);
  });

  it("rejects all-digit passwords", () => {
    const r = validatePasswordStrength("1234567890");
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/digits/);
  });

  it.each([
    "Mypassword1",
    "Passwd1234!",
    "123456Abcdef",
    "Qwerty12345",
    "Letmein9999",
    "Welcome2026",
    "Admin12345!",
    "Worldcup26",
    "Football99X",
    "Soccer2026!",
  ])("rejects blocklisted pattern: %s", (pw) => {
    const r = validatePasswordStrength(pw);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/common/i);
  });

  it("blocklist match is case-insensitive", () => {
    const r = validatePasswordStrength("XxPASSWORDxx1");
    expect(r.valid).toBe(false);
  });

  it("accepts exactly 10 characters when mixed", () => {
    const r = validatePasswordStrength("Abcd-1234!");
    expect(r.valid).toBe(true);
  });
});
