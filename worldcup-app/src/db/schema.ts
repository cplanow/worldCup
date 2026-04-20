import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  bracketSubmitted: integer("bracket_submitted", { mode: "boolean" })
    .notNull()
    .default(false),
  groupPicksSubmitted: integer("group_picks_submitted", { mode: "boolean" })
    .notNull()
    .default(false),
  topScorerPick: text("top_scorer_pick"),
});

export const tournamentConfig = sqliteTable("tournament_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  isLocked: integer("is_locked", { mode: "boolean" }).notNull().default(false),
  groupStageLocked: integer("group_stage_locked", { mode: "boolean" }).notNull().default(false),
  pointsGroupAdvance: integer("points_group_advance").notNull().default(2),
  pointsGroupExact: integer("points_group_exact").notNull().default(1),
  pointsR32: integer("points_r32").notNull().default(2),
  pointsR16: integer("points_r16").notNull().default(4),
  pointsQf: integer("points_qf").notNull().default(8),
  pointsSf: integer("points_sf").notNull().default(16),
  pointsFinal: integer("points_final").notNull().default(32),
  pointsGroupPosition: integer("points_group_position").notNull().default(2),
  pointsGroupPerfect: integer("points_group_perfect").notNull().default(5),
  actualTopScorer: text("actual_top_scorer"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamA: text("team_a").notNull(),
  teamB: text("team_b").notNull(),
  round: integer("round").notNull(),
  position: integer("position").notNull(),
  winner: text("winner"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_matches_round_position").on(table.round, table.position),
]);

export const results = sqliteTable("results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id").notNull().references(() => matches.id).unique(),
  winner: text("winner").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const picks = sqliteTable("picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  matchId: integer("match_id").notNull().references(() => matches.id),
  selectedTeam: text("selected_team").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_picks_user_id").on(table.userId),
  uniqueIndex("idx_picks_user_match").on(table.userId, table.matchId),
]);

export const groups = sqliteTable("groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const groupTeams = sqliteTable("group_teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id").notNull().references(() => groups.id),
  teamName: text("team_name").notNull(),
  finalPosition: integer("final_position"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_group_teams_group_id").on(table.groupId),
]);

export const groupPicks = sqliteTable("group_picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  groupId: integer("group_id").notNull().references(() => groups.id),
  firstPlace: text("first_place").notNull(),
  secondPlace: text("second_place").notNull(),
  thirdPlace: text("third_place"),
  fourthPlace: text("fourth_place"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex("idx_group_picks_user_group").on(table.userId, table.groupId),
]);

export const thirdPlaceAdvancers = sqliteTable("third_place_advancers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id").notNull().references(() => groups.id).unique(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
