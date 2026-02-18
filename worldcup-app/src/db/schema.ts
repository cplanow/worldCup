import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull().unique(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    bracketSubmitted: integer("bracket_submitted", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [index("idx_users_username").on(table.username)]
);
