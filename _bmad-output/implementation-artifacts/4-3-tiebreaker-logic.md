# Story 4.3: Tiebreaker Logic

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant,
I want ties on the leaderboard resolved fairly,
so that rankings are definitive even when participants have equal scores.

## Acceptance Criteria

1. **AC1: Champion Pick Tiebreaker**
   - **Given** two or more participants have the same current score
   - **When** the leaderboard ranking is calculated
   - **Then** the first tiebreaker is applied: the participant with a correct champion pick ranks higher

2. **AC2: Latest Round Tiebreaker**
   - **Given** two or more participants are still tied after the champion pick tiebreaker
   - **When** the second tiebreaker is applied
   - **Then** the participant with more correct picks in the latest completed round ranks higher

3. **AC3: Unit Tests**
   - **Given** tiebreaker logic is implemented
   - **When** unit tests are written
   - **Then** tests cover: no tie, tie broken by champion pick, tie broken by latest-round picks, three-way tie, tie that remains unresolved after both tiebreakers

## Tasks / Subtasks

- [ ] Task 1: Implement tiebreaker sorting (AC: #1, #2)
  - [ ] Add to `src/lib/scoring-engine.ts`:
  - [ ] `applyTiebreakers(entries: LeaderboardEntry[], params: TiebreakerInput): LeaderboardEntry[]`
    - Sort entries by:
      1. Score (descending) — primary sort
      2. Correct champion pick (true ranks higher) — first tiebreaker
      3. Correct picks in latest completed round (more = higher) — second tiebreaker
    - Assign `rank` values (1, 2, 3, ...) — tied participants after all tiebreakers share the same rank
  - [ ] `getCorrectPicksInRound(params: { picks: { matchId: number; selectedTeam: string }[]; results: { matchId: number; winner: string }[]; matches: { id: number; round: number }[]; targetRound: number }): number`
    - Count how many correct picks a user has in a specific round
  - [ ] `getLatestCompletedRound(results: { matchId: number }[], matches: { id: number; round: number }[]): number`
    - Find the highest round number where ALL matches in that round have results
    - If no round is fully complete, use the highest round that has ANY results

- [ ] Task 2: Integrate tiebreakers into buildLeaderboardEntries (AC: #1, #2)
  - [ ] Update `buildLeaderboardEntries()` from Story 4.2 to call `applyTiebreakers()` as the final step
  - [ ] Pass necessary data for tiebreaker computation (champion pick correctness, per-round correct counts)

- [ ] Task 3: Write unit tests (AC: #3)
  - [ ] Add tests to `src/lib/scoring-engine.test.ts`:
    - **No tie:** Users with different scores → ranked by score
    - **Tie broken by champion pick:** Two users same score, one has correct champion → that user ranks higher
    - **Tie broken by latest-round picks:** Two users same score, neither has correct champion, one has more correct picks in latest round → ranks higher
    - **Three-way tie:** Three users same score → all tiebreakers applied, ranks assigned
    - **Unresolved tie:** Two users same score, same champion status, same latest-round picks → share the same rank
    - **Champion pick tiebreaker precedence:** User A has correct champion but fewer latest-round picks than User B → User A still ranks higher (champion tiebreaker comes first)

## Dev Notes

### Architecture Compliance

- **Same file:** `src/lib/scoring-engine.ts` — extends Stories 4.1 and 4.2
- **Pure functions:** No database access
- **Tests co-located:** `src/lib/scoring-engine.test.ts`

### Tiebreaker Sort Algorithm

```typescript
export function applyTiebreakers(
  entries: LeaderboardEntry[],
  input: {
    allPicks: { userId: number; matchId: number; selectedTeam: string }[];
    results: { matchId: number; winner: string }[];
    matches: { id: number; round: number; position: number; teamA: string | null; teamB: string | null }[];
  }
): LeaderboardEntry[] {
  const latestRound = getLatestCompletedRound(input.results, input.matches);

  // Determine actual champion (winner of Final) if Final has a result
  const finalMatch = input.matches.find(m => m.round === 5 && m.position === 1);
  const finalResult = finalMatch ? input.results.find(r => r.matchId === finalMatch.id) : null;
  const actualChampion = finalResult?.winner ?? null;

  const sorted = [...entries].sort((a, b) => {
    // 1. Score (descending)
    if (b.score !== a.score) return b.score - a.score;

    // 2. Correct champion pick (true ranks higher)
    if (actualChampion) {
      const aChampCorrect = a.championPick === actualChampion;
      const bChampCorrect = b.championPick === actualChampion;
      if (aChampCorrect !== bChampCorrect) return aChampCorrect ? -1 : 1;
    }

    // 3. Most correct picks in latest completed round
    if (latestRound > 0) {
      const aRoundPicks = getCorrectPicksInRound({
        picks: input.allPicks.filter(p => p.userId === a.userId),
        results: input.results,
        matches: input.matches,
        targetRound: latestRound,
      });
      const bRoundPicks = getCorrectPicksInRound({
        picks: input.allPicks.filter(p => p.userId === b.userId),
        results: input.results,
        matches: input.matches,
        targetRound: latestRound,
      });
      if (bRoundPicks !== aRoundPicks) return bRoundPicks - aRoundPicks;
    }

    // Still tied — preserve relative order
    return 0;
  });

  // Assign ranks (tied entries share same rank)
  let currentRank = 1;
  sorted[0].rank = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    // If same score and same tiebreaker values, share rank
    if (curr.score === prev.score) {
      // Check if tiebreakers also match
      const sameChamp = curr.championPick === prev.championPick;
      // For simplicity, if sort didn't differentiate them, they share rank
      curr.rank = prev.rank;
    } else {
      curr.rank = i + 1;
    }
  }

  return sorted;
}

export function getCorrectPicksInRound(params: {
  picks: { matchId: number; selectedTeam: string }[];
  results: { matchId: number; winner: string }[];
  matches: { id: number; round: number }[];
  targetRound: number;
}): number {
  const { picks, results, matches, targetRound } = params;
  let count = 0;

  const roundMatches = matches.filter(m => m.round === targetRound);
  for (const match of roundMatches) {
    const result = results.find(r => r.matchId === match.id);
    if (!result) continue;
    const pick = picks.find(p => p.matchId === match.id);
    if (pick && pick.selectedTeam === result.winner) count++;
  }

  return count;
}

export function getLatestCompletedRound(
  results: { matchId: number }[],
  matches: { id: number; round: number }[]
): number {
  const resultMatchIds = new Set(results.map(r => r.matchId));

  // Check rounds from highest to lowest
  for (let round = 5; round >= 1; round--) {
    const roundMatches = matches.filter(m => m.round === round);
    if (roundMatches.length === 0) continue;

    const hasAnyResult = roundMatches.some(m => resultMatchIds.has(m.id));
    if (hasAnyResult) return round;
  }

  return 0; // No results entered
}
```

### Rank Assignment Note

When two users are truly tied after all tiebreakers, they share the same rank number. The next rank skips. Example:
- Rank 1: Alice (45 pts)
- Rank 2: Bob (40 pts)
- Rank 2: Charlie (40 pts, tied with Bob on all tiebreakers)
- Rank 4: Dave (38 pts)

### Champion Pick Tiebreaker Nuance

The champion pick tiebreaker only applies **after the Final has been played and a champion is known.** Before the Final:
- `actualChampion` is null
- Champion tiebreaker is skipped
- Only latest-round tiebreaker applies

After the Final, a correct champion pick is the strongest tiebreaker — per PRD FR26.

### Previous Story Context

**Story 4.1:** `calculateScore()`, `calculateAllScores()`, Vitest setup
**Story 4.2:** `maxPossiblePoints()`, `isEliminated()`, `getChampionPick()`, `buildLeaderboardEntries()`

**This story extends:**
- `src/lib/scoring-engine.ts` — add `applyTiebreakers()`, `getCorrectPicksInRound()`, `getLatestCompletedRound()`
- `src/lib/scoring-engine.test.ts` — add tiebreaker test cases
- Update `buildLeaderboardEntries()` to integrate tiebreakers

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/scoring-engine.ts` | Modified | Add tiebreaker functions |
| `src/lib/scoring-engine.test.ts` | Modified | Add tiebreaker test cases |

### Testing Considerations

~6 new test cases:
- [ ] No tie → ranked by score alone
- [ ] Tie broken by champion pick
- [ ] Tie broken by latest-round correct picks
- [ ] Three-way tie with tiebreakers applied
- [ ] Unresolved tie → shared rank
- [ ] Champion tiebreaker takes precedence over latest-round

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3: Tiebreaker Logic]
- [Source: _bmad-output/planning-artifacts/prd.md#FR26]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
