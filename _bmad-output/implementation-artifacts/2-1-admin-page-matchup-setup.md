# Story 2.1: Admin Page & Matchup Setup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the admin,
I want to input all 16 R32 matchups (Team A vs Team B),
so that the tournament bracket is ready for participants to make their picks.

## Acceptance Criteria

1. **AC1: Admin Matchup Setup Interface**
   - **Given** the admin user navigates to the Admin tab
   - **When** the admin page loads
   - **Then** a matchup setup interface is displayed where the admin can input 16 R32 matchups (Team A vs Team B for each game)

2. **AC2: Match Persistence**
   - **Given** the admin is on the matchup setup interface
   - **When** they enter two team names for a matchup and save
   - **Then** the match is stored in the `matches` table with team_a, team_b, round, and match position

3. **AC3: Non-Admin Protection**
   - **Given** a non-admin user attempts to access the `/admin` route
   - **When** the server checks the username against `ADMIN_USERNAME`
   - **Then** the admin UI is not rendered and the user is redirected to the leaderboard

4. **AC4: Matches Table Created**
   - **Given** this is the first story requiring match data
   - **When** the `matches` table is needed
   - **Then** the `matches` table is created via Drizzle schema and migration with columns for id, team_a, team_b, round, position, winner, and created_at

5. **AC5: All 16 Matchups Complete**
   - **Given** the admin has entered all 16 R32 matchups
   - **When** the setup is complete
   - **Then** all 16 matches are persisted and ready for bracket entry by participants

## Tasks / Subtasks

- [x] Task 1: Define matches table schema (AC: #4)
  - [x] Add `matches` table definition to `src/db/schema.ts`
  - [x] Columns: `id` (integer, primary key, autoincrement), `team_a` (text, not null), `team_b` (text, not null), `round` (integer, not null), `position` (integer, not null), `winner` (text, nullable — set when result entered in Epic 5), `created_at` (text, not null, default ISO 8601)
  - [x] Add composite index: `idx_matches_round_position` on `(round, position)` for ordered retrieval
  - [x] Run `npx drizzle-kit generate` to create migration
  - [x] Run `npx drizzle-kit migrate` to apply migration to Turso

- [x] Task 2: Create admin Server Actions for matchup setup (AC: #2, #5)
  - [x] Create `src/lib/actions/admin.ts` with `"use server"` directive
  - [x] Implement `setupMatchup(data: { teamA: string; teamB: string; position: number }): Promise<ActionResult<{ matchId: number }>>`
    - Validate admin identity (check session cookie against `ADMIN_USERNAME`)
    - Validate both team names are non-empty
    - Validate position is 1-16
    - Insert or update match in `matches` table (round = 1, position from input)
    - Return match ID on success
  - [x] Implement `getMatches(): Promise<Match[]>` — fetch all matches ordered by round, position
  - [x] Implement `deleteMatchup(matchId: number): Promise<ActionResult<null>>` — remove a matchup (admin only)
  - [x] All actions verify admin identity before executing

- [x] Task 3: Build admin matchup setup UI (AC: #1, #5)
  - [x] Replace placeholder in `src/app/(app)/admin/page.tsx` with full admin page
  - [x] Admin page is a Server Component that:
    - Verifies admin identity (redirect non-admin to `/leaderboard`)
    - Fetches existing matches from DB
    - Renders the matchup setup interface
  - [x] Create `src/components/admin/MatchupSetup.tsx` (client component for form interaction):
    - Display 16 matchup slots numbered 1-16
    - Each slot shows: position number, Team A input, "vs" label, Team B input, Save button
    - Already-saved matchups show team names with an Edit button to modify
    - Progress indicator: "X of 16 matchups configured"
    - All 16 slots always visible — empty ones show input fields, saved ones show team names
  - [x] Style per UX spec:
    - Match cards stacked vertically
    - Input fields: 16px font, generous padding
    - Save button per matchup: Slate 900 background, white text
    - Saved matchup: team names displayed with subtle background, Edit button as secondary action

- [x] Task 4: Add Match type to shared types (AC: #4)
  - [x] Add `Match` type to `src/types/index.ts`:
    ```typescript
    export type Match = {
      id: number;
      teamA: string;
      teamB: string;
      round: number;
      position: number;
      winner: string | null;
      createdAt: string;
    };
    ```

## Dev Notes

### Architecture Compliance

- **Admin page location:** `src/app/(app)/admin/page.tsx` — already exists as placeholder from Story 1.3
- **Admin Server Actions:** `src/lib/actions/admin.ts` — per architecture, all admin actions in one file
- **Admin components:** `src/components/admin/` — per architecture's feature-grouped directory structure
- **Admin identity check:** Every Server Action in `admin.ts` must verify admin identity before executing
- **Server Action return shape:** MUST use `ActionResult<T>` from `@/lib/actions/types`

### Database Schema Details

```typescript
// Add to src/db/schema.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

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
```

**Round numbering convention:**
- Round 1 = R32 (Round of 32) — 16 matches
- Round 2 = R16 (Round of 16) — 8 matches
- Round 3 = QF (Quarterfinals) — 4 matches
- Round 4 = SF (Semifinals) — 2 matches
- Round 5 = Final — 1 match

**Position numbering:** Within each round, matches are numbered 1 through N. Position determines bracket placement and which matches feed into which later-round matches. For R32 (round 1), positions 1-16. Positions 1 and 2 feed into R16 position 1, positions 3 and 4 feed into R16 position 2, etc.

### Match Position → Next Round Mapping

```
R32 positions 1,2  → R16 position 1
R32 positions 3,4  → R16 position 2
R32 positions 5,6  → R16 position 3
R32 positions 7,8  → R16 position 4
R32 positions 9,10 → R16 position 5
R32 positions 11,12 → R16 position 6
R32 positions 13,14 → R16 position 7
R32 positions 15,16 → R16 position 8
```

General formula: `nextRoundPosition = Math.ceil(currentPosition / 2)`

This mapping is critical for bracket rendering and cascading pick logic in Epic 3. The admin only enters R32 matches — later round matches are implicit from the bracket structure.

### Admin Identity Verification Pattern

```typescript
// src/lib/actions/admin.ts
"use server";

import { cookies } from "next/headers";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";

async function verifyAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
  return username === process.env.ADMIN_USERNAME;
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

  if (position < 1 || position > 16) {
    return { success: false, error: "Position must be between 1 and 16" };
  }

  // Upsert: check if match at this position already exists
  const existing = await db.select().from(matches)
    .where(eq(matches.round, 1))
    .where(eq(matches.position, position))
    .get();

  if (existing) {
    // Update existing match
    await db.update(matches)
      .set({ teamA: teamA.trim(), teamB: teamB.trim() })
      .where(eq(matches.id, existing.id));
    return { success: true, data: { matchId: existing.id } };
  }

  // Insert new match
  const result = await db.insert(matches)
    .values({ teamA: teamA.trim(), teamB: teamB.trim(), round: 1, position })
    .returning();

  return { success: true, data: { matchId: result[0].id } };
}
```

### Validation Order (per architecture)

1. Verify admin identity (fast rejection for non-admin)
2. Validate input data (team names non-empty, position valid)
3. Perform mutation (insert/update match)
4. Return result

### UX Design Requirements

- **Admin page:** Only visible when logged in as admin. Third tab in navigation.
- **Match list:** Matches as simple two-team input rows, numbered 1-16
- **Saved state:** Saved matches show team names (not input fields) with an Edit button
- **No confirmation needed:** Saving a matchup is low-stakes and easily editable. No confirm dialog.
- **Feedback:** Success = match row updates to show saved state. No toast. Error = inline below the row.
- **Progress:** "X of 16 matchups configured" helps admin track setup completion

### Admin Page Server Component Pattern

```typescript
// src/app/(app)/admin/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { asc } from "drizzle-orm";
import { MatchupSetup } from "@/components/admin/MatchupSetup";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (username !== process.env.ADMIN_USERNAME) {
    redirect("/leaderboard");
  }

  const allMatches = await db.select().from(matches).orderBy(asc(matches.position));

  return (
    <div>
      <h1>Admin - Tournament Setup</h1>
      <MatchupSetup existingMatches={allMatches} />
    </div>
  );
}
```

### Previous Story Context

**Story 1.1:** Project scaffolding, DB connection, empty schema, ActionResult type
**Story 1.2:** Users table, createUser action, landing page, cookie-based session
**Story 1.3:** enterApp action, state-based routing, `(app)` route group with tab nav, admin page placeholder with server-side protection, TabNav component

**This story builds on:**
- `src/db/schema.ts` — has `users` table, add `matches` table alongside it
- `src/app/(app)/admin/page.tsx` — replace placeholder with real admin matchup setup
- `src/lib/actions/` — add `admin.ts` alongside existing `auth.ts`
- `src/components/admin/` — empty directory scaffolded in Story 1.1, add MatchupSetup component
- `src/types/index.ts` — has `User` type, add `Match` type
- Tab navigation from Story 1.3 already shows Admin tab for admin user

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema.ts` | Modified | Add `matches` table definition |
| `src/db/migrations/0001_*.sql` | Created | Second migration (matches table) |
| `src/lib/actions/admin.ts` | Created | `setupMatchup()`, `getMatches()`, `deleteMatchup()`, `verifyAdmin()` |
| `src/app/(app)/admin/page.tsx` | Modified | Replace placeholder with matchup setup interface |
| `src/components/admin/MatchupSetup.tsx` | Created | Client component for 16-matchup input form |
| `src/types/index.ts` | Modified | Add `Match` type |

### Naming Conventions Reminder

- Database table: `matches` (snake_case, plural)
- Database columns: `team_a`, `team_b`, `created_at` (snake_case)
- TypeScript properties: `teamA`, `teamB`, `createdAt` (camelCase — Drizzle maps)
- Server Action file: `admin.ts` (kebab-case)
- Server Action functions: `setupMatchup()`, `getMatches()`, `deleteMatchup()` (camelCase verbs)
- Component: `MatchupSetup.tsx` (PascalCase)
- Type: `Match` (PascalCase)

### Testing Considerations

Manual testing checklist:
- [ ] Admin can see matchup setup interface on Admin tab
- [ ] Non-admin user redirected to `/leaderboard` when accessing `/admin`
- [ ] Admin can enter Team A and Team B for a matchup and save
- [ ] Saved matchup persists across page reloads
- [ ] Admin can edit an existing matchup
- [ ] Admin can configure all 16 matchups
- [ ] Progress counter shows correct count (e.g., "12 of 16 matchups configured")
- [ ] Empty team name validation prevents save
- [ ] Server Action rejects non-admin callers

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1: Admin Page & Matchup Setup]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - AdminMatchCard]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User Journey Flows - Journey 3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR28]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Migration `0001_keen_shard.sql` also drops redundant `idx_users_username` index (unique index already covers it)
- Used `and()` for composite where clause on round+position (story dev notes sample used chained `.where()` which doesn't work with Drizzle)

### Completion Notes List

- Task 1: Added `matches` table to Drizzle schema with all required columns and composite index. Generated migration `0001_keen_shard.sql` and applied to Turso.
- Task 2: Created `src/lib/actions/admin.ts` with `verifyAdmin()`, `setupMatchup()`, `getMatches()`, `deleteMatchup()`. All actions verify admin identity. setupMatchup uses upsert pattern (insert or update by round+position). 12 unit tests covering auth, validation, insert, update, trim, getMatches, and delete.
- Task 3: Replaced admin page placeholder with Server Component that fetches matches and renders `MatchupSetup` client component. MatchupSetup displays 16 numbered slots, progress counter, inline save/edit/delete per matchup, inline error display. Styled per UX spec (Slate 900 save buttons, subtle bg for saved state).
- Task 4: Added `Match` type to `src/types/index.ts` with all required fields.

### Change Log

- 2026-02-18: Implemented Story 2.1 — all 4 tasks complete, 12 new unit tests, 31 total tests passing
- 2026-02-18: Code review fixes — 6 issues fixed (3 HIGH, 3 MEDIUM): H1 case-sensitivity in verifyAdmin(), H2 admin check on getMatches(), H3 ActionResult return type for getMatches(), M1 matchId validation in deleteMatchup(), M2 integer validation for position, M3 revalidatePath after mutations. Admin page updated to use getMatches() action instead of direct DB query. 5 new tests added (17 total admin tests, 36 total tests passing).

### File List

- `src/db/schema.ts` (modified) — added `matches` table with composite index
- `src/db/migrations/0001_keen_shard.sql` (created) — matches table migration
- `src/db/migrations/meta/0001_snapshot.json` (created) — migration snapshot
- `src/db/migrations/meta/_journal.json` (modified) — migration journal updated
- `src/lib/actions/admin.ts` (created) — setupMatchup, getMatches, deleteMatchup server actions
- `src/lib/actions/admin.test.ts` (created) — 12 unit tests for admin actions
- `src/app/(app)/admin/page.tsx` (modified) — replaced placeholder with matchup setup interface
- `src/components/admin/MatchupSetup.tsx` (created) — client component for 16-matchup form
- `src/types/index.ts` (modified) — added Match type
