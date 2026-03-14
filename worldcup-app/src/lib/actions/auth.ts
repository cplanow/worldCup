"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
import { users, tournamentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";
import { hashPassword, verifyPassword } from "@/lib/password";

const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 4;

async function setSessionCookie(username: string) {
  const cookieStore = await cookies();
  cookieStore.set("username", username, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function checkIsAdmin(username: string): boolean {
  const adminUsername = process.env.ADMIN_USERNAME?.toLowerCase();
  return !!adminUsername && username === adminUsername;
}

export interface AuthResult {
  userId: number;
  username: string;
  bracketSubmitted: boolean;
  isAdmin: boolean;
  isLocked: boolean;
  needsPassword: boolean;
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

    await setSessionCookie(trimmed);

    return {
      success: true,
      data: {
        userId: result[0].id,
        username: trimmed,
        bracketSubmitted: false,
        isAdmin: checkIsAdmin(trimmed),
        isLocked,
        needsPassword: false,
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
    return { success: false, error: "Username is required" };
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, trimmed))
      .get();

    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }

    if (user.passwordHash === null) {
      const config = await db.select().from(tournamentConfig).get();
      const isLocked = config?.isLocked ?? false;

      return {
        success: true,
        data: {
          userId: user.id,
          username: user.username,
          bracketSubmitted: user.bracketSubmitted,
          isAdmin: checkIsAdmin(user.username),
          isLocked,
          needsPassword: true,
        },
      };
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Invalid username or password" };
    }

    const config = await db.select().from(tournamentConfig).get();
    const isLocked = config?.isLocked ?? false;

    await setSessionCookie(trimmed);

    return {
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        bracketSubmitted: user.bracketSubmitted,
        isAdmin: checkIsAdmin(user.username),
        isLocked,
        needsPassword: false,
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

export async function setPassword(
  username: string,
  password: string
): Promise<ActionResult<{ success: true }>> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  const trimmed = username.trim().toLowerCase();

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, trimmed))
      .get();

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.passwordHash !== null) {
      return { success: false, error: "Password already set" };
    }

    const hash = await hashPassword(password);

    await db
      .update(users)
      .set({ passwordHash: hash })
      .where(eq(users.id, user.id));

    await setSessionCookie(trimmed);

    return {
      success: true,
      data: { success: true },
    };
  } catch (error) {
    console.error("setPassword failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function logoutUser(): Promise<ActionResult<null>> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("username");
    return { success: true, data: null };
  } catch (error) {
    console.error("logoutUser failed:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
