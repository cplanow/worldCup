# Story 5.1: Admin Result Entry

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the admin,
I want to select a completed match and enter the winning team,
so that scores are calculated and the leaderboard updates for all participants.

## Acceptance Criteria

1. **AC1: Match List Display**
   - **Given** the admin is on the Admin page
   - **When** they view the match list
   - **Then** all matches are displayed grouped by round, with unresolved matches visually distinct from resolved ones

2. **AC2: Winner Selection**
   - **Given** the admin taps an unresolved match
   - **When** they tap the winning team
   - **Then** the selected team is highlighted and confirm/cancel buttons appear below the AdminMatchCard

3. **AC3: Result Confirmation**
   - **Given** the admin has selected a winner and tapped "Confirm"
   - **When** the `enterResult()` Server Action is called
   - **Then** the result is saved, all participant scores are recalculated via the scoring engine, and the match card updates to show the resolved state

4. **AC4: Cancel Selection**
   - **Given** the admin taps "Cancel" after selecting a winner
   - **When** the cancel action is processed
   - **Then** the selection is cleared and the match returns to its unresolved state without saving

5. **AC5: Results Table Created**
   - **Given** this is the first story requiring result data
   - **When** the `results` table is needed
   - **Then** the `results` table is created via Drizzle schema and migration with columns for id, match_id, winner, and created_at

## Tasks / Subtasks

- [x] Task 1: Define results table schema (AC: #5)
  - [x] Add `results` table to `src/db/schema.ts`
  - [x] Columns: `id` (integer, primary key, autoincrement), `matchId` (integer, not null, references matches.id, unique), `winner` (text, not null), `createdAt` (text, not null, default ISO 8601)
  - [x] Unique constraint on `matchId` — one result per match
  - [x] Run `npx drizzle-kit generate` and `npx drizzle-kit migrate`

- [x] Task 2: Implement enterResult Server Action (AC: #3)
  - [x] Add to `src/lib/actions/admin.ts`:
  - [x] `enterResult(data: { matchId: number; winner: string }): Promise<ActionResult<null>>`
    - Verify admin identity
    - Validate match exists
    - Validate winner is one of the teams in that match
    - Insert result into `results` table (or update if already exists — for correction flow in Story 5.2)
    - Update `matches.winner` column as well (denormalized for easy querying)
    - Also update later-round match slots: the winning team advances to the next match position. Update the `teamA` or `teamB` of the next match based on position mapping.
    - Return success

- [x] Task 3: Build AdminMatchCard component (AC: #2, #4)
  - [x] Create `src/components/admin/AdminMatchCard.tsx` (client component)
  - [x] Props: `match: Match`, `result: Result | null`, `onConfirm` callback, `onCancel` callback
  - [x] States:
    - **Unresolved:** Both teams neutral, slightly more prominent border, tappable
    - **Winner selected (pending confirm):** Selected team highlighted (Emerald 50), confirm/cancel buttons visible below card
    - **Resolved:** Winner highlighted with "Result saved" indicator, tappable to re-enter correction flow (Story 5.2)
  - [x] Confirm button: Slate 900 bg, white text, "Confirm Result"
  - [x] Cancel button: white bg, Slate 200 border, Slate 700 text, "Cancel"
  - [x] Confirmation step is intentional — this is the one place where "are you sure?" is appropriate (per UX spec)

- [x] Task 4: Build admin results section (AC: #1)
  - [x] Update `src/app/(app)/admin/page.tsx`:
  - [x] Add "Match Results" section below bracket lock and matchup setup
  - [x] Fetch all matches and results in Server Component
  - [x] Group matches by round for display
  - [x] Create `src/components/admin/ResultsManager.tsx` (client component):
    - Displays matches grouped under round headers
    - Unresolved matches visually distinct (bolder border, "No result" badge)
    - Resolved matches show winner with subtle "saved" indicator
    - Each match rendered as AdminMatchCard
    - On confirm: calls `enterResult()` Server Action
    - On success: updates local state to show resolved

- [x] Task 5: Advance winning team to next round (AC: #3)
  - [x] When a result is entered, update the next-round match's team slot:
    - Winning team from `(round, position)` goes to `(round+1, ceil(position/2))`
    - If position is odd → set `teamA` of next match
    - If position is even → set `teamB` of next match
  - [x] This enables later-round matches to display actual team names
  - [x] Add `advanceWinner()` helper in `src/lib/actions/admin.ts`

- [x] Task 6: Add Result type to shared types (AC: #5)
  - [x] Add to `src/types/index.ts`:
    ```typescript
    export type Result = {
      id: number;
      matchId: number;
      winner: string;
      createdAt: string;
    };
    ```

## Dev Notes

### Architecture Compliance

- **Server Actions:** `src/lib/actions/admin.ts` — extends existing admin actions
- **Component:** `src/components/admin/AdminMatchCard.tsx`, `src/components/admin/ResultsManager.tsx`
- **Result entry triggers scoring recalculation:** Per architecture, the Server Action saves the result, and the NEXT leaderboard page load recomputes scores via the scoring engine. No immediate push to clients — page refresh shows updated data.
- **Confirmation step:** This is the only place in the app with a confirm dialog — per UX spec

### Database Schema

```typescript
// Add to src/db/schema.ts
export const results = sqliteTable("results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  matchId: integer("match_id").notNull().references(() => matches.id).unique(),
  winner: text("winner").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
```

**Dual storage:** Results are stored in BOTH `results` table (source of truth) AND `matches.winner` column (denormalized for easy querying). The scoring engine can use either source. This redundancy simplifies queries while keeping a clean results audit trail.

### enterResult Server Action

```typescript
export async function enterResult(data: {
  matchId: number;
  winner: string;
}): Promise<ActionResult<null>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  const match = await db.select().from(matches).where(eq(matches.id, data.matchId)).get();
  if (!match) return { success: false, error: "Match not found" };

  // Validate winner is one of the teams
  if (data.winner !== match.teamA && data.winner !== match.teamB) {
    return { success: false, error: "Winner must be one of the teams in this match" };
  }

  // Upsert result
  const existing = await db.select().from(results).where(eq(results.matchId, data.matchId)).get();
  if (existing) {
    await db.update(results).set({ winner: data.winner }).where(eq(results.id, existing.id));
  } else {
    await db.insert(results).values({ matchId: data.matchId, winner: data.winner });
  }

  // Update denormalized winner on matches table
  await db.update(matches).set({ winner: data.winner }).where(eq(matches.id, data.matchId));

  // Advance winner to next round
  await advanceWinner(match.round, match.position, data.winner);

  return { success: true, data: null };
}

async function advanceWinner(round: number, position: number, winner: string) {
  if (round >= 5) return; // Final — no next round

  const nextRound = round + 1;
  const nextPosition = Math.ceil(position / 2);
  const isTeamA = position % 2 === 1; // Odd position → teamA slot

  const nextMatch = await db.select().from(matches)
    .where(and(eq(matches.round, nextRound), eq(matches.position, nextPosition)))
    .get();

  if (nextMatch) {
    await db.update(matches)
      .set(isTeamA ? { teamA: winner } : { teamB: winner })
      .where(eq(matches.id, nextMatch.id));
  }
}
```

### Score Recalculation Approach

Scores are NOT recalculated inside `enterResult()`. Instead:
- The leaderboard page Server Component fetches all data and calls the scoring engine on every load
- This means scores are always re-derived from source data (picks + results) — per NFR5
- No stale cached scores, no incremental accumulation
- At 12 users × 31 picks × 31 matches, this computation is trivial (sub-millisecond)

### Admin Page Layout After This Story

```
┌─────────────────────────────────┐
│ Admin - Tournament Management    │
├─────────────────────────────────┤
│ Bracket Entry Control            │
│ [Switch] Brackets are locked     │
├─────────────────────────────────┤
│ R32 Matchups (16 of 16)          │
│ 1. Brazil vs Mexico       [Edit] │
│ ...                              │
├─────────────────────────────────┤
│ Match Results                    │
│                                  │
│ Round of 32                      │
│ Brazil vs Mexico [✓ Brazil]      │
│ Argentina vs Australia [No result]│
│ ...                              │
│                                  │
│ Round of 16                      │
│ Brazil vs ??? [No result]        │
│ ...                              │
└─────────────────────────────────┘
```

### Previous Story Context

**Story 2.1-2.2:** Admin page with matchup setup and bracket lock. `admin.ts` has `verifyAdmin()`, `setupMatchup()`, `toggleLock()`, `getTournamentConfig()`, `checkBracketLock()`
**Story 4.1-4.4:** Scoring engine complete, leaderboard display. Scoring engine expects results as `{ matchId, winner }[]`

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema.ts` | Modified | Add `results` table |
| `src/db/migrations/0004_*.sql` | Created | Fifth migration (results table) |
| `src/lib/actions/admin.ts` | Modified | Add `enterResult()`, `advanceWinner()` |
| `src/components/admin/AdminMatchCard.tsx` | Created | Result entry with confirm/cancel |
| `src/components/admin/ResultsManager.tsx` | Created | Results section with grouped matches |
| `src/app/(app)/admin/page.tsx` | Modified | Add results section |
| `src/types/index.ts` | Modified | Add `Result` type |

### Testing Considerations

- [ ] Admin can see match list grouped by round
- [ ] Unresolved matches visually distinct from resolved
- [ ] Tap team → confirm/cancel appears
- [ ] Confirm saves result, match shows resolved state
- [ ] Cancel clears selection without saving
- [ ] Winning team advances to next round's match slot
- [ ] Leaderboard reflects updated scores after page reload
- [ ] Non-admin cannot call `enterResult()`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1: Admin Result Entry]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - AdminMatchCard]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User Journey Flows - Journey 3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR31, FR25]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation followed story spec exactly with no blockers.

### Completion Notes List

- Added `results` table to schema with unique constraint on `matchId` (dual-storage: results table + matches.winner denormalized column)
- Migration `0004_superb_silver_centurion.sql` generated and applied to Turso DB
- `enterResult()` server action: admin auth, match validation, winner validation, upsert pattern (supports Story 5.2 correction flow out of the box), revalidates `/admin`, `/leaderboard`, and `/bracket`
- `advanceWinner()` private helper: positions odd → teamA slot, even → teamB slot, no-op at round 5 (Final)
- `AdminMatchCard` three-state client component: unresolved (bolder border + "No result" badge), pending confirm (Emerald 50 highlight + confirm/cancel buttons), resolved (Emerald 100 winner highlight + "Result saved" indicator)
- Correction-mode fix: winner highlight suppressed when a new team is selected on a resolved card — only the newly selected team is highlighted
- `ResultsManager` manages optimistic local state after confirm — no page reload required to see resolved state
- Admin page fetches matches, config, and results in parallel; passes to ResultsManager
- Code review fixes applied: added `revalidatePath("/bracket")`, fixed dual-highlight in correction mode, added "No result" badge, added 27 unit tests for AdminMatchCard and ResultsManager
- 238/238 tests pass

### File List

- `worldcup-app/src/db/schema.ts` — added `results` table
- `worldcup-app/src/db/migrations/0004_superb_silver_centurion.sql` — migration for results table
- `worldcup-app/src/db/migrations/meta/_journal.json` — updated by drizzle-kit generate
- `worldcup-app/src/types/index.ts` — added `Result` type
- `worldcup-app/src/lib/actions/admin.ts` — added `getResults()`, `enterResult()`, `advanceWinner()`; added `revalidatePath("/bracket")`
- `worldcup-app/src/components/admin/AdminMatchCard.tsx` — new component; fixed correction-mode dual-highlight; added "No result" badge
- `worldcup-app/src/components/admin/AdminMatchCard.test.tsx` — new test file (16 tests)
- `worldcup-app/src/components/admin/ResultsManager.tsx` — new component
- `worldcup-app/src/components/admin/ResultsManager.test.tsx` — new test file (11 tests)
- `worldcup-app/src/app/(app)/admin/page.tsx` — added Match Results section

### Change Log

- 2026-02-21: Implemented Story 5.1 — Admin Result Entry. Added results table, enterResult server action with winner advancement, AdminMatchCard and ResultsManager components, Match Results section on admin page.
