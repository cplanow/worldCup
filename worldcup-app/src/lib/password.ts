/**
 * Password hashing utilities using Web Crypto API (PBKDF2-SHA256).
 *
 * Passwords are stored as "salt:hash" where both parts are hex-encoded.
 */

import { timingSafeEqual } from "node:crypto";

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export const MIN_PASSWORD_LENGTH = 10;

// Common-pattern blocklist — kept short and static. This is NOT a full
// breach-corpus check (that would mean zxcvbn or a download of HIBP); the
// goal is just to reject the most obvious bad choices. Matched as a
// case-insensitive substring.
const PASSWORD_BLOCKLIST = [
  "password",
  "passwd",
  "12345",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "worldcup",
  "football",
  "soccer",
];

export interface PasswordStrengthResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate password strength. Rejects obvious weak patterns without pulling
 * in a heavyweight library — this is a family pool, not a bank.
 *
 * Rules:
 *  - At least MIN_PASSWORD_LENGTH characters
 *  - Not all one character class (all lowercase, all uppercase, all digits)
 *  - Does not contain a common-pattern substring from PASSWORD_BLOCKLIST
 */
export function validatePasswordStrength(
  password: string
): PasswordStrengthResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      reason: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  if (/^[a-z]+$/.test(password)) {
    return {
      valid: false,
      reason: "Password must include more than just lowercase letters",
    };
  }
  if (/^[A-Z]+$/.test(password)) {
    return {
      valid: false,
      reason: "Password must include more than just uppercase letters",
    };
  }
  if (/^[0-9]+$/.test(password)) {
    return {
      valid: false,
      reason: "Password must include more than just digits",
    };
  }

  const lower = password.toLowerCase();
  for (const term of PASSWORD_BLOCKLIST) {
    if (lower.includes(term)) {
      return {
        valid: false,
        reason: "Password is too common — pick something less predictable",
      };
    }
  }

  return { valid: true };
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    HASH_BITS
  );
}

/**
 * Hash a password using PBKDF2-SHA256 with a random 16-byte salt.
 * Returns a string in "salt:hash" format (both hex-encoded).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);

  const hashBuffer = await deriveKey(password, salt);

  return `${toHex(salt.buffer)}:${toHex(hashBuffer)}`;
}

/**
 * Verify a password against a stored "salt:hash" string.
 * Returns true if the password matches, false otherwise.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = fromHex(saltHex);
  const hashBuffer = await deriveKey(password, salt);
  const derivedBytes = new Uint8Array(hashBuffer);
  const storedBytes = fromHex(hashHex);

  if (derivedBytes.length !== storedBytes.length) return false;
  return timingSafeEqual(derivedBytes, storedBytes);
}
