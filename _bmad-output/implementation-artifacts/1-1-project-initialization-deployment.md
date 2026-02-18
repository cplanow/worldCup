# Story 1.1: Project Initialization & Deployment

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the project scaffolded with all required tooling and deployed to Vercel,
so that I have a working foundation to build features on.

## Acceptance Criteria

1. **AC1: Next.js Project Scaffolded**
   - **Given** a fresh development environment
   - **When** the initialization commands are executed
   - **Then** a Next.js 16 project exists with TypeScript, Tailwind CSS, ESLint, App Router, `src/` directory, Turbopack, and `@/*` import alias

2. **AC2: shadcn/ui Configured**
   - **Given** the Next.js project is initialized
   - **When** shadcn/ui is configured
   - **Then** the following components are available: Button, Input, Table, Tabs, Switch

3. **AC3: Database Dependencies Installed**
   - **Given** the project exists
   - **When** database dependencies are installed
   - **Then** `drizzle-orm`, `@libsql/client`, and `drizzle-kit` are installed and `drizzle.config.ts` is configured pointing to Turso

4. **AC4: Environment Configuration**
   - **Given** the project exists
   - **When** environment configuration is set up
   - **Then** `.env.example` exists with `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, and `ADMIN_USERNAME` variables, and `.env.local` is gitignored

5. **AC5: Deployed to Vercel**
   - **Given** the project is pushed to GitHub
   - **When** Vercel is connected via Git integration
   - **Then** the app is deployed and accessible at a public URL with environment variables configured in Vercel dashboard

## Tasks / Subtasks

- [x] Task 1: Scaffold Next.js project (AC: #1)
  - [x] Run `npx create-next-app@latest worldcup-app --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"`
  - [x] Verify project runs with `npm run dev` and default page loads at `http://localhost:3000`
  - [x] Verify TypeScript strict mode is enabled in `tsconfig.json`
  - [x] Verify Turbopack is the default bundler (Next.js 16 default)

- [x] Task 2: Initialize shadcn/ui and add components (AC: #2)
  - [x] Run `npx shadcn@latest init` (accept defaults, confirm `src/` directory detection)
  - [x] Run `npx shadcn@latest add button input table tabs switch`
  - [x] Verify `components.json` exists at project root
  - [x] Verify components exist in `src/components/ui/`

- [x] Task 3: Install and configure database dependencies (AC: #3)
  - [x] Run `npm install drizzle-orm @libsql/client`
  - [x] Run `npm install -D drizzle-kit`
  - [x] Create `drizzle.config.ts` at project root with Turso connection configuration
  - [x] Create `src/db/index.ts` with Turso client + Drizzle instance setup
  - [x] Create `src/db/schema.ts` as empty schema file (tables added in later stories)

- [x] Task 4: Set up environment configuration (AC: #4)
  - [x] Create `.env.example` with `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_USERNAME`
  - [x] Create `.env.local` with actual Turso credentials (user provides) and admin username
  - [x] Verify `.env.local` is listed in `.gitignore` (Next.js includes this by default)

- [x] Task 5: Set up project structure scaffold (AC: #1)
  - [x] Create directory structure per architecture spec:
    - `src/app/bracket/` (empty, for future stories)
    - `src/app/leaderboard/` (empty, for future stories)
    - `src/app/admin/` (empty, for future stories)
    - `src/components/bracket/`
    - `src/components/leaderboard/`
    - `src/components/admin/`
    - `src/db/migrations/`
    - `src/lib/actions/`
    - `src/types/`
  - [x] Create `src/types/index.ts` as empty types file
  - [x] Create `src/lib/actions/types.ts` with `ActionResult<T>` type definition

- [x] Task 6: Push to GitHub and deploy to Vercel (AC: #5)
  - [x] Initialize git repo (if not already), commit all files
  - [x] Push to GitHub repository
  - [ ] Connect Vercel to the GitHub repo via Git integration
  - [ ] Configure environment variables in Vercel dashboard: `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_USERNAME`
  - [ ] Verify deployment succeeds and app is accessible at public URL

## Dev Notes

### Architecture Compliance

- **Starter template:** `create-next-app` is the mandated starter — do NOT use create-t3-app or any custom template
- **Project name convention:** The CLI creates a directory named `worldcup-app` — this is the app directory within the repo
- **App Router ONLY:** Do not create any `pages/` directory. All routing uses the `app/` directory
- **No `utils.ts` catch-all:** Per architecture anti-patterns, never create generic utils files. Name files by what they do.
- **Server Action return shape:** The `ActionResult<T>` type must follow this exact pattern:
  ```typescript
  type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };
  ```

### Technical Requirements

- **Next.js 16 specifics:**
  - `params` and `searchParams` are now async — all page components accessing these must use `await`
  - Turbopack is now the default bundler (no longer experimental)
  - Minimum Node.js version: 20.9.0 LTS
  - Minimum TypeScript version: 5.1.0
  - Run `npx next typegen` after setup to auto-generate types for async params/searchParams

- **shadcn/ui specifics:**
  - Package is `shadcn` (not `shadcn-ui` — the old name is deprecated)
  - Init will detect `src/` directory automatically
  - Components are copied as source code into `src/components/ui/` — full ownership, no dependency lock-in

- **Drizzle + Turso specifics:**
  - `drizzle-orm` v0.45.x is the current stable (do NOT use 1.0.0-beta)
  - `drizzle.config.ts` must reference the schema path at `./src/db/schema.ts`
  - Database connection uses `@libsql/client` with `createClient()` pointing to Turso URL
  - Drizzle instance wraps the libsql client: `drizzle(client)`

### drizzle.config.ts Reference

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_CONNECTION_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config;
```

### src/db/index.ts Reference

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client);
```

### Library Versions (Current Stable as of Feb 2026)

| Package | Version | Notes |
|---------|---------|-------|
| next | 16.1.6 LTS | Use `@latest` tag |
| react / react-dom | Latest (bundled with Next.js 16) | |
| shadcn | 3.8.5 | `npx shadcn@latest` |
| drizzle-orm | 0.45.x | Do NOT use 1.0.0-beta |
| @libsql/client | 0.17.x | Stable |
| drizzle-kit | 0.45.x | Dev dependency |

### File Structure After This Story

```
worldcup-app/
├── .env.example                     # TURSO_CONNECTION_URL, TURSO_AUTH_TOKEN, ADMIN_USERNAME
├── .env.local                       # Actual values (gitignored)
├── .gitignore
├── components.json                  # shadcn/ui config
├── drizzle.config.ts                # Drizzle Kit config pointing to Turso
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── public/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx               # Root layout (default from create-next-app)
│   │   ├── page.tsx                 # Default page (replaced in Story 1.2)
│   │   ├── bracket/                 # Empty — populated in Epic 3
│   │   ├── leaderboard/             # Empty — populated in Epic 4
│   │   └── admin/                   # Empty — populated in Epic 2
│   ├── components/
│   │   ├── ui/                      # shadcn/ui: Button, Input, Table, Tabs, Switch
│   │   ├── bracket/                 # Empty — populated in Epic 3
│   │   ├── leaderboard/             # Empty — populated in Epic 4
│   │   └── admin/                   # Empty — populated in Epic 2
│   ├── db/
│   │   ├── index.ts                 # Turso client + Drizzle instance
│   │   ├── schema.ts                # Empty schema (tables added in Story 1.2+)
│   │   └── migrations/              # Empty — migrations generated in Story 1.2+
│   ├── lib/
│   │   └── actions/
│   │       └── types.ts             # ActionResult<T> type definition
│   └── types/
│       └── index.ts                 # Empty — types added as needed
```

### Naming Conventions to Follow

- **Files:** kebab-case for non-components (`drizzle.config.ts`, `scoring-engine.ts`), PascalCase for components (`MatchCard.tsx`)
- **Database:** snake_case tables (plural) and columns — `users`, `user_id`, `created_at`
- **TypeScript:** camelCase functions/variables, PascalCase types/interfaces, UPPER_SNAKE_CASE constants
- **Imports:** Use `@/*` alias for all internal imports (e.g., `@/db`, `@/components/ui/button`)

### Import Ordering Convention

```typescript
// 1. React/Next.js imports
// 2. Third-party libraries (drizzle, etc.)
// 3. Internal imports (@/lib, @/components, @/db)
// 4. Types
```

### Project Structure Notes

- All directories align with the unified project structure defined in the architecture document
- Empty directories are scaffolded now to establish the structure convention for subsequent stories
- No `.prettierrc` — not specified in architecture. Solo developer can add later if desired.
- The `public/flags/` directory is NOT created in this story — it will be added when bracket UI needs country flags (Epic 3)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1: Project Initialization & Deployment]
- [Source: _bmad-output/planning-artifacts/prd.md#Additional Requirements]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Node.js v21.5.0 triggers EBADENGINE warnings for some packages expecting ^20.19 || ^22.13 — no functional impact, all packages work correctly
- shadcn init `--yes` flag still prompts for color; used `--defaults` flag instead

### Completion Notes List

- Task 1: Scaffolded Next.js 16.1.6 with TypeScript, Tailwind CSS v4, ESLint, App Router, src/ dir, Turbopack, @/* alias. Build passes.
- Task 2: shadcn/ui v3.8.5 initialized with Neutral theme. Added button, input, table, tabs, switch components to src/components/ui/.
- Task 3: Installed drizzle-orm, @libsql/client, drizzle-kit. Created drizzle.config.ts, src/db/index.ts, src/db/schema.ts per architecture spec.
- Task 4: Created .env.example with required variables. Created .env.local with placeholders (user to fill after Turso setup). Confirmed .env* gitignored.
- Task 5: Created all directory scaffolding with .gitkeep files. Created src/types/index.ts and src/lib/actions/types.ts with exported ActionResult<T>.
- Task 6: Committed and pushed to GitHub (commit 19d57b3). Vercel setup delegated to user (manual steps).

### Change Log

- 2026-02-17: Story 1.1 implementation — scaffolded Next.js 16 project with all tooling, dependencies, and project structure. Pushed to GitHub. Vercel deployment pending user action.

### File List

- worldcup-app/.env.example (new)
- worldcup-app/.env.local (new, gitignored)
- worldcup-app/drizzle.config.ts (new)
- worldcup-app/src/db/index.ts (new)
- worldcup-app/src/db/schema.ts (new)
- worldcup-app/src/db/migrations/.gitkeep (new)
- worldcup-app/src/types/index.ts (new)
- worldcup-app/src/lib/actions/types.ts (new)
- worldcup-app/src/app/bracket/.gitkeep (new)
- worldcup-app/src/app/leaderboard/.gitkeep (new)
- worldcup-app/src/app/admin/.gitkeep (new)
- worldcup-app/src/components/bracket/.gitkeep (new)
- worldcup-app/src/components/leaderboard/.gitkeep (new)
- worldcup-app/src/components/admin/.gitkeep (new)
- worldcup-app/src/components/ui/button.tsx (new, shadcn)
- worldcup-app/src/components/ui/input.tsx (new, shadcn)
- worldcup-app/src/components/ui/table.tsx (new, shadcn)
- worldcup-app/src/components/ui/tabs.tsx (new, shadcn)
- worldcup-app/src/components/ui/switch.tsx (new, shadcn)
- worldcup-app/src/lib/utils.ts (new, shadcn)
- worldcup-app/components.json (new, shadcn)
- worldcup-app/package.json (modified — added drizzle-orm, @libsql/client, drizzle-kit, shadcn deps)
