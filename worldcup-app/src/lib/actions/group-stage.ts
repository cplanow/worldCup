"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, groups, groupTeams, groupPicks, tournamentConfig } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";
import type { GroupPick } from "@/types";
import { requireUser } from "@/lib/session";

async function isGroupStageLocked(): Promise<boolean> {
  const config = await db.select().from(tournamentConfig).get();
  return config?.groupStageLocked ?? false;
}

export async function saveGroupPick(data: {
  groupId: number;
  firstPlace: string;
  secondPlace: string;
  thirdPlace: string;
  fourthPlace: string;
}): Promise<ActionResult<{ pickId: number }>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "Unauthenticated" };
  }

  if (await isGroupStageLocked()) {
    return { success: false, error: "Group stage picks are locked" };
  }

  if (user.groupPicksSubmitted) {
    return { success: false, error: "Group picks already submitted" };
  }

  const group = await db.select().from(groups).where(eq(groups.id, data.groupId)).get();
  if (!group) return { success: false, error: "Group not found" };

  const positions = [data.firstPlace, data.secondPlace, data.thirdPlace, data.fourthPlace];
  if (positions.some((p) => typeof p !== "string" || p.length === 0 || p.length > 60)) {
    return { success: false, error: "Invalid team name" };
  }
  const unique = new Set(positions);
  if (unique.size !== 4) {
    return { success: false, error: "All four positions must be different teams" };
  }

  const teamsInGroup = await db
    .select()
    .from(groupTeams)
    .where(eq(groupTeams.groupId, data.groupId))
    .all();

  const teamNames = new Set(teamsInGroup.map((t) => t.teamName));
  for (const team of positions) {
    if (!teamNames.has(team)) {
      return { success: false, error: `Team "${team}" does not belong to this group` };
    }
  }

  const existing = await db
    .select()
    .from(groupPicks)
    .where(and(eq(groupPicks.userId, user.id), eq(groupPicks.groupId, data.groupId)))
    .get();

  let pickId: number;
  if (existing) {
    await db
      .update(groupPicks)
      .set({
        firstPlace: data.firstPlace,
        secondPlace: data.secondPlace,
        thirdPlace: data.thirdPlace,
        fourthPlace: data.fourthPlace,
      })
      .where(eq(groupPicks.id, existing.id));
    pickId = existing.id;
  } else {
    const result = await db
      .insert(groupPicks)
      .values({
        userId: user.id,
        groupId: data.groupId,
        firstPlace: data.firstPlace,
        secondPlace: data.secondPlace,
        thirdPlace: data.thirdPlace,
        fourthPlace: data.fourthPlace,
      })
      .returning();
    pickId = result[0].id;
  }

  return { success: true, data: { pickId } };
}

export async function saveTopScorerPick(data: {
  topScorerPick: string;
}): Promise<ActionResult<null>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "Unauthenticated" };
  }

  if (await isGroupStageLocked()) {
    return { success: false, error: "Group stage picks are locked" };
  }

  if (user.groupPicksSubmitted) {
    return { success: false, error: "Group picks already submitted" };
  }

  const trimmed = data.topScorerPick.trim();
  if (!trimmed) {
    return { success: false, error: "Top scorer pick cannot be empty" };
  }
  if (trimmed.length > 100) {
    return { success: false, error: "Top scorer pick must be 100 characters or less" };
  }

  await db.update(users).set({ topScorerPick: trimmed }).where(eq(users.id, user.id));

  return { success: true, data: null };
}

export async function submitGroupPicks(): Promise<ActionResult<null>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "Unauthenticated" };
  }

  if (await isGroupStageLocked()) {
    return { success: false, error: "Group stage picks are locked" };
  }

  if (user.groupPicksSubmitted) {
    return { success: false, error: "Group picks already submitted" };
  }

  const userPicks = await db
    .select()
    .from(groupPicks)
    .where(eq(groupPicks.userId, user.id))
    .all();

  if (userPicks.length < 12) {
    return {
      success: false,
      error: `Only ${userPicks.length} of 12 group picks made. Complete all groups first.`,
    };
  }

  const incomplete = userPicks.find((p) => !p.thirdPlace || !p.fourthPlace);
  if (incomplete) {
    return {
      success: false,
      error: "Every group pick must rank all 4 teams. Complete 3rd and 4th for each group.",
    };
  }

  if (!user.topScorerPick) {
    return { success: false, error: "Golden Boot pick is required before submitting" };
  }

  await db.update(users).set({ groupPicksSubmitted: true }).where(eq(users.id, user.id));

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/bracket");
  revalidatePath("/groups");

  return { success: true, data: null };
}

export async function getGroupPicksForUser(): Promise<ActionResult<GroupPick[]>> {
  let user;
  try {
    user = await requireUser();
  } catch {
    return { success: false, error: "Unauthenticated" };
  }

  const userPicks = await db
    .select()
    .from(groupPicks)
    .where(eq(groupPicks.userId, user.id))
    .all();

  return { success: true, data: userPicks };
}

export async function checkGroupStageLock(): Promise<boolean> {
  return isGroupStageLocked();
}
