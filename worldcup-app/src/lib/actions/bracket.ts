"use server";

import { db } from "@/db";
import { picks, users, matches } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { checkBracketLock } from "@/lib/actions/admin";
import { requireUser } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/types";
import { getCascadingClears, getMatchSlot } from "@/lib/bracket-utils";
import type { Match, Pick } from "@/types";

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

  if (typeof data.selectedTeam !== "string" || data.selectedTeam.length === 0 || data.selectedTeam.length > 60) {
    return { success: false, error: "Invalid team selection" };
  }

  const match = await db.select().from(matches).where(eq(matches.id, data.matchId)).get();
  if (!match) return { success: false, error: "Match not found" };

  // Fetch the user's full pick list + all matches once. We need these both
  // for R2+ slot validation (H4) and for server-side cascade computation
  // (M4). For R32 picks the matches list is only used by getCascadingClears.
  const [userPicksRows, allMatchesRows] = await Promise.all([
    db.select().from(picks).where(eq(picks.userId, user.id)).all(),
    db.select().from(matches).all(),
  ]);
  const userPicks = userPicksRows as Pick[];
  const allMatches = allMatchesRows as Match[];

  if (match.round === 1) {
    if (data.selectedTeam !== match.teamA && data.selectedTeam !== match.teamB) {
      return { success: false, error: "Invalid team selection" };
    }
  } else {
    // Rounds 2-5: candidate teams aren't stored on the match row — they're
    // derived from the user's earlier picks. Reject phantom teams that
    // couldn't possibly reach this slot given the user's feeder picks.
    const slot = getMatchSlot(match.round, match.position, userPicks, allMatches);
    if (!slot.teamA || !slot.teamB) {
      return { success: false, error: "Pick is not yet available" };
    }
    if (data.selectedTeam !== slot.teamA && data.selectedTeam !== slot.teamB) {
      return { success: false, error: "Invalid team selection" };
    }
  }

  const existing = userPicks.find((p) => p.matchId === data.matchId) ?? null;

  // M4: if the pick is a change (different team than before), clear the
  // downstream picks that referenced the dethroned team. Do this server-side
  // in a single batch so a client that drops the follow-up network call
  // can't leave us with an R5 pick for a team eliminated in R32.
  const cascadeIds =
    existing && existing.selectedTeam !== data.selectedTeam
      ? getCascadingClears(data.matchId, existing.selectedTeam, userPicks, allMatches)
      : [];

  let pickId: number;
  if (existing) {
    if (cascadeIds.length > 0) {
      // TODO(audit): log bracket.pick.cascade_clear event (matchIds: cascadeIds)
      await db.batch([
        db
          .update(picks)
          .set({ selectedTeam: data.selectedTeam })
          .where(eq(picks.id, existing.id)),
        db
          .delete(picks)
          .where(and(eq(picks.userId, user.id), inArray(picks.matchId, cascadeIds))),
      ]);
    } else {
      await db
        .update(picks)
        .set({ selectedTeam: data.selectedTeam })
        .where(eq(picks.id, existing.id));
    }
    pickId = existing.id;
  } else {
    // No prior pick at this match ⇒ nothing downstream to cascade.
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
