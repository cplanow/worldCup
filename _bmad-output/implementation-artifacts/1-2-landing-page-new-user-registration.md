# Story 1.2: Landing Page & New User Registration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a participant,
I want to enter a username on a clean landing page,
so that I can create my identity and join the bracket pool.

## Acceptance Criteria

1. **AC1: Landing Page UI**
   - **Given** a user navigates to the app URL
   - **When** the landing page loads
   - **Then** a single username input field and an "Enter" button are displayed with no other UI clutter

2. **AC2: New User Registration**
   - **Given** a user is on the landing page
   - **When** they enter a username that does not already exist and tap "Enter"
   - **Then** a new user record is created in the `users` table and the user is routed into the app

3. **AC3: Username Collision**
   - **Given** a user is on the landing page
   - **When** they enter a username that is already taken by another user
   - **Then** an inline error message "That name is already taken" appears below the input field

4. **AC4: Empty Username Validation**
   - **Given** a user is on the landing page
   - **When** they submit an empty username
   - **Then** the form does not submit and the input shows validation feedback

5. **AC5: Users Table Created**
   - **Given** this is the first story with database interaction
   - **When** the `users` table is needed
   - **Then** the `users` table is created via Drizzle schema and migration with columns: `id`, `username`, `created_at`, `bracket_submitted`

## Tasks / Subtasks

- [x] Task 1: Define users table schema (AC: #5)
  - [x] Add `users` table definition to `src/db/schema.ts` using Drizzle's SQLite table builder
  - [x] Columns: `id` (integer, primary key, autoincrement), `username` (text, not null, unique), `created_at` (text, not null, default to ISO 8601 timestamp), `bracket_submitted` (integer, not null, default 0 — SQLite boolean)
  - [x] Add index: `idx_users_username` on `username` column for fast lookups
  - [x] Run `npx drizzle-kit generate` to create migration SQL file in `src/db/migrations/`
  - [x] Run `npx drizzle-kit migrate` to apply migration to Turso database
  - [x] Verify table exists in Turso

- [x] Task 2: Create auth Server Actions (AC: #2, #3)
  - [x] Create `src/lib/actions/auth.ts` with `"use server"` directive
  - [x] Implement `createUser(username: string): Promise<ActionResult<{ userId: number }>>`:
    - Validate username is non-empty and trimmed
    - Check if username already exists in `users` table
    - If exists: return `{ success: false, error: "That name is already taken" }`
    - If not exists: insert new user, return `{ success: true, data: { userId } }`
  - [x] Import `ActionResult` from `@/lib/actions/types`
  - [x] Import `db` from `@/db`
  - [x] Import `users` table from `@/db/schema`

- [x] Task 3: Build landing page UI (AC: #1, #4)
  - [x] Replace `src/app/page.tsx` default content with landing page component
  - [x] Landing page is a Server Component that renders a client component for the form
  - [x] Create `src/app/page.tsx` as the Server Component wrapper (centered layout, minimal)
  - [x] Create a client component for the username form (needs `"use client"` for form interaction):
    - Use shadcn/ui `Input` component for username field
    - Use shadcn/ui `Button` component for "Enter" button
    - Center the form vertically and horizontally on the page
    - Client-side validation: prevent empty username submission (HTML `required` attribute + form validation)
    - Display inline error message below input when Server Action returns an error
    - Show "Submitting..." on button during Server Action execution (disabled state)
  - [x] Style per UX spec:
    - White background, centered content
    - App title/logo area above input (simple text: "worldCup" or similar)
    - Input: 16px font, generous padding, centered text
    - Button: Slate 900 background, white text, 16px semibold
    - Error text: red, 14px, below input field
    - Max-width container for comfortable reading width

- [x] Task 4: Implement form submission and routing (AC: #2, #3)
  - [x] On form submit, call `createUser()` Server Action with trimmed username
  - [x] On success: use `router.push()` to route user into the app (route to `/bracket` for now — state-based routing comes in Story 1.3)
  - [x] On error: display error message inline below input, keep form interactive
  - [x] Store username in a cookie or URL param for session identification (no auth library — simple username-based identity)

- [x] Task 5: Add User type to shared types (AC: #5)
  - [x] Add `User` type to `src/types/index.ts`:
    ```typescript
    export type User = {
      id: number;
      username: string;
      createdAt: string;
      bracketSubmitted: boolean;
    };
    ```

## Dev Notes

### Architecture Compliance

- **Landing page location:** `src/app/page.tsx` — this REPLACES the default create-next-app page entirely
- **Server Actions location:** `src/lib/actions/auth.ts` — NEVER inline Server Actions in component files
- **Database queries:** Only in Server Components or Server Actions — NEVER in client components
- **Error feedback:** Inline below the input field — NO toast notifications, NO modals, NO pop-ups
- **Server Action return shape:** MUST use `ActionResult<T>` from `@/lib/actions/types`

### Database Schema Details

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  bracketSubmitted: integer("bracket_submitted", { mode: "boolean" }).notNull().default(false),
});
```

**Critical SQLite/Drizzle notes:**
- SQLite has no native boolean type — use `integer` with `{ mode: "boolean" }` in Drizzle, which maps 0/1 to false/true
- SQLite has no native datetime type — use `text` and store ISO 8601 strings
- Drizzle automatically maps snake_case DB columns to camelCase TypeScript properties
- The `$defaultFn` runs at insert time in the application, not as a SQL default

### Server Action Implementation Pattern

```typescript
// src/lib/actions/auth.ts
"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/actions/types";

export async function createUser(username: string): Promise<ActionResult<{ userId: number }>> {
  const trimmed = username.trim();

  if (!trimmed) {
    return { success: false, error: "Username is required" };
  }

  // Check if username exists
  const existing = await db.select().from(users).where(eq(users.username, trimmed)).get();

  if (existing) {
    return { success: false, error: "That name is already taken" };
  }

  // Create user
  const result = await db.insert(users).values({ username: trimmed }).returning();

  return { success: true, data: { userId: result[0].id } };
}
```

### Validation Order (per architecture)

1. Validate input (non-empty, trimmed)
2. Check username uniqueness
3. Perform mutation (insert user)
4. Return result

Note: Bracket lock check is NOT needed for user creation — lock only affects pick entry/submission. Users can always create an identity.

### UX Design Requirements

- **Pure minimal landing:** Logo/title, subtitle (optional), username input, enter button. Nothing else.
- **Zero-instruction onboarding:** The UI teaches itself — single input field communicates "enter your name"
- **Button states:**
  - Default: Slate 900 background, white text, 16px semibold
  - Disabled/loading: Slate 100 background, Slate 400 text, "Submitting..." text
  - Disabled button stays visible — never hide it
- **Input:** Centered text, 16px font, generous padding (min 44x44px tap target)
- **Error:** Red text below input, 14px — exact text: "That name is already taken"
- **No confirmation dialog:** Username creation is instant and low-stakes

### User Session Identification

This story needs a mechanism to remember which user is logged in across page navigation. Options per architecture constraints (no auth library, trust-based):

- **Recommended: Cookie-based** — Set an HTTP-only cookie with the username after successful creation. Server Components can read cookies to identify the current user. Use `cookies()` from `next/headers` (must be awaited in Next.js 16).
- **Alternative: URL search param** — Pass `?user=username` in the URL. Simpler but visible in URL bar.

The cookie approach is cleaner and aligns better with Server Component patterns. Set cookie in the Server Action, read in Server Components.

```typescript
// In createUser Server Action, after successful insert:
import { cookies } from "next/headers";

const cookieStore = await cookies();
cookieStore.set("username", trimmed, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 30, // 30 days
});
```

### Routing After Registration

- On successful user creation, route to `/bracket` (the bracket entry view)
- Story 1.3 will add state-based routing logic (submitted bracket → leaderboard, locked → read-only, etc.)
- For now, a simple redirect to `/bracket` after creation is sufficient
- The `/bracket` page may not exist yet — create a minimal placeholder `src/app/bracket/page.tsx` that displays "Bracket view coming soon" so the route doesn't 404

### Previous Story Context (Story 1.1)

Story 1.1 established:
- Project scaffolding with Next.js 16, TypeScript, Tailwind, shadcn/ui
- `src/db/index.ts` — Turso client + Drizzle instance (ready to use)
- `src/db/schema.ts` — empty file (this story adds the `users` table)
- `src/lib/actions/types.ts` — `ActionResult<T>` type (ready to import)
- `src/components/ui/` — shadcn Button and Input components (ready to use)
- `src/types/index.ts` — empty file (this story adds `User` type)
- `src/app/page.tsx` — default create-next-app page (**replace entirely**)

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/db/schema.ts` | Modified | Add `users` table definition |
| `src/db/migrations/0000_*.sql` | Created | First migration (generated by drizzle-kit) |
| `src/lib/actions/auth.ts` | Created | `createUser()` Server Action |
| `src/app/page.tsx` | Replaced | Landing page with username form |
| `src/app/bracket/page.tsx` | Created | Minimal placeholder for post-registration route |
| `src/types/index.ts` | Modified | Add `User` type |

### Naming Conventions Reminder

- Database table: `users` (snake_case, plural)
- Database columns: `id`, `username`, `created_at`, `bracket_submitted` (snake_case)
- TypeScript properties: `id`, `username`, `createdAt`, `bracketSubmitted` (camelCase — Drizzle maps automatically)
- Server Action file: `auth.ts` (kebab-case)
- Server Action function: `createUser()` (camelCase verb)
- Type: `User` (PascalCase)

### Import Ordering Reminder

```typescript
// 1. React/Next.js imports
// 2. Third-party libraries (drizzle-orm)
// 3. Internal imports (@/db, @/lib/actions, @/components/ui)
// 4. Types
```

### Project Structure Notes

- All file locations align with the architecture document's project structure
- No new top-level directories created — using existing scaffolded structure from Story 1.1
- The `src/app/bracket/page.tsx` placeholder is minimal — full bracket UI comes in Epic 3

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Landing Page & New User Registration]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns & Consistency Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#UX Consistency Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User Journey Flows - Journey 1]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- jsdom v28 has ESM compatibility issues with Node 21.5.0 — switched to happy-dom for test environment
- drizzle-kit migrate requires explicit env var export (does not read .env.local automatically)
- vi.mock hoisting in vitest v4 requires factory functions to avoid referencing variables declared outside the factory

### Completion Notes List

- Task 1: Defined `users` table in schema.ts with id, username, created_at, bracket_submitted columns. Added idx_users_username index. Generated migration 0000_flat_kronos.sql and applied to Turso. Verified table structure in Turso shell.
- Task 2: Created auth.ts server action with createUser() function. Validates empty input, checks username uniqueness, inserts user, sets httpOnly cookie for session identification. Uses ActionResult<T> return type.
- Task 3: Replaced default Next.js landing page with minimal UI — "worldCup" title, centered username input (shadcn Input), and "Enter" button (shadcn Button, Slate 900). Created UsernameForm client component with inline error display and disabled/submitting state.
- Task 4: Form submission calls createUser server action, routes to /bracket on success via router.push(), displays inline error on failure. Cookie-based session identification set in server action. Created /bracket placeholder page.
- Task 5: Added User type to src/types/index.ts with id, username, createdAt, bracketSubmitted properties.
- Testing: Set up Vitest + happy-dom + React Testing Library. 9 tests across 2 test files — 5 unit tests for createUser logic (empty, whitespace, collision, success+cookie, trimming), 4 component tests for UsernameForm (render, error display, redirect, submitting state).

### Change Log

- 2026-02-17: Story 1.2 implementation — landing page, user registration, database schema, server actions, tests.
- 2026-02-17: Code review fixes — added try/catch error handling, username length validation (max 30), case-insensitive usernames (lowercase normalization), TOCTOU race condition handling, console.error logging, removed redundant username index, moved tests to co-located positions. 12 tests (3 new).

### File List

- worldcup-app/src/db/schema.ts (modified — added users table, removed redundant index)
- worldcup-app/src/db/migrations/0000_flat_kronos.sql (new — generated migration)
- worldcup-app/src/db/migrations/meta/0000_snapshot.json (new — drizzle metadata)
- worldcup-app/src/db/migrations/meta/_journal.json (new — drizzle metadata)
- worldcup-app/src/lib/actions/auth.ts (new — createUser server action with error handling)
- worldcup-app/src/lib/actions/auth.test.ts (new — createUser unit tests, co-located)
- worldcup-app/src/app/page.tsx (replaced — landing page with username form)
- worldcup-app/src/app/bracket/page.tsx (new — placeholder bracket page)
- worldcup-app/src/components/UsernameForm.tsx (new — client component for username form)
- worldcup-app/src/components/UsernameForm.test.tsx (new — component tests, co-located)
- worldcup-app/src/types/index.ts (modified — added User type)
- worldcup-app/vitest.config.mts (new — vitest configuration)
- worldcup-app/package.json (modified — added test deps and scripts)
