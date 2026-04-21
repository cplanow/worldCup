"use server";

import { db } from "@/db";
import { users, tournamentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getSession, isAdminUsername } from "@/lib/session";

const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 10;

async function createSession(userId: number, username: string) {
  const session = await getSession();
  session.userId = userId;
  session.username = username;
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

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  // C4 fix: the admin username cannot be claimed via self-registration.
  // The admin account must be seeded out-of-band.
  if (isAdminUsername(trimmed)) {
    return {
      success: false,
      error: "That username is reserved. Choose another.",
    };
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

    await createSession(result[0].id, trimmed);

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

    await createSession(user.id, user.username);

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
