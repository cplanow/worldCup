# Story 4.1: Scoring Engine — Core Calculation & Tests

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a scoring engine that calculates points using escalating round values,
so that participant scores are 100% accurate and re-derivable from source data.

## Acceptance Criteria

1. **AC1: Score Calculation**
   - **Given** a participant's picks and the entered match results
   - **When** `calculateScore()` is called
   - **Then** it returns the correct score using escalating points: R32 = 1, R16 = 2, QF = 4, SF = 8, Final = 16

2. **AC2: Pure Functions, No DB Access**
   - **Given** the scoring engine functions
   - **When** they are implemented in `src/lib/scoring-engine.ts`
   - **Then** they are pure functions that receive picks and results as arguments with no database access

3. **AC3: Configurable Point Values**
   - **Given** point values are stored in `tournament_config`
   - **When** scores are calculated
   - **Then** the engine uses the configured point values rather than hardcoded values

4. **AC4: Unit Tests**
   - **Given** the scoring engine is implemented
   - **When** unit tests are written in `src/lib/scoring-engine.test.ts`
   - **Then** tests cover: correct picks in each round, no correct picks, all correct picks, partial correct picks, and edge cases with zero results entered

5. **AC5: Re-derivable Scores**
   - **Given** a new result is entered or an existing result is corrected
   - **When** `calculateScore()` is called for all participants
   - **Then** all scores are re-derived from source data (picks + results), not incrementally accumulated

## Tasks / Subtasks

- [ ] Task 1: Set up test runner (AC: #4)
  - [ ] Install Vitest (lightweight, fast, TypeScript-native): `npm install -D vitest`
  - [ ] Add test script to `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`
  - [ ] Verify test runner works with a trivial test
  - [ ] No additional config file needed — Vitest reads `tsconfig.json` and resolves `@/*` aliases from Next.js config

- [ ] Task 2: Implement core scoring function (AC: #1, #2, #3, #5)
  - [ ] Create `src/lib/scoring-engine.ts`
  - [ ] Implement `calculateScore(params: ScoreInput): number`:
    - Receives: user's picks, match results (winner per match), point values per round
    - For each match with a result: if user's pick matches the result winner, add points for that round
    - Returns total score
    - PURE FUNCTION: no imports from `@/db`, no database access, no side effects
  - [ ] Define `ScoreInput` type:
    ```typescript
    interface ScoreInput {
      picks: { matchId: number; selectedTeam: string }[];
      results: { matchId: number; winner: string }[];
      matches: { id: number; round: number }[];
      pointsPerRound: Record<number, number>;
    }
    ```

- [ ] Task 3: Implement bulk scoring function (AC: #5)
  - [ ] Implement `calculateAllScores(params: AllScoresInput): PlayerScore[]`:
    - Receives: all users, all picks (grouped or flat), all results, all matches, point values
    - Calls `calculateScore()` for each user
    - Returns array of `{ userId, username, score }` sorted by score descending
    - This is the function called after every result entry/correction
  - [ ] Define `PlayerScore` type:
    ```typescript
    interface PlayerScore {
      userId: number;
      username: string;
      score: number;
    }
    ```

- [ ] Task 4: Implement helper to map round numbers to point values (AC: #3)
  - [ ] Implement `getPointsPerRound(config: TournamentConfig): Record<number, number>`:
    - Maps round numbers to configured point values:
      ```typescript
      { 1: config.pointsR32, 2: config.pointsR16, 3: config.pointsQf, 4: config.pointsSf, 5: config.pointsFinal }
      ```
    - Used by callers to pass point values into scoring functions

- [ ] Task 5: Write comprehensive unit tests (AC: #4)
  - [ ] Create `src/lib/scoring-engine.test.ts`
  - [ ] Test cases:
    - **Zero results entered:** Score = 0 for all users
    - **One correct R32 pick:** Score = 1 (or configured R32 points)
    - **One wrong R32 pick:** Score = 0
    - **Correct picks in each round:** Verify correct point value per round (1, 2, 4, 8, 16)
    - **All correct picks (perfect bracket):** Score = 16×1 + 8×2 + 4×4 + 2×8 + 1×16 = 16+16+16+16+16 = 80 (with default points)
    - **No correct picks:** Score = 0
    - **Partial correct:** Mix of correct and incorrect across rounds
    - **Custom point values:** Non-default point config produces correct totals
    - **Re-derivability:** Same inputs always produce same output (deterministic)
    - **Empty picks array:** Score = 0 (user with no picks)
    - **Result for match with no pick:** Doesn't crash, pick scores 0
  - [ ] Add types to `src/types/index.ts` as needed

- [ ] Task 6: Add scoring types to shared types (AC: #1, #2)
  - [ ] Add to `src/types/index.ts`:
    ```typescript
    export interface ScoreInput {
      picks: { matchId: number; selectedTeam: string }[];
      results: { matchId: number; winner: string }[];
      matches: { id: number; round: number }[];
      pointsPerRound: Record<number, number>;
    }

    export interface PlayerScore {
      userId: number;
      username: string;
      score: number;
    }
    ```

## Dev Notes

### Architecture Compliance

- **Scoring engine location:** `src/lib/scoring-engine.ts` — per architecture spec
- **Tests co-located:** `src/lib/scoring-engine.test.ts` — next to source file, per architecture
- **PURE FUNCTIONS ONLY:** The scoring engine MUST NOT import from `@/db`, `@/lib/actions`, or any module that accesses the database. It receives ALL data as arguments. This is the most critical architectural boundary in the project (NFR4, NFR5).
- **No `utils.ts`:** Scoring functions go in `scoring-engine.ts`, not a generic utils file

### Scoring Engine Architecture

```
Caller (Server Action or Server Component)
  ↓
  Fetches from DB: picks, results, matches, tournament_config
  ↓
  Transforms to plain objects (no Drizzle types)
  ↓
  Calls scoring-engine.ts pure functions
  ↓
  Receives computed scores
  ↓
  Uses for display or further computation
```

The scoring engine never touches the database. The CALLER is responsible for:
1. Fetching picks, results, matches, and config from Turso
2. Passing them as plain objects to scoring functions
3. Using the returned scores for rendering or further logic

### Core Algorithm

```typescript
// src/lib/scoring-engine.ts

export function calculateScore(input: ScoreInput): number {
  const { picks, results, matches, pointsPerRound } = input;
  let score = 0;

  for (const result of results) {
    // Find user's pick for this match
    const pick = picks.find(p => p.matchId === result.matchId);
    if (!pick) continue;

    // Check if pick is correct
    if (pick.selectedTeam === result.winner) {
      // Find match to get round number
      const match = matches.find(m => m.id === result.matchId);
      if (!match) continue;

      score += pointsPerRound[match.round] ?? 0;
    }
  }

  return score;
}

export function calculateAllScores(
  users: { id: number; username: string }[],
  allPicks: { userId: number; matchId: number; selectedTeam: string }[],
  results: { matchId: number; winner: string }[],
  matches: { id: number; round: number }[],
  pointsPerRound: Record<number, number>
): PlayerScore[] {
  return users
    .map(user => ({
      userId: user.id,
      username: user.username,
      score: calculateScore({
        picks: allPicks.filter(p => p.userId === user.id),
        results,
        matches,
        pointsPerRound,
      }),
    }))
    .sort((a, b) => b.score - a.score);
}

export function getPointsPerRound(config: {
  pointsR32: number;
  pointsR16: number;
  pointsQf: number;
  pointsSf: number;
  pointsFinal: number;
}): Record<number, number> {
  return {
    1: config.pointsR32,
    2: config.pointsR16,
    3: config.pointsQf,
    4: config.pointsSf,
    5: config.pointsFinal,
  };
}
```

### Default Point Values & Perfect Score

| Round | Name | Matches | Points Each | Max Points |
|-------|------|---------|-------------|------------|
| 1 | R32 | 16 | 1 | 16 |
| 2 | R16 | 8 | 2 | 16 |
| 3 | QF | 4 | 4 | 16 |
| 4 | SF | 2 | 8 | 16 |
| 5 | Final | 1 | 16 | 16 |
| **Total** | | **31** | | **80** |

Perfect bracket = 80 points with default scoring. This is useful for test validation.

### Test Runner Setup

**Vitest** is the recommended test runner:
- TypeScript-native (no separate ts-jest config)
- Fast (uses Vite's transform pipeline)
- Compatible with Next.js project structure
- Resolves `@/*` path aliases from `tsconfig.json`

```json
// package.json scripts
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

If Vitest has issues resolving `@/*` aliases, add a minimal `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Test Structure Example

```typescript
// src/lib/scoring-engine.test.ts
import { describe, it, expect } from "vitest";
import { calculateScore, calculateAllScores, getPointsPerRound } from "./scoring-engine";

const DEFAULT_POINTS = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

// Helper to create test matches
function makeMatch(id: number, round: number) {
  return { id, round };
}

describe("calculateScore", () => {
  it("returns 0 when no results entered", () => {
    const score = calculateScore({
      picks: [{ matchId: 1, selectedTeam: "Brazil" }],
      results: [],
      matches: [makeMatch(1, 1)],
      pointsPerRound: DEFAULT_POINTS,
    });
    expect(score).toBe(0);
  });

  it("scores 1 point for correct R32 pick", () => {
    const score = calculateScore({
      picks: [{ matchId: 1, selectedTeam: "Brazil" }],
      results: [{ matchId: 1, winner: "Brazil" }],
      matches: [makeMatch(1, 1)],
      pointsPerRound: DEFAULT_POINTS,
    });
    expect(score).toBe(1);
  });

  it("scores 0 for wrong pick", () => {
    const score = calculateScore({
      picks: [{ matchId: 1, selectedTeam: "Mexico" }],
      results: [{ matchId: 1, winner: "Brazil" }],
      matches: [makeMatch(1, 1)],
      pointsPerRound: DEFAULT_POINTS,
    });
    expect(score).toBe(0);
  });

  it("scores correct points per round", () => {
    // One correct pick in each round
    const picks = [
      { matchId: 1, selectedTeam: "A" },
      { matchId: 17, selectedTeam: "B" },
      { matchId: 25, selectedTeam: "C" },
      { matchId: 29, selectedTeam: "D" },
      { matchId: 31, selectedTeam: "E" },
    ];
    const results = [
      { matchId: 1, winner: "A" },
      { matchId: 17, winner: "B" },
      { matchId: 25, winner: "C" },
      { matchId: 29, winner: "D" },
      { matchId: 31, winner: "E" },
    ];
    const matches = [
      makeMatch(1, 1), makeMatch(17, 2), makeMatch(25, 3),
      makeMatch(29, 4), makeMatch(31, 5),
    ];
    expect(calculateScore({ picks, results, matches, pointsPerRound: DEFAULT_POINTS }))
      .toBe(1 + 2 + 4 + 8 + 16); // 31
  });

  it("scores 80 for perfect bracket", () => {
    // 16 correct R32 + 8 correct R16 + 4 correct QF + 2 correct SF + 1 correct Final
    // = 16*1 + 8*2 + 4*4 + 2*8 + 1*16 = 80
    // ... build full test data
  });

  it("uses custom point values", () => {
    const customPoints = { 1: 2, 2: 3, 3: 5, 4: 10, 5: 20 };
    const score = calculateScore({
      picks: [{ matchId: 1, selectedTeam: "A" }],
      results: [{ matchId: 1, winner: "A" }],
      matches: [makeMatch(1, 1)],
      pointsPerRound: customPoints,
    });
    expect(score).toBe(2);
  });
});
```

### Why Pure Functions Matter (NFR4, NFR5)

1. **100% accurate (NFR4):** No database state, no async behavior, no side effects. Same inputs → same output. Always.
2. **Re-derivable (NFR5):** When a result is corrected, call `calculateAllScores()` with all picks and ALL results. Scores are recomputed from scratch, not incrementally adjusted. No accumulated rounding errors, no stale state.
3. **Testable:** Unit tests run in milliseconds with no database setup. Every edge case can be verified.
4. **Debuggable:** If a score is wrong, pass the same inputs to the function and step through it. No database queries to debug.

### Previous Story Context

**Stories 1.1-3.4:** Full project scaffolding, users/matches/picks/tournament_config tables, bracket entry, submission, read-only view.

**This story creates:**
- `src/lib/scoring-engine.ts` — NEW file, core scoring logic
- `src/lib/scoring-engine.test.ts` — NEW file, unit tests
- Vitest test runner setup
- Scoring types in `src/types/index.ts`

**No dependency on previous bracket code.** The scoring engine is intentionally isolated — it doesn't import anything from the bracket components or actions. It receives plain data and returns computed results.

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/scoring-engine.ts` | Created | `calculateScore()`, `calculateAllScores()`, `getPointsPerRound()` |
| `src/lib/scoring-engine.test.ts` | Created | Comprehensive unit tests |
| `src/types/index.ts` | Modified | Add `ScoreInput`, `PlayerScore` types |
| `package.json` | Modified | Add vitest dev dependency, test scripts |
| `vitest.config.ts` | Created (if needed) | Path alias resolution for `@/*` |

### Testing Considerations

Run tests: `npm test`

Expected test count: ~10-15 test cases covering:
- [ ] Zero results → score 0
- [ ] One correct pick per round → correct point value
- [ ] Wrong pick → score 0
- [ ] Perfect bracket → score 80
- [ ] No correct picks → score 0
- [ ] Partial correct picks → correct sum
- [ ] Custom point values → correct calculation
- [ ] Empty picks array → score 0
- [ ] Result for match with no pick → no crash, score 0
- [ ] Re-derivability: same inputs always produce same output
- [ ] `calculateAllScores` returns sorted array
- [ ] `calculateAllScores` handles multiple users correctly
- [ ] `getPointsPerRound` maps config correctly

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1: Scoring Engine — Core Calculation & Tests]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions - Scoring Boundary]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/prd.md#FR24, FR25]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR4, NFR5]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
