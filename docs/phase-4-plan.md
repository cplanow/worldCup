# Phase 4 Plan — UI Revamp + E2E Tests + Product Analytics

**Date:** 2026-04-21
**Target ship:** Before June 11 kickoff (51 days runway)
**Scope:** Three independent workstreams — bundle as one plan since they share engineering attention.

---

## Part 1 — UI Revamp

> **Scope note:** This is a **ground-up rework of every UI surface**, not a targeted patch. The bracket page in particular is called out as unreadable and gets top priority. No component is safe — auth, bracket, groups, leaderboard, admin, navigation, forms, cards all get redesigned.

### 1.1 Current-State Audit (from explore agent)

Full palette + contrast + component report at bottom of this doc (Appendix A). Headline findings:

**Contrast failures (3 critical):**
| Pair | Ratio | WCAG |
|------|------:|:-----|
| Gold-muted `#8B7A2E` on gold-bright `#D4AF37` (the "Saved" badge on GroupCard) | 2.91 | ❌ FAIL AA |
| Muted-teal `#8BAF9E` on forest-green `#0F2E23` (nav inactive state, leaderboard headers) | 4.21 | ❌ FAIL AA |
| Red `#ef4444` on white (error banners) | 3.99 | ❌ FAIL AA |

**Structural issues:**
- Custom forest+gold palette defined but **underused**. Slate grays dominate the app interior → feels generic.
- **5+ copies** of the same input styling inlined across auth forms (no central input variant).
- **Inconsistent era.** Auth flow (glassmorphism, gradients) is 2024+; admin pages (flat utilitarian) are 2022.
- **No dark mode.** Dark tokens defined in CSS but zero wiring. Dead code.
- **No motion.** Only `transition-colors` scattered. No entry animations, no skeleton loaders, no state-change feedback.
- **Mobile unstressed.** `MatchCard w-40` will overflow small screens; admin forms cramped on mobile.

**What's working — keep it:**
- Bricolage Grotesque (display) + DM Sans (body) — strong pairing, preserve.
- Forest-green brand identity — distinctive, just needs fuller expression.
- Glassmorphism auth forms (gradient bg + `bg-white/10 backdrop-blur`) — extend this language into the app.
- Leaderboard rank-1 gold badge — visually effective.
- Per-position ring badges on GroupCard — intuitive hierarchy.

### 1.2 2026 Design Principles (from research)

Sources: [Figma 2026 Web Design Trends](https://www.figma.com/resource-library/web-design-trends/), [Recursion Color Trends 2026](https://recursion.software/blog/ui-color-trends-2026), [BitsKingdom Typography & Color 2026](https://bitskingdom.com/blog/2026-typography-color-texture/).

Distilled for our context:

1. **Cloud Dancer–style warm whites** (Pantone 2026 Color of the Year: soft, airy whites with subtle warmth). Reduces glare on leaderboards that users stare at. Applies to our body surface — swap from pure white to something like `#FBFAF6`.
2. **Sophisticated gradients return** — but subtle ombré, not rainbows. Use dual-tone transitions on hero panels, cards, and state-change flourishes.
3. **Variable fonts** — one typeface, many weights dynamically. Bricolage already supports this; we're using 400/600/700/800 as discrete weights. Opportunity: switch to the variable axis for fluid hierarchy.
4. **Dark mode as "mood mode"** — not a color inversion. Designed palettes for both light and dark that honor the brand. Keep forest-green as our dark mode primary.
5. **Bold expressive headlines** — oversized, confident display type. Chance to lean harder into Bricolage at large sizes.
6. **Motion design with restraint** — scroll-triggered reveals for leaderboard updates, hover nudges on bracket picks, state-change celebrations (micro-confetti on correct-pick reveal). No full-page parallax nonsense.
7. **Neumorphic touches for tactile clarity** — soft shadows to distinguish input fields and pickable cards. Subtle, not 2019 loud.
8. **Vibrant accent colors** — saturated pops for wins/losses/rank-changes. Our gold already plays this role; add an equivalent for "correct pick" (emerald needs tuning; currently fails contrast) and "wrong pick."
9. **Accessibility as first-class** — high contrast, keyboard nav, ARIA, voice/screen reader. We're already doing ARIA labels; contrast is the gap.

Out of scope (explicitly): neo-brutalism, maximalism, heavy illustration, claymorphism. Bad fit for a data-dense bracket app.

### 1.3 AI-Assisted Workflow

Research: [NxCode Vibe Design Tools 2026](https://www.nxcode.io/resources/news/vibe-design-tools-compared-stitch-v0-lovable-2026), [Komposo Best AI UI Generators 2026](https://www.komposo.ai/blog/best-ai-ui-generators-2026), [Kreante AI Frontend Tools 2026](https://www.kreante.co/post/lovable-cursor-v0-bolt-stitch-base44-which-ai-tool-should-you-choose-for-your-frontend-in-2026).

**Proposed tool stack (each chosen deliberately):**

| Stage | Tool | Why |
|-------|------|-----|
| **Design exploration** | [Google Stitch](https://stitch.withgoogle.com) | Describe → it generates 3-4 visual directions. Good for the "I don't know what I want but I know what I don't want" phase. Export to Figma. |
| **Component generation** | [v0.dev](https://v0.dev) | Outputs **Shadcn + Tailwind + React** — our exact stack. Paste existing component as context, ask for a redesign with new tokens. Copy-paste into our repo. |
| **Integration + polish** | Cursor (already installed) | Take v0 output, make it fit our conventions (iron-session, types, etc.), run tests. |
| **Avoid** | Lovable, Bolt.new, Mocha | Full-stack AI builders. They want to generate a DB, backend, auth — we already have all that. Would create throw-away code. |

**Workflow for each page/component:**
1. Screenshot the current UI.
2. Feed to Stitch with a prompt describing the 2026 direction + our brand (forest + gold + warm ivory, Bricolage display, data-dense but legible).
3. Pick one direction → iterate on the design in Figma or Stitch.
4. Send the final design + our existing code to v0 ("redesign this component to match this image, stay within Tailwind and Shadcn primitives").
5. Review v0 output in Cursor, tweak to match our types/conventions.
6. Visual regression test (Playwright screenshot diff) against the old version.

### 1.4 Design-Token System (pre-work for the revamp)

Before any component changes, centralize the palette as CSS custom properties + Tailwind theme tokens. Current pain point: hex values hardcoded in JSX across 40+ files. Migration path:

```css
/* globals.css */
@theme {
  /* Surface */
  --color-bg:             #FBFAF6;  /* Cloud Dancer warm white */
  --color-surface:        #FFFFFF;  /* card bg */
  --color-surface-hover:  #F5F4EF;

  /* Brand */
  --color-brand:          #0F2E23;  /* forest green — primary */
  --color-brand-hover:    #1A4A38;
  --color-brand-muted:    #2D5F4E;

  /* Accent */
  --color-accent:         #D4AF37;  /* gold */
  --color-accent-hover:   #C9A832;
  --color-accent-dark:    #8B7A2E;  /* gold on white only, NOT on gold */

  /* Semantic */
  --color-success:        #059669;  /* emerald-600, passes AA on white */
  --color-warning:        #D97706;
  --color-error:          #DC2626;  /* red-600, passes AA on white */
  --color-info:           #2563EB;

  /* Text */
  --color-text:           #0F172A;  /* near-black for body */
  --color-text-muted:     #64748B;  /* passes AA on white */
  --color-text-on-brand:  #FFFFFF;  /* text on forest green */
  --color-text-on-accent: #0F2E23;  /* text on gold */

  /* Dark mode overrides (mood mode, not inversion) */
}
```

Then every component uses `bg-surface text-text-muted border-brand/20` etc. Contrast failures get fixed at the token level once, everywhere.

### 1.5 Revamp Sequencing (updated — bracket-first)

Phased to maintain shippability at each step — never a broken-app commit. **Order reflects user-stated priority: the bracket page is currently unreadable and gets the first rework pass.**

| Phase | Scope | Effort | Status at end |
|-------|-------|-------:|----------|
| **4A — Tokens + contrast fixes** | Central palette in `globals.css`, Tailwind theme config, fix the 3 contrast failures inline. Prereq for all later work. | 0.5 day | Same UI, but accessible + token-centralized |
| **4B — Design sprint (Stitch)** | Generate 3-4 visual directions per page: **bracket (priority 1)**, groups, leaderboard, landing/auth, admin. Pick one per page. Export. | 1 day | Design mocks for everything |
| **4C — Component primitives** | Consolidate input, button, card, table, badge variants into one source of truth. Apply across every file that currently has inline styles. | 1 day | Fragmentation gone before we rebuild on top |
| **4D — Bracket rework** 🔥 | **Top priority per user feedback.** Complete reimagining of `BracketView`, `BracketTree`, `RoundView`, `MatchCard`, `ProgressBar`. Better visual hierarchy (current → next round flow), high-contrast state colors (correct/wrong/pending), hover/press micro-interactions, mobile-first layout. Use v0 with current screenshots + target design as input. | 2 days | Main game surface is now the strongest-looking |
| **4E — Group picks rework** | `GroupCard`, `GroupPicksView` — position badges, 4-team ranking UX, Golden Boot input. Tie visual language to the new bracket. | 1 day | Phase 1 user journey matches Phase 2 quality |
| **4F — Leaderboard rework** | Fix contrast. Add rank-change animations. Medal badges for 1-2-3. Golden Boot + champion pick tiebreaker visualization. | 0.5 day | Data density without eye strain |
| **4G — Auth + landing rework** | Landing is the front door; auth is the first interaction. Current glassmorphism is the best piece — amplify it, don't lose it. Large expressive headline, dual-tone gradient, variable-font Bricolage. | 1 day | First impression upgraded |
| **4H — Admin rework** | The laggard. Unified admin card pattern across `MatchupSetup`, `GroupSetup`, `KnockoutSetup`, `ResultsManager`, `AdminUserList`, `AdminMatchCard`. Match the game surface visual language. | 1 day | No more "2022 admin" vibes |
| **4I — Navigation + header** | `TabNav`, app-level header, `LogoutButton`, settings link. Often overlooked, sets the tone on every page. | 0.5 day | Shell matches the rooms |
| **4J — Dark mode** | Wire the existing unused dark tokens as "mood mode" (curated palette for dark, not inversion). Toggle in header. | 1 day | Premium polish |

**Total: ~8-9 working days for complete revamp.** Dark mode is included as default rather than optional — with every surface being reworked anyway, the incremental cost to do dark-mode-aware tokens as you go is smaller than bolting it on later.

### 1.6 Visual Regression Safety Net

Before touching UI, set up Playwright screenshot diffs on key pages (landing, bracket, leaderboard, admin). That way every redesign PR has a before/after visual diff in CI. This dovetails with Part 2 (E2E tests) — we build the infra once.

---

## Part 2 — E2E Integration Tests

### 2.1 Motivation

From Murat's earlier note: **we have 392 unit tests with mocks, 0 tests that exercise the real wire protocol.** If iron-session's cookie format changes, or drizzle-orm upgrades, or Next.js 16.3 changes server action behavior, unit tests stay green while prod breaks.

### 2.2 Tool: Playwright

Industry standard, first-party support from Microsoft, best-in-class for Next.js App Router. Already in the project's recommended tool stack (it was in the BMAD `tea` agent's skill list). No debate — use it.

### 2.3 Architecture

```
tests/
├── e2e/
│   ├── auth.spec.ts          # register → login → change password → logout
│   ├── group-picks.spec.ts   # 4-position pick flow, Golden Boot, submit
│   ├── bracket.spec.ts       # R32 through Final, cascade on change, submit
│   ├── admin.spec.ts         # login as admin, enter result, toggle lock
│   └── leaderboard.spec.ts   # multi-user scores render correctly
├── e2e/fixtures/
│   ├── db-state.ts           # seed/teardown helpers
│   ├── users.ts              # test account factories
│   └── playwright.config.ts
└── package.json              # @playwright/test
```

### 2.4 Setup Strategy

**Test environment:** dedicated Turso dev database (separate from prod). Use `.env.test` with a different `TURSO_CONNECTION_URL`. Each test run:
1. Wipes `users`, `picks`, `group_picks`, `results`, `audit_log` (keep `groups`, `group_teams`, `matches` structure)
2. Seeds a known state (admin user, 3-4 test users with varied progress)
3. Runs tests against `npm run dev` on `localhost:3000`
4. Tears down at end

**Avoid mocking at this layer.** The point is to exercise the real stack.

### 2.5 Test Priorities

Ordered by risk-weighted value:

1. **Auth flow end-to-end** (highest value — security-sensitive, recently refactored)
   - Register → login → logout → can't access authed routes after logout
   - Password change → old password rejected, new accepted, other devices invalidated (session-version test)
   - Admin-generated reset token → consume → password set → login works
   - Rate limit hit → proper 429-equivalent error

2. **Group pick flow** (core user journey)
   - Rank all 4 teams in a group → advance → rank another
   - Golden Boot required before submit
   - Submitted picks can't be edited
   - Locked state disables inputs

3. **Bracket flow** (most complex state machine)
   - R32 pick propagates to R16 candidates
   - Changing R32 pick cascades (server-side transaction)
   - Phantom team in R16 rejected
   - 31/31 picks → submit enabled

4. **Admin flow** (auth boundary + destructive ops)
   - Non-admin user hits admin action → rejected
   - Admin enters result → advancement correct
   - Auto-seed R32 populates matches correctly

5. **Leaderboard** (data integrity)
   - Scores correct for known pick+result state
   - Tiebreakers apply (Golden Boot > Champion pick > username)

### 2.6 CI Integration

GitHub Actions workflow `.github/workflows/e2e.yml` runs on PR. Fail-fast on:
- Unit tests (existing 392)
- Playwright suite
- Visual regression diffs (if 4F is done)

Run only on PRs and `main` pushes. Skip on docs-only changes.

### 2.7 Effort

- Setup + fixtures: 1 day
- Auth + group picks + bracket suites: 2 days
- Admin + leaderboard suites: 1 day
- CI wiring: 0.5 day
- **Total: ~4.5 days**

Can run in parallel with UI revamp because Playwright tests are file-additions, not file-modifications.

---

## Part 3 — Product Analytics

### 3.1 Philosophy (constraints drive design here)

This is a family pool, not a SaaS product. So:
- **No third-party SDKs.** No Google Analytics, no PostHog-hosted, no Mixpanel. Privacy + simplicity wins.
- **Self-hosted only.** Store events in our own Turso DB.
- **Light-touch.** Capture only what answers questions you'd actually ask. Skip vanity metrics.
- **Reuse `audit_log`.** We already have an append-only events table.

### 3.2 Questions Analytics Should Answer

For a pool owner:
1. **Who's signed up?** (You kinda know since it's family, but confirmation helps.)
2. **Who hasn't submitted group picks yet?** (Nudge them before lock.)
3. **Who hasn't submitted brackets yet?** (Same, later in the cycle.)
4. **Are people actively engaging during the tournament?** (Daily active users, leaderboard views.)
5. **Which features are broken / confusing?** (Error rates per action, time-to-submit distribution.)

Analytics that **don't** matter for this context: funnel conversion, marketing attribution, session replay, heatmaps, bounce rate.

### 3.3 Data Model

Extend the existing `audit_log` table + add one new events table:

```ts
// schema.ts — already exists
auditLog            // admin + security events (keep as-is)

// schema.ts — NEW
export const userEvents = sqliteTable("user_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),  // null for unauthed
  event: text("event").notNull(),  // "login", "group_pick_save", "bracket_pick_save", "bracket_submit", "group_submit", "leaderboard_view", "error"
  payload: text("payload"),         // small JSON blob — keep it tiny
  createdAt: text("created_at").notNull(),
}, (t) => [
  index("idx_user_events_user").on(t.userId),
  index("idx_user_events_event").on(t.event),
  index("idx_user_events_created").on(t.createdAt),
]);
```

### 3.4 Instrumentation Points

Add one-line `logEvent()` calls at:

| Point | Event | Payload |
|-------|-------|---------|
| Successful login | `login` | — |
| Group pick saved | `group_pick_save` | `{ groupId, complete: boolean }` |
| Group picks submitted | `group_submit` | `{ hasGoldenBoot }` |
| Bracket pick saved | `bracket_pick_save` | `{ round, position }` |
| Bracket submitted | `bracket_submit` | — |
| Leaderboard visited | `leaderboard_view` | — |
| Action error (any server action returns `{success:false}`) | `error` | `{ action, error }` — low cardinality |

**Deliberately NOT instrumenting:** every page view (too noisy), scroll depth (irrelevant), hover/click events (heavy + privacy-adjacent).

### 3.5 Admin Dashboard

One new admin page: `/admin/analytics` — a read-only view with:

- **Engagement overview:** bar chart of events per day, last 30 days
- **User progress:** table of every user → registered? group picks submitted? bracket submitted? last seen?
- **Error feed:** recent `error` events, grouped by `action`
- **Active users:** count of distinct `userId` with an event in last 24h / 7d

Simple server-rendered page with no heavy charting libs. Recharts is fine if needed, but SVG bars via Tailwind work for something this small.

### 3.6 Effort

- Schema + migration: 0.5 day
- `logEvent()` helper + instrumentation points: 0.5 day
- `/admin/analytics` page + queries: 1 day
- Polish + basic charts: 0.5 day
- **Total: ~2.5 days**

Can run in parallel with UI revamp and E2E work.

---

## Part 4 — Sequencing Across All Three Workstreams

### Recommended order

```
Week 1  ─────────────────────────────────────────────────
  [4A tokens]    [Test setup]    [Analytics schema]
  Chris           Agent X         Agent Y

Week 2  ─────────────────────────────────────────────────
  [4B design]    [Auth + groups  [Instrumentation +
  Chris+Stitch    e2e suites]     /admin/analytics]
                  Agent X          Agent Y

Week 3  ─────────────────────────────────────────────────
  [4C-4G code    [Bracket + admin
   redesign]      e2e suites + CI]
  Chris+v0        Agent X

Week 4  ─────────────────────────────────────────────────
  [Polish + dark
   mode + buffer]
```

**Parallelizable:** all three streams. Use worktree agents for tests and analytics (well-scoped, minimal overlap); reserve Chris + v0/Stitch for the design-heavy UI work that needs taste judgments.

### Total effort estimate

| Stream | Days |
|--------|-----:|
| UI revamp (complete, every surface, includes dark mode) | 8-9 |
| E2E test suite | 4.5 |
| Analytics | 2.5 |
| **Subtotal** | **15-16 person-days** |

Calendar time ~4 weeks with parallelization (UI can't fully parallelize with itself — same taste-judgment bottleneck — but tests and analytics fully parallel), ~7 weeks sequential. Kickoff is 51 days out; comfortable even if things slip.

### Hard decisions / open questions

1. ~~**Dark mode — in or out?**~~ IN. Doing it alongside the light-mode revamp is cheaper than a separate pass.
2. **Visual regression tests — mandatory or optional?** Recommend mandatory given ground-up rework scope (the investment pays back on every future change, and catches regressions while we iterate on 10+ components).
3. **Analytics admin page — SSR or client-side?** Recommend SSR for consistency with existing admin pages. No auth complications.
4. **One AI tool or multiple?** Stitch is free Google Labs; v0 has a free tier. Minimal cost either way. Recommend: use Stitch for design exploration, v0 for code generation. Don't try to collapse to one tool — each does a different job.
5. **What's the non-negotiable brand anchor?** Before 4B (Stitch design sprint), decide what CANNOT change. Strong candidates: Bricolage display font, forest-green brand color. Everything else on the table.

---

## Appendix A — Full UI Audit (from Explore agent, 2026-04-21)

### Palette inventory

**Brand (defined, underused):**
- `#0F2E23` Forest Green — primary brand
- `#1A4A38` Forest Light — hover/secondary
- `#2D5F4E` Forest Muted — rarely used
- `#D4AF37` Gold Bright — accents, active nav, CTAs
- `#8B7A2E` Gold Muted — badge text (problematic — see contrast)
- `#FAFAF5` Ivory — defined, not in UI
- `#F5F4EF` Ivory Warm — defined, not in UI

**Actual app interior (stock Tailwind):**
- `slate-{50,100,200,300,400,600,700,800,900}` — dominant
- `emerald-{50,100,500,600,700,800}` — correct picks, advance
- `red-{50,100,400,500,600,700,900}` — errors, wrong picks
- `blue-{100,500,800}` — medal accents

### Contrast failures

| Text | Background | Hex | Ratio | Verdict |
|------|-----------|-----|------:|:--------|
| `#8BAF9E` | `#0F2E23` | muted-teal on forest | 4.21 | ❌ AA fail (nav + table headers) |
| `#8B7A2E` | `#D4AF37` | gold-muted on gold | 2.91 | ❌ AA fail (Saved badge) |
| `#ef4444` | `#FFFFFF` | red-500 on white | 3.99 | ❌ AA fail (error banners) |
| `#9ca3af` | `#FFFFFF` | slate-400 on white | 4.48 | ⚠️ marginal AA (placeholders) |
| `#10b981` | `#FFFFFF` | emerald-500 on white | 4.54 | ⚠️ marginal AA (correct picks) |
| `#D4AF37` | `#0F2E23` | gold on forest | 7.87 | ✅ PASS AAA |
| `#FFFFFF` | `#0F2E23` | white on forest | 13.7 | ✅ PASS AAA |

### Worst offenders (line-level)

1. `src/components/groups/GroupCard.tsx:108` — `<span className="text-xs text-[#D4AF37]...">Saved</span>` contrast 2.91
2. `src/components/leaderboard/LeaderboardTable.tsx:43-66` — headers `text-[#8BAF9E]` contrast 4.21
3. `src/components/LoginForm.tsx:53,61,69` — input styles inlined; also present in `RegisterForm.tsx` and `ForgotPasswordResetForm.tsx`
4. `src/components/bracket/MatchCard.tsx:158-181` — result colors marginal contrast
5. `src/components/admin/AdminMatchCard.tsx:49-57` — inline logic, no theme alignment
6. `src/app/page.tsx:16` — lone gradient in the entire app, reads as stranded

### shadcn components present
`Button` (full variants), `Input` (minimal), `Table`, `Switch` (unused). Customization happens via inline Tailwind, not variant props → fragmentation.

---

## Sources

### 2026 design trends
- [Figma — Top Web Design Trends for 2026](https://www.figma.com/resource-library/web-design-trends/)
- [Recursion — Modern Color Palette / UI Color Trends 2026](https://recursion.software/blog/ui-color-trends-2026)
- [BitsKingdom — Typography, Color, Texture 2026](https://bitskingdom.com/blog/2026-typography-color-texture/)
- [UpDivision — UI Color Trends to Watch 2026](https://updivision.com/blog/post/ui-color-trends-to-watch-in-2026)
- [Lounge Lizard — 2026 Web Design Color Trends](https://www.loungelizard.com/blog/web-design-color-trends/)

### AI UI tooling
- [NxCode — Vibe Design Tools 2026: Stitch vs v0 vs Lovable vs Bolt](https://www.nxcode.io/resources/news/vibe-design-tools-compared-stitch-v0-lovable-2026)
- [Komposo — Best AI UI Generators 2026](https://www.komposo.ai/blog/best-ai-ui-generators-2026)
- [Kreante — Lovable vs Cursor vs v0 vs Bolt](https://www.kreante.co/post/lovable-cursor-v0-bolt-stitch-base44-which-ai-tool-should-you-choose-for-your-frontend-in-2026)
- [Lovable — Best AI App Builders 2026](https://lovable.dev/guides/best-ai-app-builders)
