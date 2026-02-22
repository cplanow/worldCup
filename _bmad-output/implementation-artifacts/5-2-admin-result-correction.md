# Story 5.2: Admin Result Correction

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the admin,
I want to correct a previously entered result,
so that any mistakes are fixed and all scores recalculate accurately.

## Acceptance Criteria

1. **AC1: Re-enter Correction Flow**
   - **Given** the admin views a match that already has a result entered
   - **When** they tap the resolved match
   - **Then** the match re-enters the selection flow, allowing the admin to tap a different winner

2. **AC2: Correction Saves**
   - **Given** the admin selects a corrected winner and taps "Confirm"
   - **When** the `correctResult()` Server Action is called
   - **Then** the result is updated in the `results` table and all participant scores, max possible points, and elimination statuses are fully recalculated from source data

3. **AC3: Leaderboard Reflects Correction**
   - **Given** a result correction changes the winner of a match
   - **When** recalculation completes
   - **Then** the leaderboard reflects the corrected scores immediately on next load with no manual intervention required

4. **AC4: Full Re-derivation**
   - **Given** a result is corrected
   - **When** the scoring engine recalculates
   - **Then** all 12 participants' scores are re-derived from picks + results (not incrementally adjusted), ensuring 100% accuracy per NFR4 and NFR5

## Tasks / Subtasks

- [x] Task 1: Implement correctResult Server Action (AC: #2, #4)
  - [x] Add to `src/lib/actions/admin.ts`:
  - [x] `correctResult(data: { matchId: number; winner: string }): Promise<ActionResult<{ warning?: string }>>`
    - Verify admin identity
    - Validate match exists and has an existing result
    - Validate new winner is one of the teams
    - Update result in `results` table
    - Update `matches.winner` column
    - Handle cascading team advancement correction (see below)
    - Return success
  - [x] OR: reuse `enterResult()` from Story 5.1 if it already handles upsert (it does). In that case, `correctResult` may just be an alias or the same function with an extra validation that a result already exists.

- [x] Task 2: Handle cascading advancement correction (AC: #2)
  - [x] When a result is corrected, the advancing team changes:
    - Update the team slot in the next-round match
    - If the next-round match ALSO has a result involving the old team, that result may now be invalid
    - **Decision:** For MVP, correcting an R32 result updates the R16 team slot. If the R16 match already has a result and the OLD winner was involved, flag it for the admin but don't auto-clear (admin manually re-enters later results).
    - Show a warning after correction if downstream results may be affected: "Note: This correction may affect results in later rounds. Please verify Round of 16 results."
  - [x] Update `advanceWinner()` from Story 5.1 to handle the correction case

- [x] Task 3: Update AdminMatchCard for correction flow (AC: #1)
  - [x] Update `src/components/admin/AdminMatchCard.tsx`:
  - [x] Resolved matches are tappable — tapping re-opens the selection flow
  - [x] When a resolved match is tapped:
    - Clear the selection state (both teams return to neutral)
    - Show team options for re-selection
    - Confirm/cancel buttons appear (same as initial entry)
  - [x] Visual indicator that this is a correction: different button text "Update Result"

- [x] Task 4: Update ResultsManager for correction UX (AC: #1, #3)
  - [x] Update `src/components/admin/ResultsManager.tsx`:
  - [x] After correction success, show brief inline feedback: "Result updated"
  - [x] If downstream results may be affected, show warning message
  - [x] Refresh match data after correction (revalidate page or update local state)

## Dev Notes

### Architecture Compliance

- **Same Server Action file:** `src/lib/actions/admin.ts`
- **Scores are NOT recalculated in the Server Action.** The leaderboard page re-derives all scores on every load. Correction just updates the stored result. Next leaderboard load reflects the change.
- **NFR4/NFR5 guaranteed:** Because scores are always re-derived (not incrementally updated), a result correction automatically produces correct scores on next page load. No special "recalculation trigger" needed.

### correctResult vs enterResult

Story 5.1's `enterResult()` already does an upsert (insert or update). `correctResult()` can be the same function, or a thin wrapper that:
1. Validates that a result already exists (correction implies previous result)
2. Calls the same logic as `enterResult()`
3. Adds downstream cascade checking

```typescript
export async function correctResult(data: {
  matchId: number;
  winner: string;
}): Promise<ActionResult<{ warning?: string }>> {
  if (!(await verifyAdmin())) {
    return { success: false, error: "Unauthorized" };
  }

  // Verify existing result
  const existingResult = await db.select().from(results)
    .where(eq(results.matchId, data.matchId)).get();
  if (!existingResult) {
    return { success: false, error: "No existing result to correct. Use enter result instead." };
  }

  const match = await db.select().from(matches).where(eq(matches.id, data.matchId)).get();
  if (!match) return { success: false, error: "Match not found" };
  if (data.winner !== match.teamA && data.winner !== match.teamB) {
    return { success: false, error: "Winner must be one of the teams" };
  }

  // Update result
  await db.update(results).set({ winner: data.winner }).where(eq(results.id, existingResult.id));
  await db.update(matches).set({ winner: data.winner }).where(eq(matches.id, data.matchId));

  // Update advancement
  await advanceWinner(match.round, match.position, data.winner);

  // Check if downstream results exist that may be affected
  let warning: string | undefined;
  if (match.round < 5) {
    const nextRound = match.round + 1;
    const nextPosition = Math.ceil(match.position / 2);
    const nextMatch = await db.select().from(matches)
      .where(and(eq(matches.round, nextRound), eq(matches.position, nextPosition)))
      .get();
    if (nextMatch) {
      const nextResult = await db.select().from(results)
        .where(eq(results.matchId, nextMatch.id)).get();
      if (nextResult) {
        const roundName = ROUND_NAMES[nextRound] ?? `Round ${nextRound}`;
        warning = `Result updated. Please verify ${roundName} results — the advancing team has changed.`;
      }
    }
  }

  return { success: true, data: { warning } };
}
```

### Downstream Cascade: MVP Approach

Full automatic cascade correction (clearing all downstream results when an earlier result changes) is complex and error-prone. For MVP with a single admin (Chris) entering ~31 results:

1. Correction updates the team advancement in the next round
2. If downstream results exist that involved the old team, show a warning
3. Admin manually reviews and re-enters affected downstream results
4. This is acceptable because corrections are rare and the admin knows what they're doing

### Previous Story Context

**Story 5.1:** `enterResult()`, `advanceWinner()`, AdminMatchCard, ResultsManager, results table

**This story extends:**
- `src/lib/actions/admin.ts` — add `correctResult()` (or refine `enterResult()`)
- `src/components/admin/AdminMatchCard.tsx` — resolved matches tappable for correction
- `src/components/admin/ResultsManager.tsx` — correction UX, warning messages

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/actions/admin.ts` | Modified | Add `correctResult()` with downstream warning |
| `src/components/admin/AdminMatchCard.tsx` | Modified | Correction flow for resolved matches |
| `src/components/admin/ResultsManager.tsx` | Modified | Correction feedback and warnings |

### Testing Considerations

- [x] Tap a resolved match → re-enters selection flow
- [x] Select different winner → confirm → result updated
- [x] Leaderboard shows corrected scores on next load
- [x] Advancing team updated in next round's match slot
- [x] Warning shown if downstream results may be affected
- [x] Cancel during correction → original result preserved

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2: Admin Result Correction]
- [Source: _bmad-output/planning-artifacts/prd.md#FR32, FR33]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR4, NFR5]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation was straightforward following the Dev Notes pseudocode.

### Completion Notes List

- **Task 1 & 2:** Added `correctResult()` to `worldcup-app/src/lib/actions/admin.ts`. The function validates an existing result, updates both `results` and `matches` tables, calls the existing `advanceWinner()` to update the next-round team slot, then checks if the next round already has a result and returns a typed warning string if so. `ROUND_NAMES` constant added to admin.ts to generate human-readable round names in warning messages. `revalidatePath` called for `/admin`, `/leaderboard`, and `/bracket`.
- **Task 3:** `AdminMatchCard.tsx` already had the correction UX from Story 5.1 (resolved matches tappable, winner highlight suppressed during selection). Updated the confirm button text to show "Update Result" when `isResolved` (correction mode) vs "Confirm Result" (initial entry). Updated the existing correction-mode test to match.
- **Task 4:** Updated `ResultsManager.tsx` to call `correctResult` (imported from admin actions) when a result already exists for the match, and `enterResult` for initial entry. Added `successMsg` and `warning` state variables. Shows emerald "Result updated" banner after successful correction and amber warning banner when `correctResult` returns a downstream warning. Added 5 new component tests covering all correction paths.
- **Tests:** 7 new unit tests for `correctResult` in `admin.test.ts`, 1 updated + 5 new tests in `ResultsManager.test.tsx`, 1 updated test in `AdminMatchCard.test.tsx`. All 270 tests pass with zero regressions.

### File List

- `worldcup-app/src/lib/actions/admin.ts` (modified)
- `worldcup-app/src/lib/actions/admin.test.ts` (modified)
- `worldcup-app/src/components/admin/AdminMatchCard.tsx` (modified)
- `worldcup-app/src/components/admin/AdminMatchCard.test.tsx` (modified)
- `worldcup-app/src/components/admin/ResultsManager.tsx` (modified)
- `worldcup-app/src/components/admin/ResultsManager.test.tsx` (modified)
- `worldcup-app/src/lib/bracket-utils.ts` (import source — ROUND_NAMES/MATCHES_PER_ROUND now exported from here)

## Change Log

| Date | Change |
|------|--------|
| 2026-02-22 | Implemented Story 5.2: `correctResult()` server action with downstream warning, AdminMatchCard "Update Result" button text, ResultsManager correction UX with success and warning banners |
| 2026-02-22 | Code review fixes: added 7 `enterResult` unit tests (H1), deduplicated ROUND_NAMES/MATCHES_PER_ROUND to bracket-utils.ts (M1), added same-winner no-op test for `correctResult` (M2), added success banner for initial `enterResult` (M3), added teams-not-set guard in `correctResult` (L1), AdminMatchCard skips server call on same-winner re-confirm (L2) |
