---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# worldCup - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for worldCup, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Participant can enter a username to create a new identity
FR2: Participant can return to the app by re-entering their username
FR3: System enforces one bracket per username
FR4: System routes users based on state (new user → bracket entry, returning user → bracket/leaderboard, locked state → read-only)
FR5: Participant can view all R32 matchups in a bracket format
FR6: Participant can select a winner for any available matchup by tapping a team
FR7: System cascades winning team forward into the next round's matchup when a pick is made
FR8: System clears downstream dependent picks when an earlier-round pick is changed
FR9: Participant can view a progress indicator showing picks completed out of 31
FR10: System prevents bracket submission until all 31 picks are complete
FR11: Participant can submit a completed bracket
FR12: System locks a participant's bracket permanently after submission
FR13: Participant can view their bracket in read-only mode after submission
FR14: Participant can view their bracket on desktop as a full tournament tree
FR15: Participant can view their bracket on mobile as a round-by-round view
FR16: System color-codes picks after results are entered (green for correct, red for wrong, neutral for unplayed)
FR17: Participant can view any other participant's bracket in read-only mode
FR18: Participant can view a ranked leaderboard of all participants
FR19: Leaderboard displays each participant's current score
FR20: Leaderboard displays each participant's champion pick
FR21: Leaderboard displays max possible points remaining for each participant
FR22: Leaderboard displays an eliminated flag for participants who cannot mathematically win
FR23: Leaderboard displays a visual indicator when a participant's champion pick has been eliminated
FR24: System calculates scores using escalating points per round: R32 = 1, R16 = 2, QF = 4, SF = 8, Final = 16. Point values are admin-configurable before brackets open.
FR25: System automatically recalculates all participant scores when a result is entered or corrected
FR26: System resolves ties using tiebreaker logic (correct champion pick first, most correct latest-round picks second)
FR27: System calculates max possible points remaining for each participant based on surviving picks
FR28: Admin can input R32 matchups (Team A vs Team B for each of the 16 games)
FR29: Admin can toggle bracket lock status (locked/unlocked) for all participants
FR30: System prevents bracket entry or modification when brackets are locked
FR31: Admin can select a completed match and enter the winner
FR32: Admin can correct a previously entered result
FR33: System automatically recalculates all scores and leaderboard standings after a result correction
FR34: System presents a single username input field as the entry point

### NonFunctional Requirements

NFR1: App remains available for the full duration of the knockout stage (~3 weeks) with no unplanned downtime
NFR2: No data loss — submitted brackets and entered results persist reliably across the tournament duration
NFR3: App recovers gracefully from server restarts without losing state
NFR4: Scoring calculations produce 100% accurate results — no rounding errors, no missed picks, no incorrect point assignments
NFR5: Result corrections trigger complete and accurate recalculation of all affected scores, max possible points, and elimination status
NFR6: Bracket lock enforcement is absolute — no race conditions or edge cases that allow picks after lock
NFR7: Page loads complete within 3 seconds and user actions complete within 500ms on both desktop and mobile

### Additional Requirements

- Starter template: `create-next-app` with TypeScript, Tailwind CSS, ESLint, App Router, src directory, Turbopack, @/* import alias
- shadcn/ui initialization and components: Button, Input, Table, Tabs, Switch
- Database dependencies: Drizzle ORM (`drizzle-orm`, `@libsql/client`) + Drizzle Kit (`drizzle-kit`)
- Database: Turso (remote libSQL) with normalized relational tables (`users`, `matches`, `picks`, `results`, `tournament_config`)
- ORM: Drizzle ORM with TypeScript schema definitions and generated migrations
- API pattern: React Server Components for reads (direct DB access), Next.js Server Actions for mutations
- Admin identification: Hardcoded admin username via `ADMIN_USERNAME` environment variable
- Deployment: Vercel with Git integration, environment variables for `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_USERNAME`
- Server Action return shape: `{ success: true, data }` or `{ success: false, error: "message" }`
- Scoring engine as pure functions — no database access, receives picks and results as arguments, testable in isolation
- Validation order in Server Actions: check lock status → validate user → validate action → perform mutation → return result
- Responsive design: Mobile (<768px) uses RoundView, Desktop (>=768px) uses BracketTree
- Custom components: MatchCard, BracketTree, RoundView, ProgressBar, AdminMatchCard, BracketLockToggle
- Color system: Emerald 500 correct, Red 500 wrong, Slate 300 pending, with secondary indicators (checkmark/X) for accessibility
- WCAG AA accessibility: semantic HTML, ARIA labels, keyboard navigation, 44x44px minimum tap targets, visible focus rings
- Top tab navigation: Leaderboard | My Bracket | Admin (admin only visible)
- Optimistic UI for bracket picks, inline error feedback, no toast notifications
- Loading states: disabled button with "Submitting..." text during Server Action execution
- Picks saved as they are made (not only on submit) for mid-entry return support
- Project structure follows feature-grouped directories under `src/` with co-located tests

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Enter username to create identity |
| FR2 | Epic 1 | Return via username |
| FR3 | Epic 1 | One bracket per username |
| FR4 | Epic 1 | State-based routing |
| FR5 | Epic 3 | View R32 matchups |
| FR6 | Epic 3 | Tap to pick winner |
| FR7 | Epic 3 | Cascading picks forward |
| FR8 | Epic 3 | Clear downstream picks on change |
| FR9 | Epic 3 | Progress indicator |
| FR10 | Epic 3 | Submit gate (31 picks required) |
| FR11 | Epic 3 | Submit completed bracket |
| FR12 | Epic 3 | Lock bracket after submission |
| FR13 | Epic 3 | Read-only bracket post-submission |
| FR14 | Epic 3 | Desktop full bracket tree |
| FR15 | Epic 3 | Mobile round-by-round view |
| FR16 | Epic 5 | Color-coded picks after results |
| FR17 | Epic 5 | View other participants' brackets |
| FR18 | Epic 4 | Ranked leaderboard |
| FR19 | Epic 4 | Current score display |
| FR20 | Epic 4 | Champion pick display |
| FR21 | Epic 4 | Max possible points remaining |
| FR22 | Epic 4 | Eliminated flag |
| FR23 | Epic 4 | Champion pick elimination indicator |
| FR24 | Epic 4 | Escalating scoring (1/2/4/8/16) |
| FR25 | Epic 4 | Auto-recalculate on result entry |
| FR26 | Epic 4 | Tiebreaker logic |
| FR27 | Epic 4 | Max possible points calculation |
| FR28 | Epic 2 | Admin inputs R32 matchups |
| FR29 | Epic 2 | Admin toggles bracket lock |
| FR30 | Epic 2 | Lock prevents entry/modification |
| FR31 | Epic 5 | Admin enters match winner |
| FR32 | Epic 5 | Admin corrects result |
| FR33 | Epic 5 | Auto-recalculate after correction |
| FR34 | Epic 1 | Single username input landing page |

## Epic List

### Epic 1: User Identity & Landing Experience
Users can access the app via a shared link, enter a username to create an identity or return as an existing user, and get routed to the appropriate view based on their state.
**FRs covered:** FR1, FR2, FR3, FR4, FR34
*Includes project initialization (create-next-app, database setup, deployment) as the foundation story.*

### Epic 2: Tournament Setup (Admin)
Admin can prepare the tournament by inputting all R32 matchups and controlling the bracket lock to open/close the entry window for participants.
**FRs covered:** FR28, FR29, FR30
*Standalone: Admin can fully configure the tournament. Builds on Epic 1 for admin identification via ADMIN_USERNAME.*

### Epic 3: Bracket Entry & Submission
Participants can view R32 matchups, tap to pick winners with cascading logic, track their progress, and submit a completed 31-pick bracket. Bracket renders as a full tree on desktop and round-by-round on mobile. After submission, the bracket is permanently locked and viewable in read-only mode.
**FRs covered:** FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15
*Standalone: After this epic, the complete bracket entry journey works end-to-end. Builds on Epic 1 (identity) and Epic 2 (matchups exist).*

### Epic 4: Scoring Engine & Leaderboard
Participants can view a ranked leaderboard showing current scores (escalating points per round), champion pick, max possible points remaining, and elimination status. Tiebreaker logic resolves ties.
**FRs covered:** FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27
*Standalone: After this epic, the competitive tracking experience is live. Builds on Epic 1 (users) and Epic 3 (submitted picks).*

### Epic 5: Result Management & Live Bracket Tracking
Admin can enter and correct match results with automatic score recalculation. Participant brackets display color-coded picks (green correct, red wrong, neutral unplayed). Participants can view any other participant's bracket in read-only mode.
**FRs covered:** FR16, FR17, FR31, FR32, FR33
*Standalone: After this epic, the full tournament lifecycle works — results drive leaderboard updates and bracket storytelling. Builds on all previous epics.*

## Epic 1: User Identity & Landing Experience

Users can access the app via a shared link, enter a username to create an identity or return as an existing user, and get routed to the appropriate view based on their state.

### Story 1.1: Project Initialization & Deployment

As a developer,
I want the project scaffolded with all required tooling and deployed to Vercel,
So that I have a working foundation to build features on.

**Acceptance Criteria:**

**Given** a fresh development environment
**When** the initialization commands are executed
**Then** a Next.js 16 project exists with TypeScript, Tailwind CSS, ESLint, App Router, `src/` directory, Turbopack, and `@/*` import alias

**Given** the Next.js project is initialized
**When** shadcn/ui is configured
**Then** the following components are available: Button, Input, Table, Tabs, Switch

**Given** the project exists
**When** database dependencies are installed
**Then** `drizzle-orm`, `@libsql/client`, and `drizzle-kit` are installed and `drizzle.config.ts` is configured pointing to Turso

**Given** the project exists
**When** environment configuration is set up
**Then** `.env.example` exists with `TURSO_CONNECTION_URL`, `TURSO_AUTH_TOKEN`, and `ADMIN_USERNAME` variables, and `.env.local` is gitignored

**Given** the project is pushed to GitHub
**When** Vercel is connected via Git integration
**Then** the app is deployed and accessible at a public URL with environment variables configured in Vercel dashboard

### Story 1.2: Landing Page & New User Registration

As a participant,
I want to enter a username on a clean landing page,
So that I can create my identity and join the bracket pool.

**Acceptance Criteria:**

**Given** a user navigates to the app URL
**When** the landing page loads
**Then** a single username input field and an "Enter" button are displayed with no other UI clutter

**Given** a user is on the landing page
**When** they enter a username that does not already exist and tap "Enter"
**Then** a new user record is created in the `users` table and the user is routed into the app

**Given** a user is on the landing page
**When** they enter a username that is already taken by another user
**Then** an inline error message "That name is already taken" appears below the input field

**Given** a user is on the landing page
**When** they submit an empty username
**Then** the form does not submit and the input shows validation feedback

**Given** this is the first story with database interaction
**When** the `users` table is needed
**Then** the `users` table is created via Drizzle schema and migration with appropriate columns (id, username, created_at, bracket_submitted)

### Story 1.3: Returning User Access & State-Based Routing

As a returning participant,
I want to re-enter my username to access my bracket and the leaderboard,
So that I can check my picks and standings without creating a new account.

**Acceptance Criteria:**

**Given** a user enters a username that already exists in the system
**When** they tap "Enter"
**Then** they are recognized as a returning user and routed based on their current state

**Given** a returning user whose bracket has NOT been submitted
**When** they are routed into the app
**Then** they land on the bracket entry view with their in-progress picks (if any) preserved

**Given** a returning user whose bracket HAS been submitted
**When** they are routed into the app
**Then** they land on the leaderboard view

**Given** brackets are locked by admin AND a returning user has NOT submitted their bracket
**When** they are routed into the app
**Then** they see a read-only view (leaderboard) with a message indicating brackets are locked

**Given** the admin user enters the `ADMIN_USERNAME`
**When** they are routed into the app
**Then** the Admin tab is visible in the navigation alongside Leaderboard and My Bracket

## Epic 2: Tournament Setup (Admin)

Admin can prepare the tournament by inputting all R32 matchups and controlling the bracket lock to open/close the entry window for participants.

### Story 2.1: Admin Page & Matchup Setup

As the admin,
I want to input all 16 R32 matchups (Team A vs Team B),
So that the tournament bracket is ready for participants to make their picks.

**Acceptance Criteria:**

**Given** the admin user navigates to the Admin tab
**When** the admin page loads
**Then** a matchup setup interface is displayed where the admin can input 16 R32 matchups (Team A vs Team B for each game)

**Given** the admin is on the matchup setup interface
**When** they enter two team names for a matchup and save
**Then** the match is stored in the `matches` table with team_a, team_b, round, and match position

**Given** a non-admin user attempts to access the `/admin` route
**When** the server checks the username against `ADMIN_USERNAME`
**Then** the admin UI is not rendered and the user is redirected to the leaderboard

**Given** this is the first story requiring match data
**When** the `matches` table is needed
**Then** the `matches` table is created via Drizzle schema and migration with columns for id, team_a, team_b, round, position, winner, and created_at

**Given** the admin has entered all 16 R32 matchups
**When** the setup is complete
**Then** all 16 matches are persisted and ready for bracket entry by participants

### Story 2.2: Bracket Lock Control

As the admin,
I want to toggle the bracket lock status for all participants,
So that I can control when the entry window opens and closes.

**Acceptance Criteria:**

**Given** the admin is on the Admin page
**When** they view the bracket lock control
**Then** a Switch toggle is displayed showing the current lock status (locked/unlocked)

**Given** brackets are currently unlocked
**When** the admin toggles the switch to locked
**Then** the `tournament_config` table is updated to `is_locked = true` and all participants are immediately prevented from entering or modifying picks

**Given** brackets are currently locked
**When** the admin toggles the switch to unlocked
**Then** the `tournament_config` table is updated to `is_locked = false` and participants with unsubmitted brackets can resume entry

**Given** brackets are locked
**When** any participant attempts to save a pick or submit a bracket via Server Action
**Then** the Server Action checks lock status first and returns `{ success: false, error: "Brackets are locked" }`

**Given** this is the first story requiring tournament configuration
**When** the `tournament_config` table is needed
**Then** the `tournament_config` table is created via Drizzle schema and migration with columns for id, is_locked, and point values per round (configurable scoring: R32, R16, QF, SF, Final)

## Epic 3: Bracket Entry & Submission

Participants can view R32 matchups, tap to pick winners with cascading logic, track their progress, and submit a completed 31-pick bracket. Bracket renders as a full tree on desktop and round-by-round on mobile. After submission, the bracket is permanently locked and viewable in read-only mode.

### Story 3.1: Bracket Data Model & Match Display

As a participant,
I want to view all R32 matchups in a bracket format,
So that I can see the tournament structure and begin making my picks.

**Acceptance Criteria:**

**Given** the admin has set up R32 matchups and brackets are unlocked
**When** a new participant navigates to the bracket view
**Then** all 16 R32 matchups are displayed as MatchCard components showing Team A vs Team B

**Given** the participant is on a desktop browser (>= 768px)
**When** the bracket view renders
**Then** a BracketTree component displays all rounds (R32 through Final) as columns flowing left to right with connector lines between rounds

**Given** the participant is on a mobile browser (< 768px)
**When** the bracket view renders
**Then** a RoundView component displays the current round's matchups as vertically stacked MatchCards with left/right navigation between rounds

**Given** the bracket view is loaded
**When** no picks have been made yet
**Then** all MatchCards are in their default state (both teams neutral, ready for selection) and later-round slots are empty

**Given** this is the first story requiring pick data
**When** the `picks` table is needed
**Then** the `picks` table is created via Drizzle schema and migration with columns for id, user_id, match_id, selected_team, and created_at

### Story 3.2: Tap-to-Pick with Cascading Logic

As a participant,
I want to tap a team to pick them as the winner and see my pick cascade forward into the next round,
So that I can build my bracket prediction from R32 through the Final.

**Acceptance Criteria:**

**Given** a participant is viewing an R32 matchup with two teams
**When** they tap one team
**Then** that team is visually selected (green-tinted background, checkmark) and the team advances to the corresponding next-round matchup slot

**Given** a participant picks Team A in an R32 match and Team A's opponent in R16 has also been picked
**When** both teams are present in the R16 matchup slot
**Then** the R16 MatchCard becomes available for the participant to pick a winner

**Given** a participant has picked Team A to win R32, R16, and QF
**When** they change their R32 pick from Team A to Team B
**Then** all downstream picks involving Team A (R16, QF, and any further) are automatically cleared

**Given** a downstream pick is cleared due to an earlier pick change
**When** the cascading logic completes
**Then** the progress counter decreases to reflect the total cleared picks and affected MatchCards return to their default state

**Given** a participant taps a team to make a pick
**When** the pick is registered
**Then** the pick is saved to the `picks` table via a `savePick()` Server Action with optimistic UI (immediate visual update, server save in background)

**Given** cascading pick logic is needed
**When** picks are made or changed
**Then** `bracket-utils.ts` provides `getCascadingPicks()` and `validatePick()` functions that handle all cascade computation on the client

### Story 3.3: Progress Tracking & Submission

As a participant,
I want to track my progress and submit my completed bracket,
So that I can lock in my 31 predictions and join the competition.

**Acceptance Criteria:**

**Given** a participant is making picks on their bracket
**When** each pick is made or cleared
**Then** a ProgressBar component displays "X of 31 picks made" with a fill bar that updates in real time

**Given** a participant has made fewer than 31 picks
**When** they view the submit button
**Then** the "Submit Bracket" button is disabled (Slate 100 background, Slate 400 text, cursor not-allowed)

**Given** a participant has completed all 31 picks
**When** the progress counter reaches "31 of 31 picks made"
**Then** the "Submit Bracket" button activates (Slate 900 background, white text)

**Given** a participant taps the active "Submit Bracket" button
**When** the `submitBracket()` Server Action is called
**Then** the user's `bracket_submitted` flag is set to true, the bracket is permanently locked, and the button shows "Submitting..." during the request

**Given** a bracket has been successfully submitted
**When** the submission completes
**Then** the participant is routed to the leaderboard view

### Story 3.4: Read-Only Bracket View

As a participant who has submitted their bracket,
I want to view my bracket in read-only mode,
So that I can review my picks after submission.

**Acceptance Criteria:**

**Given** a participant has submitted their bracket
**When** they navigate to the "My Bracket" tab
**Then** their bracket is displayed in read-only mode with all 31 picks visible but not interactive (no tap-to-pick, no hover states)

**Given** the bracket is in read-only mode
**When** displayed on desktop (>= 768px)
**Then** the BracketTree component renders the full tournament tree with all picks shown

**Given** the bracket is in read-only mode
**When** displayed on mobile (< 768px)
**Then** the RoundView component renders with round navigation, showing picks in each round

**Given** the bracket is in read-only mode
**When** no results have been entered yet
**Then** all picks display in neutral/pending state (no green/red color-coding — that comes in Epic 5)

## Epic 4: Scoring Engine & Leaderboard

Participants can view a ranked leaderboard showing current scores (escalating points per round), champion pick, max possible points remaining, and elimination status. Tiebreaker logic resolves ties.

### Story 4.1: Scoring Engine — Core Calculation & Tests

As a developer,
I want a scoring engine that calculates points using escalating round values,
So that participant scores are 100% accurate and re-derivable from source data.

**Acceptance Criteria:**

**Given** a participant's picks and the entered match results
**When** `calculateScores()` is called
**Then** it returns the correct score using escalating points: R32 = 1, R16 = 2, QF = 4, SF = 8, Final = 16

**Given** the scoring engine functions
**When** they are implemented in `src/lib/scoring-engine.ts`
**Then** they are pure functions that receive picks and results as arguments with no database access

**Given** point values are stored in `tournament_config`
**When** scores are calculated
**Then** the engine uses the configured point values (admin-configurable before brackets open) rather than hardcoded values

**Given** the scoring engine is implemented
**When** unit tests are written in `src/lib/scoring-engine.test.ts`
**Then** tests cover: correct picks in each round, no correct picks, all correct picks, partial correct picks, and edge cases with zero results entered

**Given** a new result is entered or an existing result is corrected
**When** `calculateScores()` is called for all participants
**Then** all scores are re-derived from source data (picks + results), not incrementally accumulated

### Story 4.2: Max Possible Points & Elimination Logic

As a participant,
I want to see my max possible points remaining and whether I'm mathematically eliminated,
So that I can track my competitive position throughout the tournament.

**Acceptance Criteria:**

**Given** a participant's picks and the current match results
**When** `maxPossiblePoints()` is called
**Then** it calculates the maximum points the participant could still earn based on their surviving picks in remaining unplayed matches

**Given** a participant's champion pick has been eliminated from the tournament
**When** elimination status is evaluated
**Then** the participant is flagged with a champion pick elimination indicator

**Given** a participant's max possible points (current score + remaining possible) is less than the current leader's score
**When** elimination status is evaluated
**Then** the participant is flagged as mathematically eliminated (cannot win)

**Given** max possible points and elimination logic are implemented
**When** unit tests are written
**Then** tests cover: all picks still alive, some picks eliminated, champion eliminated, mathematically eliminated, edge case where elimination status changes after a result correction

### Story 4.3: Tiebreaker Logic

As a participant,
I want ties on the leaderboard resolved fairly,
So that rankings are definitive even when participants have equal scores.

**Acceptance Criteria:**

**Given** two or more participants have the same current score
**When** the leaderboard ranking is calculated
**Then** the first tiebreaker is applied: the participant with a correct champion pick ranks higher

**Given** two or more participants are still tied after the champion pick tiebreaker
**When** the second tiebreaker is applied
**Then** the participant with more correct picks in the latest completed round ranks higher

**Given** tiebreaker logic is implemented
**When** unit tests are written
**Then** tests cover: no tie, tie broken by champion pick, tie broken by latest-round picks, three-way tie, tie that remains unresolved after both tiebreakers

### Story 4.4: Leaderboard Display

As a participant,
I want to view a ranked leaderboard of all 12 participants,
So that I can see where I stand in the competition at a glance.

**Acceptance Criteria:**

**Given** a participant navigates to the Leaderboard tab
**When** the leaderboard page loads
**Then** a LeaderboardTable displays all participants ranked by score with tiebreakers applied

**Given** the leaderboard is displayed
**When** the participant views the table
**Then** each row shows: Rank, Name, Score, Max Possible Points Remaining, and Champion Pick

**Given** the current user is viewing the leaderboard
**When** their row is rendered
**Then** their row is highlighted with a subtle background color so they can find themselves instantly

**Given** the leaderboard is displayed
**When** a participant is mathematically eliminated
**Then** their max possible points value visually communicates they cannot win (per UX spec: max lower than leader's score tells the story)

**Given** the leaderboard is displayed
**When** a participant's champion pick has been eliminated from the tournament
**Then** their champion pick is displayed with a strikethrough indicator

**Given** the #1 ranked participant
**When** the leaderboard renders
**Then** a crown icon is displayed next to their rank

**Given** no results have been entered yet
**When** the leaderboard loads
**Then** all 12 users are displayed with score "0" and max possible points at the maximum value — never an empty table

## Epic 5: Result Management & Live Bracket Tracking

Admin can enter and correct match results with automatic score recalculation. Participant brackets display color-coded picks (green correct, red wrong, neutral unplayed). Participants can view any other participant's bracket in read-only mode.

### Story 5.1: Admin Result Entry

As the admin,
I want to select a completed match and enter the winning team,
So that scores are calculated and the leaderboard updates for all participants.

**Acceptance Criteria:**

**Given** the admin is on the Admin page
**When** they view the match list
**Then** all matches are displayed grouped by round, with unresolved matches visually distinct from resolved ones

**Given** the admin taps an unresolved match
**When** they tap the winning team
**Then** the selected team is highlighted and confirm/cancel buttons appear below the AdminMatchCard

**Given** the admin has selected a winner and tapped "Confirm"
**When** the `enterResult()` Server Action is called
**Then** the result is saved to the `results` table, all participant scores are recalculated via the scoring engine, and the match card updates to show the resolved state

**Given** the admin taps "Cancel" after selecting a winner
**When** the cancel action is processed
**Then** the selection is cleared and the match returns to its unresolved state without saving

**Given** this is the first story requiring result data
**When** the `results` table is needed
**Then** the `results` table is created via Drizzle schema and migration with columns for id, match_id, winner, and created_at

### Story 5.2: Admin Result Correction

As the admin,
I want to correct a previously entered result,
So that any mistakes are fixed and all scores recalculate accurately.

**Acceptance Criteria:**

**Given** the admin views a match that already has a result entered
**When** they tap the resolved match
**Then** the match re-enters the selection flow, allowing the admin to tap a different winner

**Given** the admin selects a corrected winner and taps "Confirm"
**When** the `correctResult()` Server Action is called
**Then** the result is updated in the `results` table and all participant scores, max possible points, and elimination statuses are fully recalculated from source data

**Given** a result correction changes the winner of a match
**When** recalculation completes
**Then** the leaderboard reflects the corrected scores immediately on next load with no manual intervention required

**Given** a result is corrected
**When** the scoring engine recalculates
**Then** all 12 participants' scores are re-derived from picks + results (not incrementally adjusted), ensuring 100% accuracy per NFR4 and NFR5

### Story 5.3: Color-Coded Bracket Results

As a participant,
I want my bracket picks color-coded after results are entered,
So that I can instantly see which picks were correct, wrong, or still pending.

**Acceptance Criteria:**

**Given** a participant views their bracket after results have been entered
**When** a pick matches the entered result (correct pick)
**Then** the MatchCard displays with Emerald 500 green background and a checkmark indicator

**Given** a participant views their bracket after results have been entered
**When** a pick does not match the entered result (wrong pick)
**Then** the MatchCard displays with Red 500 background, an X indicator, and the team name struck through

**Given** a participant views their bracket
**When** a match has not yet been played (no result entered)
**Then** the MatchCard displays in neutral/pending state with Slate 300 styling

**Given** a participant picked a team to win multiple rounds but that team loses in an earlier round
**When** the result is entered
**Then** all downstream picks involving the eliminated team are marked red, showing the cascading impact visually

**Given** color-coding is implemented
**When** accessibility is verified
**Then** color is not the only indicator — checkmark/X symbols provide secondary identification for color-blind users

### Story 5.4: View Other Participants' Brackets

As a participant,
I want to view any other participant's bracket in read-only mode,
So that I can compare picks and see how others are doing.

**Acceptance Criteria:**

**Given** a participant is on the leaderboard
**When** they tap another participant's name or row
**Then** they navigate to that participant's bracket displayed in read-only mode

**Given** a participant is viewing another user's bracket
**When** results have been entered
**Then** the bracket displays with the same color-coding (green correct, red wrong, neutral pending) as their own bracket

**Given** a participant is viewing another user's bracket
**When** displayed on desktop (>= 768px)
**Then** the BracketTree component renders the full tournament tree

**Given** a participant is viewing another user's bracket
**When** displayed on mobile (< 768px)
**Then** the RoundView component renders with round navigation

**Given** a participant is viewing another user's bracket
**When** they want to return to the leaderboard
**Then** the tab navigation remains visible, allowing them to tap back to the Leaderboard tab
