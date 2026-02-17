# Story 4.2: Max Possible Points & Elimination Logic

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant,
I want to see my max possible points remaining and whether I'm mathematically eliminated,
so that I can track my competitive position throughout the tournament.

## Acceptance Criteria

1. **AC1: Max Possible Points Calculation**
   - **Given** a participant's picks and the current match results
   - **When** `maxPossiblePoints()` is called
   - **Then** it calculates the maximum points the participant could still earn based on their surviving picks in remaining unplayed matches

2. **AC2: Champion Pick Elimination**
   - **Given** a participant's champion pick has been eliminated from the tournament
   - **When** elimination status is evaluated
   - **Then** the participant is flagged with a champion pick elimination indicator

3. **AC3: Mathematical Elimination**
   - **Given** a participant's max possible points (current score + remaining possible) is less than the current leader's score
   - **When** elimination status is evaluated
   - **Then** the participant is flagged as mathematically eliminated (cannot win)

4. **AC4: Unit Tests**
   - **Given** max possible points and elimination logic are implemented
   - **When** unit tests are written
   - **Then** tests cover: all picks still alive, some picks eliminated, champion eliminated, mathematically eliminated, edge case where elimination status changes after a result correction

## Tasks / Subtasks

- [ ] Task 1: Implement maxPossiblePoints function (AC: #1)
  - [ ] Add to `src/lib/scoring-engine.ts`:
  - [ ] `maxPossiblePoints(params: MaxPointsInput): number`
    - Receives: user's picks, match results, all matches, point values per round
    - For each match WITHOUT a result yet (unplayed):
      - Check if the user's pick for that match is still "alive" (the picked team hasn't been eliminated in an earlier round)
      - If pick is alive: add that round's point value to max possible
    - Add current score (already earned points) to remaining possible
    - Return total max possible points
  - [ ] A pick is "alive" if the picked team has not lost in any earlier round where a result exists. A team is eliminated when a result shows a different winner for a match the team was in.

- [ ] Task 2: Implement team survival check (AC: #1)
  - [ ] `isTeamAlive(team: string, results: { matchId: number; winner: string }[], matches: Match[]): boolean`
    - Check if the team has lost any match where a result exists
    - A team loses when: a result exists for a match containing that team AND the winner is not that team
    - For R32 matches: check match.teamA/teamB against team name
    - For later rounds: a team is in a match if they were picked to advance there — but we need the actual results, not picks
    - **Simpler approach:** A team is eliminated from the tournament if any result shows them losing. Scan all results: for each result, the loser is the team in that match that is NOT the winner. If our team is a loser in any result, they're eliminated.
  - [ ] This requires knowing which teams were in each match. For R32 matches, teams are in the `matches` table. For later rounds, the teams are determined by previous results (not picks).

- [ ] Task 3: Implement champion pick elimination check (AC: #2)
  - [ ] `isChampionEliminated(championTeam: string, results: { matchId: number; winner: string }[], matches: Match[]): boolean`
    - The champion pick is the user's pick for the Final match (round 5, position 1)
    - Check if that team has been eliminated from the tournament (lost any match per actual results)
    - Return true if champion team has been knocked out

- [ ] Task 4: Implement mathematical elimination check (AC: #3)
  - [ ] `isEliminated(params: EliminationInput): boolean`
    - Calculate user's max possible points
    - Compare against the current leader's score
    - If max possible < leader's score: user is mathematically eliminated
    - Note: "leader's score" means the highest current score among all participants

- [ ] Task 5: Create combined leaderboard entry builder (AC: #1, #2, #3)
  - [ ] `buildLeaderboardEntries(params: LeaderboardInput): LeaderboardEntry[]`
    - Combines: scores, max possible points, champion pick, champion eliminated flag, mathematical elimination flag
    - Returns sorted array ready for leaderboard display (Story 4.4)
  - [ ] Define `LeaderboardEntry` type:
    ```typescript
    export interface LeaderboardEntry {
      userId: number;
      username: string;
      score: number;
      maxPossible: number;
      championPick: string;
      isChampionEliminated: boolean;
      isEliminated: boolean;
      rank: number;
    }
    ```

- [ ] Task 6: Write unit tests (AC: #4)
  - [ ] Add tests to `src/lib/scoring-engine.test.ts`:
    - **All picks alive:** No results entered, max possible = 80 (perfect score)
    - **Some picks eliminated:** R32 results entered, some wrong → max decreases
    - **Champion eliminated:** Champion team loses in R16 → flag is true
    - **Champion alive:** Champion team still in tournament → flag is false
    - **Mathematically eliminated:** Max possible < leader's score → eliminated
    - **Not eliminated:** Max possible >= leader's score → not eliminated
    - **Result correction changes elimination:** User was eliminated, result corrected, now not eliminated
    - **All results entered:** Max possible = current score (no remaining matches)
    - **Zero results:** Max possible = 80 for everyone (everyone can still get perfect)

## Dev Notes

### Architecture Compliance

- **Same file:** All scoring functions in `src/lib/scoring-engine.ts` — extends Story 4.1
- **Tests co-located:** `src/lib/scoring-engine.test.ts` — extends Story 4.1 tests
- **Pure functions:** Same rule — NO database access, receives all data as arguments
- **Types in `src/types/index.ts`:** `LeaderboardEntry`, `MaxPointsInput`, `EliminationInput`

### Max Possible Points Algorithm

```typescript
export function maxPossiblePoints(input: {
  picks: { matchId: number; selectedTeam: string }[];
  results: { matchId: number; winner: string }[];
  matches: { id: number; round: number; teamA: string | null; teamB: string | null }[];
  pointsPerRound: Record<number, number>;
  currentScore: number;
}): number {
  const { picks, results, matches, pointsPerRound, currentScore } = input;

  // Build set of eliminated teams from actual results
  const eliminatedTeams = new Set<string>();
  for (const result of results) {
    const match = matches.find(m => m.id === result.matchId);
    if (!match) continue;
    // The loser is whichever team in this match is NOT the winner
    if (match.teamA && match.teamA !== result.winner) eliminatedTeams.add(match.teamA);
    if (match.teamB && match.teamB !== result.winner) eliminatedTeams.add(match.teamB);
  }

  // For each unplayed match, check if user's pick is still alive
  let remainingPossible = 0;
  const resultMatchIds = new Set(results.map(r => r.matchId));

  for (const pick of picks) {
    // Skip matches that already have results (already scored in currentScore)
    if (resultMatchIds.has(pick.matchId)) continue;

    // Check if picked team is still alive
    if (!eliminatedTeams.has(pick.selectedTeam)) {
      const match = matches.find(m => m.id === pick.matchId);
      if (match) {
        remainingPossible += pointsPerRound[match.round] ?? 0;
      }
    }
  }

  return currentScore + remainingPossible;
}
```

### Team Elimination Logic

**A team is eliminated from the tournament when they lose a match.** The algorithm only needs to look at actual results — NOT picks.

For R32 matches, the teams are in `matches.teamA` and `matches.teamB`. When a result says `winner = "Brazil"` for a match where `teamA = "Brazil"` and `teamB = "Mexico"`, then Mexico is eliminated.

For later-round matches, the teams in that match are determined by the RESULTS of feeder matches (not user picks). The `matches` table has `teamA`/`teamB` as null for later rounds initially, but after results determine winners, the actual teams in later matches are known.

**Important:** The team names in later-round match slots should be derived from actual results, not from any single user's picks. Either:
- Update `matches.teamA`/`matches.teamB` when results are entered (Story 5.1 will handle this)
- OR derive team presence from the results chain at scoring time

**Recommended:** Have the result entry flow (Story 5.1) update the `matches` table with actual advancing teams. This makes the data model self-documenting and simplifies the scoring engine.

For now, the scoring engine function receives matches with team names already populated (caller's responsibility to provide correct data).

### Champion Pick Identification

The champion pick is the user's pick for the **Final match** (round 5, position 1). To identify it:

```typescript
export function getChampionPick(
  picks: { matchId: number; selectedTeam: string }[],
  matches: { id: number; round: number; position: number }[]
): string | null {
  const finalMatch = matches.find(m => m.round === 5 && m.position === 1);
  if (!finalMatch) return null;
  const pick = picks.find(p => p.matchId === finalMatch.id);
  return pick?.selectedTeam ?? null;
}
```

### Mathematical Elimination

```typescript
export function isEliminated(
  maxPossible: number,
  leaderScore: number
): boolean {
  return maxPossible < leaderScore;
}
```

Note: this uses strict `<`, not `<=`. A user tied with the leader is NOT eliminated (tiebreakers in Story 4.3 resolve ties).

### Previous Story Context

**Story 4.1:** `calculateScore()`, `calculateAllScores()`, `getPointsPerRound()`, Vitest setup, test infrastructure

**This story extends:**
- `src/lib/scoring-engine.ts` — add `maxPossiblePoints()`, `isChampionEliminated()`, `isEliminated()`, `getChampionPick()`, `buildLeaderboardEntries()`
- `src/lib/scoring-engine.test.ts` — add test cases for new functions
- `src/types/index.ts` — add `LeaderboardEntry` and related input types

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/scoring-engine.ts` | Modified | Add max points, elimination, champion check functions |
| `src/lib/scoring-engine.test.ts` | Modified | Add tests for new functions |
| `src/types/index.ts` | Modified | Add `LeaderboardEntry`, input types |

### Testing Considerations

Run tests: `npm test`

Additional test cases (~9 new tests):
- [ ] All picks alive (no results) → max = 80
- [ ] R32 results, some picks wrong → max decreases correctly
- [ ] Champion team loses → `isChampionEliminated` = true
- [ ] Champion team still alive → `isChampionEliminated` = false
- [ ] Max possible < leader → `isEliminated` = true
- [ ] Max possible >= leader → `isEliminated` = false
- [ ] Result correction flips elimination status
- [ ] All results entered → max = current score
- [ ] `getChampionPick` returns correct team from Final match pick

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2: Max Possible Points & Elimination Logic]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions - Scoring Boundary]
- [Source: _bmad-output/planning-artifacts/prd.md#FR21, FR22, FR23, FR27]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Opportunities - Max Possible Points]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
