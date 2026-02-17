# Story 3.4: Read-Only Bracket View

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant who has submitted their bracket,
I want to view my bracket in read-only mode,
so that I can review my picks after submission.

## Acceptance Criteria

1. **AC1: Read-Only Display**
   - **Given** a participant has submitted their bracket
   - **When** they navigate to the "My Bracket" tab
   - **Then** their bracket is displayed in read-only mode with all 31 picks visible but not interactive (no tap-to-pick, no hover states)

2. **AC2: Desktop Read-Only**
   - **Given** the bracket is in read-only mode
   - **When** displayed on desktop (>= 768px)
   - **Then** the BracketTree component renders the full tournament tree with all picks shown

3. **AC3: Mobile Read-Only**
   - **Given** the bracket is in read-only mode
   - **When** displayed on mobile (< 768px)
   - **Then** the RoundView component renders with round navigation, showing picks in each round

4. **AC4: Neutral State (No Results Yet)**
   - **Given** the bracket is in read-only mode
   - **When** no results have been entered yet
   - **Then** all picks display in neutral/pending state (no green/red color-coding — that comes in Epic 5)

## Tasks / Subtasks

- [ ] Task 1: Ensure read-only mode works in BracketView (AC: #1, #4)
  - [ ] Verify `src/components/bracket/BracketView.tsx` correctly handles `isReadOnly={true}`:
    - No `handleSelect` callback passed to MatchCards (or pass no-op)
    - No ProgressBar rendered
    - No Submit button rendered
    - Local state initialized from server picks but never modified
  - [ ] Verify all 31 picks are rendered across all rounds (R32 through Final + Champion)

- [ ] Task 2: Update MatchCard for read-only state (AC: #1, #4)
  - [ ] Verify `src/components/bracket/MatchCard.tsx` handles read-only correctly:
    - When `disabled={true}` or `onSelect` is undefined: no tap interaction, no hover effect
    - Team rows render as `<div>` instead of `<button>` in read-only mode (or buttons with `disabled` and `aria-disabled`)
    - Cursor: default (not pointer, not not-allowed)
    - Selected team still shows with visual distinction (checkmark or subtle background) so user can see their pick
    - Both teams visible — the picked team is highlighted, the unpicked team is neutral
  - [ ] Neutral/pending state styling:
    - Selected team: Slate 100 background with subtle checkmark (NOT Emerald — green is reserved for correct picks in Epic 5)
    - Unselected team: white background, Slate 900 text, no indicator
    - No color-coding — all picks are neutral until results are entered

- [ ] Task 3: Verify BracketTree read-only rendering (AC: #2)
  - [ ] Verify `src/components/bracket/BracketTree.tsx` renders correctly when read-only:
    - All 5 round columns populated with user's picks
    - Connector lines show the path of each team through the bracket
    - Champion slot shows the user's champion pick
    - No interactive states (no hover highlights on team rows)
  - [ ] Layout should look identical to entry mode minus the interactive affordances

- [ ] Task 4: Verify RoundView read-only rendering (AC: #3)
  - [ ] Verify `src/components/bracket/RoundView.tsx` renders correctly when read-only:
    - Round navigation works (left/right arrows between rounds)
    - All rounds show the user's picks
    - MatchCards are non-interactive
  - [ ] Consider showing a summary line in read-only mode:
    - Replace ProgressBar slot with "Your bracket — 31 picks" or similar static text
    - Or show nothing (clean, minimal)

- [ ] Task 5: Bracket page handles submitted user state (AC: #1)
  - [ ] Verify `src/app/(app)/bracket/page.tsx` Server Component:
    - Detects `user.bracketSubmitted === true`
    - Passes `isReadOnly={true}` to BracketView
    - Fetches all matches and user picks (same queries as entry mode)
    - No lock status check needed for read-only view — submitted users can always see their bracket

## Dev Notes

### Architecture Compliance

- **No new files needed:** This story primarily verifies and refines existing components from Stories 3.1-3.3
- **Same components, different mode:** BracketView, BracketTree, RoundView, MatchCard all support read-only via props — no separate "read-only" component copies
- **Server Component data fetching:** Same bracket page Server Component serves both entry and read-only modes. The `isReadOnly` flag controls behavior.

### Read-Only vs Entry Mode Comparison

| Aspect | Entry Mode | Read-Only Mode |
|--------|-----------|---------------|
| MatchCard interaction | Tap to pick (buttons) | No interaction (divs or disabled buttons) |
| Hover states | Slate 50 background on hover | No hover effect |
| Cursor | pointer on team rows | default |
| ProgressBar | Visible, updates in real time | Hidden |
| Submit button | Visible (disabled or active) | Hidden |
| Selected pick styling | Emerald 50 bg + checkmark | Slate 100 bg + subtle checkmark |
| Round navigation (mobile) | Works | Works (same) |
| Local state management | useState with handleSelect | Static — initialized once, never modified |

### Critical: Neutral Pick Styling (Not Green)

In read-only mode BEFORE results are entered, picks should NOT use Emerald/green. Green is reserved for "correct pick" in Epic 5. The read-only neutral state uses:

- **Selected (picked) team:** Slate 100 background, subtle checkmark icon in Slate 400
- **Unselected (not picked) team:** white background, no indicator
- **This is a distinct visual state from entry mode** (which uses Emerald 50 for the active pick)

The MatchCard component needs a `mode` or `variant` prop to distinguish:
- `"entry"` — Emerald 50 bg for selected (interactive picking)
- `"readonly"` — Slate 100 bg for selected (neutral review)
- `"results"` — Emerald 500 / Red 500 for correct/wrong (Epic 5)

```typescript
// MatchCard prop approach
interface MatchCardProps {
  // ... existing props
  mode: "entry" | "readonly" | "results";
  result?: { winner: string } | null; // Used in "results" mode (Epic 5)
}

// Styling logic
const selectedBg = {
  entry: "bg-emerald-50",
  readonly: "bg-slate-100",
  results: null, // Determined by correct/wrong in Epic 5
};
```

### Champion Display in Read-Only

The Final match winner (champion pick) should be prominently displayed:
- **Desktop BracketTree:** Champion slot at the far right of the bracket tree, showing the team name in larger text
- **Mobile RoundView:** When navigating to the Final round, the single MatchCard shows the matchup with the champion pick highlighted. Optionally show "Your Champion: [Team Name]" text above.

### What This Story Does NOT Do

- No green/red color-coding — that's Epic 5, Story 5.3
- No viewing OTHER participants' brackets — that's Epic 5, Story 5.4
- No score display on the bracket — that's Epic 5 territory
- No results overlay — Epic 5

This story is purely about the submitted user viewing their OWN picks in a clean, non-interactive state.

### Previous Story Context

**Story 3.1:** MatchCard, BracketTree, RoundView, BracketView components created. `isReadOnly` prop already planned.
**Story 3.2:** Tap-to-pick interaction, `handleSelect`, optimistic UI. Read-only mode skips all of this.
**Story 3.3:** ProgressBar, submit button, submission flow. Read-only mode hides these.

**This story refines:**
- `src/components/bracket/MatchCard.tsx` — add `mode` prop for entry/readonly/results styling
- `src/components/bracket/BracketView.tsx` — ensure clean read-only rendering (no ProgressBar, no Submit)
- `src/components/bracket/BracketTree.tsx` — verify full bracket renders with all picks in read-only
- `src/components/bracket/RoundView.tsx` — verify round navigation works in read-only

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/components/bracket/MatchCard.tsx` | Modified | Add `mode` prop (entry/readonly/results), neutral styling for readonly |
| `src/components/bracket/BracketView.tsx` | Modified | Clean read-only rendering, hide ProgressBar + Submit |
| `src/components/bracket/BracketTree.tsx` | Modified | Verify read-only rendering, champion display |
| `src/components/bracket/RoundView.tsx` | Modified | Verify read-only rendering, optional summary text |

### Testing Considerations

Manual testing checklist:
- [ ] Submit a bracket (via Story 3.3 flow), then navigate to "My Bracket" tab
- [ ] All 31 picks visible across all rounds
- [ ] No tap interaction — clicking a team does nothing
- [ ] No hover effect on team rows
- [ ] No ProgressBar shown
- [ ] No Submit button shown
- [ ] Desktop: full BracketTree with all picks, champion visible
- [ ] Mobile: RoundView with navigation, all rounds show picks
- [ ] Picks show neutral styling (Slate 100, NOT green)
- [ ] Page reload preserves read-only state
- [ ] Non-submitted user still sees entry mode (regression check)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4: Read-Only Bracket View]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - MatchCard States]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Design & Accessibility]
- [Source: _bmad-output/planning-artifacts/prd.md#FR13, FR14, FR15]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
