# Story 2.2: Bracket Lock Control

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the admin,
I want to toggle the bracket lock status for all participants,
so that I can control when the entry window opens and closes.

## Acceptance Criteria

1. **AC1: Bracket Lock Toggle UI**
   - **Given** the admin is on the Admin page
   - **When** they view the bracket lock control
   - **Then** a Switch toggle is displayed showing the current lock status (locked/unlocked)

2. **AC2: Lock Brackets**
   - **Given** brackets are currently unlocked
   - **When** the admin toggles the switch to locked
   - **Then** the `tournament_config` table is updated to `is_locked = true` and all participants are immediately prevented from entering or modifying picks

3. **AC3: Unlock Brackets**
   - **Given** brackets are currently locked
   - **When** the admin toggles the switch to unlocked
   - **Then** the `tournament_config` table is updated to `is_locked = false` and participants with unsubmitted brackets can resume entry

4. **AC4: Server-Side Lock Enforcement**
   - **Given** brackets are locked
   - **When** any participant attempts to save a pick or submit a bracket via Server Action
   - **Then** the Server Action checks lock status first and returns `{ success: false, error: "Brackets are locked" }`

5. **AC5: Tournament Config Table Created**
   - **Given** this is the first story requiring tournament configuration
   - **When** the `tournament_config` table is needed
   - **Then** the `tournament_config` table is created via Drizzle schema and migration with columns for id, is_locked, and point values per round (configurable scoring: R32, R16, QF, SF, Final)

## Tasks / Subtasks

- [x] Task 1: Define tournament_config table schema (AC: #5)
  - [x] Add `tournament_config` table definition to `src/db/schema.ts`
  - [x] Columns: `id` (integer, primary key, autoincrement), `is_locked` (integer/boolean, not null, default false), `points_r32` (integer, not null, default 1), `points_r16` (integer, not null, default 2), `points_qf` (integer, not null, default 4), `points_sf` (integer, not null, default 8), `points_final` (integer, not null, default 16), `created_at` (text, not null, default ISO 8601)
  - [x] Run `npx drizzle-kit generate` to create migration
  - [x] Run `npx drizzle-kit migrate` to apply migration to Turso

- [x] Task 2: Create lock control Server Actions (AC: #2, #3, #4)
  - [x] Add to `src/lib/actions/admin.ts`:
    - `toggleLock(locked: boolean): Promise<ActionResult<{ isLocked: boolean }>>` — admin-only, updates `is_locked` in tournament_config
    - `getTournamentConfig(): Promise<TournamentConfig>` — fetches config (creates default row if none exists)
  - [x] Create shared lock check utility in `src/lib/actions/admin.ts`:
    - `checkBracketLock(): Promise<boolean>` — returns true if locked, false if unlocked
    - This function will be imported by `bracket.ts` actions in Epic 3 for server-side lock enforcement
  - [x] All mutation actions verify admin identity via `verifyAdmin()` before executing
  - [x] `revalidatePath("/admin")` after toggling lock
  - [x] Write unit tests in `src/lib/actions/admin.test.ts` (extend existing test file):
    - Test toggleLock rejects non-admin
    - Test toggleLock sets is_locked to true
    - Test toggleLock sets is_locked to false
    - Test getTournamentConfig creates default row if none exists
    - Test getTournamentConfig returns existing config
    - Test checkBracketLock returns correct status

- [x] Task 3: Build BracketLockToggle UI component (AC: #1)
  - [x] Create `src/components/admin/BracketLockToggle.tsx` (client component with `"use client"`)
  - [x] Use shadcn/ui `Switch` component
  - [x] Props: `initialLocked: boolean`
  - [x] Display layout:
    - "Bracket Entry Control" section heading
    - Switch toggle with label
    - Status text: "Brackets are open for entry" (unlocked) or "Brackets are locked — no new picks allowed" (locked)
  - [x] On toggle: call `toggleLock()` Server Action with optimistic UI
  - [x] Loading state: disable Switch during Server Action execution
  - [x] Error handling: revert Switch position on failure, show inline error

- [x] Task 4: Integrate BracketLockToggle into admin page (AC: #1)
  - [x] Update `src/app/(app)/admin/page.tsx`:
    - Fetch tournament config via `getTournamentConfig()`
    - Render BracketLockToggle above MatchupSetup with `isLocked` prop
    - Section separator between lock control and matchup setup

- [x] Task 5: Update enterApp to use real lock status (AC: #4)
  - [x] Update `src/lib/actions/auth.ts`:
    - Import `tournamentConfig` from `@/db/schema`
    - Replace the TODO placeholder at line 78-79 (`const isLocked = false;`) with real DB query
    - ALSO update the race condition catch block at line 111 (`isLocked: false`) — same fix needed there
    - Query `tournament_config` table for `is_locked` value
    - Default to `false` if no config row exists yet
    - Move the lock query BEFORE the try block so both paths use it

- [x] Task 6: Add TournamentConfig type (AC: #5)
  - [x] Add to `src/types/index.ts`:
    ```typescript
    export type TournamentConfig = {
      id: number;
      isLocked: boolean;
      pointsR32: number;
      pointsR16: number;
      pointsQf: number;
      pointsSf: number;
      pointsFinal: number;
      createdAt: string;
    };
    ```

## Dev Notes

### Architecture Compliance

- **Server Actions location:** `src/lib/actions/admin.ts` — extend existing file from Story 2.1, keep all admin actions together
- **Component location:** `src/components/admin/BracketLockToggle.tsx` — per architecture's feature-grouped structure
- **Server Action return shape:** MUST use `ActionResult<T>` from `@/lib/actions/types` for all mutations
- **Lock enforcement is server-side:** Per NFR6, bracket lock enforcement is absolute — no race conditions. The client can show lock state, but the server MUST reject mutations when locked. Never rely on client-side lock checks alone.
- **Single-row config table:** `tournament_config` always has exactly one row. Use get-or-create pattern (not upsert).
- **Validation order in Server Actions:** Check admin identity first → validate input → perform mutation → revalidatePath → return result

### Database Schema Details

```typescript
// Add to src/db/schema.ts alongside existing users and matches tables
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
```

**Design notes:**
- Single-row table: only one tournament config exists. All queries use `.get()` (returns first row or undefined).
- Point values stored here so admin can configure scoring before brackets open (FR24). Default values: R32=1, R16=2, QF=4, SF=8, Final=16.
- Point values are NOT changed after brackets are submitted — they're set once during setup.
- `is_locked` is the only column that changes during tournament lifecycle (toggled by admin).
- The `mode: "boolean"` on `is_locked` makes Drizzle automatically map SQLite integer 0/1 to TypeScript boolean.

### Get-or-Create Pattern for Config

```typescript
// In src/lib/actions/admin.ts
export async function getTournamentConfig(): Promise<TournamentConfig> {
  let config = await db.select().from(tournamentConfig).get();

  if (!config) {
    // Create default config row (unlocked, default point values)
    const result = await db.insert(tournamentConfig).values({}).returning();
    config = result[0];
  }

  return {
    id: config.id,
    isLocked: config.isLocked,
    pointsR32: config.pointsR32,
    pointsR16: config.pointsR16,
    pointsQf: config.pointsQf,
    pointsSf: config.pointsSf,
    pointsFinal: config.pointsFinal,
    createdAt: config.createdAt,
  };
}
```

**IMPORTANT:** `getTournamentConfig()` does NOT require admin auth — it's a read operation used by both admin page AND `enterApp()` for any user. Only `toggleLock()` requires admin auth.

### Lock Toggle Server Action

```typescript
export async function toggleLock(locked: boolean): Promise<ActionResult<{ isLocked: boolean }>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  // Ensure config row exists
  const config = await getTournamentConfig();

  await db.update(tournamentConfig)
    .set({ isLocked: locked })
    .where(eq(tournamentConfig.id, config.id));

  revalidatePath("/admin");
  return { success: true, data: { isLocked: locked } };
}
```

### Shared Lock Check for Future Actions

```typescript
// Export this for use by bracket.ts actions in Epic 3
export async function checkBracketLock(): Promise<boolean> {
  const config = await getTournamentConfig();
  return config.isLocked;
}
```

**Usage in future bracket Server Actions (Epic 3):**
```typescript
// src/lib/actions/bracket.ts (created in Epic 3)
import { checkBracketLock } from "@/lib/actions/admin";

export async function savePick(...) {
  // Step 1: Check lock status FIRST (per validation order from architecture)
  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }
  // ... rest of validation and mutation
}
```

### Updating enterApp() in auth.ts

Story 1.3 left a placeholder for lock status checking in `enterApp()`. This story replaces it with a real database query.

**TWO locations need updating in `auth.ts`:**
1. Line 78-79: `// TODO: Check bracket lock status from tournament_config table (Story 2.2)` + `const isLocked = false;`
2. Line 111: `isLocked: false` in the race condition catch block

**Fix approach:** Query lock status once before the try block so both the happy path and race condition path use the real value:

```typescript
// In src/lib/actions/auth.ts — at the top of enterApp(), after validation, BEFORE the try block:
import { tournamentConfig } from "@/db/schema";

// Query lock status once — both paths need it
const config = await db.select().from(tournamentConfig).get();
const isLocked = config?.isLocked ?? false;

try {
  // ... existing user lookup/create logic ...
  // Use isLocked in both return paths (happy path and race condition catch)
}
```

**Note:** Query `tournament_config` directly here (not via `getTournamentConfig()`) to avoid the auto-create side effect in a non-admin context. Just read the value; if no row exists yet, default to unlocked (`false`).

### BracketLockToggle Component Pattern

```typescript
// src/components/admin/BracketLockToggle.tsx
"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleLock } from "@/lib/actions/admin";

export function BracketLockToggle({ initialLocked }: { initialLocked: boolean }) {
  const [isLocked, setIsLocked] = useState(initialLocked);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(checked: boolean) {
    setIsPending(true);
    setError(null);
    setIsLocked(checked); // Optimistic update

    const result = await toggleLock(checked);

    if (!result.success) {
      setIsLocked(!checked); // Revert on failure
      setError(result.error);
    }
    setIsPending(false);
  }

  return (
    <div className="...">
      <h2>Bracket Entry Control</h2>
      <div className="flex items-center gap-3">
        <Switch
          checked={isLocked}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
        <span>{isLocked ? "Brackets are locked" : "Brackets are open for entry"}</span>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

### UX Design Requirements

- **Switch component:** shadcn/ui Switch, standard toggle with label
- **Visual states:**
  - Unlocked: switch off position, "Brackets are open for entry" in muted/Slate 500 text
  - Locked: switch on position, "Brackets are locked — no new picks allowed" in emphasized text
- **Placement:** Top of admin page, clearly separated from matchup setup section below
- **No confirmation dialog:** Toggle is easily reversible — no "are you sure?" needed (per UX spec: low-stakes, easily reversible actions don't need confirmation)
- **Immediate feedback:** Switch position updates optimistically, server saves in background
- **Error display:** Inline error text below the switch if server action fails (per UX feedback patterns)

### Admin Page Layout After This Story

```
┌─────────────────────────────────┐
│ Tournament Setup                 │
├─────────────────────────────────┤
│ Bracket Entry Control            │
│ [Switch] Brackets are unlocked   │
├─────────────────────────────────┤
│ R32 Matchups (12 of 16)          │
│ 1. Brazil vs Mexico     [Edit]   │
│ 2. Argentina vs Australia [Edit]  │
│ 3. [Team A] vs [Team B] [Save]   │
│ ...                               │
└─────────────────────────────────┘
```

### Previous Story Intelligence

**From Story 2.1 (admin-page-matchup-setup) — completed:**
- `src/lib/actions/admin.ts` already exists with `verifyAdmin()`, `setupMatchup()`, `getMatches()`, `deleteMatchup()`. Extend this file.
- `verifyAdmin()` uses case-insensitive comparison: `username.toLowerCase() === process.env.ADMIN_USERNAME?.toLowerCase()`. Use the same function for lock toggle.
- Admin page Server Component pattern: cookies check → redirect non-admin → fetch data → render components
- `revalidatePath("/admin")` is called after mutations — do the same for toggleLock
- Story 2.1 code review found that chained `.where()` doesn't work with Drizzle — must use `and()` for composite conditions
- 36 total tests passing as of Story 2.1 completion

**From Story 1.3 (returning-user-access):**
- `enterApp()` in `src/lib/actions/auth.ts` has a placeholder for lock status
- The function returns `{ isLocked: boolean }` as part of its response — update it to query real data
- Route group `(app)` already exists with tab navigation including admin tab

### Git Intelligence

Recent commit `b24dc60` (Story 2.1) touched:
- `src/db/schema.ts` — added matches table (add tournament_config alongside)
- `src/lib/actions/admin.ts` — created file (extend with new functions)
- `src/app/(app)/admin/page.tsx` — replaced placeholder (extend with lock toggle)
- `src/components/admin/MatchupSetup.tsx` — created (add sibling BracketLockToggle)
- `src/types/index.ts` — added Match type (add TournamentConfig type)

Code patterns established:
- Drizzle schema uses `integer("column_name", { mode: "boolean" })` for boolean columns (see `users.bracketSubmitted`)
- All admin Server Actions start with `if (!(await verifyAdmin()))` check
- Components follow client component pattern: `"use client"` + `useState` + Server Action calls
- Tests use the existing test infrastructure (Vitest based on Story 2.1 test file patterns)

### Project Structure Notes

- All changes align with architecture-defined project structure
- No new directories created — extends existing `src/components/admin/` and `src/lib/actions/`
- `tournament_config` table completes the data model needed for bracket lock (FR29, FR30) and scoring configuration (FR24)
- The `checkBracketLock()` export establishes the server-side enforcement boundary that Epic 3 will use

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2: Bracket Lock Control]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — tournament_config table]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security — admin identification]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns — Validation order, Server Action return shape]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure — admin components, actions]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy — BracketLockToggle, Switch]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User Journey Flows — Journey 3: Admin Result Entry]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns — Feedback Patterns, Loading States]
- [Source: _bmad-output/planning-artifacts/prd.md#FR29 — Admin toggles bracket lock]
- [Source: _bmad-output/planning-artifacts/prd.md#FR30 — Lock prevents entry/modification]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR6 — Lock enforcement absolute, no race conditions]
- [Source: _bmad-output/implementation-artifacts/2-1-admin-page-matchup-setup.md — Previous story patterns and learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Migration `0002_sturdy_venus.sql` generated and applied successfully for tournament_config table
- Mock DB setup required adding `.get` directly on `mockFrom` return to support `db.select().from(table).get()` pattern (no `.where()` call)
- Auth test mocks updated to provide tournament_config query result as first `mockGet` call since lock status is now queried before user lookup

### Completion Notes List

- Task 1: Added `tournamentConfig` table to Drizzle schema with 8 columns (id, is_locked, points_r32-final, created_at). Generated migration `0002_sturdy_venus.sql` and applied to Turso.
- Task 2: Extended `src/lib/actions/admin.ts` with `getTournamentConfig()` (get-or-create), `toggleLock()` (admin-only), and `checkBracketLock()` (public). 7 new unit tests (24 total admin tests). getTournamentConfig does NOT require admin auth. toggleLock uses revalidatePath.
- Task 3: Created `BracketLockToggle.tsx` client component with shadcn/ui Switch, optimistic UI, error rollback, loading state, and accessible aria-label. Visual states: locked (red text) vs unlocked (muted text).
- Task 4: Updated admin page to fetch tournament config via `getTournamentConfig()` in parallel with `getMatches()`. BracketLockToggle rendered above MatchupSetup with spacing separator.
- Task 5: Updated `enterApp()` in auth.ts — replaced TODO placeholder with real `tournament_config` DB query. Lock status queried once before try block, used in both happy path and race condition catch block. Defaults to `false` if no config row exists.
- Task 6: Added `TournamentConfig` type to `src/types/index.ts` with all 8 fields.

### Change Log

- 2026-02-18: Implemented Story 2.2 — all 6 tasks complete, 8 new tests, 44 total tests passing
- 2026-02-18: Code review fixes — 3 issues fixed (1 HIGH, 2 MEDIUM): H1 getTournamentConfig race condition on concurrent auto-create (re-query after insert for canonical row), M1 boolean type validation on toggleLock, M2 documented as resolved by H1 defensive pattern. 1 new test added (25 admin tests, 45 total passing).

### File List

- `worldcup-app/src/db/schema.ts` (modified) — added `tournamentConfig` table definition
- `worldcup-app/src/db/migrations/0002_sturdy_venus.sql` (created) — tournament_config table migration
- `worldcup-app/src/db/migrations/meta/0002_snapshot.json` (created) — migration snapshot
- `worldcup-app/src/db/migrations/meta/_journal.json` (modified) — migration journal updated
- `worldcup-app/src/lib/actions/admin.ts` (modified) — added `getTournamentConfig()`, `toggleLock()`, `checkBracketLock()`
- `worldcup-app/src/lib/actions/admin.test.ts` (modified) — 7 new unit tests for tournament config and lock functions
- `worldcup-app/src/lib/actions/auth.ts` (modified) — replaced lock status placeholder with real DB query
- `worldcup-app/src/lib/actions/auth.test.ts` (modified) — updated mocks for tournament_config query, added isLocked=true test
- `worldcup-app/src/components/admin/BracketLockToggle.tsx` (created) — client component for bracket lock Switch toggle
- `worldcup-app/src/app/(app)/admin/page.tsx` (modified) — integrated BracketLockToggle above MatchupSetup
- `worldcup-app/src/types/index.ts` (modified) — added `TournamentConfig` type
