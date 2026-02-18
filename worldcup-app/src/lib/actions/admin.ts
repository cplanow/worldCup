"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";

async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
  return (
    !!username &&
    username.toLowerCase() === process.env.ADMIN_USERNAME?.toLowerCase()
  );
}

export async function setupMatchup(data: {
  teamA: string;
  teamB: string;
  position: number;
}): Promise<ActionResult<{ matchId: number }>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const { teamA, teamB, position } = data;

  if (!teamA.trim() || !teamB.trim()) {
    return { success: false, error: "Both team names are required" };
  }

  if (!Number.isInteger(position) || position < 1 || position > 16) {
    return { success: false, error: "Position must be between 1 and 16" };
  }

  const existing = await db
    .select()
    .from(matches)
    .where(and(eq(matches.round, 1), eq(matches.position, position)))
    .get();

  if (existing) {
    await db
      .update(matches)
      .set({ teamA: teamA.trim(), teamB: teamB.trim() })
      .where(eq(matches.id, existing.id));
    revalidatePath("/admin");
    return { success: true, data: { matchId: existing.id } };
  }

  const result = await db
    .insert(matches)
    .values({ teamA: teamA.trim(), teamB: teamB.trim(), round: 1, position })
    .returning();

  revalidatePath("/admin");
  return { success: true, data: { matchId: result[0].id } };
}

export async function getMatches(): Promise<
  ActionResult<
    {
      id: number;
      teamA: string;
      teamB: string;
      round: number;
      position: number;
      winner: string | null;
      createdAt: string;
    }[]
  >
> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const data = await db
      .select()
      .from(matches)
      .orderBy(asc(matches.position))
      .all();
    return { success: true, data };
  } catch (error) {
    console.error("getMatches failed:", error);
    return { success: false, error: "Failed to load matches" };
  }
}

export async function deleteMatchup(
  matchId: number
): Promise<ActionResult<null>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  if (!Number.isInteger(matchId) || matchId < 1) {
    return { success: false, error: "Invalid match ID" };
  }

  await db.delete(matches).where(eq(matches.id, matchId));
  revalidatePath("/admin");
  return { success: true, data: null };
}
