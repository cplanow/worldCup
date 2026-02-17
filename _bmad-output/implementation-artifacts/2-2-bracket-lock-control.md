# Story 2.2: Bracket Lock Control

Status: ready-for-dev

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

- [ ] Task 1: Define tournament_config table schema (AC: #5)
  - [ ] Add `tournament_config` table definition to `src/db/schema.ts`
  - [ ] Columns: `id` (integer, primary key, autoincrement), `is_locked` (integer/boolean, not null, default false), `points_r32` (integer, not null, default 1), `points_r16` (integer, not null, default 2), `points_qf` (integer, not null, default 4), `points_sf` (integer, not null, default 8), `points_final` (integer, not null, default 16), `created_at` (text, not null, default ISO 8601)
  - [ ] Run `npx drizzle-kit generate` to create migration
  - [ ] Run `npx drizzle-kit migrate` to apply migration
  - [ ] Seed initial config row (single row table — only one tournament config exists)

- [ ] Task 2: Create lock control Server Actions (AC: #2, #3, #4)
  - [ ] Add to `src/lib/actions/admin.ts`:
    - `toggleLock(locked: boolean): Promise<ActionResult<{ isLocked: boolean }>>` — admin-only, updates `is_locked` in tournament_config
    - `getTournamentConfig(): Promise<TournamentConfig>` — fetches config (creates default row if none exists)
  - [ ] Create shared lock check utility in `src/lib/actions/admin.ts`:
    - `checkBracketLock(): Promise<boolean>` — returns true if locked, false if unlocked
    - This function will be imported by `bracket.ts` actions in Epic 3 for server-side lock enforcement
  - [ ] All mutation actions verify admin identity via `verifyAdmin()` before executing

- [ ] Task 3: Build bracket lock toggle UI (AC: #1)
  - [ ] Create `src/components/admin/BracketLockToggle.tsx` (client component)
  - [ ] Use shadcn/ui `Switch` component
  - [ ] Display: "Bracket Entry" label, Switch toggle, current status text ("Locked" / "Unlocked")
  - [ ] On toggle: call `toggleLock()` Server Action, update UI optimistically
  - [ ] Show lock status with visual distinction:
    - Unlocked: green accent, "Brackets are open for entry"
    - Locked: red accent, "Brackets are locked — no new picks allowed"
  - [ ] Loading state: disable Switch during Server Action execution

- [ ] Task 4: Add BracketLockToggle to admin page (AC: #1)
  - [ ] Update `src/app/(app)/admin/page.tsx` to include BracketLockToggle above the matchup setup
  - [ ] Fetch tournament config in the Server Component and pass `isLocked` as prop
  - [ ] Admin page layout: Lock control section at top, matchup setup section below

- [ ] Task 5: Update enterApp to use real lock status (AC: #4)
  - [ ] Update `enterApp()` in `src/lib/actions/auth.ts` to query `tournament_config` for real `is_locked` value
  - [ ] Remove the TODO/try-catch placeholder from Story 1.3
  - [ ] Import `tournamentConfig` from `@/db/schema` and query it properly

- [ ] Task 6: Add TournamentConfig type to shared types (AC: #5)
  - [ ] Add `TournamentConfig` type to `src/types/index.ts`:
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

- **Server Actions location:** `src/lib/actions/admin.ts` — extend existing file from Story 2.1
- **Component location:** `src/components/admin/BracketLockToggle.tsx` — per architecture's feature-grouped structure
- **Lock enforcement is server-side:** Per NFR6, bracket lock enforcement is absolute — no race conditions. The client can show lock state, but the server MUST reject mutations when locked. Never rely on client-side lock checks alone.
- **Single-row config table:** `tournament_config` always has exactly one row. Use upsert or "get or create" pattern.

### Database Schema Details

```typescript
// Add to src/db/schema.ts
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
- Single-row table: only one tournament config exists. All queries use `.get()` (returns first row).
- Point values stored here so admin can configure scoring before brackets open (FR24).
- Point values are NOT changed after brackets are submitted — they're set once during setup.
- `is_locked` is the only column that changes during tournament lifecycle.

### Get-or-Create Pattern for Config

```typescript
// In src/lib/actions/admin.ts
export async function getTournamentConfig(): Promise<TournamentConfig> {
  let config = await db.select().from(tournamentConfig).get();

  if (!config) {
    // Create default config row
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

  return { success: true, data: { isLocked: locked } };
}
```

### Shared Lock Check for Other Actions

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
  // Step 1: Check lock status FIRST (per validation order)
  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }
  // ... rest of validation and mutation
}
```

### Updating enterApp() in auth.ts

Story 1.3 left a TODO placeholder for lock status checking. Replace it:

```typescript
// In src/lib/actions/auth.ts — update the enterApp function
import { tournamentConfig } from "@/db/schema";

// Replace the try/catch TODO block with:
const config = await db.select().from(tournamentConfig).get();
const isLocked = config?.isLocked ?? false;
```

### UX Design Requirements

- **Switch component:** shadcn/ui Switch, standard toggle with label
- **Visual states:**
  - Unlocked: switch off position, "Brackets are open for entry" in muted text
  - Locked: switch on position, "Brackets are locked" with emphasis
- **Placement:** Top of admin page, clearly separated from matchup setup section below
- **No confirmation dialog:** Toggle is easily reversible — no "are you sure?" needed
- **Immediate feedback:** Switch position updates optimistically, server saves in background

### Admin Page Layout After This Story

```
┌─────────────────────────────────┐
│ Admin - Tournament Setup        │
├─────────────────────────────────┤
│ Bracket Entry Control           │
│ [Switch] Brackets are unlocked  │
├─────────────────────────────────┤
│ R32 Matchups (12 of 16)         │
│ 1. Brazil vs Mexico     [Edit]  │
│ 2. Argentina vs Australia [Edit] │
│ 3. [Team A] vs [Team B] [Save]  │
│ ...                              │
└─────────────────────────────────┘
```

### Previous Story Context

**Story 1.1-1.2:** Project scaffolding, users table, auth actions, landing page
**Story 1.3:** enterApp action (with lock status TODO), route group, tab nav, admin placeholder
**Story 2.1:** Matches table, admin Server Actions file (`admin.ts`) with `verifyAdmin()`, `setupMatchup()`, MatchupSetup component, admin page with matchup interface

**This story builds on:**
- `src/db/schema.ts` — has `users` and `matches` tables, add `tournament_config` table
- `src/lib/actions/admin.ts` — has `verifyAdmin()`, `setupMatchup()`, add `toggleLock()`, `getTournamentConfig()`, `checkBracketLock()`
- `src/lib/actions/auth.ts` — update `enterApp()` to use real lock status
- `src/app/(app)/admin/page.tsx` — add BracketLockToggle above existing MatchupSetup
- `src/components/admin/` — has MatchupSetup, add BracketLockToggle
- `src/types/index.ts` — has `User` and `Match`, add `TournamentConfig`

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema.ts` | Modified | Add `tournament_config` table definition |
| `src/db/migrations/0002_*.sql` | Created | Third migration (tournament_config table) |
| `src/lib/actions/admin.ts` | Modified | Add `toggleLock()`, `getTournamentConfig()`, `checkBracketLock()` |
| `src/lib/actions/auth.ts` | Modified | Update `enterApp()` to query real lock status |
| `src/app/(app)/admin/page.tsx` | Modified | Add BracketLockToggle section above matchup setup |
| `src/components/admin/BracketLockToggle.tsx` | Created | Client component for lock toggle Switch |
| `src/types/index.ts` | Modified | Add `TournamentConfig` type |

### Naming Conventions Reminder

- Database table: `tournament_config` (snake_case, singular — this is a config table, not an entity collection)
- Database columns: `is_locked`, `points_r32`, `points_qf` (snake_case)
- TypeScript properties: `isLocked`, `pointsR32`, `pointsQf` (camelCase)
- Server Action functions: `toggleLock()`, `getTournamentConfig()`, `checkBracketLock()` (camelCase verbs)
- Component: `BracketLockToggle.tsx` (PascalCase)
- Type: `TournamentConfig` (PascalCase)

### Testing Considerations

Manual testing checklist:
- [ ] Admin sees lock toggle on admin page
- [ ] Toggle switch changes lock status in database
- [ ] Switch reflects current lock state on page reload
- [ ] Non-admin cannot call `toggleLock()` (returns unauthorized error)
- [ ] After locking, `enterApp()` returns `isLocked: true` for all users
- [ ] After unlocking, `enterApp()` returns `isLocked: false`
- [ ] Lock toggle is independent of matchup setup — both work on same page
- [ ] Default config row is auto-created on first access (unlocked, default point values)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2: Bracket Lock Control]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - BracketLockToggle]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User Journey Flows - Journey 3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR29, FR30]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR6 - Lock enforcement absolute]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
