# Story 5.4: View Other Participants' Brackets

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant,
I want to view any other participant's bracket in read-only mode,
so that I can compare picks and see how others are doing.

## Acceptance Criteria

1. **AC1: Navigate from Leaderboard**
   - **Given** a participant is on the leaderboard
   - **When** they tap another participant's name or row
   - **Then** they navigate to that participant's bracket displayed in read-only mode

2. **AC2: Color-Coded Results on Other Brackets**
   - **Given** a participant is viewing another user's bracket
   - **When** results have been entered
   - **Then** the bracket displays with the same color-coding (green correct, red wrong, neutral pending) as their own bracket

3. **AC3: Desktop Other Bracket**
   - **Given** a participant is viewing another user's bracket
   - **When** displayed on desktop (>= 768px)
   - **Then** the BracketTree component renders the full tournament tree

4. **AC4: Mobile Other Bracket**
   - **Given** a participant is viewing another user's bracket
   - **When** displayed on mobile (< 768px)
   - **Then** the RoundView component renders with round navigation

5. **AC5: Return to Leaderboard**
   - **Given** a participant is viewing another user's bracket
   - **When** they want to return to the leaderboard
   - **Then** the tab navigation remains visible, allowing them to tap back to the Leaderboard tab

## Tasks / Subtasks

- [ ] Task 1: Create dynamic bracket route (AC: #1, #3, #4)
  - [ ] Create `src/app/(app)/bracket/[username]/page.tsx` — dynamic route for viewing any user's bracket
  - [ ] Server Component that:
    - Reads `username` from route params (async in Next.js 16: `const { username } = await params`)
    - Validates user exists in database
    - Fetches that user's picks, all matches, all results
    - Computes pick classifications using `classifyAllPicks()`
    - Computes score and max possible for this user
    - Passes data to BracketView with `isReadOnly={true}` and results mode
  - [ ] Display header: "[Username]'s Bracket" above the bracket view
  - [ ] If user has not submitted their bracket: show message "This bracket has not been submitted yet" (don't show picks)

- [ ] Task 2: Make leaderboard rows clickable (AC: #1)
  - [ ] Update `src/components/leaderboard/LeaderboardTable.tsx`:
  - [ ] Each row is a link or tappable element that navigates to `/bracket/[username]`
  - [ ] Use Next.js `Link` component or `router.push()` on row click
  - [ ] Cursor: pointer on rows
  - [ ] Hover: subtle Slate 50 background on non-current-user rows
  - [ ] Current user row: clicking navigates to `/bracket` (their own bracket page, no username param)
  - [ ] Accessibility: rows are focusable with keyboard, Enter/Space triggers navigation

- [ ] Task 3: Update bracket page routing (AC: #1)
  - [ ] Ensure `/bracket` (no param) shows the current user's bracket (existing behavior)
  - [ ] `/bracket/[username]` shows another user's bracket
  - [ ] Both pages use the same BracketView component — only data source differs
  - [ ] The `(app)` layout with tab navigation wraps both routes — tabs always visible

- [ ] Task 4: Show whose bracket is being viewed (AC: #1, #5)
  - [ ] On `/bracket/[username]` page, show a header:
    - "[Username]'s Bracket" in 24px bold
    - Small "Back to Leaderboard" link below or rely on tab navigation
  - [ ] On `/bracket` (own bracket), show "My Bracket" header (existing)
  - [ ] Tab navigation always visible — user can tap Leaderboard tab to return

## Dev Notes

### Architecture Compliance

- **Dynamic route:** `src/app/(app)/bracket/[username]/page.tsx` — standard Next.js App Router convention
- **Same BracketView component:** Reuses existing bracket rendering — no separate "view others" component
- **Server Component data fetching:** Fetch the OTHER user's picks, same matches/results data
- **Tab navigation always visible:** The `(app)` layout wraps this route — no layout changes needed
- **No deep linking concerns:** Users navigate from leaderboard, tab nav provides return path

### Dynamic Route Server Component

```typescript
// src/app/(app)/bracket/[username]/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, picks, matches, results } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { BracketView } from "@/components/bracket/BracketView";

export default async function UserBracketPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params; // Next.js 16: params is async

  const cookieStore = await cookies();
  const currentUsername = cookieStore.get("username")?.value;
  if (!currentUsername) redirect("/");

  // If viewing own bracket, redirect to /bracket
  if (username === currentUsername) {
    redirect("/bracket");
  }

  // Fetch target user
  const targetUser = await db.select().from(users)
    .where(eq(users.username, decodeURIComponent(username))).get();

  if (!targetUser) {
    redirect("/leaderboard"); // User not found
  }

  if (!targetUser.bracketSubmitted) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">{targetUser.username}&apos;s Bracket</h1>
        <p className="text-slate-500">This bracket has not been submitted yet.</p>
      </div>
    );
  }

  // Fetch data
  const allMatches = await db.select().from(matches).orderBy(asc(matches.round), asc(matches.position));
  const userPicks = await db.select().from(picks).where(eq(picks.userId, targetUser.id));
  const allResults = await db.select().from(results);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{targetUser.username}&apos;s Bracket</h1>
      <BracketView
        matches={allMatches}
        picks={userPicks}
        results={allResults}
        isReadOnly={true}
        userId={targetUser.id}
      />
    </div>
  );
}
```

### Leaderboard Row Navigation

```typescript
// In LeaderboardTable.tsx
import Link from "next/link";

// Each row wraps content in a Link
<Link
  href={entry.username === currentUsername ? "/bracket" : `/bracket/${encodeURIComponent(entry.username)}`}
  className="table-row hover:bg-slate-50 cursor-pointer"
>
  {/* ... row cells ... */}
</Link>
```

**Alternative approach:** Use `onClick` with `router.push()` if `<Link>` doesn't work well with `<tr>` elements. In that case, add `role="link"` and `tabIndex={0}` for accessibility.

### Username URL Encoding

Usernames are used in URLs (`/bracket/Mike`). Since usernames in this app are simple strings entered by 12 friends, special characters are unlikely. Still, use `encodeURIComponent()` when building URLs and `decodeURIComponent()` when reading params, as a safety measure.

### Unsubmitted Bracket Privacy

If a user hasn't submitted their bracket yet, their picks should NOT be visible to others. The page shows "This bracket has not been submitted yet" instead. This prevents bracket-peeking before the entry window closes.

### Previous Story Context

**Story 3.4:** Read-only bracket with `mode="readonly"` and `mode="results"`
**Story 4.4:** LeaderboardTable component with user rows
**Story 5.3:** Color-coded results mode in MatchCard and BracketView

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/app/(app)/bracket/[username]/page.tsx` | Created | Dynamic route for viewing other users' brackets |
| `src/components/leaderboard/LeaderboardTable.tsx` | Modified | Make rows clickable/navigable |

### Testing Considerations

- [ ] Tap a user's name on leaderboard → navigate to their bracket
- [ ] Other user's bracket displays in read-only with results color-coding
- [ ] Desktop: BracketTree renders for other user's bracket
- [ ] Mobile: RoundView renders for other user's bracket
- [ ] Tab navigation visible — can tap back to Leaderboard
- [ ] Viewing own name on leaderboard → navigates to `/bracket` (own bracket)
- [ ] Unsubmitted user's bracket shows "not submitted" message
- [ ] URL with non-existent username → redirects to leaderboard
- [ ] Header shows "[Username]'s Bracket"

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.4: View Other Participants' Brackets]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive Design & Accessibility]
- [Source: _bmad-output/planning-artifacts/prd.md#FR17]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
