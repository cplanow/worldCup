import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  bracketSubmitted: integer("bracket_submitted", { mode: "boolean" })
    .notNull()
    .default(false),
});

export const tournamentConfig = sqliteTable("tournament_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  isLocked: integer("is_locked", { mode: "boolean" }).notNull().default(false),
  pointsR32: integer("points_r32").notNull().default(1),
  pointsR16: integer("points_r16").notNull().default(2),
  pointsQf: integer("points_qf").notNull().default(4),
  pointsSf: integer("points_sf").notNull().default(8),
  pointsFinal: integer("points_final").notNull().default(16),
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
