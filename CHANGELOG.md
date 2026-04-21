# Changelog

All notable changes to the worldCup prediction pool are documented here.

## [2026-04-21] — Security Hardening

### Security (audit remediation)

**Phase 1** (`2487804`) — quick wins:
- Upgraded Next.js 16.1.6 → 16.2.4, closing CSRF null-origin bypass
  (GHSA-mq59-m269-xvcx) and HTTP request smuggling (GHSA-ggv3-7p47-pfv8).
- Added CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy to every response.
- Switched `verifyPassword` hash comparison to `crypto.timingSafeEqual`.
- Forced cookie `secure: true` unconditionally.
- Unified the `setPassword` "user not found" vs "password already set"
  errors to prevent enumeration of takeoverable accounts.
- 60-char cap on admin-entered team names; 100-char cap on top-scorer
  picks.
- ~~Bound Docker container port to `127.0.0.1:3002:3000`~~ **Reverted
  (`147fd3e`):** M5 assumed Caddy was co-located on sparta. In this
  homelab Caddy lives on citadel (`10.0.20.20`) and needs LAN
  reachability to sparta:3002. Loopback binding broke the reverse
  proxy. Edge exposure is controlled at the homelab firewall instead.

**Phase 2** (`310c98d`) — signed-session auth rewrite:
- Replaced the unsigned `username=<literal>` cookie with an iron-session
  encrypted + signed session. Cookie values are no longer impersonatable
  by clients. Requires `SESSION_SECRET` env var (32+ chars).
- Server actions (`savePick`, `deletePicks`, `submitBracket`,
  `saveGroupPick`, `saveTopScorerPick`, `submitGroupPicks`,
  `getGroupPicksForUser`) now derive the user from the session instead
  of trusting a client-supplied `userId`. Closes IDOR across all
  pick-related mutations.
- Removed the unauthenticated `setPassword` action and
  `SetPasswordForm` component. The legacy migration-bridge takeover
  primitive is gone; null-password accounts are no longer claimable.
- `registerUser` rejects the admin username, so the admin account must
  be seeded out-of-band rather than land-grabbed on a fresh deploy.
- `MIN_PASSWORD_LENGTH` raised 4 → 10.
- New helpers in `src/lib/session.ts`:
  `getSession`, `getSessionUser`, `requireUser`, `requireAdmin`,
  `requireSessionOrRedirect`, `isAdminUsername`.

### Deployment notes for this release
1. Generate a session secret: `openssl rand -base64 48`.
2. Add to sparta's `~/.env`: `SESSION_SECRET="<generated>"`.
3. `git pull && docker compose up -d --build`.
4. **Register the admin account immediately** so it isn't claimable.

**Phase 3** — remaining high/medium/low findings closed:

### Security (audit remediation, phase 3)

- **H3 rate limiting** (`a46c0c9`) — per-IP and per-username token-bucket
  rate limits on `registerUser`, `loginUser`, password-change, and
  reset-token endpoints. In-process state (`src/lib/rate-limit.ts`),
  acceptable for single-replica sparta deploy.
- **H4 server-side bracket pick validation for rounds 2-5** (`205033b`)
  — `savePick` now validates that a round-N+1 pick's team actually
  advanced from the referenced round-N match, not just trusting the
  client.
- **H5 password strength** (`c13553d`) — `validatePasswordStrength` in
  `src/lib/password.ts`: min 10 chars, short common-pattern blocklist
  (`password`, `qwerty`, etc.), rejects all-lowercase / all-uppercase /
  all-digits.
- **H6 build-time Turso secrets** (`2df8b44`) — all routes forced
  dynamic; Turso token no longer needed at `next build` time, stays out
  of build logs / image layers.
- **M3 session rotation** (`8c32c74`) — `SessionData` carries
  `sessionVersion`; `users.session_version` bumps on password change and
  session is re-saved with the new value, invalidating sessions on
  other devices.
- **M4 server-side cascading bracket clears** (`7bcad27`, `ffeba3c`) —
  when a round-N pick changes, downstream round-(N+1..5) picks that
  referenced the old winner are cleared in a single DB transaction via
  `clearBracketMatchesIfSafe`. Also reused from `autoSeedR32`.
- **M7 audit log** (`8c32c74`) — `audit_log` table append-only; wired
  into result entry/correction, lock toggles, reset-token generation and
  consumption, password changes. Helper: `src/lib/audit-log.ts`.
- **M9 surface bracket save errors** (`ba1b9a3`) — UI no longer
  swallows save failures on bracket mutations; errors shown to user.
- **L1 username format validation** (`a4afb1e`) — regex
  `/^[a-z0-9._-]{3,30}$/`, enforced in `registerUser`, silent in
  `loginUser` (no enumeration).
- **L7 group name regex** (`4677fe5`) — restricted to `A`-`L`.
- **L8 orphan match cleanup** (`ffeba3c`) — extracted
  `clearBracketMatchesIfSafe` helper; bracket reset no longer leaves
  orphan rows.
- **L9 SECURITY.md** (`661cd3c`) — vulnerability disclosure policy
  added at repo root.
- **Password self-service** (`3067e89`, `799bfad` — task #27):
  authenticated password change at `/settings/password` via
  `changePassword` action (verifies current password, validates
  strength, bumps `session_version`); admin-initiated tokenized reset
  at `/forgot-password/<token>` consuming an admin-generated 32-byte
  token (1-hour expiry, SHA-256 hashed and stored on
  `users.reset_token_hash` / `reset_token_expires_at`). Admin can
  generate the reset URL from the admin UI and share out-of-band.

### Deployment notes for this release

1. Migration `0007` adds `session_version`, `reset_token_hash`,
   `reset_token_expires_at` on `users`, plus the `audit_log` table.
   Apply with `drizzle-kit push` against Turso before rolling the
   container.
2. No new env vars required for phase 3 (rate limits and session
   rotation are self-contained). `SESSION_SECRET` from phase 2 still
   required.
3. `git pull && docker compose up -d --build` on sparta.

### Audit findings remaining

- **L5** (container hardening: `no-new-privileges`, read-only root
  FS). Explicitly deferred.

## [2026-04-20] — Group Stage Expansion + 2026 World Cup Seeding

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
