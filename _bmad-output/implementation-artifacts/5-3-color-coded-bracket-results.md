# Story 5.3: Color-Coded Bracket Results

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant,
I want my bracket picks color-coded after results are entered,
so that I can instantly see which picks were correct, wrong, or still pending.

## Acceptance Criteria

1. **AC1: Correct Pick — Green**
   - **Given** a participant views their bracket after results have been entered
   - **When** a pick matches the entered result (correct pick)
   - **Then** the MatchCard displays with Emerald 500 green background and a checkmark indicator

2. **AC2: Wrong Pick — Red**
   - **Given** a participant views their bracket after results have been entered
   - **When** a pick does not match the entered result (wrong pick)
   - **Then** the MatchCard displays with Red 500 background, an X indicator, and the team name struck through

3. **AC3: Pending — Neutral**
   - **Given** a participant views their bracket
   - **When** a match has not yet been played (no result entered)
   - **Then** the MatchCard displays in neutral/pending state with Slate 300 styling

4. **AC4: Cascading Wrong Picks**
   - **Given** a participant picked a team to win multiple rounds but that team loses in an earlier round
   - **When** the result is entered
   - **Then** all downstream picks involving the eliminated team are marked red, showing the cascading impact visually

5. **AC5: Accessibility**
   - **Given** color-coding is implemented
   - **When** accessibility is verified
   - **Then** color is not the only indicator — checkmark/X symbols provide secondary identification for color-blind users

## Tasks / Subtasks

- [x] Task 1: Update MatchCard results mode styling (AC: #1, #2, #3, #5)
  - [x] Update `src/components/bracket/MatchCard.tsx`:
  - [x] Add `mode="results"` handling (extends the `mode` prop from Story 3.4):
    - **Correct pick:** Emerald 500 (`#10B981`) background on selected team row, white text, checkmark icon (✓)
    - **Wrong pick:** Red 500 (`#EF4444`) background on selected team row, white text, X icon (✗), team name with line-through
    - **Pending (no result):** Slate 300 (`#CBD5E1`) background on selected team row, Slate 600 text, no icon
    - **Unselected team in resolved match:** neutral white background
  - [x] Props addition: `classification?: PickClassification` — passed from BracketView via BracketTree/RoundView
  - [x] Accessibility: checkmark (✓) and X (✗) symbols are the PRIMARY indicator alongside color. Use `aria-label` on each team row: "[Team] — correct pick" or "[Team] — wrong pick" or "[Team] — pending"

- [x] Task 2: Implement pick result classification (AC: #1, #2, #3, #4)
  - [x] Add to `src/lib/bracket-utils.ts`:
  - [x] `classifyPick(pick: { selectedTeam: string }, result: { winner: string } | null): "correct" | "wrong" | "pending"`
    - If no result: "pending"
    - If pick.selectedTeam === result.winner: "correct"
    - Else: "wrong"
  - [x] `classifyAllPicks(picks: Pick[], results: Result[], matches: Match[]): Map<number, "correct" | "wrong" | "pending">`
    - For each pick, find the result for that match, classify
    - Returns map of matchId → classification
  - [x] Cascading wrong detection: a pick is "wrong" if either:
    - The match has a result and the pick doesn't match, OR
    - The picked team was eliminated in an earlier round (team lost a match in a previous round per actual results)
  - [x] For cascading: if a team is eliminated, ALL downstream picks of that team are "wrong" regardless of whether those matches have results yet

- [x] Task 3: Update BracketView for results mode (AC: #1, #2, #3, #4)
  - [x] Update `src/components/bracket/BracketView.tsx`:
  - [x] When `isReadOnly={true}` AND results exist:
    - Classify all picks using `classifyAllPicks()`
    - Pass `mode="results"` and `classifications` Map to BracketTree/RoundView → MatchCard
  - [x] When `isReadOnly={true}` AND no results: use `mode="readonly"` (Story 3.4 behavior)
  - [x] Determine which mode based on: if ANY results exist → use results mode for all MatchCards

- [x] Task 4: Update bracket page to pass results data (AC: #1)
  - [x] Update `src/app/(app)/bracket/page.tsx`:
  - [x] Fetch results alongside matches and picks
  - [x] Pass results to BracketView component
  - [x] BracketView determines correct/wrong/pending per MatchCard

- [x] Task 5: Add score summary to read-only bracket (AC: #1)
  - [x] When viewing bracket in results mode, show a score summary:
    - "Your Score: X pts — Max Possible: Y"
    - Positioned where ProgressBar was during entry (same slot)
  - [x] Fetch or compute score in bracket page Server Component using scoring engine
  - [x] Pass score and maxPossible as props to BracketView

## Dev Notes

### Architecture Compliance

- **MatchCard modes:** `"entry"` | `"readonly"` | `"results"` — the `mode` prop established in Story 3.4 now has all three variants implemented
- **Pick classification in bracket-utils:** `src/lib/bracket-utils.ts` — utility functions, not in components
- **Results fetched in Server Component:** bracket page fetches results and passes to client. No DB queries in client components.

### MatchCard Results Styling Reference

```typescript
// In MatchCard.tsx — results mode styling
const resultStyles = {
  correct: {
    bg: "bg-emerald-500",
    text: "text-white",
    icon: "✓",
    strikethrough: false,
  },
  wrong: {
    bg: "bg-red-500",
    text: "text-white",
    icon: "✗",
    strikethrough: true, // line-through on team name
  },
  pending: {
    bg: "bg-slate-300",
    text: "text-slate-600",
    icon: null,
    strikethrough: false,
  },
};
```

### Cascading Wrong Pick Logic

```typescript
export function classifyAllPicks(
  picks: { matchId: number; selectedTeam: string }[],
  results: { matchId: number; winner: string }[],
  matches: { id: number; round: number; teamA: string | null; teamB: string | null }[]
): Map<number, "correct" | "wrong" | "pending"> {
  const classifications = new Map<number, "correct" | "wrong" | "pending">();

  // Build set of eliminated teams from actual results
  const eliminatedTeams = new Set<string>();
  for (const result of results) {
    const match = matches.find(m => m.id === result.matchId);
    if (!match) continue;
    if (match.teamA && match.teamA !== result.winner) eliminatedTeams.add(match.teamA);
    if (match.teamB && match.teamB !== result.winner) eliminatedTeams.add(match.teamB);
  }

  const resultMap = new Map(results.map(r => [r.matchId, r]));

  for (const pick of picks) {
    const result = resultMap.get(pick.matchId);

    if (result) {
      // Match has a result
      classifications.set(pick.matchId, pick.selectedTeam === result.winner ? "correct" : "wrong");
    } else if (eliminatedTeams.has(pick.selectedTeam)) {
      // No result for this match yet, but picked team is already eliminated
      classifications.set(pick.matchId, "wrong");
    } else {
      // No result, team still alive
      classifications.set(pick.matchId, "pending");
    }
  }

  return classifications;
}
```

**Key insight:** A pick can be "wrong" even if the match hasn't been played yet — if the picked team was already eliminated in an earlier round. This creates the visual "red trail" effect described in the PRD's Journey 3 (Sarah's Brazil scenario).

### Score Summary in Bracket View

```tsx
// In BracketView.tsx — results mode summary
{isReadOnly && hasResults && (
  <div className="text-sm text-slate-500 space-y-1">
    <p>Your Score: <span className="font-semibold text-slate-900">{score} pts</span></p>
    <p>Max Possible: <span className="font-semibold text-slate-900">{maxPossible}</span></p>
  </div>
)}
```

### Previous Story Context

**Story 3.4:** MatchCard `mode` prop (entry/readonly), read-only bracket rendering
**Story 5.1-5.2:** Results table, `enterResult()`, `correctResult()`, result data available

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/components/bracket/MatchCard.tsx` | Modified | Add `mode="results"` with correct/wrong/pending styling |
| `src/lib/bracket-utils.ts` | Modified | Add `classifyPick()`, `classifyAllPicks()` |
| `src/components/bracket/BracketView.tsx` | Modified | Results mode rendering, score summary |
| `src/app/(app)/bracket/page.tsx` | Modified | Fetch results, pass to BracketView |

### Testing Considerations

- [ ] Correct pick shows green background + checkmark
- [ ] Wrong pick shows red background + X + strikethrough
- [ ] Pending pick shows slate/neutral styling
- [ ] Team eliminated in R32 → all downstream picks of that team show red
- [ ] Mixed results: some correct, some wrong, some pending — all display correctly
- [ ] Checkmark/X symbols visible alongside colors (accessibility)
- [ ] Score summary shows correct values
- [ ] Desktop and mobile both render results mode correctly

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.3: Color-Coded Bracket Results]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - MatchCard States]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation - Color System]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility Considerations]
- [Source: _bmad-output/planning-artifacts/prd.md#FR16]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without blockers.

### Completion Notes List

- Implemented `classifyPick()` and `classifyAllPicks()` in `bracket-utils.ts` with full cascading elimination detection (AC #4): a pick is "wrong" even if the match has no result yet, if the picked team was already eliminated in an earlier round.
- Added `PickClassification` type and extended `MatchCardMode` to `"entry" | "readonly" | "results"` in `types/index.ts`.
- Updated `MatchCard` with `mode="results"` rendering: correct=emerald-500+✓, wrong=red-500+✗+line-through, pending=slate-300. Each selected row uses `aria-label` for accessibility (AC #5).
- Added `classifications?: Map<number, PickClassification>` prop threading through `BracketTree` and `RoundView` to `MatchCard`.
- `BracketView` now accepts `results`, `score`, `maxPossible` props. Automatically switches to `"results"` mode when `isReadOnly=true` and results exist; falls back to `"readonly"` when no results (AC #3).
- Bracket page fetches results and tournament config, computes score + maxPossible via scoring engine, passes everything to `BracketView`.
- Score summary "Your Score: X pts — Max Possible: Y" rendered in both desktop (below BracketTree) and mobile (RoundView progressBar slot).
- 275/275 tests pass. 27 new tests added across bracket-utils.test.ts, MatchCard.test.tsx, and BracketView.test.tsx.

### File List

- `src/types/index.ts` — Added `"results"` to `MatchCardMode`, added `PickClassification` type
- `src/lib/bracket-utils.ts` — Added `classifyPick()`, `classifyAllPicks()`
- `src/lib/bracket-utils.test.ts` — Added 8 tests for new classification functions
- `src/components/bracket/MatchCard.tsx` — Added `mode="results"` rendering with correct/wrong/pending styling + accessibility aria-labels; added `classification?` prop
- `src/components/bracket/MatchCard.test.tsx` — Added 10 tests for results mode
- `src/components/bracket/BracketTree.tsx` — Added `classifications?` prop, passed to MatchCard; connector lines colored in results mode (correct=emerald, wrong=red, pending=slate-300)
- `src/components/bracket/RoundView.tsx` — Added `classifications?` prop, passed to MatchCard
- `src/components/bracket/BracketView.tsx` — Added `results`, `score`, `maxPossible` props; results mode switching; score summary (spec format: "Score: X pts - Max: Y pts"); `classifyAllPicks()` integration
- `src/components/bracket/BracketView.test.tsx` — Added 8 tests for results mode + score summary + mobile path
- `src/app/(app)/bracket/page.tsx` — Fetches results + tournament config; computes score/maxPossible; passes to BracketView

## Change Log

- Implemented color-coded bracket results (correct/wrong/pending + cascading elimination), score summary, and results data fetching in bracket page (Date: 2026-02-22)
- Code review fixes: colored connector lines in results mode (BracketTree), score summary format aligned to UX spec ("Score: X pts - Max: Y pts"), `classifyAllPicks` now calls `classifyPick` internally (DRY), added tests for mobile score path and undefined classification fallback (Date: 2026-02-22)
