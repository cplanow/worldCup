"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";

const MAX_USERNAME_LENGTH = 30;

export async function createUser(
  username: string
): Promise<ActionResult<{ userId: number }>> {
  const trimmed = username.trim().toLowerCase();

  if (!trimmed) {
    return { success: false, error: "Username is required" };
  }

  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return { success: false, error: `Username must be ${MAX_USERNAME_LENGTH} characters or less` };
  }

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, trimmed))
      .get();

    if (existing) {
      return { success: false, error: "That name is already taken" };
    }

    const result = await db
      .insert(users)
      .values({ username: trimmed })
      .returning();

    const cookieStore = await cookies();
    cookieStore.set("username", trimmed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    return { success: true, data: { userId: result[0].id } };
  } catch (error) {
    console.error("createUser failed:", error);

    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return { success: false, error: "That name is already taken" };
    }

    return { success: false, error: "Something went wrong. Please try again." };
  }
}
