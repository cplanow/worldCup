"use server";

import { db } from "@/db";
import { picks, users, matches } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { checkBracketLock } from "@/lib/actions/admin";
import { requireUser } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/types";

export async function savePick(data: {
  matchId: number;
  selectedTeam: string;
}): Promise<ActionResult<{ pickId: number }>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "Unauthenticated" };
  }

  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }

  if (user.bracketSubmitted) {
    return { success: false, error: "Bracket already submitted" };
  }

  const match = await db.select().from(matches).where(eq(matches.id, data.matchId)).get();
  if (!match) return { success: false, error: "Match not found" };
  if (
    match.round === 1 &&
    data.selectedTeam !== match.teamA &&
    data.selectedTeam !== match.teamB
  ) {
    return { success: false, error: "Invalid team selection" };
  }
  if (typeof data.selectedTeam !== "string" || data.selectedTeam.length === 0 || data.selectedTeam.length > 60) {
    return { success: false, error: "Invalid team selection" };
  }

  const existing = await db
    .select()
    .from(picks)
    .where(and(eq(picks.userId, user.id), eq(picks.matchId, data.matchId)))
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
      .values({ userId: user.id, matchId: data.matchId, selectedTeam: data.selectedTeam })
      .returning();
    pickId = result[0].id;
  }

  return { success: true, data: { pickId } };
}

export async function submitBracket(): Promise<ActionResult<null>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "Unauthenticated" };
  }

  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }

  if (user.bracketSubmitted) return { success: false, error: "Bracket already submitted" };

  const userPicks = await db.select().from(picks).where(eq(picks.userId, user.id)).all();
  if (userPicks.length < 31) {
    return {
      success: false,
      error: `Only ${userPicks.length} of 31 picks made. Complete your bracket first.`,
    };
  }

  await db.update(users).set({ bracketSubmitted: true }).where(eq(users.id, user.id));

  return { success: true, data: null };
}

export async function deletePicks(data: {
  matchIds: number[];
}): Promise<ActionResult<null>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "Unauthenticated" };
  }

  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }

  if (user.bracketSubmitted) return { success: false, error: "Bracket already submitted" };

  if (!Array.isArray(data.matchIds) || data.matchIds.length > 30) {
    return { success: false, error: "Invalid request" };
  }

  if (data.matchIds.length > 0) {
    await db
      .delete(picks)
      .where(and(eq(picks.userId, user.id), inArray(picks.matchId, data.matchIds)));
  }

  return { success: true, data: null };
}
