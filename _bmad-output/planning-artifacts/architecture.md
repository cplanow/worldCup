---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-02-17'
inputDocuments:
  - product-brief-worldCup-2026-02-16.md
  - prd.md
  - prd-validation-report.md
  - ux-design-specification.md
workflowType: 'architecture'
project_name: 'worldCup'
user_name: 'Chris'
date: '2026-02-17'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
35 FRs across 8 capability areas. The bracket entry system (FR5-FR15) is the most interaction-heavy, requiring cascading pick logic, progress tracking, and submission gating. The scoring engine (FR24-FR27) is the most computation-heavy, requiring escalating point calculations, tiebreaker resolution, and max possible points remaining — a forward-looking calculation that must evaluate each user's surviving picks against remaining tournament matchups. Admin operations (FR28-FR33) require result entry with automatic score recalculation across all 12 users, including undo/correct with full cascade recalculation.

**Non-Functional Requirements:**
7 NFRs across reliability, data integrity, and performance. Architecture-driving NFRs:
- **NFR2 (Data persistence):** Submitted brackets and results must persist reliably across ~3 weeks. Rules out ephemeral or in-memory-only storage.
- **NFR3 (Server restart recovery):** State must survive server restarts without loss. Requires durable storage, not session-based state.
- **NFR4 (Scoring accuracy):** 100% correct calculations. Scoring logic must be deterministic and testable in isolation.
- **NFR5 (Cascade recalculation):** Result corrections trigger complete recalculation of all affected scores, max possible points, and elimination status. Scoring must be re-derivable from source data (picks + results), not incrementally accumulated.
- **NFR6 (Lock enforcement):** No race conditions on bracket lock. Requires server-side enforcement, not client-side only.
- **NFR7 (Performance):** Page loads under 3 seconds, user actions under 500ms. Trivially achievable at this data scale (12 users, 31 picks each, 31 matches max).

**Scale & Complexity:**

- Primary domain: Full-stack web application (SPA + REST API)
- Complexity level: Low
- Estimated architectural components: ~6 (landing/auth, bracket entry UI, bracket display, leaderboard, scoring engine, admin tools)
- Data scale: 12 users, 372 total picks (12 x 31), 31 matches — entire dataset fits in memory

### Technical Constraints & Dependencies

- **Hard external deadline:** App must be deployed before knockout stage begins. Lean architecture choices that minimize setup time are preferred over optimal-but-complex solutions.
- **Solo developer:** Architecture must be simple enough for one person to build, deploy, and maintain. No microservices, no complex infrastructure.
- **UX prescriptions:** UX spec specifies Next.js, Tailwind CSS, and shadcn/ui. These are inputs to the architecture, not open decisions.
- **Trust-based auth:** 12 known users, username-only identity. No passwords, no OAuth, no sessions to manage beyond basic user identification.
- **Manual result entry for MVP:** No external API integration. Admin enters results manually. Simplifies data flow architecture.

### Cross-Cutting Concerns Identified

- **Cascading pick logic:** Affects bracket entry (FR7-FR8), scoring calculation (FR24-FR27), and result correction (FR33). Changing an early-round pick or correcting a result cascades through multiple data relationships. The architecture must make this traversal straightforward and deterministic.
- **Bracket lock enforcement:** Affects entry (FR30), submission (FR12), admin control (FR29), and edge cases (incomplete bracket at lock time). Must be enforced server-side with no client-side bypass.
- **Score recalculation triggers:** Result entry (FR25) and result correction (FR33) both trigger full score recalculation for all 12 users. Architecture should support re-deriving all scores from source data (picks + results) rather than maintaining running totals.
- **Dual-mode bracket rendering:** Desktop (BracketTree) and mobile (RoundView) share the same data model but render completely differently. Component architecture must cleanly separate data from presentation.

## Starter Template Evaluation

### Technical Preferences

- **Language:** TypeScript (novice level)
- **Framework:** Next.js 16 with App Router (novice level with React/Next.js)
- **Styling:** Tailwind CSS + shadcn/ui (prescribed by UX spec)
- **Database:** SQLite semantics via Turso (remote libSQL) — user wants hands-on schema work
- **ORM:** Drizzle ORM (TypeScript-native, SQLite-first, lightweight)
- **Deployment:** Vercel (serverless, zero-config Next.js hosting)

### Primary Technology Domain

Full-stack web application (Next.js App Router with API routes and Turso database)

### Starter Options Considered

**Option A: `create-next-app` (Official Next.js CLI)**
- Maintained by Vercel, always current with latest Next.js version
- Includes TypeScript, Tailwind CSS, ESLint, App Router out of the box
- No database or ORM opinions — added separately
- Minimal, well-understood starting point

**Option B: `create-t3-app` (T3 Stack)**
- Full-stack starter with TypeScript, Tailwind, tRPC, Drizzle, NextAuth
- Opinionated about API layer (tRPC) and auth (NextAuth) — neither needed here
- Heavier than necessary for a 12-user trust-based app
- More to learn for a novice TypeScript developer

**Option C: Custom template or example repo**
- Could include Drizzle + Turso pre-configured
- Risk of outdated dependencies, less community support
- No advantage over adding Drizzle/Turso to a fresh Next.js project

### Selected Starter: `create-next-app`

**Rationale for Selection:**
- Lightest viable starting point — only includes what Next.js needs, no extra opinions
- Best for a novice TypeScript/React developer — minimal concepts to learn upfront
- Tailwind CSS included by default — matches UX spec requirement
- shadcn/ui and Drizzle/Turso added incrementally — easier to understand each layer
- Maintained by Vercel — guaranteed compatibility with Vercel deployment

**Initialization Commands:**

```bash
# 1. Create Next.js project
npx create-next-app@latest worldcup-app --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"

# 2. Initialize shadcn/ui
npx shadcn@latest init

# 3. Add shadcn/ui components (per UX spec)
npx shadcn@latest add button input table tabs switch

# 4. Install database dependencies
npm install drizzle-orm @libsql/client
npm install -D drizzle-kit
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
TypeScript with strict mode, Next.js 16 on Node.js runtime, App Router with React Server Components

**Styling Solution:**
Tailwind CSS v4 with PostCSS, configured via `tailwind.config.ts`. Extended by shadcn/ui component library (components copied into project as source code — full ownership, no dependency lock-in)

**Build Tooling:**
Turbopack for development (fast HMR), Webpack for production builds, automatic code splitting and optimization by Next.js

**Testing Framework:**
Not included by starter — to be decided in architectural decisions step. Lightweight testing appropriate for project scale.

**Code Organization:**
`src/` directory with App Router conventions (`app/` for routes, `components/` for UI, `lib/` for utilities). Drizzle schema and database config added under `src/db/`.

**Development Experience:**
Turbopack hot reload, TypeScript type checking, ESLint for code quality, `@/*` import aliases for clean imports

**Database Layer (added post-starter):**
Drizzle ORM with `@libsql/client` connecting to Turso. Schema defined in TypeScript (`src/db/schema.ts`), migrations via `drizzle-kit`. Environment variables for `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN`.

**Note:** Project initialization using these commands should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Data modeling: Normalized relational tables
- Database: Turso (remote libSQL) with Drizzle ORM
- API pattern: Server Components for reads, Server Actions for mutations
- Admin identification: Hardcoded admin username via environment variable
- Deployment: Vercel with Git integration

**Important Decisions (Shape Architecture):**
- Data validation: Dual (client for UX, server for truth)
- Migrations: Drizzle Kit migration files
- Error handling: Typed success/error returns from Server Actions
- State management: React Server Components + local `useState` for bracket entry
- Component organization: Feature-grouped directories

**Deferred Decisions (Post-MVP):**
- Caching strategy (unnecessary at current scale)
- Rate limiting (unnecessary for 12 users)
- Error tracking service (Vercel logs sufficient)
- Automated testing pipeline (manual testing appropriate for MVP)

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Turso (remote libSQL) | SQLite semantics with Vercel serverless compatibility. Free tier (500M reads/mo, 10M writes/mo) far exceeds needs. |
| ORM | Drizzle ORM with `@libsql/client` | TypeScript-native, lightweight, SQLite-first. Schema defined in code. |
| Data modeling | Normalized relational tables | Separate tables for `users`, `matches`, `picks`, `results`, `tournament_config`. Clean queries, re-derivable scores (NFR5). |
| Validation | Dual: client + server | Client validates for UX (progress counter, submit gate). Server validates for truth (bracket lock, pick validity). Server is the authority (NFR6). |
| Migrations | Drizzle Kit generated migrations | `drizzle-kit generate` creates SQL files from TypeScript schema. Committed to git for change history. Applied via `drizzle-kit migrate`. |
| Caching | None | 12 users, ~400 rows. Every query is fast. Rely on Turso performance and Next.js built-in request deduplication. |

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| User identity | Username entry, no passwords | Trust-based, 12 known users. One bracket per username. Return via same username. |
| Admin identification | Environment variable (`ADMIN_USERNAME`) | Single hardcoded admin. Server checks username match. No multi-admin requirement. |
| Admin protection | None (trust-based) | Friend group sharing a link in group chat. No additional guard beyond username. |
| API security | Server-side validation only | No public API. All mutations go through Server Actions with server-side checks. |

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data fetching | React Server Components with direct DB access | Server Components query Turso directly. No API routes needed for reads. |
| Mutations | Next.js Server Actions | Type-safe server functions called from client components. No manual API route boilerplate. |
| Error handling | Typed return objects `{ success, data/error }` | Server Actions return consistent shape. Components check result and display inline errors per UX spec. React Error Boundaries as crash safety net. |
| Real-time updates | None (page refresh) | PRD specifies no WebSockets for MVP. Users refresh to see updates. Acceptable for match-by-match result cadence. |

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Server Components + `useState` | Server Components handle data fetching. Local `useState` for bracket picks during entry. No state library needed. |
| Component organization | Feature-grouped directories | `src/components/bracket/`, `src/components/leaderboard/`, `src/components/admin/`, `src/components/ui/` (shadcn). ~10 custom components organized by feature. |
| Routing | Next.js App Router (file-based) | Built-in, convention-based. No router library. |
| Performance | Default Next.js optimizations | Automatic code splitting, Turbopack dev server. No custom optimization needed at this scale. |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Vercel (serverless) | Zero-config Next.js deployment. Free tier sufficient. |
| CI/CD | Vercel Git integration | Push to `main` auto-deploys. PR branches get preview deploys. No custom pipeline. |
| Environment config | `.env.local` (local) + Vercel dashboard (prod) | `.env.example` in git as template. Three vars: `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_USERNAME`. |
| Monitoring | Vercel built-in logs | Function logs and error tracking via Vercel dashboard. `console.error` for server-side issues. Sufficient for 12 users over 3 weeks. |

### Decision Impact Analysis

**Implementation Sequence:**
1. Project initialization (create-next-app, shadcn/ui, Drizzle, Turso)
2. Database schema design and migration (normalized tables)
3. Server Components and Server Actions scaffold
4. Bracket entry UI with client-side state
5. Admin tools (matchup setup, result entry, bracket lock)
6. Scoring engine and leaderboard
7. Vercel deployment and environment configuration

**Cross-Component Dependencies:**
- Scoring engine depends on data model (picks + results tables) being finalized first
- Bracket entry UI depends on matches table structure for rendering matchups
- Leaderboard depends on scoring engine for calculations
- Admin result entry triggers scoring recalculation — shared dependency on scoring logic
- Bracket lock enforcement spans admin tools (toggle), bracket entry (gate), and Server Actions (validation)

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 5 areas where AI agents could make different choices — naming, structure, formats, communication, and process. All resolved below.

### Naming Patterns

**Database Naming Conventions:**
- Tables: snake_case, plural — `users`, `matches`, `picks`, `results`, `tournament_config`
- Columns: snake_case — `user_id`, `team_name`, `is_locked`, `created_at`
- Foreign keys: `{referenced_table_singular}_id` — `user_id`, `match_id`
- Indexes: `idx_{table}_{column}` — `idx_picks_user_id`
- Drizzle maps snake_case columns to camelCase TypeScript properties automatically

**Code Naming Conventions:**
- Components: PascalCase files and exports — `MatchCard.tsx`, `BracketTree.tsx`
- Non-component files: kebab-case — `scoring-engine.ts`, `bracket-utils.ts`
- Functions/variables: camelCase — `getUserPicks()`, `maxPossiblePoints`
- Types/interfaces: PascalCase — `type Match`, `interface LeaderboardEntry`
- Constants: UPPER_SNAKE_CASE — `POINTS_PER_ROUND`, `MAX_PICKS`
- Server Actions: camelCase verbs — `submitBracket()`, `enterResult()`, `toggleLock()`

### Format Patterns

**Server Action Return Shape:**
```typescript
// Success
{ success: true, data: { ... } }

// Error
{ success: false, error: "Human-readable message" }
```

**Date/Time:**
- Database storage: ISO 8601 strings (`2026-06-20T15:00:00Z`)
- UI display: Formatted by components at render time, never stored formatted

**JSON Field Naming:**
- Server responses: camelCase (TypeScript convention)
- Database columns: snake_case (Drizzle maps between them)

**Null Handling:**
- Use `null` for absent values, never `undefined` in data objects
- Empty arrays are `[]`, never `null`

### Structure Patterns

**Project Organization:**
```
src/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Landing page (username entry)
│   ├── bracket/
│   │   └── page.tsx            # Bracket view (entry + read-only)
│   ├── leaderboard/
│   │   └── page.tsx            # Leaderboard view
│   └── admin/
│       └── page.tsx            # Admin tools
├── components/
│   ├── ui/                     # shadcn/ui components (auto-generated)
│   ├── bracket/                # MatchCard, BracketTree, RoundView, ProgressBar
│   ├── leaderboard/            # LeaderboardTable
│   └── admin/                  # AdminMatchCard, BracketLockToggle
├── db/
│   ├── schema.ts               # Drizzle table definitions
│   ├── index.ts                # Database connection (Turso client)
│   └── migrations/             # Drizzle Kit generated SQL files
├── lib/
│   ├── actions/                # Server Actions (one file per action or grouped by feature)
│   ├── scoring-engine.ts       # Score calculation, max possible points, elimination
│   └── bracket-utils.ts        # Cascading pick logic, validation helpers
└── types/
    └── index.ts                # Shared TypeScript types
```

**Structure Rules:**
- Server Actions go in `src/lib/actions/` — never inline in components
- Database queries live in Server Components or Server Actions, never in client components
- Shared types go in `src/types/` — imported by both server and client code
- No `utils.ts` catch-all — name files by what they do
- Tests co-located with source: `scoring-engine.ts` alongside `scoring-engine.test.ts`

### Process Patterns

**Loading States:**
- Server Components: no loading spinner — rendered on the server
- Server Actions: disable triggering button, show "Submitting..." text
- Bracket picks: optimistic UI — update immediately, save in background
- Route transitions: use Next.js `loading.tsx` if needed

**Error Handling Flow:**
1. Server Action catches the error
2. Returns `{ success: false, error: "Human-readable message" }`
3. Component displays error inline, adjacent to the action
4. `console.error` on the server for Vercel logs
5. React Error Boundary at root layout as crash safety net

**Validation Order in Server Actions:**
1. Check bracket lock status first (fast rejection)
2. Validate user exists
3. Validate the specific action (pick is valid, match exists, etc.)
4. Perform the mutation
5. Return success with updated data

**Import Ordering:**
```typescript
// 1. React/Next.js imports
// 2. Third-party libraries (drizzle, etc.)
// 3. Internal imports (@/lib, @/components, @/db)
// 4. Types
```

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow naming conventions exactly — no mixing camelCase columns in SQL or snake_case in TypeScript
- Place files in the correct directory per the project structure — no new top-level directories without discussion
- Use the Server Action return shape `{ success, data/error }` for every mutation — no exceptions
- Validate on the server even if the client also validates — server is the authority
- Co-locate tests next to source files — no separate test directories

**Anti-Patterns:**
- Creating a `utils.ts` or `helpers.ts` catch-all file
- Putting database queries in client components
- Using `undefined` instead of `null` in data objects
- Inline Server Actions in component files
- Skipping server-side validation because "the client already checks"

## Project Structure & Boundaries

### Complete Project Directory Structure

```
worldcup-app/
├── README.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts                # Drizzle Kit config (Turso connection, schema path)
├── .env.local                       # Local env vars (git-ignored)
├── .env.example                     # Template: TURSO_CONNECTION_URL, TURSO_AUTH_TOKEN, ADMIN_USERNAME
├── .gitignore
├── components.json                  # shadcn/ui config
├── public/
│   └── flags/                       # Country flag SVGs or emoji fallback
├── src/
│   ├── app/
│   │   ├── globals.css              # Tailwind base styles + theme extensions
│   │   ├── layout.tsx               # Root layout (Error Boundary, font, metadata)
│   │   ├── loading.tsx              # Root loading state (optional)
│   │   ├── page.tsx                 # Landing page — username entry (FR1, FR2, FR34)
│   │   ├── bracket/
│   │   │   └── page.tsx             # Bracket view — entry + read-only (FR5-FR17)
│   │   ├── leaderboard/
│   │   │   └── page.tsx             # Leaderboard view (FR18-FR23)
│   │   └── admin/
│   │       └── page.tsx             # Admin tools — setup, results, lock (FR28-FR33)
│   ├── components/
│   │   ├── ui/                      # shadcn/ui: Button, Input, Table, Tabs, Switch
│   │   ├── bracket/
│   │   │   ├── MatchCard.tsx        # Single matchup — tap to pick (FR6, FR7)
│   │   │   ├── BracketTree.tsx      # Desktop full bracket tree (FR14)
│   │   │   ├── RoundView.tsx        # Mobile round-by-round view (FR15)
│   │   │   └── ProgressBar.tsx      # "X of 31 picks made" (FR9)
│   │   ├── leaderboard/
│   │   │   └── LeaderboardTable.tsx # Ranked standings table (FR18-FR23)
│   │   └── admin/
│   │       ├── AdminMatchCard.tsx   # Result entry with confirm step (FR31, FR32)
│   │       └── BracketLockToggle.tsx # Lock/unlock brackets (FR29)
│   ├── db/
│   │   ├── index.ts                 # Turso client + Drizzle instance
│   │   ├── schema.ts                # All table definitions (users, matches, picks, results, tournament_config)
│   │   └── migrations/              # Drizzle Kit generated SQL migration files
│   ├── lib/
│   │   ├── actions/
│   │   │   ├── auth.ts              # createUser(), loginUser() (FR1, FR2, FR3)
│   │   │   ├── bracket.ts           # savePick(), submitBracket() (FR6-FR12)
│   │   │   ├── admin.ts             # enterResult(), correctResult(), toggleLock(), setupMatchups() (FR28-FR33)
│   │   │   └── types.ts             # ActionResult<T> type definition
│   │   ├── scoring-engine.ts        # calculateScores(), maxPossiblePoints(), isEliminated() (FR24-FR27)
│   │   ├── scoring-engine.test.ts   # Unit tests for scoring logic
│   │   ├── bracket-utils.ts         # getCascadingPicks(), validatePick(), getProgress() (FR7, FR8, FR10)
│   │   └── bracket-utils.test.ts    # Unit tests for bracket logic
│   └── types/
│       └── index.ts                 # Match, Pick, User, LeaderboardEntry, TournamentConfig, ActionResult
└── .vercel/                         # Vercel project config (auto-generated, git-ignored)
```

### Architectural Boundaries

**Data Boundary:**
- All database access goes through `src/db/index.ts` (single Drizzle instance)
- Schema is the single source of truth for data shape (`src/db/schema.ts`)
- No raw SQL outside of migration files — use Drizzle query builder everywhere
- Server Components and Server Actions can query the database; client components cannot

**Server/Client Boundary:**
- `src/app/` pages are Server Components by default — they fetch data directly
- Components in `src/components/bracket/` that need interactivity (tap-to-pick) use `"use client"` directive
- Server Actions in `src/lib/actions/` are the only way client components mutate data
- Types in `src/types/` are shared across both sides

**Admin Boundary:**
- Admin page (`src/app/admin/page.tsx`) checks `ADMIN_USERNAME` on the server before rendering
- Admin Server Actions (`src/lib/actions/admin.ts`) verify admin identity before executing
- Non-admin users navigating to `/admin` see the leaderboard or a redirect — no admin UI exposed

**Scoring Boundary:**
- All scoring logic lives in `src/lib/scoring-engine.ts` — pure functions, no database access
- Scoring functions receive picks and results as arguments, return computed values
- This makes scoring testable in isolation (NFR4) and re-derivable from source data (NFR5)
- Server Actions and Server Components call scoring functions after fetching data

### Requirements to Structure Mapping

**FR Category → Location:**

| FR Category | Page | Components | Server Actions | Logic |
|-------------|------|------------|----------------|-------|
| User Identity (FR1-FR4) | `app/page.tsx` | `ui/Input`, `ui/Button` | `lib/actions/auth.ts` | — |
| Bracket Entry (FR5-FR15) | `app/bracket/page.tsx` | `bracket/MatchCard`, `bracket/BracketTree`, `bracket/RoundView`, `bracket/ProgressBar` | `lib/actions/bracket.ts` | `lib/bracket-utils.ts` |
| Bracket Display (FR16-FR17) | `app/bracket/page.tsx` | `bracket/MatchCard` (results states) | — | — |
| Leaderboard (FR18-FR23) | `app/leaderboard/page.tsx` | `leaderboard/LeaderboardTable` | — | `lib/scoring-engine.ts` |
| Scoring Engine (FR24-FR27) | — | — | — | `lib/scoring-engine.ts` |
| Admin Setup (FR28-FR30) | `app/admin/page.tsx` | `admin/BracketLockToggle` | `lib/actions/admin.ts` | — |
| Admin Results (FR31-FR33) | `app/admin/page.tsx` | `admin/AdminMatchCard` | `lib/actions/admin.ts` | `lib/scoring-engine.ts` |
| Landing Page (FR34) | `app/page.tsx` | `ui/Input`, `ui/Button` | `lib/actions/auth.ts` | — |

**Cross-Cutting Concerns → Location:**

| Concern | Primary Location | Touches |
|---------|-----------------|---------|
| Cascading pick logic | `lib/bracket-utils.ts` | `actions/bracket.ts`, `bracket/MatchCard.tsx` |
| Bracket lock enforcement | `lib/actions/bracket.ts` + `lib/actions/admin.ts` | `app/bracket/page.tsx`, `app/admin/page.tsx` |
| Score recalculation | `lib/scoring-engine.ts` | `actions/admin.ts` (triggers), `app/leaderboard/page.tsx` (displays) |
| Admin identity check | `lib/actions/admin.ts` + `app/admin/page.tsx` | All admin operations |

### Data Flow

```
User Action → Client Component → Server Action → Database (Turso)
                                      ↓
                              Scoring Engine (pure functions)
                                      ↓
                              Return ActionResult<T>
                                      ↓
                          Client Component updates UI
```

**Bracket Entry Flow:**
1. User taps team in `MatchCard` (client state update)
2. Pick saved via `savePick()` Server Action → Turso
3. Cascading picks computed by `bracket-utils.ts` on client
4. Progress counter updates locally

**Result Entry Flow:**
1. Admin taps winner in `AdminMatchCard`, confirms
2. `enterResult()` Server Action saves to Turso
3. `scoring-engine.ts` recalculates all scores, max possible, elimination
4. Leaderboard reflects updated data on next load

**Leaderboard Load Flow:**
1. Server Component fetches all picks + results from Turso
2. Calls `scoring-engine.ts` to compute rankings
3. Renders `LeaderboardTable` with computed data
4. No client-side fetching needed

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices are ecosystem-compatible. Next.js 16 + Drizzle + Turso + Vercel is a documented, tested stack. No contradictions between architectural decisions.

**Pattern Consistency:** Naming conventions (snake_case DB, camelCase TS) handled by Drizzle mapping. Server Action return shape is consistent across all mutations. Import ordering and file placement rules are clear and enforceable.

**Structure Alignment:** Project structure follows Next.js App Router conventions exactly. Feature-grouped components align with FR categories. Boundaries (data, server/client, admin, scoring) are clearly defined and structurally enforced.

### Requirements Coverage Validation

**Functional Requirements:** 35/35 FRs mapped to specific files and directories. No unmapped requirements. All cross-cutting concerns (cascading picks, bracket lock, score recalculation) have clear architectural homes.

**Non-Functional Requirements:** 7/7 NFRs addressed by architectural decisions. Turso handles persistence and recovery (NFR2, NFR3). Pure scoring functions handle accuracy (NFR4). Server-side validation handles lock enforcement (NFR6). Data scale makes performance trivial (NFR7).

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions documented with versions and rationale. No blocking deferred decisions.

**Structure Completeness:** Complete project tree with every file, directory, and its purpose. FR-to-file mapping table enables any agent to find where to implement any requirement.

**Pattern Completeness:** All five conflict categories resolved — naming, structure, format, communication, process. Concrete examples and anti-patterns provided.

### Gap Analysis Results

**Critical Gaps:** None

**Important Gaps:**
- Database schema column-level design deferred to implementation (intentional — user wants hands-on work). Table structure and naming conventions are specified.

**Nice-to-Have Gaps:**
- Test runner not specified (Jest/Vitest). Can be chosen when first test file is created.
- No auto-formatter config (`.prettierrc`). Low risk for solo developer.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (low complexity, 12 users)
- [x] Technical constraints identified (deadline, solo dev, trust-based auth)
- [x] Cross-cutting concerns mapped (cascading picks, bracket lock, score recalculation)

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified (Next.js 16, TypeScript, Tailwind, shadcn/ui, Drizzle, Turso, Vercel)
- [x] Integration patterns defined (Server Components + Server Actions)
- [x] Performance considerations addressed (trivial at scale)

**Implementation Patterns**
- [x] Naming conventions established (DB snake_case, code camelCase/PascalCase)
- [x] Structure patterns defined (feature-grouped, co-located tests)
- [x] Format patterns specified (ActionResult shape, date format, null handling)
- [x] Process patterns documented (validation order, error flow, loading states)

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established (data, server/client, admin, scoring)
- [x] Integration points mapped (data flows documented)
- [x] Requirements to structure mapping complete (35/35 FRs, 7/7 NFRs)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Every FR and NFR has a clear architectural home
- Pure scoring engine is testable and re-derivable — the most critical logic is isolated
- Minimal technology surface area — fewer things to learn, fewer things to break
- Boundaries prevent the most common agent conflicts (DB access from client, inline actions, catch-all utils)

**Areas for Future Enhancement:**
- Test runner selection and automated test pipeline (post-MVP)
- Auto-formatter configuration
- Database schema column-level documentation (happens during implementation)
- Phase 2 considerations (results API integration, group stage predictions)

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt about where something goes, check the Requirements to Structure Mapping table

**First Implementation Priority:**
```bash
npx create-next-app@latest worldcup-app --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"
```
