import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

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
