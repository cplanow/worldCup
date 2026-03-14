/**
 * Password hashing utilities using Web Crypto API (PBKDF2-SHA256).
 *
 * Passwords are stored as "salt:hash" where both parts are hex-encoded.
 */

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

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
  const salt = fromHex(saltHex);

  const hashBuffer = await deriveKey(password, salt);
  const derivedHex = toHex(hashBuffer);

  return derivedHex === hashHex;
}
