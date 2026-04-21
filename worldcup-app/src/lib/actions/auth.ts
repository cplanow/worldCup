"use server";

import { db } from "@/db";
import { users, tournamentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/password";
import { getSession, getSessionUser, isAdminUsername } from "@/lib/session";
import { checkRateLimit, getClientIp, AUTH_LIMITS } from "@/lib/rate-limit";
import { createHash, timingSafeEqual } from "node:crypto";
import { logAudit } from "@/lib/audit-log";

const MAX_USERNAME_LENGTH = 30;

function rateLimitMessage(retryAfterMs: number): string {
  const seconds = Math.ceil(retryAfterMs / 1000);
  if (seconds < 60) return `Too many attempts. Try again in ${seconds}s.`;
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

async function createSession(userId: number, username: string, sessionVersion: number) {
  const session = await getSession();
  session.userId = userId;
  session.username = username;
  session.sessionVersion = sessionVersion;
  await session.save();
}

export interface AuthResult {
  userId: number;
  username: string;
  bracketSubmitted: boolean;
  isAdmin: boolean;
  isLocked: boolean;
}

export async function registerUser(
  username: string,
  password: string
): Promise<ActionResult<AuthResult>> {
  const trimmed = username.trim().toLowerCase();

  if (!trimmed) {
    return { success: false, error: "Username is required" };
  }

  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return {
      success: false,
      error: `Username must be ${MAX_USERNAME_LENGTH} characters or less`,
    };
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return { success: false, error: strength.reason ?? "Password is too weak" };
  }

  // C4 fix: the admin username cannot be claimed via self-registration.
  // The admin account must be seeded out-of-band.
  if (isAdminUsername(trimmed)) {
    return {
      success: false,
      error: "That username is reserved. Choose another.",
    };
  }

  // H3: rate-limit by IP. Defense in depth against automated account creation.
  const ip = await getClientIp();
  const rl = checkRateLimit(`register:ip:${ip}`, AUTH_LIMITS.registerPerIp);
  if (!rl.allowed) {
    return { success: false, error: rateLimitMessage(rl.retryAfterMs) };
  }

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, trimmed))
      .get();

    if (existing) {
      return { success: false, error: "Username already taken" };
    }

    const hash = await hashPassword(password);

    const result = await db
      .insert(users)
      .values({ username: trimmed, passwordHash: hash })
      .returning();

    const config = await db.select().from(tournamentConfig).get();
    const isLocked = config?.isLocked ?? false;

    // Fresh users have session_version = 1 (schema default).
    await createSession(result[0].id, trimmed, 1);

    return {
      success: true,
      data: {
        userId: result[0].id,
        username: trimmed,
        bracketSubmitted: false,
        isAdmin: isAdminUsername(trimmed),
        isLocked,
      },
    };
  } catch (error) {
    console.error("registerUser failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function loginUser(
  username: string,
  password: string
): Promise<ActionResult<AuthResult>> {
  const trimmed = username.trim().toLowerCase();

  if (!trimmed) {
    return { success: false, error: "Invalid username or password" };
  }

  // H3: rate-limit by IP and by username. Per-IP caps brute force from one
  // source; per-username caps credential-stuffing distributed across IPs.
  const ip = await getClientIp();
  const ipRl = checkRateLimit(`login:ip:${ip}`, AUTH_LIMITS.loginPerIp);
  if (!ipRl.allowed) {
    return { success: false, error: rateLimitMessage(ipRl.retryAfterMs) };
  }
  const userRl = checkRateLimit(
    `login:user:${trimmed}`,
    AUTH_LIMITS.loginPerUsername
  );
  if (!userRl.allowed) {
    // Keep the message generic so we don't leak which usernames exist.
    return { success: false, error: rateLimitMessage(userRl.retryAfterMs) };
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, trimmed))
      .get();

    if (!user || user.passwordHash === null) {
      // Unified error — don't reveal "user exists but has no password"
      // which would identify takeoverable accounts.
      return { success: false, error: "Invalid username or password" };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid username or password" };
    }

    const config = await db.select().from(tournamentConfig).get();
    const isLocked = config?.isLocked ?? false;

    await createSession(user.id, user.username, user.sessionVersion);

    return {
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        bracketSubmitted: user.bracketSubmitted,
        isAdmin: isAdminUsername(user.username),
        isLocked,
      },
    };
  } catch (error) {
    console.error("loginUser failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Not signed in" };
  }

  // H3: rate-limit by user ID. The attacker is plausibly the session holder
  // themselves (stolen device, coerced signin), so per-user is the right key.
  const rl = checkRateLimit(
    `change-password:user:${user.id}`,
    AUTH_LIMITS.changePasswordPerUser
  );
  if (!rl.allowed) {
    return { success: false, error: rateLimitMessage(rl.retryAfterMs) };
  }

  if (!user.passwordHash) {
    return { success: false, error: "Account has no password set" };
  }

  const valid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Current password is incorrect" };
  }

  const strength = validatePasswordStrength(data.newPassword);
  if (!strength.valid) {
    return { success: false, error: strength.reason ?? "Password is too weak" };
  }

  if (data.currentPassword === data.newPassword) {
    return { success: false, error: "New password must be different" };
  }

  try {
    const hash = await hashPassword(data.newPassword);

    // Bump session_version to invalidate sessions on other devices. The
    // current session will be re-saved below with the new version so it
    // stays valid.
    await db
      .update(users)
      .set({
        passwordHash: hash,
        passwordChangedAt: new Date().toISOString(),
        sessionVersion: user.sessionVersion + 1,
        // Any outstanding reset token should be invalidated on a direct
        // password change too.
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    // Re-save the session with the NEW session_version so this browser
    // stays signed in while other devices (still carrying the old version)
    // are invalidated on their next request.
    const newVersion = user.sessionVersion + 1;
    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.sessionVersion = newVersion;
    await session.save();

    await logAudit({
      actorUserId: user.id,
      actorUsername: user.username,
      action: "auth.password_changed",
    });

    return { success: true, data: null };
  } catch (error) {
    console.error("changePassword failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function constantTimeEqualHex(a: string, b: string): boolean {
  // Both inputs are hex strings (sha256 = 64 chars). Reject length mismatches
  // up front so timingSafeEqual doesn't throw.
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Consume an admin-issued password reset token. No session required — the
 * token itself is the capability. Validates hash + expiry in constant time,
 * updates the password, clears the token, bumps session_version, and signs
 * the user in.
 */
export async function consumePasswordResetToken(data: {
  token: string;
  newPassword: string;
}): Promise<ActionResult<AuthResult>> {
  const { token, newPassword } = data;

  if (!token || typeof token !== "string") {
    return { success: false, error: "Invalid or expired reset link" };
  }

  // H3: rate-limit token consumption. Tokens are bearer-like; without a cap
  // an attacker could grind 43-char base64url space. The space is huge but
  // DoS via excessive hashing is still a concern.
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `consume-reset:ip:${ip}`,
    AUTH_LIMITS.consumeResetPerIp
  );
  if (!rl.allowed) {
    return { success: false, error: rateLimitMessage(rl.retryAfterMs) };
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return { success: false, error: strength.reason ?? "Password is too weak" };
  }

  try {
    const tokenHash = sha256Hex(token);

    // Find candidate user by exact hash match, then verify expiry + re-check
    // the hash in constant time (defense against DB driver optimizations
    // leaking timing info).
    const user = await db
      .select()
      .from(users)
      .where(eq(users.resetTokenHash, tokenHash))
      .get();

    if (!user || !user.resetTokenHash || !user.resetTokenExpiresAt) {
      return { success: false, error: "Invalid or expired reset link" };
    }

    if (!constantTimeEqualHex(user.resetTokenHash, tokenHash)) {
      return { success: false, error: "Invalid or expired reset link" };
    }

    const expiresAt = Date.parse(user.resetTokenExpiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return { success: false, error: "Invalid or expired reset link" };
    }

    const hash = await hashPassword(newPassword);
    const newVersion = user.sessionVersion + 1;

    await db
      .update(users)
      .set({
        passwordHash: hash,
        passwordChangedAt: new Date().toISOString(),
        sessionVersion: newVersion,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    const config = await db.select().from(tournamentConfig).get();
    const isLocked = config?.isLocked ?? false;

    await createSession(user.id, user.username, newVersion);

    await logAudit({
      actorUserId: user.id,
      actorUsername: user.username,
      action: "auth.password_reset_consumed",
    });

    return {
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        bracketSubmitted: user.bracketSubmitted,
        isAdmin: isAdminUsername(user.username),
        isLocked,
      },
    };
  } catch (error) {
    console.error("consumePasswordResetToken failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function logoutUser(): Promise<ActionResult<null>> {
  try {
    const session = await getSession();
    session.destroy();
    return { success: true, data: null };
  } catch (error) {
    console.error("logoutUser failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
