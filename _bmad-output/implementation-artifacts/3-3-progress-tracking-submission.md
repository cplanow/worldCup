# Story 3.3: Progress Tracking & Submission

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant,
I want to track my progress and submit my completed bracket,
so that I can lock in my 31 predictions and join the competition.

## Acceptance Criteria

1. **AC1: Progress Bar Display**
   - **Given** a participant is making picks on their bracket
   - **When** each pick is made or cleared
   - **Then** a ProgressBar component displays "X of 31 picks made" with a fill bar that updates in real time

2. **AC2: Submit Button Disabled State**
   - **Given** a participant has made fewer than 31 picks
   - **When** they view the submit button
   - **Then** the "Submit Bracket" button is disabled (Slate 100 background, Slate 400 text, cursor not-allowed)

3. **AC3: Submit Button Active State**
   - **Given** a participant has completed all 31 picks
   - **When** the progress counter reaches "31 of 31 picks made"
   - **Then** the "Submit Bracket" button activates (Slate 900 background, white text)

4. **AC4: Bracket Submission**
   - **Given** a participant taps the active "Submit Bracket" button
   - **When** the `submitBracket()` Server Action is called
   - **Then** the user's `bracket_submitted` flag is set to true, the bracket is permanently locked, and the button shows "Submitting..." during the request

5. **AC5: Post-Submission Routing**
   - **Given** a bracket has been successfully submitted
   - **When** the submission completes
   - **Then** the participant is routed to the leaderboard view

## Tasks / Subtasks

- [ ] Task 1: Build ProgressBar component (AC: #1)
  - [ ] Create `src/components/bracket/ProgressBar.tsx` (client component)
  - [ ] Props: `current: number`, `total: number` (always 31)
  - [ ] Display: text counter "X of 31 picks made" above a thin horizontal fill bar
  - [ ] Fill bar: Emerald 500 fill on Slate 200 track
  - [ ] Fill width: `(current / total) * 100%`
  - [ ] Accessibility: `role="progressbar"`, `aria-valuenow={current}`, `aria-valuemax={total}`, `aria-label="Bracket completion progress"`
  - [ ] Text: 14px, Slate 500 color (supporting text size per UX spec)
  - [ ] Bar height: 4-6px, rounded corners

- [ ] Task 2: Implement submitBracket Server Action (AC: #4)
  - [ ] Add to `src/lib/actions/bracket.ts`:
  - [ ] `submitBracket(userId: number): Promise<ActionResult<null>>`
    - Step 1: Check bracket lock → reject if locked
    - Step 2: Validate user exists and bracket not already submitted
    - Step 3: Count user's picks — reject if count < 31
    - Step 4: Update `users.bracket_submitted = true`
    - Step 5: Return success
  - [ ] Server-side pick count validation is critical — never trust client-side count alone (NFR6 spirit)

- [ ] Task 3: Add submit button and wire up to BracketView (AC: #2, #3, #4, #5)
  - [ ] Update `src/components/bracket/BracketView.tsx`:
  - [ ] Add submit section below the bracket (both desktop and mobile views)
  - [ ] Use shadcn/ui `Button` component for "Submit Bracket"
  - [ ] Button states:
    - Disabled (`pickCount < 31`): Slate 100 bg, Slate 400 text, cursor-not-allowed
    - Active (`pickCount === 31`): Slate 900 bg, white text, 16px semibold
    - Loading (during submission): Slate 100 bg, Slate 400 text, "Submitting..." text, disabled
  - [ ] On submit click:
    1. Set loading state
    2. Call `submitBracket(userId)` Server Action
    3. On success: `router.push("/leaderboard")`
    4. On error: display inline error message, restore button state
  - [ ] Disabled button stays visible — never hide it. It communicates "complete all picks first."

- [ ] Task 4: Integrate ProgressBar into BracketView (AC: #1)
  - [ ] Update `src/components/bracket/BracketView.tsx`:
  - [ ] Compute `pickCount` from local picks state (length of picks array)
  - [ ] Render ProgressBar:
    - Desktop (BracketTree): fixed position at top or bottom of bracket area
    - Mobile (RoundView): below round navigation header, above MatchCards (per UX spec)
  - [ ] ProgressBar updates instantly on every pick or cascade clear — driven by local state, not server

- [ ] Task 5: Handle post-submission read-only state (AC: #5)
  - [ ] After successful submission, bracket becomes read-only
  - [ ] If user returns to `/bracket` after submission:
    - Server Component detects `bracketSubmitted === true`
    - Pass `isReadOnly={true}` to BracketView
    - BracketView hides ProgressBar and Submit button
    - All MatchCards rendered with `disabled={true}` (no hover, no tap interaction)
  - [ ] This is handled by existing bracket page Server Component logic from Story 3.1

## Dev Notes

### Architecture Compliance

- **ProgressBar location:** `src/components/bracket/ProgressBar.tsx` — per architecture's feature-grouped structure
- **Submit action location:** `src/lib/actions/bracket.ts` — extend existing file from Story 3.2
- **Server-side validation:** `submitBracket()` MUST verify pick count = 31 on server. Client disables the button, but server is the authority (NFR6 principle).
- **No toast on success:** Success = route to leaderboard. No "Bracket submitted!" toast or modal.
- **Error feedback:** Inline, adjacent to submit button — per UX spec

### ProgressBar Component Detail

```typescript
// src/components/bracket/ProgressBar.tsx
"use client";

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-1">
      <p className="text-sm text-slate-500">
        {current} of {total} picks made
      </p>
      <div
        className="h-1.5 w-full rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemax={total}
        aria-label="Bracket completion progress"
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

### submitBracket Server Action

```typescript
// Add to src/lib/actions/bracket.ts
export async function submitBracket(userId: number): Promise<ActionResult<null>> {
  // 1. Check lock
  if (await checkBracketLock()) {
    return { success: false, error: "Brackets are locked" };
  }

  // 2. Validate user
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return { success: false, error: "User not found" };
  if (user.bracketSubmitted) return { success: false, error: "Bracket already submitted" };

  // 3. Server-side pick count validation
  const userPicks = await db.select().from(picks).where(eq(picks.userId, userId));
  if (userPicks.length < 31) {
    return { success: false, error: `Only ${userPicks.length} of 31 picks made. Complete your bracket first.` };
  }

  // 4. Lock bracket permanently
  await db.update(users)
    .set({ bracketSubmitted: true })
    .where(eq(users.id, userId));

  return { success: true, data: null };
}
```

### Submit Button Integration

```typescript
// In BracketView.tsx — submit section
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);
const pickCount = localPicks.length;
const isComplete = pickCount === MAX_PICKS; // 31

async function handleSubmit() {
  setIsSubmitting(true);
  setSubmitError(null);

  const result = await submitBracket(userId);

  if (result.success) {
    router.push("/leaderboard");
  } else {
    setSubmitError(result.error);
    setIsSubmitting(false);
  }
}

// JSX
{!isReadOnly && (
  <div className="mt-6 space-y-3">
    <ProgressBar current={pickCount} total={MAX_PICKS} />
    <Button
      onClick={handleSubmit}
      disabled={!isComplete || isSubmitting}
      className={isComplete && !isSubmitting
        ? "w-full bg-slate-900 text-white font-semibold"
        : "w-full bg-slate-100 text-slate-400 cursor-not-allowed"
      }
    >
      {isSubmitting ? "Submitting..." : "Submit Bracket"}
    </Button>
    {submitError && (
      <p className="text-sm text-red-500">{submitError}</p>
    )}
  </div>
)}
```

### Layout Integration

**Desktop (BracketTree):** ProgressBar and Submit button below the bracket tree, centered.

**Mobile (RoundView):** ProgressBar below round navigation header, above MatchCards. Submit button at the very bottom, below MatchCards. This keeps the submit action accessible without scrolling past the bracket on small screens.

```
Mobile layout:
┌─────────────────────────┐
│ ← Round of 32 →         │
├─────────────────────────┤
│ 17 of 31 picks made     │
│ ████████░░░░░░░░░░░░░░  │
├─────────────────────────┤
│ MatchCard 1              │
│ MatchCard 2              │
│ ...                      │
├─────────────────────────┤
│ [Submit Bracket] (disabled) │
└─────────────────────────┘
```

### Pick Count Computation

Pick count is derived from `localPicks.length` in BracketView's state. This is already maintained by Story 3.2's `handleSelect`:
- Making a pick: adds to array → count increases
- Cascade clear: removes from array → count decreases
- No additional computation needed

### Edge Cases

1. **User has exactly 31 picks but presses back and removes one:** Submit button correctly re-disables because `localPicks.length` drops below 31. No stale state issue.

2. **Server rejects submission (count < 31 on server):** Could happen if optimistic UI is ahead of server saves (e.g., some saves failed silently). Error message tells user the actual count. User can refresh to reconcile state.

3. **Double-click on submit:** Button is disabled immediately (`isSubmitting = true`). Second click is no-op.

4. **Brackets lock while user is filling out:** `submitBracket()` checks lock status first. If locked, returns error "Brackets are locked". User sees inline error.

5. **Submit during cascade:** If user submits while a cascade is still clearing, `localPicks.length` would already reflect the cleared state (synchronous setState). But server `deletePicks()` might not have completed. Server-side count check protects against this — if server still has the old picks, count might be > 31 which is fine. If cascaded deletes haven't landed, count < 31 and server rejects.

### Previous Story Context

**Story 3.1:** Picks table, MatchCard, BracketTree, RoundView, BracketView, bracket-utils, bracket page
**Story 3.2:** savePick/deletePicks Server Actions, getCascadingClears, optimistic UI, tap-to-pick interaction

**This story extends:**
- `src/components/bracket/ProgressBar.tsx` — NEW component
- `src/components/bracket/BracketView.tsx` — add ProgressBar, submit button, submission logic
- `src/lib/actions/bracket.ts` — add `submitBracket()` Server Action

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/components/bracket/ProgressBar.tsx` | Created | Progress bar component (X of 31 picks) |
| `src/components/bracket/BracketView.tsx` | Modified | Add ProgressBar, submit button, submission flow |
| `src/lib/actions/bracket.ts` | Modified | Add `submitBracket()` Server Action |

### Testing Considerations

Manual testing checklist:
- [ ] ProgressBar shows "0 of 31 picks made" initially
- [ ] ProgressBar updates immediately on each pick
- [ ] ProgressBar decreases on cascade clears
- [ ] Submit button disabled when picks < 31
- [ ] Submit button activates at exactly 31 picks
- [ ] Submit button shows "Submitting..." during Server Action
- [ ] Successful submission routes to `/leaderboard`
- [ ] Returning to `/bracket` after submission shows read-only bracket (no ProgressBar, no Submit)
- [ ] Double-click on submit doesn't cause duplicate submissions
- [ ] Submitting with brackets locked shows inline error
- [ ] Fill bar width matches pick count percentage

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3: Progress Tracking & Submission]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - ProgressBar]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns - Button Hierarchy]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns - Loading States]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns - Feedback Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md#FR9, FR10, FR11, FR12]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
