# Story 3.1: Bracket Data Model & Match Display

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant,
I want to view all R32 matchups in a bracket format,
so that I can see the tournament structure and begin making my picks.

## Acceptance Criteria

1. **AC1: R32 Matchup Display**
   - **Given** the admin has set up R32 matchups and brackets are unlocked
   - **When** a new participant navigates to the bracket view
   - **Then** all 16 R32 matchups are displayed as MatchCard components showing Team A vs Team B

2. **AC2: Desktop Bracket Tree**
   - **Given** the participant is on a desktop browser (>= 768px)
   - **When** the bracket view renders
   - **Then** a BracketTree component displays all rounds (R32 through Final) as columns flowing left to right with connector lines between rounds

3. **AC3: Mobile Round View**
   - **Given** the participant is on a mobile browser (< 768px)
   - **When** the bracket view renders
   - **Then** a RoundView component displays the current round's matchups as vertically stacked MatchCards with left/right navigation between rounds

4. **AC4: Default State**
   - **Given** the bracket view is loaded
   - **When** no picks have been made yet
   - **Then** all MatchCards are in their default state (both teams neutral, ready for selection) and later-round slots are empty

5. **AC5: Picks Table Created**
   - **Given** this is the first story requiring pick data
   - **When** the `picks` table is needed
   - **Then** the `picks` table is created via Drizzle schema and migration with columns for id, user_id, match_id, selected_team, and created_at

## Tasks / Subtasks

- [ ] Task 1: Define picks table schema (AC: #5)
  - [ ] Add `picks` table definition to `src/db/schema.ts`
  - [ ] Columns: `id` (integer, primary key, autoincrement), `user_id` (integer, not null, references users.id), `match_id` (integer, not null, references matches.id), `selected_team` (text, not null), `created_at` (text, not null, default ISO 8601)
  - [ ] Add composite unique index: `idx_picks_user_match` on `(user_id, match_id)` — one pick per user per match
  - [ ] Add index: `idx_picks_user_id` on `user_id` for fetching all picks by user
  - [ ] Run `npx drizzle-kit generate` and `npx drizzle-kit migrate`

- [ ] Task 2: Build MatchCard component (AC: #1, #4)
  - [ ] Create `src/components/bracket/MatchCard.tsx` (client component)
  - [ ] Props: `matchId`, `teamA`, `teamB`, `selectedTeam` (null if no pick), `round`, `position`, `onSelect` callback, `disabled` (boolean), `result` (null for now — used in Epic 5)
  - [ ] Anatomy per UX spec:
    - Two team rows stacked vertically
    - Each row: team name, selection indicator area
    - Top row: rounded top corners. Bottom row: rounded bottom corners
    - 1px Slate 200 border between teams, outer border wraps the pair
  - [ ] States:
    - **Default:** Both teams neutral (white background, Slate 900 text)
    - **Selected:** Picked team has Emerald 50 background tint and checkmark icon
    - **Hover:** Subtle Slate 50 background shift on hovered team row (desktop only)
    - **Disabled:** Both teams Slate 100 background, no hover, cursor-not-allowed
  - [ ] Interaction: tap/click a team row to call `onSelect(teamName)`
  - [ ] Accessibility: each team row is a `<button>` with `aria-label="[Team name] wins"`, selected state via `aria-pressed`
  - [ ] Minimum 44x44px tap targets per team row

- [ ] Task 3: Build BracketTree component for desktop (AC: #2, #4)
  - [ ] Create `src/components/bracket/BracketTree.tsx` (client component)
  - [ ] Props: `matches` (R32 matches from DB), `picks` (user's current picks), `onSelect` callback
  - [ ] Layout: rounds displayed as columns flowing left to right
    - Column 1: R32 (16 MatchCards)
    - Column 2: R16 (8 slots)
    - Column 3: QF (4 slots)
    - Column 4: SF (2 slots)
    - Column 5: Final (1 slot)
    - Column 6: Champion display
  - [ ] Round labels above each column: "Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"
  - [ ] Later-round slots: show empty MatchCard placeholders until both feeder picks are made
  - [ ] When both teams for a later-round matchup are determined by picks, render a MatchCard with those teams
  - [ ] Connector lines between rounds (CSS borders or SVG) linking MatchCard winners to next round
  - [ ] Vertical spacing increases per round (R32 tight, Final spacious) to create the converging bracket shape
  - [ ] Only rendered at >= 768px (use Tailwind `hidden md:block` / `md:hidden`)
  - [ ] Horizontal scrolling allowed if bracket exceeds viewport width

- [ ] Task 4: Build RoundView component for mobile (AC: #3, #4)
  - [ ] Create `src/components/bracket/RoundView.tsx` (client component)
  - [ ] Props: `matches`, `picks`, `currentRound`, `onSelect` callback, `onRoundChange` callback
  - [ ] Layout: single round displayed at a time
    - Round navigation header: left arrow button, round name, right arrow button
    - Vertically stacked MatchCards for the current round
  - [ ] Round names: "Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"
  - [ ] Navigation: left/right buttons switch between rounds
    - Left arrow disabled on R32 (first round)
    - Right arrow disabled on Final (last round)
    - Only rounds with available matchups are navigable (later rounds show empty slots if teams not yet determined)
  - [ ] Only rendered at < 768px (use Tailwind `md:hidden` / `hidden md:block`)

- [ ] Task 5: Build bracket page (AC: #1, #2, #3, #4)
  - [ ] Update `src/app/(app)/bracket/page.tsx` — replace placeholder
  - [ ] Server Component that:
    - Reads session cookie to identify current user
    - Fetches R32 matches from DB (round = 1, ordered by position)
    - Fetches user's existing picks from DB
    - Checks bracket lock status and user's submission status
    - Passes data to client bracket component
  - [ ] Create `src/components/bracket/BracketView.tsx` (client component wrapper):
    - Receives matches, picks, user state as props
    - Manages local pick state (for optimistic UI — actual saving in Story 3.2)
    - Renders BracketTree on desktop, RoundView on mobile
    - Computes later-round matchups from current picks using bracket position mapping
  - [ ] For this story: picks are display-only (tap-to-pick interaction comes in Story 3.2). MatchCards render with `disabled={false}` but `onSelect` is a no-op placeholder.

- [ ] Task 6: Create bracket utility functions (AC: #2, #3, #4)
  - [ ] Create `src/lib/bracket-utils.ts`
  - [ ] Implement `computeBracketState(matches: Match[], picks: Pick[]): BracketState`:
    - Takes R32 matches and user's picks
    - Computes all rounds: which teams appear in each round's matchup slots based on picks
    - Returns a data structure representing the full bracket state for rendering
  - [ ] Implement `getNextRoundPosition(currentRound: number, currentPosition: number): { round: number; position: number }`:
    - Formula: `nextPosition = Math.ceil(currentPosition / 2)`, `nextRound = currentRound + 1`
  - [ ] Implement `getMatchSlot(round: number, position: number, picks: Pick[], matches: Match[]): { teamA: string | null; teamB: string | null }`:
    - For R32: returns team names from matches table
    - For later rounds: derives team names from picks in feeder matches
  - [ ] Add `Pick` and `BracketState` types to `src/types/index.ts`

## Dev Notes

### Architecture Compliance

- **Bracket components:** `src/components/bracket/` — MatchCard, BracketTree, RoundView, BracketView
- **Bracket utilities:** `src/lib/bracket-utils.ts` — per architecture, cascading logic and bracket computation
- **Bracket page:** `src/app/(app)/bracket/page.tsx` — Server Component fetching data, passing to client
- **Dual rendering:** BracketTree (desktop >= 768px) and RoundView (mobile < 768px) — both rendered in DOM, CSS visibility toggles which shows. NOT conditional rendering based on window width detection.
- **No database queries in client components:** Bracket page Server Component fetches everything, passes as props

### Database Schema Details

```typescript
// Add to src/db/schema.ts
export const picks = sqliteTable("picks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  matchId: integer("match_id").notNull().references(() => matches.id),
  selectedTeam: text("selected_team").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_picks_user_id").on(table.userId),
  // Unique constraint: one pick per user per match
  // Use unique index instead of table-level unique constraint for SQLite compatibility
  index("idx_picks_user_match").on(table.userId, table.matchId),
]);
```

**Critical note on match_id for later rounds:** The `matches` table only has R32 matches (created by admin in Story 2.1). Later-round matches are NOT pre-created in the DB — they're implicit from the bracket structure. Picks for later rounds reference "virtual" match positions.

**Approach for later-round picks:** Each pick stores `match_id` which references a match in the `matches` table. For later rounds, we have two options:

**Option A (Recommended): Pre-create all 31 match slots on bracket open.**
When admin enters R32 matchups, auto-create empty match rows for rounds 2-5 with null team names. Picks reference these match IDs. This keeps the foreign key constraint valid.

**Option B: Store round+position instead of match_id.**
Change picks to reference `round` and `position` instead of `match_id`. Simpler but loses referential integrity.

**Go with Option A.** When Story 2.1's `setupMatchup()` saves R32 matches, also create placeholder matches for all later rounds:
- R16: 8 matches (positions 1-8), team_a/team_b = null
- QF: 4 matches (positions 1-4)
- SF: 2 matches (positions 1-2)
- Final: 1 match (position 1)

Total: 16 (R32) + 8 + 4 + 2 + 1 = 31 match rows.

**This means Task 1 should also update Story 2.1's `setupMatchup()` to auto-create later-round match slots.** OR create a separate action `initializeBracketStructure()` that creates all 31 match slots. The dev agent should determine the cleanest approach.

### Bracket Position Mapping (Critical)

```
Round 1 (R32): 16 matches, positions 1-16
Round 2 (R16): 8 matches, positions 1-8
  R16 pos 1 ← R32 pos 1 winner vs R32 pos 2 winner
  R16 pos 2 ← R32 pos 3 winner vs R32 pos 4 winner
  R16 pos 3 ← R32 pos 5 winner vs R32 pos 6 winner
  R16 pos 4 ← R32 pos 7 winner vs R32 pos 8 winner
  R16 pos 5 ← R32 pos 9 winner vs R32 pos 10 winner
  R16 pos 6 ← R32 pos 11 winner vs R32 pos 12 winner
  R16 pos 7 ← R32 pos 13 winner vs R32 pos 14 winner
  R16 pos 8 ← R32 pos 15 winner vs R32 pos 16 winner

Round 3 (QF): 4 matches, positions 1-4
  QF pos 1 ← R16 pos 1 winner vs R16 pos 2 winner
  ...

Round 4 (SF): 2 matches, positions 1-2
Round 5 (Final): 1 match, position 1
```

**General formula:**
- Feeder positions for `(round, position)`: `(round-1, position*2-1)` and `(round-1, position*2)`
- Next match for `(round, position)`: `(round+1, Math.ceil(position/2))`
- Slot within next match: position is odd → teamA slot, position is even → teamB slot

### BracketState Type

```typescript
// Add to src/types/index.ts
export type Pick = {
  id: number;
  userId: number;
  matchId: number;
  selectedTeam: string;
  createdAt: string;
};

export type MatchSlot = {
  matchId: number;
  round: number;
  position: number;
  teamA: string | null;
  teamB: string | null;
  selectedTeam: string | null;
};

export type BracketState = {
  rounds: {
    round: number;
    name: string;
    matches: MatchSlot[];
  }[];
  totalPicks: number;
  maxPicks: number; // Always 31
};
```

### Round Names Constant

```typescript
// In src/lib/bracket-utils.ts
export const ROUND_NAMES: Record<number, string> = {
  1: "Round of 32",
  2: "Round of 16",
  3: "Quarterfinals",
  4: "Semifinals",
  5: "Final",
};

export const MATCHES_PER_ROUND: Record<number, number> = {
  1: 16,
  2: 8,
  3: 4,
  4: 2,
  5: 1,
};

export const MAX_PICKS = 31;
```

### BracketTree Layout Strategy

```
Desktop layout (>= 768px):
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│ R32  │  │ R16  │  │  QF  │  │  SF  │  │Final │
│      │  │      │  │      │  │      │  │      │
│ M1   │──│      │  │      │  │      │  │      │
│ M2   │──│ M1   │──│      │  │      │  │      │
│ M3   │──│      │  │ M1   │──│      │  │      │
│ M4   │──│ M2   │──│      │  │ M1   │──│      │
│ ...  │  │ ...  │  │ M2   │──│      │  │ M1   │
│ M16  │──│ M8   │──│ M4   │──│ M2   │──│      │
└──────┘  └──────┘  └──────┘  └──────┘  └──────┘

Use CSS flexbox or grid:
- Outer container: flex-row (columns for each round)
- Each round column: flex-col with increasing gap per round
- Connector lines: CSS borders (::after pseudo-elements) or dedicated SVG layer
```

**Connector line approach:** Use CSS `::after` pseudo-elements on MatchCard containers with horizontal and vertical border segments. Alternatively, use a simple approach with no connector lines initially and add them as polish — the bracket is understandable from column alignment alone.

### MatchCard Component Detail

```typescript
// src/components/bracket/MatchCard.tsx
"use client";

interface MatchCardProps {
  matchId: number;
  teamA: string | null;
  teamB: string | null;
  selectedTeam: string | null;
  disabled: boolean;
  onSelect: (matchId: number, team: string) => void;
}

// Each team row is a <button> element for accessibility
// Empty team slots (null) render as gray placeholder bars
// Selected team: Emerald 50 bg, checkmark icon
// Unselected team in same match: white bg, no icon
// Both null: empty placeholder MatchCard (later round, teams not yet determined)
```

### Responsive Rendering Strategy

Both BracketTree and RoundView are rendered in the DOM simultaneously. CSS controls visibility:

```tsx
// In BracketView.tsx
<div className="hidden md:block">
  <BracketTree ... />
</div>
<div className="md:hidden">
  <RoundView ... />
</div>
```

Do NOT use `window.innerWidth` or `useMediaQuery` hooks. Tailwind responsive classes handle this cleanly with zero JS overhead.

### Bracket Page Server Component

```typescript
// src/app/(app)/bracket/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, matches, picks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { BracketView } from "@/components/bracket/BracketView";

export default async function BracketPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (!username) redirect("/");

  const user = await db.select().from(users).where(eq(users.username, username)).get();
  if (!user) redirect("/");

  // Fetch all matches (all rounds) ordered by round, position
  const allMatches = await db.select().from(matches).orderBy(asc(matches.round), asc(matches.position));

  // Fetch user's picks
  const userPicks = await db.select().from(picks).where(eq(picks.userId, user.id));

  const isReadOnly = user.bracketSubmitted;

  return (
    <BracketView
      matches={allMatches}
      picks={userPicks}
      isReadOnly={isReadOnly}
      userId={user.id}
    />
  );
}
```

### Previous Story Context

**Story 1.1-1.3:** Project scaffolding, users table, auth, route group, tab nav
**Story 2.1:** Matches table (R32 matches), admin matchup setup, admin Server Actions
**Story 2.2:** Tournament config table, bracket lock toggle, `checkBracketLock()` utility

**This story builds on:**
- `src/db/schema.ts` — has `users`, `matches`, `tournament_config` tables, add `picks` table
- `src/app/(app)/bracket/page.tsx` — replace placeholder with full bracket page
- `src/components/bracket/` — empty directory, create MatchCard, BracketTree, RoundView, BracketView
- `src/lib/` — create `bracket-utils.ts`
- `src/types/index.ts` — has User, Match, TournamentConfig, add Pick, MatchSlot, BracketState
- May need to update Story 2.1's admin action to auto-create later-round match placeholders

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema.ts` | Modified | Add `picks` table definition |
| `src/db/migrations/0003_*.sql` | Created | Fourth migration (picks table) |
| `src/components/bracket/MatchCard.tsx` | Created | Single matchup display component |
| `src/components/bracket/BracketTree.tsx` | Created | Desktop full bracket tree layout |
| `src/components/bracket/RoundView.tsx` | Created | Mobile round-by-round view |
| `src/components/bracket/BracketView.tsx` | Created | Client wrapper — responsive toggle + state |
| `src/app/(app)/bracket/page.tsx` | Modified | Server Component fetching matches + picks |
| `src/lib/bracket-utils.ts` | Created | computeBracketState, position mapping, constants |
| `src/types/index.ts` | Modified | Add Pick, MatchSlot, BracketState types |
| `src/lib/actions/admin.ts` | Modified | Add later-round match slot initialization (if Option A) |

### Critical Implementation Note

**This story is DISPLAY ONLY.** MatchCards render and show the bracket structure, but tapping a team does NOT save a pick yet. The `onSelect` callback should update local state for visual feedback but does NOT call any Server Action. Story 3.2 adds the actual tap-to-pick interaction with Server Action saving and cascading logic.

However, the bracket-utils functions (`computeBracketState`, position mapping) must be complete and correct here because Story 3.2 depends on them for cascading pick logic.

### Testing Considerations

Manual testing checklist:
- [ ] Bracket page loads with R32 matchups displayed
- [ ] Desktop (>= 768px): BracketTree renders with all 5 round columns
- [ ] Mobile (< 768px): RoundView renders with R32 matchups and round navigation
- [ ] Later-round slots show as empty placeholders
- [ ] All 16 R32 MatchCards show correct Team A vs Team B
- [ ] MatchCards are in default state (no picks selected)
- [ ] Round navigation arrows work on mobile (left disabled on R32, right disabled on Final)
- [ ] Responsive transition: resizing browser switches between BracketTree and RoundView
- [ ] Bracket page redirects to `/` if no session cookie
- [ ] Team rows meet 44x44px minimum tap target

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1: Bracket Data Model & Match Display]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - MatchCard]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - BracketTree]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - RoundView]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Design & Accessibility]
- [Source: _bmad-output/planning-artifacts/prd.md#FR5, FR14, FR15]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
