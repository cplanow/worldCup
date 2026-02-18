"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";

export async function createUser(
  username: string
): Promise<ActionResult<{ userId: number }>> {
  const trimmed = username.trim();

  if (!trimmed) {
    return { success: false, error: "Username is required" };
  }

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
}
