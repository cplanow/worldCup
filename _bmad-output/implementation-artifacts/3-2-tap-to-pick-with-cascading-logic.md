# Story 3.2: Tap-to-Pick with Cascading Logic

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant,
I want to tap a team to pick them as the winner and see my pick cascade forward into the next round,
so that I can build my bracket prediction from R32 through the Final.

## Acceptance Criteria

1. **AC1: Tap to Pick**
   - **Given** a participant is viewing an R32 matchup with two teams
   - **When** they tap one team
   - **Then** that team is visually selected (green-tinted background, checkmark) and the team advances to the corresponding next-round matchup slot

2. **AC2: Later Round Unlocking**
   - **Given** a participant picks Team A in an R32 match and Team A's opponent in R16 has also been picked
   - **When** both teams are present in the R16 matchup slot
   - **Then** the R16 MatchCard becomes available for the participant to pick a winner

3. **AC3: Cascading Clear on Pick Change**
   - **Given** a participant has picked Team A to win R32, R16, and QF
   - **When** they change their R32 pick from Team A to Team B
   - **Then** all downstream picks involving Team A (R16, QF, and any further) are automatically cleared

4. **AC4: Progress Counter Updates**
   - **Given** a downstream pick is cleared due to an earlier pick change
   - **When** the cascading logic completes
   - **Then** the progress counter decreases to reflect the total cleared picks and affected MatchCards return to their default state

5. **AC5: Pick Persistence via Server Action**
   - **Given** a participant taps a team to make a pick
   - **When** the pick is registered
   - **Then** the pick is saved to the `picks` table via a `savePick()` Server Action with optimistic UI (immediate visual update, server save in background)

6. **AC6: Bracket Utils Functions**
   - **Given** cascading pick logic is needed
   - **When** picks are made or changed
   - **Then** `bracket-utils.ts` provides `getCascadingPicks()` and `validatePick()` functions that handle all cascade computation on the client

## Tasks / Subtasks

- [ ] Task 1: Implement savePick Server Action (AC: #5)
  - [ ] Create `src/lib/actions/bracket.ts` with `"use server"` directive
  - [ ] Implement `savePick(data: { userId: number; matchId: number; selectedTeam: string }): Promise<ActionResult<{ pickId: number }>>`
    - Step 1: Check bracket lock status via `checkBracketLock()` — reject if locked
    - Step 2: Validate user exists and bracket not submitted
    - Step 3: Validate match exists and selected team is either teamA or teamB of that match
    - Step 4: Upsert pick (insert or update if pick for this user+match already exists)
    - Step 5: Return pick ID
  - [ ] Implement `deletePicks(data: { userId: number; matchIds: number[] }): Promise<ActionResult<null>>`
    - Bulk delete picks for given user and match IDs (used for cascade clearing)
    - Validate lock status and user before deleting
  - [ ] Import `checkBracketLock` from `@/lib/actions/admin`

- [ ] Task 2: Implement cascading pick logic in bracket-utils (AC: #3, #6)
  - [ ] Add to `src/lib/bracket-utils.ts`:
  - [ ] `getCascadingClears(changedMatchId: number, previousTeam: string, allPicks: Pick[], allMatches: Match[]): number[]`
    - Given a pick change, find all downstream match IDs where the removed team was picked
    - Walk forward through rounds: for the match at `(round, position)`, find the next match at `(round+1, ceil(position/2))`
    - If the pick for the next match is the removed team, add that match ID to the clear list and continue walking forward
    - If the pick for the next match is NOT the removed team (or no pick exists), stop — cascade doesn't affect this branch
    - Return array of match IDs whose picks should be cleared
  - [ ] `validatePick(matchId: number, team: string, matches: Match[], picks: Pick[]): boolean`
    - Validate the team is actually one of the two teams in the match
    - For later rounds: validate both feeder teams have been picked (match slot is "available")
  - [ ] `getAvailableMatches(matches: Match[], picks: Pick[]): number[]`
    - Return match IDs where both teams are determined (R32 always available, later rounds when feeder picks made)

- [ ] Task 3: Wire up tap-to-pick interaction in BracketView (AC: #1, #2, #3, #4)
  - [ ] Update `src/components/bracket/BracketView.tsx`:
  - [ ] Manage local picks state with `useState` (initialized from server-fetched picks)
  - [ ] Implement `handleSelect(matchId: number, team: string)`:
    1. Check if this is a pick change (different team already selected for this match)
    2. If pick change: compute cascading clears via `getCascadingClears()`
    3. Update local state optimistically:
       - Set new pick for the selected match
       - Remove picks for all cascading-cleared matches
    4. Fire-and-forget: call `savePick()` Server Action for the new pick
    5. If cascading clears exist: call `deletePicks()` Server Action for cleared match IDs
    6. Recompute bracket state from updated local picks
  - [ ] Pass `handleSelect` as `onSelect` callback to MatchCard components
  - [ ] Disable MatchCards for matches where both teams are not yet determined
  - [ ] Track pick count locally for progress display (Story 3.3 adds the ProgressBar component)

- [ ] Task 4: Update MatchCard for interactive selection (AC: #1)
  - [ ] Update `src/components/bracket/MatchCard.tsx`:
  - [ ] Remove `disabled` override from Story 3.1 — now truly interactive when not disabled
  - [ ] On tap: call `onSelect(matchId, teamName)` — parent handles all logic
  - [ ] Visual feedback is instant (optimistic) — controlled by parent's state, not by server response
  - [ ] If match slot has both teams but is read-only (`isReadOnly` prop), show teams but disable interaction
  - [ ] If match slot has null teams (later round, feeder picks not made), show empty placeholder — not tappable

- [ ] Task 5: Update BracketTree and RoundView for interactivity (AC: #1, #2)
  - [ ] Update `src/components/bracket/BracketTree.tsx`:
    - Pass `onSelect` through to each MatchCard
    - Later-round MatchCards appear when both feeder picks exist — re-render on pick state change
    - Connector lines update to show advancing team name/color
  - [ ] Update `src/components/bracket/RoundView.tsx`:
    - Pass `onSelect` through to each MatchCard
    - Later-round MatchCards populate as picks cascade forward
    - Round navigation shows updated state for each round

## Dev Notes

### Architecture Compliance

- **Bracket Server Actions:** `src/lib/actions/bracket.ts` — per architecture, bracket mutations in dedicated file
- **Cascade logic on client:** `bracket-utils.ts` handles cascade computation — NO cascade logic in Server Actions. Server Actions do simple CRUD. Client computes what to save/delete.
- **Optimistic UI:** Per architecture and UX spec — update UI immediately, save in background. If save fails silently, next page load reconciles.
- **Validation order in savePick:** Lock status → user exists → bracket not submitted → match valid → team valid → upsert pick
- **No toast notifications:** Pick success = visual state change (team selected, advances). No additional feedback.

### Cascading Logic Deep Dive

**The most critical algorithm in the entire app.** If this is wrong, brackets break.

```
Example cascade scenario:
- User picks Brazil in R32 match at position 1 (Brazil vs Mexico)
- Brazil advances to R16 position 1 (teamA slot)
- User picks Argentina in R32 match at position 2 (Argentina vs Australia)
- Argentina advances to R16 position 1 (teamB slot)
- R16 position 1 now has Brazil vs Argentina — user picks Brazil
- Brazil advances to QF position 1 (teamA slot)
- User picks Brazil in QF too, and SF, and Final = Champion

Now user changes R32 position 1 pick from Brazil to Mexico:
- R32 pos 1: Brazil → Mexico (direct change)
- R16 pos 1: was Brazil vs Argentina, Brazil was picked
  → Brazil is no longer advancing from R32 pos 1 (Mexico is)
  → R16 pos 1 becomes Mexico vs Argentina
  → The PICK for R16 pos 1 was "Brazil" — Brazil is no longer in this match
  → CLEAR the R16 pos 1 pick
- QF pos 1: Brazil was picked here too
  → Brazil came from R16 pos 1 which is now cleared
  → CLEAR QF pos 1 pick
- SF pos 1: Brazil was picked
  → CLEAR SF pos 1 pick
- Final pos 1: Brazil was picked
  → CLEAR Final pos 1 pick
- Champion: cleared

Result: 1 pick changed + 4 picks cleared = 5 picks affected, counter decreases by 4
```

### getCascadingClears Algorithm

```typescript
export function getCascadingClears(
  changedMatchId: number,
  previousTeam: string,
  allPicks: Pick[],
  allMatches: Match[]
): number[] {
  const clearIds: number[] = [];
  const match = allMatches.find(m => m.id === changedMatchId);
  if (!match) return clearIds;

  let currentRound = match.round;
  let currentPosition = match.position;
  let teamToTrace = previousTeam;

  // Walk forward through rounds
  while (currentRound < 5) {
    const nextRound = currentRound + 1;
    const nextPosition = Math.ceil(currentPosition / 2);

    // Find the next match
    const nextMatch = allMatches.find(
      m => m.round === nextRound && m.position === nextPosition
    );
    if (!nextMatch) break;

    // Check if user picked the removed team in this next match
    const pickForNext = allPicks.find(p => p.matchId === nextMatch.id);
    if (pickForNext && pickForNext.selectedTeam === teamToTrace) {
      clearIds.push(nextMatch.id);
      // Continue tracing — this team was picked further
      currentRound = nextRound;
      currentPosition = nextPosition;
    } else {
      // Team wasn't picked in this round — cascade stops
      break;
    }
  }

  return clearIds;
}
```

### savePick Server Action

```typescript
// src/lib/actions/bracket.ts
"use server";

import { db } from "@/db";
import { picks, users, matches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { checkBracketLock } from "@/lib/actions/admin";
import type { ActionResult } from "@/lib/actions/types";

export async function savePick(data: {
  userId: number;
  matchId: number;
  selectedTeam: string;
}): Promise<ActionResult<{ pickId: number }>> {
  // 1. Check lock
  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }

  // 2. Validate user exists and not submitted
  const user = await db.select().from(users).where(eq(users.id, data.userId)).get();
  if (!user) return { success: false, error: "User not found" };
  if (user.bracketSubmitted) return { success: false, error: "Bracket already submitted" };

  // 3. Validate match exists and team is valid
  const match = await db.select().from(matches).where(eq(matches.id, data.matchId)).get();
  if (!match) return { success: false, error: "Match not found" };
  // For R32, validate against stored teams. For later rounds, team validity
  // is ensured by the client cascade logic (team must come from a feeder pick)
  if (match.round === 1 && data.selectedTeam !== match.teamA && data.selectedTeam !== match.teamB) {
    return { success: false, error: "Invalid team selection" };
  }

  // 4. Upsert pick
  const existing = await db.select().from(picks)
    .where(and(eq(picks.userId, data.userId), eq(picks.matchId, data.matchId)))
    .get();

  let pickId: number;
  if (existing) {
    await db.update(picks)
      .set({ selectedTeam: data.selectedTeam })
      .where(eq(picks.id, existing.id));
    pickId = existing.id;
  } else {
    const result = await db.insert(picks)
      .values({ userId: data.userId, matchId: data.matchId, selectedTeam: data.selectedTeam })
      .returning();
    pickId = result[0].id;
  }

  return { success: true, data: { pickId } };
}

export async function deletePicks(data: {
  userId: number;
  matchIds: number[];
}): Promise<ActionResult<null>> {
  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }

  const user = await db.select().from(users).where(eq(users.id, data.userId)).get();
  if (!user) return { success: false, error: "User not found" };
  if (user.bracketSubmitted) return { success: false, error: "Bracket already submitted" };

  // Delete picks for each match ID
  for (const matchId of data.matchIds) {
    await db.delete(picks)
      .where(and(eq(picks.userId, data.userId), eq(picks.matchId, matchId)));
  }

  return { success: true, data: null };
}
```

### Optimistic UI Pattern

```typescript
// In BracketView.tsx
const [localPicks, setLocalPicks] = useState<Pick[]>(initialPicks);

async function handleSelect(matchId: number, team: string) {
  // 1. Compute cascade clears BEFORE updating state
  const currentPick = localPicks.find(p => p.matchId === matchId);
  let clearIds: number[] = [];

  if (currentPick && currentPick.selectedTeam !== team) {
    // Pick is changing — compute cascade
    clearIds = getCascadingClears(matchId, currentPick.selectedTeam, localPicks, allMatches);
  }

  // 2. Optimistic state update
  setLocalPicks(prev => {
    let updated = prev.filter(p => !clearIds.includes(p.matchId));
    const existingIdx = updated.findIndex(p => p.matchId === matchId);
    const newPick = { id: -1, userId, matchId, selectedTeam: team, createdAt: "" };

    if (existingIdx >= 0) {
      updated[existingIdx] = newPick;
    } else {
      updated = [...updated, newPick];
    }
    return updated;
  });

  // 3. Fire-and-forget server saves
  savePick({ userId, matchId, selectedTeam: team });
  if (clearIds.length > 0) {
    deletePicks({ userId, matchIds: clearIds });
  }
}
```

**Fire-and-forget:** Per UX spec, for a 12-user trust-based app, optimistic UI is acceptable. Don't block interaction waiting for server confirmation. If save fails silently, next page load reconciles from server state.

### Later-Round Match Availability

A later-round MatchCard becomes interactive when BOTH feeder positions have picks:

```typescript
// In bracket-utils.ts
export function isMatchAvailable(
  round: number,
  position: number,
  picks: Pick[],
  matches: Match[]
): boolean {
  if (round === 1) return true; // R32 always available

  // Feeder positions
  const feederPos1 = position * 2 - 1;
  const feederPos2 = position * 2;

  const feederMatch1 = matches.find(m => m.round === round - 1 && m.position === feederPos1);
  const feederMatch2 = matches.find(m => m.round === round - 1 && m.position === feederPos2);

  if (!feederMatch1 || !feederMatch2) return false;

  const pick1 = picks.find(p => p.matchId === feederMatch1.id);
  const pick2 = picks.find(p => p.matchId === feederMatch2.id);

  return !!pick1 && !!pick2;
}
```

### Edge Cases to Handle

1. **Changing a pick within the same match (same round):** User picks Team A, then picks Team B in the same R32 match. This is a simple swap — only cascade if Team A was picked further downstream.

2. **Picking the same team again:** User taps the already-selected team. This is a no-op — don't deselect. Picks are only changed by tapping the OTHER team.

3. **Rapid tapping:** User taps quickly across multiple matches. Each tap triggers independent `handleSelect` calls. Local state updates are synchronous (useState), server calls are async. This works naturally with React's state batching.

4. **Network failure on save:** Pick appears selected locally but fails to save. Next page load shows server state (pick missing). Acceptable for 12-user trust-based app. No retry logic needed.

5. **Cascade clears multiple branches:** If a team appears in multiple downstream rounds, the cascade must follow the full path until the team is no longer picked. The algorithm naturally handles this by walking forward until `selectedTeam !== teamToTrace`.

### Previous Story Context

**Story 3.1 established:**
- `picks` table schema
- MatchCard component (display-only, `onSelect` was no-op placeholder)
- BracketTree and RoundView components (display-only)
- BracketView wrapper component
- `bracket-utils.ts` with `computeBracketState()`, position mapping, constants
- Bracket page Server Component fetching matches and picks

**This story extends:**
- `src/lib/bracket-utils.ts` — add `getCascadingClears()`, `validatePick()`, `isMatchAvailable()`
- `src/components/bracket/BracketView.tsx` — add local state management, `handleSelect`, optimistic UI
- `src/components/bracket/MatchCard.tsx` — wire up real `onSelect` interaction
- `src/components/bracket/BracketTree.tsx` — pass through `onSelect`, update on state change
- `src/components/bracket/RoundView.tsx` — pass through `onSelect`, update on state change
- `src/lib/actions/bracket.ts` — NEW file with `savePick()`, `deletePicks()`

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/actions/bracket.ts` | Created | `savePick()`, `deletePicks()` Server Actions |
| `src/lib/bracket-utils.ts` | Modified | Add `getCascadingClears()`, `validatePick()`, `isMatchAvailable()` |
| `src/components/bracket/BracketView.tsx` | Modified | Add local state, handleSelect, optimistic UI |
| `src/components/bracket/MatchCard.tsx` | Modified | Wire real onSelect interaction |
| `src/components/bracket/BracketTree.tsx` | Modified | Pass onSelect, re-render on pick changes |
| `src/components/bracket/RoundView.tsx` | Modified | Pass onSelect, re-render on pick changes |

### Naming Conventions Reminder

- Server Action file: `bracket.ts` (kebab-case)
- Server Action functions: `savePick()`, `deletePicks()` (camelCase verbs)
- Utility functions: `getCascadingClears()`, `validatePick()`, `isMatchAvailable()` (camelCase)
- NO new types needed — uses existing `Pick`, `Match`, `MatchSlot` from `src/types/index.ts`

### Testing Considerations

Manual testing checklist:
- [ ] Tap a team in R32 → team visually selected with green tint + checkmark
- [ ] Selected team appears in the corresponding R16 slot
- [ ] When both feeder picks made for a later round → that MatchCard becomes tappable
- [ ] Can build picks all the way through to Final/Champion
- [ ] Change an R32 pick → downstream picks involving old team are cleared
- [ ] Progress counter decreases when cascade clears picks
- [ ] Picks persist across page reload (saved to server)
- [ ] Tapping the already-selected team is a no-op
- [ ] Rapid tapping across multiple matches works without errors
- [ ] Brackets locked → tapping returns error (test via toggling lock in admin)
- [ ] Submitted bracket → picks are not editable

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2: Tap-to-Pick with Cascading Logic]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Defining Experience]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - MatchCard]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns - Feedback]
- [Source: _bmad-output/planning-artifacts/prd.md#FR6, FR7, FR8]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
