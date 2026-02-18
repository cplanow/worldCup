"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
import { users, tournamentConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";

const MAX_USERNAME_LENGTH = 30;

export interface EnterAppResult {
  userId: number;
  username: string;
  bracketSubmitted: boolean;
  isAdmin: boolean;
  isLocked: boolean;
  isNewUser: boolean;
}

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

export async function enterApp(
  username: string
): Promise<ActionResult<EnterAppResult>> {
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

  const config = await db.select().from(tournamentConfig).get();
  const isLocked = config?.isLocked ?? false;

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, trimmed))
      .get();

    let userId: number;
    let bracketSubmitted: boolean;
    let isNewUser: boolean;

    if (existing) {
      userId = existing.id;
      bracketSubmitted = existing.bracketSubmitted;
      isNewUser = false;
    } else {
      const result = await db
        .insert(users)
        .values({ username: trimmed })
        .returning();
      userId = result[0].id;
      bracketSubmitted = false;
      isNewUser = true;
    }

    await setSessionCookie(trimmed);

    return {
      success: true,
      data: {
        userId,
        username: trimmed,
        bracketSubmitted,
        isAdmin: checkIsAdmin(trimmed),
        isLocked,
        isNewUser,
      },
    };
  } catch (error) {
    console.error("enterApp failed:", error);

    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      // Race condition: user was created between our check and insert
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, trimmed))
        .get();

      if (existing) {
        await setSessionCookie(trimmed);

        return {
          success: true,
          data: {
            userId: existing.id,
            username: trimmed,
            bracketSubmitted: existing.bracketSubmitted,
            isAdmin: checkIsAdmin(trimmed),
            isLocked,
            isNewUser: false,
          },
        };
      }
    }

    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
