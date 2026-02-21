"use server";

import { db } from "@/db";
import { picks, users, matches } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { checkBracketLock } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/actions/types";

export async function savePick(data: {
  userId: number;
  matchId: number;
  selectedTeam: string;
}): Promise<ActionResult<{ pickId: number }>> {
  // 1. Check lock
  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }

  // 2. Validate user exists and not submitted
  const user = await db.select().from(users).where(eq(users.id, data.userId)).get();
  if (!user) return { success: false, error: "User not found" };
  if (user.bracketSubmitted) return { success: false, error: "Bracket already submitted" };

  // 3. Validate match exists and team is valid for R32
  const match = await db.select().from(matches).where(eq(matches.id, data.matchId)).get();
  if (!match) return { success: false, error: "Match not found" };
  if (
    match.round === 1 &&
    data.selectedTeam !== match.teamA &&
    data.selectedTeam !== match.teamB
  ) {
    return { success: false, error: "Invalid team selection" };
  }

  // 4. Upsert pick
  const existing = await db
    .select()
    .from(picks)
    .where(and(eq(picks.userId, data.userId), eq(picks.matchId, data.matchId)))
    .get();

  let pickId: number;
  if (existing) {
    await db
      .update(picks)
      .set({ selectedTeam: data.selectedTeam })
      .where(eq(picks.id, existing.id));
    pickId = existing.id;
  } else {
    const result = await db
      .insert(picks)
      .values({ userId: data.userId, matchId: data.matchId, selectedTeam: data.selectedTeam })
      .returning();
    pickId = result[0].id;
  }

  return { success: true, data: { pickId } };
}

export async function submitBracket(userId: number): Promise<ActionResult<null>> {
  // 1. Check lock
  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }

  // 2. Validate user
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return { success: false, error: "User not found" };
  if (user.bracketSubmitted) return { success: false, error: "Bracket already submitted" };

  // 3. Server-side pick count validation
  const userPicks = await db.select().from(picks).where(eq(picks.userId, userId)).all();
  if (userPicks.length < 31) {
    return {
      success: false,
      error: `Only ${userPicks.length} of 31 picks made. Complete your bracket first.`,
    };
  }

  // 4. Lock bracket permanently
  await db.update(users).set({ bracketSubmitted: true }).where(eq(users.id, userId));

  return { success: true, data: null };
}

export async function deletePicks(data: {
  userId: number;
  matchIds: number[];
}): Promise<ActionResult<null>> {
  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }

  const user = await db.select().from(users).where(eq(users.id, data.userId)).get();
  if (!user) return { success: false, error: "User not found" };
  if (user.bracketSubmitted) return { success: false, error: "Bracket already submitted" };

  if (data.matchIds.length > 30) {
    return { success: false, error: "Invalid request" };
  }

  if (data.matchIds.length > 0) {
    await db
      .delete(picks)
      .where(and(eq(picks.userId, data.userId), inArray(picks.matchId, data.matchIds)));
  }

  return { success: true, data: null };
}
