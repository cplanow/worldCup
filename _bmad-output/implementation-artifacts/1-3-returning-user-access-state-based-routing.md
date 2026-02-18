# Story 1.3: Returning User Access & State-Based Routing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a returning participant,
I want to re-enter my username to access my bracket and the leaderboard,
so that I can check my picks and standings without creating a new account.

## Acceptance Criteria

1. **AC1: Returning User Recognition**
   - **Given** a user enters a username that already exists in the system
   - **When** they tap "Enter"
   - **Then** they are recognized as a returning user and routed based on their current state

2. **AC2: Unsubmitted Bracket Routing**
   - **Given** a returning user whose bracket has NOT been submitted
   - **When** they are routed into the app
   - **Then** they land on the bracket entry view with their in-progress picks (if any) preserved

3. **AC3: Submitted Bracket Routing**
   - **Given** a returning user whose bracket HAS been submitted
   - **When** they are routed into the app
   - **Then** they land on the leaderboard view

4. **AC4: Locked Bracket Routing**
   - **Given** brackets are locked by admin AND a returning user has NOT submitted their bracket
   - **When** they are routed into the app
   - **Then** they see the leaderboard view with a message indicating brackets are locked

5. **AC5: Admin Tab Visibility**
   - **Given** the admin user enters the `ADMIN_USERNAME`
   - **When** they are routed into the app
   - **Then** the Admin tab is visible in the navigation alongside Leaderboard and My Bracket

## Tasks / Subtasks

- [x] Task 1: Create loginUser Server Action (AC: #1)
  - [x] Add `loginUser(username: string): Promise<ActionResult<{ user: User; isAdmin: boolean }>>` to `src/lib/actions/auth.ts`
  - [x] Validate username is non-empty and trimmed
  - [x] Look up username in `users` table
  - [x] If not found: return `{ success: false, error: "Username not found" }`
  - [x] If found: set session cookie (same pattern as `createUser`), return user data with `isAdmin` flag
  - [x] Determine `isAdmin` by comparing username to `process.env.ADMIN_USERNAME`

- [x] Task 2: Update landing page to handle both new and returning users (AC: #1, #2, #3, #4)
  - [x] Modify `src/app/page.tsx` landing page form to try login first, then create:
    - On submit: call `loginUser()` first
    - If user found → route based on state (see routing logic below)
    - If user not found → call `createUser()` to register → route to `/bracket`
  - [x] Alternative simpler approach: single `enterApp(username)` Server Action that handles both cases:
    - Look up user → if exists, return existing user data
    - If not exists → create new user, return new user data
    - Always set session cookie
    - Return user state for client-side routing
  - [x] Remove the "That name is already taken" error from Story 1.2 — usernames are now shared identity, not collision errors
  - [x] Update error handling: only show errors for empty username or server failures

- [x] Task 3: Implement state-based routing logic (AC: #2, #3, #4)
  - [x] After successful login/registration, route user based on state:
    - `bracketSubmitted === true` → redirect to `/leaderboard`
    - `bracketSubmitted === false` AND brackets unlocked → redirect to `/bracket`
    - `bracketSubmitted === false` AND brackets locked → redirect to `/leaderboard` (with locked message)
  - [x] To check bracket lock status, query `tournament_config` table for `is_locked` value
  - [x] Note: `tournament_config` table doesn't exist yet (created in Story 2.2). For now, default to unlocked (`is_locked = false`) if table/row doesn't exist. Handle gracefully with a try/catch or conditional check.
  - [x] Routing happens client-side via `router.push()` after Server Action returns state data

- [x] Task 4: Create app layout with tab navigation (AC: #5)
  - [x] Create `src/app/(app)/layout.tsx` — a route group layout for authenticated views (bracket, leaderboard, admin)
  - [x] The `(app)` route group wraps `/bracket`, `/leaderboard`, and `/admin` pages with shared tab navigation
  - [x] Move existing pages into route group:
    - `src/app/(app)/bracket/page.tsx`
    - `src/app/(app)/leaderboard/page.tsx`
    - `src/app/(app)/admin/page.tsx`
  - [x] Build tab navigation component using shadcn/ui `Tabs`:
    - Tab order: Leaderboard | My Bracket | Admin (admin only)
    - Active tab: underline indicator (2px Slate 900 bottom border), bold text
    - Inactive tabs: Slate 500 text, no underline
    - Tabs always visible below app header
    - Tab switches view via Next.js navigation (not client-side tab state)
  - [x] Read session cookie in layout to determine current user
  - [x] Compare username to `ADMIN_USERNAME` env var to conditionally render Admin tab
  - [x] Create navigation component: `src/components/navigation/TabNav.tsx` (client component for active state)

- [x] Task 5: Create placeholder pages (AC: #2, #3, #4)
  - [x] Create `src/app/(app)/leaderboard/page.tsx` — placeholder with "Leaderboard coming soon" message
  - [x] Update `src/app/(app)/bracket/page.tsx` — placeholder with "Bracket view coming soon" message (move from Story 1.2 location)
  - [x] Create `src/app/(app)/admin/page.tsx` — placeholder with "Admin tools coming soon" message, server-side admin check (redirect non-admin to leaderboard)

- [x] Task 6: Handle session persistence and logout (AC: #1)
  - [x] If a user navigates to the root `/` while already having a session cookie, redirect them to the appropriate view (skip landing page)
  - [x] Check session cookie in `src/app/page.tsx` Server Component — if cookie exists and user is valid, redirect based on state
  - [x] No explicit logout flow needed (trust-based, 12 users) — user can clear cookies manually or enter a different username

## Dev Notes

### Architecture Compliance

- **Server Actions location:** `src/lib/actions/auth.ts` — extend existing file from Story 1.2
- **Tab navigation:** Use shadcn/ui `Tabs` component as the base, but navigate via Next.js router (not tab panel switching)
- **Route group `(app)`:** Parenthesized folder names in Next.js App Router create route groups — they share a layout without adding a URL segment
- **Admin protection:** Server-side check in `src/app/(app)/admin/page.tsx` — compare session cookie username to `ADMIN_USERNAME`. Non-admin users redirected to `/leaderboard`.
- **No `utils.ts` catch-all:** Navigation component goes in `src/components/navigation/`, not a generic utils folder

### Critical Design Decision: Combined Login/Register

Story 1.2 originally treated existing usernames as a collision error ("That name is already taken"). Story 1.3 changes this — entering an existing username IS the login mechanism. The landing page should:

1. User enters username → Server Action checks if user exists
2. If exists → return user data (this is a login)
3. If not exists → create user and return data (this is registration)
4. Both paths set the session cookie and return state for routing

This means the `createUser()` action from Story 1.2 should be refactored into a unified `enterApp()` action, or `loginUser()` should be called first with `createUser()` as fallback. The recommended approach is a single `enterApp()` Server Action:

```typescript
// src/lib/actions/auth.ts
"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import type { ActionResult } from "@/lib/actions/types";

interface EnterAppResult {
  userId: number;
  username: string;
  bracketSubmitted: boolean;
  isAdmin: boolean;
  isLocked: boolean;
  isNewUser: boolean;
}

export async function enterApp(username: string): Promise<ActionResult<EnterAppResult>> {
  const trimmed = username.trim();

  if (!trimmed) {
    return { success: false, error: "Username is required" };
  }

  // Check if user exists
  const existing = await db.select().from(users).where(eq(users.username, trimmed)).get();

  let userId: number;
  let bracketSubmitted: boolean;
  let isNewUser: boolean;

  if (existing) {
    userId = existing.id;
    bracketSubmitted = existing.bracketSubmitted;
    isNewUser = false;
  } else {
    const result = await db.insert(users).values({ username: trimmed }).returning();
    userId = result[0].id;
    bracketSubmitted = false;
    isNewUser = true;
  }

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set("username", trimmed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // Check bracket lock status (tournament_config may not exist yet)
  let isLocked = false;
  try {
    // tournament_config table created in Story 2.2
    // For now, this will fail gracefully — default to unlocked
    // TODO: Uncomment when tournament_config table exists
    // const config = await db.select().from(tournamentConfig).get();
    // isLocked = config?.isLocked ?? false;
  } catch {
    isLocked = false;
  }

  const isAdmin = trimmed === process.env.ADMIN_USERNAME;

  return {
    success: true,
    data: { userId, username: trimmed, bracketSubmitted, isAdmin, isLocked, isNewUser },
  };
}
```

### State-Based Routing Logic

```
User enters username
  → enterApp() Server Action returns user state
  → Client reads state and routes:

  if (bracketSubmitted === true)
    → router.push("/leaderboard")

  if (bracketSubmitted === false && isLocked === false)
    → router.push("/bracket")

  if (bracketSubmitted === false && isLocked === true)
    → router.push("/leaderboard")
    → Show message: "Brackets are locked. Your bracket was not submitted."
```

### Route Group Architecture

```
src/app/
├── page.tsx                    # Landing page (no tab nav, no layout)
├── (app)/                      # Route group — shared layout with tab nav
│   ├── layout.tsx              # Tab navigation layout (reads session cookie)
│   ├── bracket/
│   │   └── page.tsx            # Bracket view (placeholder → Epic 3)
│   ├── leaderboard/
│   │   └── page.tsx            # Leaderboard view (placeholder → Epic 4)
│   └── admin/
│       └── page.tsx            # Admin tools (placeholder → Epic 2, admin-only)
```

**Why a route group?** The landing page (`/`) has no tab navigation — it's a clean username entry form. All authenticated views (`/bracket`, `/leaderboard`, `/admin`) share the same tab navigation layout. The `(app)` route group provides this shared layout without adding `/app` to the URL.

### Tab Navigation Component

```typescript
// src/components/navigation/TabNav.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";

interface TabNavProps {
  isAdmin: boolean;
}

// Use shadcn/ui Tabs as visual base, but wire to Next.js navigation
// Active tab determined by current pathname
// Tab clicks trigger router.push(), not local state changes
```

**Tab navigation rules (from UX spec):**
- Always visible below app header, never hidden
- Active: 2px Slate 900 bottom border, bold text
- Inactive: Slate 500 text, no underline
- Tab order: Leaderboard | My Bracket | Admin (admin only)
- Default for returning submitted users: Leaderboard
- Default for new users during entry: My Bracket
- Tapping a tab navigates immediately — no page reload, no transition animation

### Session Cookie Reading in Server Components

```typescript
// In any Server Component or layout:
import { cookies } from "next/headers";

// Next.js 16: cookies() must be awaited
const cookieStore = await cookies();
const username = cookieStore.get("username")?.value;
```

### Admin Page Protection Pattern

```typescript
// src/app/(app)/admin/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (username !== process.env.ADMIN_USERNAME) {
    redirect("/leaderboard");
  }

  return <div>Admin tools coming soon</div>;
}
```

### Auto-Redirect for Existing Sessions

When a user with a valid session cookie navigates to `/` (landing page), skip the username form and redirect them based on state. This prevents unnecessary re-authentication.

```typescript
// src/app/page.tsx (Server Component portion)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;

  if (username) {
    const user = await db.select().from(users).where(eq(users.username, username)).get();
    if (user) {
      if (user.bracketSubmitted) {
        redirect("/leaderboard");
      }
      redirect("/bracket");
    }
    // Cookie exists but user not found — stale cookie, fall through to form
  }

  // Render landing page form
  return <LandingForm />;
}
```

### Previous Story Context

**Story 1.1 established:**
- Project scaffolding, Turso DB connection, empty schema, ActionResult type, directory structure

**Story 1.2 established:**
- `users` table schema in `src/db/schema.ts` (id, username, created_at, bracket_submitted)
- `createUser()` Server Action in `src/lib/actions/auth.ts`
- Landing page UI in `src/app/page.tsx` with username form
- Cookie-based session identification
- `User` type in `src/types/index.ts`
- Placeholder `src/app/bracket/page.tsx`

**This story modifies/extends:**
- Refactors `createUser()` into unified `enterApp()` in `src/lib/actions/auth.ts`
- Modifies landing page to handle both login and registration
- Adds auto-redirect for existing sessions
- Moves placeholder pages into `(app)` route group
- Adds tab navigation layout

### Files Created/Modified in This Story

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/actions/auth.ts` | Modified | Add `enterApp()` (refactors/replaces `createUser()`) |
| `src/app/page.tsx` | Modified | Add auto-redirect for existing sessions, update form to use `enterApp()` |
| `src/app/(app)/layout.tsx` | Created | Shared layout with tab navigation for authenticated views |
| `src/app/(app)/bracket/page.tsx` | Moved | Placeholder bracket page (moved into route group) |
| `src/app/(app)/leaderboard/page.tsx` | Created | Placeholder leaderboard page |
| `src/app/(app)/admin/page.tsx` | Created | Placeholder admin page with server-side admin check |
| `src/components/navigation/TabNav.tsx` | Created | Client component for tab navigation |

### Naming Conventions Reminder

- Route group folder: `(app)` — parentheses are Next.js App Router convention for route groups
- Navigation component: `TabNav.tsx` (PascalCase, component file)
- Server Action: `enterApp()` (camelCase verb)
- Cookie name: `username` (lowercase, simple)

### Testing Considerations

Manual testing checklist for this story:
- [ ] New username → creates user → routes to `/bracket`
- [ ] Existing username (unsubmitted) → routes to `/bracket`
- [ ] Existing username (submitted) → routes to `/leaderboard`
- [ ] Navigate to `/` with valid session cookie → auto-redirects
- [ ] Navigate to `/admin` as non-admin → redirects to `/leaderboard`
- [ ] Navigate to `/admin` as admin → shows admin placeholder
- [ ] Tab navigation: switching tabs changes URL and view
- [ ] Admin tab only visible for admin user

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3: Returning User Access & State-Based Routing]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#User Journey Flows - Journey 2]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction - Navigation]
- [Source: _bmad-output/planning-artifacts/prd.md#FR1-FR4, FR34]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Replaced `createUser()` with unified `enterApp()` Server Action that handles both new and returning users in a single flow
- Implemented state-based routing: submitted users → leaderboard, unsubmitted + unlocked → bracket, unsubmitted + locked → leaderboard
- Created `(app)` route group with shared layout containing header and tab navigation
- TabNav uses Next.js Link-based navigation (not shadcn Tabs panel switching) — active tab determined by pathname
- Admin tab conditionally rendered based on session cookie vs `ADMIN_USERNAME` env var
- Admin page has server-side protection — non-admin users redirected to leaderboard
- Landing page auto-redirects users with valid session cookies (skip re-authentication)
- `tournament_config` lock check defaults to unlocked (table created in Story 2.2)
- Race condition handled: UNIQUE constraint failure on insert retries as login
- Old route directories (`src/app/bracket/`, `src/app/leaderboard/`, `src/app/admin/`) removed — pages moved into `(app)` route group
- Build passes successfully with all routes registered

## Senior Developer Review (AI)

**Review Date:** 2026-02-17
**Review Outcome:** Changes Requested (6 issues found, all fixed)

### Action Items

- [x] [HIGH] AC4 locked message not implemented — added `?locked=1` query param and `LockMessage` component on leaderboard page
- [x] [HIGH] Auto-redirect in page.tsx skipped lock status check — added lock check (defaults to false, TODO for Story 2.2)
- [x] [MEDIUM] No automated tests — updated existing tests and added 19 tests covering enterApp, routing, admin, edge cases
- [x] [MEDIUM] Duplicate cookie-setting code — extracted `setSessionCookie()` helper
- [x] [MEDIUM] Stale cookie not cleared — added `cookieStore.delete("username")` when user not found in DB
- [x] [MEDIUM] Admin username comparison fragility — added `.toLowerCase()` to ADMIN_USERNAME comparisons in layout and admin page, extracted `checkIsAdmin()` helper

### File List

- `src/lib/actions/auth.ts` — Modified: replaced `createUser()` with `enterApp()`, extracted `setSessionCookie()` and `checkIsAdmin()` helpers
- `src/lib/actions/auth.test.ts` — Modified: updated tests from `createUser` to `enterApp` with 13 test cases
- `src/components/UsernameForm.tsx` — Modified: uses `enterApp()`, implements state-based client routing with `?locked=1` param
- `src/components/UsernameForm.test.tsx` — Modified: updated tests for `enterApp`, added routing tests for submitted/locked states (6 tests)
- `src/components/LockMessage.tsx` — Created: alert component for bracket lock notification
- `src/app/page.tsx` — Modified: added auto-redirect with lock check, stale cookie cleanup
- `src/app/(app)/layout.tsx` — Created: shared layout with header, session check, tab navigation, case-insensitive admin check
- `src/app/(app)/bracket/page.tsx` — Created: placeholder bracket page (moved from old location)
- `src/app/(app)/leaderboard/page.tsx` — Created: placeholder leaderboard page with lock message support via searchParams
- `src/app/(app)/admin/page.tsx` — Created: placeholder admin page with case-insensitive admin protection
- `src/components/navigation/TabNav.tsx` — Created: client component for tab navigation with active state
- `src/app/bracket/page.tsx` — Deleted: moved into (app) route group
- `src/app/bracket/.gitkeep` — Deleted
- `src/app/leaderboard/.gitkeep` — Deleted
- `src/app/admin/.gitkeep` — Deleted
