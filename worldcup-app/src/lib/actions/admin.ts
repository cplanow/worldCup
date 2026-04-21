"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { matches, tournamentConfig, results, groups, groupTeams, groupPicks, picks, users, thirdPlaceAdvancers } from "@/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import type { ActionResult } from "@/lib/actions/types";
import type { TournamentConfig, Result } from "@/types";
import { ROUND_NAMES, MATCHES_PER_ROUND } from "@/lib/bracket-utils";
import { seedR32Matchups, SeedingError, type GroupSeedingInput } from "@/lib/bracket-seeding";
import { getSessionUser, isAdminUsername } from "@/lib/session";
import { logAudit } from "@/lib/audit-log";

async function getAdminActor() {
  const user = await getSessionUser();
  return {
    actorUserId: user?.id ?? null,
    actorUsername: user?.username ?? null,
  };
}

async function verifyAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return !!user && isAdminUsername(user.username);
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

  if (teamA.trim().length > 60 || teamB.trim().length > 60) {
    return { success: false, error: "Team names must be 60 characters or less" };
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
    groupStageLocked: config.groupStageLocked,
    pointsGroupAdvance: config.pointsGroupAdvance,
    pointsGroupExact: config.pointsGroupExact,
    pointsR32: config.pointsR32,
    pointsR16: config.pointsR16,
    pointsQf: config.pointsQf,
    pointsSf: config.pointsSf,
    pointsFinal: config.pointsFinal,
    pointsGroupPosition: config.pointsGroupPosition,
    pointsGroupPerfect: config.pointsGroupPerfect,
    actualTopScorer: config.actualTopScorer,
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

  await logAudit({
    ...(await getAdminActor()),
    action: "admin.toggle_bracket_lock",
    payload: { isLocked: locked },
  });

  revalidatePath("/admin");
  return { success: true, data: { isLocked: locked } };
}

export async function checkBracketLock(): Promise<boolean> {
  const config = await getTournamentConfig();
  return config.isLocked;
}

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

export async function getResults(): Promise<ActionResult<Result[]>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const data = await db.select().from(results).all();
    return { success: true, data };
  } catch (error) {
    console.error("getResults failed:", error);
    return { success: false, error: "Failed to load results" };
  }
}

export async function enterResult(data: {
  matchId: number;
  winner: string;
}): Promise<ActionResult<null>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const match = await db
    .select()
    .from(matches)
    .where(eq(matches.id, data.matchId))
    .get();

  if (!match) return { success: false, error: "Match not found" };

  if (!match.teamA || !match.teamB) {
    return { success: false, error: "Match teams are not yet determined" };
  }

  if (data.winner !== match.teamA && data.winner !== match.teamB) {
    return { success: false, error: "Winner must be one of the teams in this match" };
  }

  // Upsert result
  const existing = await db
    .select()
    .from(results)
    .where(eq(results.matchId, data.matchId))
    .get();

  if (existing) {
    await db
      .update(results)
      .set({ winner: data.winner })
      .where(eq(results.id, existing.id));
  } else {
    await db.insert(results).values({ matchId: data.matchId, winner: data.winner });
  }

  // Update denormalized winner on matches table
  await db
    .update(matches)
    .set({ winner: data.winner })
    .where(eq(matches.id, data.matchId));

  // Advance winner to next round
  await advanceWinner(match.round, match.position, data.winner);

  await logAudit({
    ...(await getAdminActor()),
    action: "admin.enter_result",
    payload: { matchId: data.matchId, winner: data.winner, round: match.round },
  });

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/bracket");

  return { success: true, data: null };
}

export async function correctResult(data: {
  matchId: number;
  winner: string;
}): Promise<ActionResult<{ warning?: string }>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const existingResult = await db
    .select()
    .from(results)
    .where(eq(results.matchId, data.matchId))
    .get();

  if (!existingResult) {
    return {
      success: false,
      error: "No existing result to correct. Use enter result instead.",
    };
  }

  const match = await db
    .select()
    .from(matches)
    .where(eq(matches.id, data.matchId))
    .get();

  if (!match) return { success: false, error: "Match not found" };

  if (!match.teamA || !match.teamB) {
    return { success: false, error: "Match teams are not yet determined" };
  }

  if (data.winner !== match.teamA && data.winner !== match.teamB) {
    return { success: false, error: "Winner must be one of the teams" };
  }

  await db
    .update(results)
    .set({ winner: data.winner })
    .where(eq(results.id, existingResult.id));

  await db
    .update(matches)
    .set({ winner: data.winner })
    .where(eq(matches.id, data.matchId));

  await advanceWinner(match.round, match.position, data.winner);

  let warning: string | undefined;
  if (match.round < 5) {
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const nextMatch = await db
      .select()
      .from(matches)
      .where(and(eq(matches.round, nextRound), eq(matches.position, nextPosition)))
      .get();
    if (nextMatch) {
      const nextResult = await db
        .select()
        .from(results)
        .where(eq(results.matchId, nextMatch.id))
        .get();
      if (nextResult) {
        const roundName = ROUND_NAMES[nextRound] ?? `Round ${nextRound}`;
        warning = `Result updated. Please verify ${roundName} results — the advancing team has changed.`;
      }
    }
  }

  await logAudit({
    ...(await getAdminActor()),
    action: "admin.correct_result",
    payload: {
      matchId: data.matchId,
      previousWinner: existingResult.winner,
      newWinner: data.winner,
      round: match.round,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/bracket");

  return { success: true, data: { warning } };
}

async function advanceWinner(round: number, position: number, winner: string) {
  if (round >= 5) return; // Final — no next round

  const nextRound = round + 1;
  const nextPosition = Math.ceil(position / 2);
  const isTeamA = position % 2 === 1; // Odd position → teamA slot

  const nextMatch = await db
    .select()
    .from(matches)
    .where(and(eq(matches.round, nextRound), eq(matches.position, nextPosition)))
    .get();

  if (nextMatch) {
    await db
      .update(matches)
      .set(isTeamA ? { teamA: winner } : { teamB: winner })
      .where(eq(matches.id, nextMatch.id));
  }
}

export async function setupGroup(data: {
  name: string;
  teams: string[];
}): Promise<ActionResult<{ groupId: number }>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const { name, teams } = data;

  if (!name.trim()) {
    return { success: false, error: "Group name is required" };
  }

  // L7: seedR32Matchups assumes single-letter group names A-L. Entering
  // "Group A" instead of "A" would silently break auto-seeding later.
  if (!/^[A-L]$/.test(name.trim())) {
    return {
      success: false,
      error: "Group name must be a single letter A through L",
    };
  }

  if (teams.length !== 4) {
    return { success: false, error: "Exactly 4 teams are required" };
  }

  if (teams.some((t) => !t.trim())) {
    return { success: false, error: "All team names must be non-empty" };
  }

  if (teams.some((t) => t.trim().length > 60)) {
    return { success: false, error: "Team names must be 60 characters or less" };
  }

  // Check if group name already exists -> upsert
  const existing = await db
    .select()
    .from(groups)
    .where(eq(groups.name, name.trim()))
    .get();

  let groupId: number;
  if (existing) {
    groupId = existing.id;
    // Delete old teams and insert new ones
    await db.delete(groupTeams).where(eq(groupTeams.groupId, groupId));
  } else {
    const result = await db
      .insert(groups)
      .values({ name: name.trim() })
      .returning();
    groupId = result[0].id;
  }

  // Insert 4 groupTeam rows
  await db.insert(groupTeams).values(
    teams.map((teamName) => ({
      groupId,
      teamName: teamName.trim(),
    }))
  );

  revalidatePath("/admin");
  return { success: true, data: { groupId } };
}

export async function enterGroupResult(data: {
  groupId: number;
  positions: { teamName: string; position: number }[];
}): Promise<ActionResult<null>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const { groupId, positions } = data;

  // Validate positions has 4 entries with positions 1-4
  if (positions.length !== 4) {
    return { success: false, error: "Exactly 4 positions are required" };
  }

  const positionNumbers = positions.map((p) => p.position).sort();
  if (
    positionNumbers[0] !== 1 ||
    positionNumbers[1] !== 2 ||
    positionNumbers[2] !== 3 ||
    positionNumbers[3] !== 4
  ) {
    return { success: false, error: "Positions must be 1, 2, 3, and 4" };
  }

  // Validate group exists
  const group = await db.select().from(groups).where(eq(groups.id, groupId)).get();
  if (!group) return { success: false, error: "Group not found" };

  // Update finalPosition on each groupTeam row
  for (const entry of positions) {
    const team = await db
      .select()
      .from(groupTeams)
      .where(
        and(eq(groupTeams.groupId, groupId), eq(groupTeams.teamName, entry.teamName))
      )
      .get();

    if (!team) {
      return {
        success: false,
        error: `Team "${entry.teamName}" not found in group`,
      };
    }

    await db
      .update(groupTeams)
      .set({ finalPosition: entry.position })
      .where(eq(groupTeams.id, team.id));
  }

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { success: true, data: null };
}

export async function toggleGroupStageLock(
  locked: boolean
): Promise<ActionResult<{ groupStageLocked: boolean }>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  if (typeof locked !== "boolean") {
    return { success: false, error: "Invalid lock value" };
  }

  const config = await getTournamentConfig();

  await db
    .update(tournamentConfig)
    .set({ groupStageLocked: locked })
    .where(eq(tournamentConfig.id, config.id));

  await logAudit({
    ...(await getAdminActor()),
    action: "admin.toggle_group_stage_lock",
    payload: { groupStageLocked: locked },
  });

  revalidatePath("/admin");
  return { success: true, data: { groupStageLocked: locked } };
}

// Token lifetime for admin-initiated password resets. Kept short to limit
// the window if the out-of-band channel (text, email) is compromised later.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generate a one-time reset token for a user. Admin-only.
 *
 * Returns the plaintext token to the caller ONCE — only the SHA-256 hash is
 * persisted, so a DB snapshot does not leak live tokens. The admin is
 * expected to share the resulting `/forgot-password/<token>` URL with the
 * user out-of-band (text message, etc).
 *
 * Replaces the previous adminResetPassword which wiped passwordHash to null
 * and relied on the next login to re-set a password — that was C3 in the
 * audit, because any attacker who guessed the username could then claim the
 * account.
 */
export async function adminGenerateResetToken(
  userId: number
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return { success: false, error: "User not found" };

  // 32 bytes → 43 chars of base64url. URL-safe + unguessable.
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

  await db
    .update(users)
    .set({
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: expiresAt,
    })
    .where(eq(users.id, userId));

  await logAudit({
    ...(await getAdminActor()),
    action: "admin.generate_reset_token",
    payload: { targetUserId: userId, targetUsername: user.username, expiresAt },
  });

  revalidatePath("/admin");
  return { success: true, data: { token, expiresAt } };
}

export async function setActualTopScorer(
  scorer: string | null
): Promise<ActionResult<null>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const trimmed = scorer?.trim() || null;
  if (trimmed !== null && trimmed.length > 100) {
    return { success: false, error: "Top scorer must be 100 characters or less" };
  }
  const config = await getTournamentConfig();

  await db
    .update(tournamentConfig)
    .set({ actualTopScorer: trimmed })
    .where(eq(tournamentConfig.id, config.id));

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { success: true, data: null };
}

export async function setThirdPlaceAdvancers(
  groupIds: number[]
): Promise<ActionResult<null>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  if (groupIds.length !== 8) {
    return {
      success: false,
      error: `Exactly 8 third-place advancers required (got ${groupIds.length})`,
    };
  }

  const unique = new Set(groupIds);
  if (unique.size !== 8) {
    return { success: false, error: "Duplicate group IDs in selection" };
  }

  const existingGroups = await db
    .select({ id: groups.id })
    .from(groups)
    .where(inArray(groups.id, groupIds))
    .all();

  if (existingGroups.length !== 8) {
    return { success: false, error: "One or more selected groups do not exist" };
  }

  await db.delete(thirdPlaceAdvancers);
  await db.insert(thirdPlaceAdvancers).values(groupIds.map((groupId) => ({ groupId })));

  revalidatePath("/admin");
  return { success: true, data: null };
}

export async function getThirdPlaceAdvancers(): Promise<ActionResult<number[]>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const rows = await db.select({ groupId: thirdPlaceAdvancers.groupId }).from(thirdPlaceAdvancers).all();
  return { success: true, data: rows.map((r) => r.groupId) };
}

export async function autoSeedR32(): Promise<ActionResult<{ created: number }>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const config = await getTournamentConfig();
  if (config.isLocked) {
    return { success: false, error: "Cannot auto-seed while bracket is locked" };
  }

  const existingResults = await db.select().from(results).all();
  if (existingResults.length > 0) {
    return {
      success: false,
      error: "Cannot auto-seed after match results have been entered",
    };
  }

  const allGroups = await db.select().from(groups).orderBy(asc(groups.name)).all();
  const allTeams = await db.select().from(groupTeams).all();
  const advancerRows = await db.select().from(thirdPlaceAdvancers).all();
  const advancerGroupIds = new Set(advancerRows.map((r) => r.groupId));

  if (allGroups.length !== 12) {
    return {
      success: false,
      error: `Need all 12 groups before auto-seeding (found ${allGroups.length})`,
    };
  }

  const seedingInput: GroupSeedingInput[] = allGroups.map((g) => {
    const teams = allTeams.filter((t) => t.groupId === g.id);
    const first = teams.find((t) => t.finalPosition === 1)?.teamName ?? "";
    const second = teams.find((t) => t.finalPosition === 2)?.teamName ?? "";
    const third = teams.find((t) => t.finalPosition === 3)?.teamName ?? "";
    return {
      name: g.name,
      first,
      second,
      third,
      thirdAdvances: advancerGroupIds.has(g.id),
    };
  });

  let seeded;
  try {
    seeded = seedR32Matchups(seedingInput);
  } catch (err) {
    if (err instanceof SeedingError) {
      return { success: false, error: err.message };
    }
    throw err;
  }

  const existingR32 = await db.select().from(matches).where(eq(matches.round, 1)).all();
  const r32Ids = existingR32.map((m) => m.id);
  if (r32Ids.length > 0) {
    await db.delete(picks).where(inArray(picks.matchId, r32Ids));
    await db.delete(matches).where(inArray(matches.id, r32Ids));
  }

  await db.insert(matches).values(
    seeded.map((m) => ({
      teamA: m.teamA,
      teamB: m.teamB,
      round: 1,
      position: m.position,
    }))
  );

  const existingLaterRounds = await db.select().from(matches).where(eq(matches.round, 2)).all();
  if (existingLaterRounds.length === 0) {
    const placeholders: { teamA: string; teamB: string; round: number; position: number }[] = [];
    for (let round = 2; round <= 5; round++) {
      const count = MATCHES_PER_ROUND[round];
      for (let pos = 1; pos <= count; pos++) {
        placeholders.push({ teamA: "", teamB: "", round, position: pos });
      }
    }
    await db.insert(matches).values(placeholders);
  }

  revalidatePath("/admin");
  revalidatePath("/bracket");
  return { success: true, data: { created: seeded.length } };
}
