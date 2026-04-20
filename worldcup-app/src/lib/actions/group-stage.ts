"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, groups, groupTeams, groupPicks, tournamentConfig } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";
import type { GroupPick } from "@/types";

async function isGroupStageLocked(): Promise<boolean> {
  const config = await db.select().from(tournamentConfig).get();
  return config?.groupStageLocked ?? false;
}

export async function saveGroupPick(data: {
  userId: number;
  groupId: number;
  firstPlace: string;
  secondPlace: string;
  thirdPlace: string;
  fourthPlace: string;
}): Promise<ActionResult<{ pickId: number }>> {
  // 1. Check group stage lock
  if (await isGroupStageLocked()) {
    return { success: false, error: "Group stage picks are locked" };
  }

  // 2. Validate user exists and not already submitted
  const user = await db.select().from(users).where(eq(users.id, data.userId)).get();
  if (!user) return { success: false, error: "User not found" };
  if (user.groupPicksSubmitted) {
    return { success: false, error: "Group picks already submitted" };
  }

  // 3. Validate group exists
  const group = await db.select().from(groups).where(eq(groups.id, data.groupId)).get();
  if (!group) return { success: false, error: "Group not found" };

  // 4. Validate all 4 positions are distinct
  const positions = [data.firstPlace, data.secondPlace, data.thirdPlace, data.fourthPlace];
  const unique = new Set(positions);
  if (unique.size !== 4) {
    return { success: false, error: "All four positions must be different teams" };
  }

  // 5. Validate all 4 teams belong to the group
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

  // 6. Upsert into groupPicks
  const existing = await db
    .select()
    .from(groupPicks)
    .where(and(eq(groupPicks.userId, data.userId), eq(groupPicks.groupId, data.groupId)))
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
        userId: data.userId,
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
  userId: number;
  topScorerPick: string;
}): Promise<ActionResult<null>> {
  if (await isGroupStageLocked()) {
    return { success: false, error: "Group stage picks are locked" };
  }

  const user = await db.select().from(users).where(eq(users.id, data.userId)).get();
  if (!user) return { success: false, error: "User not found" };
  if (user.groupPicksSubmitted) {
    return { success: false, error: "Group picks already submitted" };
  }

  const trimmed = data.topScorerPick.trim();
  if (!trimmed) {
    return { success: false, error: "Top scorer pick cannot be empty" };
  }

  await db.update(users).set({ topScorerPick: trimmed }).where(eq(users.id, data.userId));

  return { success: true, data: null };
}

export async function submitGroupPicks(userId: number): Promise<ActionResult<null>> {
  // 1. Check group stage lock
  if (await isGroupStageLocked()) {
    return { success: false, error: "Group stage picks are locked" };
  }

  // 2. Validate user exists and not already submitted
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return { success: false, error: "User not found" };
  if (user.groupPicksSubmitted) {
    return { success: false, error: "Group picks already submitted" };
  }

  // 3. Count user's group picks - must equal 12 (all groups)
  const userPicks = await db
    .select()
    .from(groupPicks)
    .where(eq(groupPicks.userId, userId))
    .all();

  if (userPicks.length < 12) {
    return {
      success: false,
      error: `Only ${userPicks.length} of 12 group picks made. Complete all groups first.`,
    };
  }

  // 4. Each pick must have all 4 positions filled
  const incomplete = userPicks.find(
    (p) => !p.thirdPlace || !p.fourthPlace
  );
  if (incomplete) {
    return {
      success: false,
      error: "Every group pick must rank all 4 teams. Complete 3rd and 4th for each group.",
    };
  }

  // 5. Golden Boot pick must be set
  if (!user.topScorerPick) {
    return { success: false, error: "Golden Boot pick is required before submitting" };
  }

  // 6. Lock submissions
  await db.update(users).set({ groupPicksSubmitted: true }).where(eq(users.id, userId));

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/bracket");
  revalidatePath("/groups");

  return { success: true, data: null };
}

export async function getGroupPicksForUser(
  userId: number
): Promise<ActionResult<GroupPick[]>> {
  const userPicks = await db
    .select()
    .from(groupPicks)
    .where(eq(groupPicks.userId, userId))
    .all();

  return { success: true, data: userPicks };
}

export async function checkGroupStageLock(): Promise<boolean> {
  return isGroupStageLocked();
}
