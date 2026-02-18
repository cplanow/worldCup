"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { matches, tournamentConfig } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";
import type { TournamentConfig } from "@/types";

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

export async function getTournamentConfig(): Promise<TournamentConfig> {
  let config = await db.select().from(tournamentConfig).get();

  if (!config) {
    await db.insert(tournamentConfig).values({}).returning();
    // Re-query to get the canonical row (lowest ID) in case of concurrent inserts
    config = await db.select().from(tournamentConfig).get();
  }

  if (!config) {
    throw new Error("Failed to initialize tournament configuration");
  }

  return {
    id: config.id,
    isLocked: config.isLocked,
    pointsR32: config.pointsR32,
    pointsR16: config.pointsR16,
    pointsQf: config.pointsQf,
    pointsSf: config.pointsSf,
    pointsFinal: config.pointsFinal,
    createdAt: config.createdAt,
  };
}

export async function toggleLock(
  locked: boolean
): Promise<ActionResult<{ isLocked: boolean }>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  if (typeof locked !== "boolean") {
    return { success: false, error: "Invalid lock value" };
  }

  const config = await getTournamentConfig();

  await db
    .update(tournamentConfig)
    .set({ isLocked: locked })
    .where(eq(tournamentConfig.id, config.id));

  revalidatePath("/admin");
  return { success: true, data: { isLocked: locked } };
}

export async function checkBracketLock(): Promise<boolean> {
  const config = await getTournamentConfig();
  return config.isLocked;
}

const MATCHES_PER_ROUND: Record<number, number> = {
  2: 8,
  3: 4,
  4: 2,
  5: 1,
};

export async function initializeBracketStructure(): Promise<
  ActionResult<{ created: number }>
> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  // Verify all 16 R32 matches exist
  const r32Matches = await db
    .select()
    .from(matches)
    .where(eq(matches.round, 1))
    .all();

  if (r32Matches.length < 16) {
    return {
      success: false,
      error: `Need all 16 R32 matches before initializing bracket structure (found ${r32Matches.length})`,
    };
  }

  // Check if later-round matches already exist (idempotent)
  const existingLaterRounds = await db
    .select()
    .from(matches)
    .where(eq(matches.round, 2))
    .all();

  if (existingLaterRounds.length > 0) {
    return { success: true, data: { created: 0 } };
  }

  // Create placeholder matches for rounds 2-5
  const placeholders: { teamA: string; teamB: string; round: number; position: number }[] = [];
  for (let round = 2; round <= 5; round++) {
    const count = MATCHES_PER_ROUND[round];
    for (let pos = 1; pos <= count; pos++) {
      placeholders.push({ teamA: "", teamB: "", round, position: pos });
    }
  }

  await db.insert(matches).values(placeholders);
  revalidatePath("/admin");
  revalidatePath("/bracket");
  return { success: true, data: { created: placeholders.length } };
}
