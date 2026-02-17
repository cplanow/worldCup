# Story 4.4: Leaderboard Display

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant,
I want to view a ranked leaderboard of all 12 participants,
so that I can see where I stand in the competition at a glance.

## Acceptance Criteria

1. **AC1: Leaderboard Table**
   - **Given** a participant navigates to the Leaderboard tab
   - **When** the leaderboard page loads
   - **Then** a LeaderboardTable displays all participants ranked by score with tiebreakers applied

2. **AC2: Column Display**
   - **Given** the leaderboard is displayed
   - **When** the participant views the table
   - **Then** each row shows: Rank, Name, Score, Max Possible Points Remaining, and Champion Pick

3. **AC3: Current User Highlighting**
   - **Given** the current user is viewing the leaderboard
   - **When** their row is rendered
   - **Then** their row is highlighted with a subtle background color so they can find themselves instantly

4. **AC4: Elimination Visual**
   - **Given** the leaderboard is displayed
   - **When** a participant is mathematically eliminated
   - **Then** their max possible points value visually communicates they cannot win

5. **AC5: Champion Pick Eliminated**
   - **Given** the leaderboard is displayed
   - **When** a participant's champion pick has been eliminated from the tournament
   - **Then** their champion pick is displayed with a strikethrough indicator

6. **AC6: Leader Crown**
   - **Given** the #1 ranked participant
   - **When** the leaderboard renders
   - **Then** a crown icon is displayed next to their rank

7. **AC7: Zero Results State**
   - **Given** no results have been entered yet
   - **When** the leaderboard loads
   - **Then** all 12 users are displayed with score "0" and max possible points at the maximum value — never an empty table

## Tasks / Subtasks

- [ ] Task 1: Build LeaderboardTable component (AC: #1, #2, #3, #4, #5, #6, #7)
  - [ ] Create `src/components/leaderboard/LeaderboardTable.tsx` (client component for current-user highlighting)
  - [ ] Props: `entries: LeaderboardEntry[]`, `currentUsername: string`
  - [ ] Use shadcn/ui `Table` component as base
  - [ ] Columns: Rank, Name, Score, Max, Champion
  - [ ] Row rendering:
    - **Rank column:** number, crown icon (emoji or SVG) for rank 1
    - **Name column:** username text
    - **Score column:** numeric score
    - **Max column:** max possible points. If eliminated, render in Slate 400 (muted) to convey "can't win"
    - **Champion column:** team name. If champion eliminated, render with strikethrough text + Red 100 background accent. If alive, render with Emerald 100 background accent.
  - [ ] Current user row: subtle Emerald 50 background highlight
  - [ ] Accessibility: `<table>` element with proper `<thead>`, `<tbody>`, `<th scope="col">`, `<td>` structure
  - [ ] All 12 users always visible on one screen — no pagination, no "load more"

- [ ] Task 2: Build leaderboard page (AC: #1, #7)
  - [ ] Update `src/app/(app)/leaderboard/page.tsx` — replace placeholder
  - [ ] Server Component that:
    - Reads session cookie for current username
    - Fetches ALL data: users, picks, results, matches, tournament_config
    - Calls scoring engine: `buildLeaderboardEntries()` with `applyTiebreakers()`
    - Passes computed `LeaderboardEntry[]` and `currentUsername` to LeaderboardTable
  - [ ] Zero-results state: scoring engine returns all users with score 0 and max possible = 80 (default). Table renders all 12 rows. NEVER an empty table.

- [ ] Task 3: Style leaderboard per UX spec (AC: #2, #3, #4, #5, #6)
  - [ ] Typography:
    - Page title: "Leaderboard" — 24px bold
    - Table text: 16px regular for names/scores
    - Rank numbers: 16px semibold
  - [ ] Spacing:
    - Generous row height for comfortable reading (min 48px per row for tap targets)
    - 16px horizontal padding in cells
  - [ ] Colors:
    - Current user row: Emerald 50 (`#ECFDF5`) background
    - Champion alive accent: Emerald 100 (`#D1FAE5`) behind champion name
    - Champion eliminated accent: Red 100 (`#FEE2E2`) behind champion name + strikethrough
    - Eliminated user's max points: Slate 400 text (muted)
    - Crown icon: gold/yellow emoji or SVG for rank 1
  - [ ] Mobile: table scrolls horizontally if needed (5 columns should fit most phone widths at 375px+)

- [ ] Task 4: Handle locked-bracket message (AC: #7)
  - [ ] If user was routed to leaderboard because brackets are locked and their bracket is unsubmitted:
    - Show a banner above the leaderboard: "Brackets are locked. Your bracket was not submitted."
    - Banner: Slate 100 background, Slate 600 text, 14px, rounded corners
    - This state is passed from the routing logic in Story 1.3's `enterApp()` return data
  - [ ] If user's bracket is submitted: no banner, just the leaderboard

## Dev Notes

### Architecture Compliance

- **Leaderboard component:** `src/components/leaderboard/LeaderboardTable.tsx` — per architecture
- **Leaderboard page:** `src/app/(app)/leaderboard/page.tsx` — Server Component
- **Scoring engine used in Server Component:** Fetch all data → call pure scoring functions → pass results to client component. No scoring logic in client component.
- **HTML table:** Use semantic `<table>` element, not divs — per accessibility requirements

### Leaderboard Data Flow

```
Server Component (leaderboard/page.tsx)
  ↓ Fetch from Turso:
  │  - All users
  │  - All picks
  │  - All match results
  │  - All matches
  │  - Tournament config (point values)
  ↓ Call scoring engine:
  │  - calculateAllScores() → scores
  │  - maxPossiblePoints() for each user
  │  - getChampionPick() for each user
  │  - isChampionEliminated() for each user
  │  - isEliminated() for each user
  │  - applyTiebreakers() → sorted entries with ranks
  ↓ Pass to client:
  │  - LeaderboardEntry[] (pre-computed)
  │  - currentUsername (for row highlighting)
  ↓
LeaderboardTable (client component — rendering only)
```

### Server Component Implementation

```typescript
// src/app/(app)/leaderboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, picks, matches, tournamentConfig } from "@/db/schema";
import { buildLeaderboardEntries, getPointsPerRound, applyTiebreakers } from "@/lib/scoring-engine";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";

export default async function LeaderboardPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
  if (!username) redirect("/");

  // Fetch all data
  const allUsers = await db.select().from(users);
  const allPicks = await db.select().from(picks);
  const allMatches = await db.select().from(matches);
  const config = await db.select().from(tournamentConfig).get();

  // Get results (winner column on matches, or separate results table — depends on Story 5.1)
  // For now, results come from matches.winner column
  const allResults = allMatches
    .filter(m => m.winner !== null)
    .map(m => ({ matchId: m.id, winner: m.winner! }));

  const pointsPerRound = config
    ? getPointsPerRound(config)
    : { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

  // Build and sort leaderboard
  const entries = buildLeaderboardEntries({
    users: allUsers,
    allPicks,
    results: allResults,
    matches: allMatches,
    pointsPerRound,
  });

  const rankedEntries = applyTiebreakers(entries, {
    allPicks,
    results: allResults,
    matches: allMatches,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      <LeaderboardTable entries={rankedEntries} currentUsername={username} />
    </div>
  );
}
```

### LeaderboardTable Column Layout

| Column | Width | Content | Notes |
|--------|-------|---------|-------|
| Rank | ~40px | Number + crown for #1 | Right-aligned or centered |
| Name | Flexible | Username | Left-aligned, bold for current user |
| Score | ~60px | Points | Right-aligned |
| Max | ~60px | Max possible | Right-aligned, muted if eliminated |
| Champion | ~100px | Team name | Left-aligned, strikethrough if eliminated |

### Crown Icon

Use the crown emoji `👑` next to the rank 1 number. Simple, no image dependency, works everywhere. Alternatively, use a small SVG crown icon from Lucide (available in shadcn/ui ecosystem).

### UX Spec Alignment

- **Clean table (A, simplified):** No status badge column — elimination communicated through max possible points and champion strikethrough
- **One screen:** All 12 users fit on one screen — designed for exactly 12 participants
- **Leaderboard as the heartbeat:** Fast-loading, tells the full story at a glance
- **No empty states:** Always show all 12 users, even with score 0

### Results Data Source Note

The epics mention a `results` table (Story 5.1), but the architecture also shows `matches.winner` column. The scoring engine receives results as `{ matchId, winner }[]` regardless of storage. The Server Component transforms from whatever storage format exists.

If `results` table exists (Epic 5): query results table.
If `matches.winner` column is used: filter matches where winner is not null.

Either way, the scoring engine input is the same. The dev agent should use whichever storage approach the previous stories established.

### Previous Story Context

**Stories 4.1-4.3:** Complete scoring engine — `calculateScore()`, `calculateAllScores()`, `maxPossiblePoints()`, `isEliminated()`, `getChampionPick()`, `isChampionEliminated()`, `buildLeaderboardEntries()`, `applyTiebreakers()`, Vitest tests

**This story creates:**
- `src/components/leaderboard/LeaderboardTable.tsx` — NEW component
- `src/app/(app)/leaderboard/page.tsx` — replace placeholder with real page

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/components/leaderboard/LeaderboardTable.tsx` | Created | Leaderboard table component |
| `src/app/(app)/leaderboard/page.tsx` | Modified | Server Component with scoring engine integration |

### Testing Considerations

Manual testing checklist:
- [ ] Leaderboard shows all 12 users (or however many exist in dev)
- [ ] Users ranked by score descending
- [ ] Crown icon on rank 1
- [ ] Current user's row highlighted with green background
- [ ] Score, max possible, and champion pick columns display correctly
- [ ] With zero results: all users show score 0, max = 80
- [ ] Champion pick strikethrough when eliminated (requires result data — may test manually in Epic 5)
- [ ] Eliminated user's max points shown in muted color
- [ ] Table uses semantic HTML (`<table>`, `<thead>`, `<tbody>`)
- [ ] Mobile: table readable at 375px width

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4: Leaderboard Display]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction - Leaderboard]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy - shadcn Table]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns - Empty/Zero States]
- [Source: _bmad-output/planning-artifacts/prd.md#FR18, FR19, FR20, FR21, FR22, FR23]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
