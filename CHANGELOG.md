# Changelog

All notable changes to the worldCup prediction pool are documented here.

## [Unreleased] — 2026-04-20

### Added

- **Group stage: full 1-4 ranking (Option B).** Users now rank all four teams per group rather than picking only 1st/2nd. Scoring: 2 pts per team in correct position + 5 pt perfect-group bonus. Max raised from 72 → **156 pts** (`src/lib/group-scoring-engine.ts`).
- **Golden Boot tiebreaker.** Users enter a tournament top-scorer guess bundled with group-stage submission. Admin enters the actual top scorer after the tournament. Applied as the highest-priority tiebreaker on the combined leaderboard after combined score, ahead of champion pick and username.
- **Auto-seed Round of 32.** New admin action derives 16 R32 matchups from group winners + runners-up + 8 admin-selected third-place advancers, using a deterministic pairing rule. Admin can manually override any matchup after seeding (`src/lib/bracket-seeding.ts`, `src/components/admin/KnockoutSetup.tsx`).
- **`third_place_advancers` table.** Admin flags which 8 of 12 groups' third-place teams advance to the knockout stage.
- **New admin UI section: "Knockout Stage Setup".** Combines Golden Boot entry, third-place advancer picker, and auto-seed button in one flow.
- **`CHANGELOG.md`** (this file).
- **`README.md`** — project overview, stack, local dev, deploy instructions.
- **Memory: `deployment_stack.md`** — captures self-hosted Docker deploy context.

### Changed

- **Knockout scoring defaults bumped** from `1/2/4/8/16` to **`2/4/8/16/32`** (R32 / R16 / QF / SF / Final). Max bracket score raised from 80 → 160 pts. Aligns with the 2026 research document's escalating-points model.
- **Combined leaderboard max** raised from 152 → **316 pts** (156 group + 160 knockout).
- **`buildCombinedLeaderboard`** now takes `actualTopScorer` and `actualChampion` and applies a full tiebreaker chain: combined score → Golden Boot → champion pick → username.
- **`submitGroupPicks`** requires all four positions and a Golden Boot pick before succeeding.
- **`GroupCard`** redesigned as a 4-position picker (click to cycle, click an assigned team to clear).
- **Deployment migrated from Vercel to self-hosted Docker** on sparta. No `vercel.json`, `.vercel/`, or `@vercel/*` dependencies remain. Architecture doc updated with deprecation notice. Deploy flow: `git push` → SSH to sparta → `docker compose up -d --build`.

### Schema

New migration: `worldcup-app/src/db/migrations/0006_overrated_spirit.sql`

- `users.top_scorer_pick` (text, nullable)
- `tournament_config.points_group_position` (default 2), `points_group_perfect` (default 5), `actual_top_scorer` (text, nullable)
- `group_picks.third_place`, `group_picks.fourth_place` (text, nullable for backwards compat)
- New table `third_place_advancers` (id, group_id unique, created_at)
- Default values on `points_r32`–`points_final` updated to new values

### Data Migrations

- `scripts/2026-04-20-bump-knockout-scoring.sql` — conservative UPDATE bumping existing tournament_config rows from `1/2/4/8/16` → `2/4/8/16/32` only when the row still matches the old defaults (preserves admin customization).
- Turso auth token was rotated 2026-04-20 during the Vercel→Docker migration.

### Tests

- 330/330 Vitest tests pass
- New suite: `src/lib/bracket-seeding.test.ts` (9 tests covering deterministic pairing, validation errors, alphabetical sort, third-place advancer subset)
- Rewrote `src/lib/group-scoring-engine.test.ts` for Option B scoring + Golden Boot tiebreaker

---

## [0.4.0] — 2026-03-13

### Added

- **Authentication.** Username/password auth with PBKDF2 hashing, migration bridge for pre-auth users, admin password reset.
- **Group Stage (v1).** 12-group prediction game, pick 1st/2nd per group, combined leaderboard with bracket. *(Superseded by 2026-04-20 changes above.)*
- **UI redesign — "Trophy Room" theme.** Forest green / gold / ivory palette, Bricolage Grotesque + DM Sans fonts.

---

## [0.3.0] — 2026-03-xx (Epics 1–5)

Epic 1: Project init, landing page, user registration
Epic 2: Admin page, matchup setup, bracket lock
Epic 3: Bracket data model, tap-to-pick, progress tracking, read-only view
Epic 4: Scoring engine, max-possible, tiebreakers, leaderboard display
Epic 5: Admin result entry, result correction, color-coded results, view others' brackets
