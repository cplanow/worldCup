---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - product-brief-worldCup-2026-02-16.md
  - brainstorming-session-2026-02-14.md
  - ux-design-specification.md
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
lastEdited: '2026-02-16'
editHistory:
  - date: '2026-02-16'
    changes: 'Validation-driven edits: NFR7 measurability fix, FR24 definitive scoring values, FR35 merged into FR4, performance targets implementation leakage cleanup'
---

# Product Requirements Document - worldCup

**Author:** Chris
**Date:** 2026-02-16

## Executive Summary

worldCup is a purpose-built web application for 12 friends to participate in a World Cup knockout-stage bracket pool. Participants predict match winners from the Round of 32 through the Final (31 picks), then track results on a live leaderboard as the tournament unfolds.

**Problem:** Commercial bracket platforms serve mass audiences with unnecessary sign-up friction, ads, and features. No simple, self-owned option exists for a small private group where the builder is also a participant.

**Solution:** A lightweight web app with three capabilities: bracket entry (tap-to-pick with cascading logic), admin-controlled result entry, and a live leaderboard with competitive tracking.

**Key Differentiators:**
- Builder's craft — custom-built by a participant, for participants
- Purposeful simplicity — brackets, results, leaderboard. Nothing else.
- Competitive depth — max possible points remaining and elimination tracking elevate the experience
- Full ownership — self-hosted, no ads, no third-party dependencies

**Target Users:**
- **Participants (12 friends):** Tech-comfortable sports fans. Mix of desktop and mobile. Want quick, frictionless engagement — fill out a bracket, check the leaderboard, talk trash.
- **Admin (Chris):** One of the 12 who builds, deploys, and manages the app. Responsible for tournament setup, result entry, and bracket lock control.

## Success Criteria

### User Success

- All 12 participants complete and submit a full 31-pick bracket within the ~24hr entry window
- Zero-confusion onboarding — users enter a username and start picking without instructions or support
- Participants return after each knockout round to check standings and compare brackets
- Max possible points remaining and elimination indicators drive active engagement — participants reference competitive dynamics in group chat

### Business Success

N/A — personal passion project. Success is the group experience and the craft of building it. No revenue, growth, or market objectives.

### Technical Success

- 100% scoring accuracy — point calculations and leaderboard rankings correct after every result entry with no manual fixes
- App remains available for the full ~3 week knockout stage with no unplanned downtime
- Responsive design works smoothly on both desktop and mobile without layout or interaction issues
- Results entered by admin within hours of match completion

### Measurable Outcomes

| Outcome | Target |
|---------|--------|
| Bracket completion rate | 12/12 participants submit |
| Scoring accuracy | 100% correct calculations |
| Uptime during tournament | Zero unplanned downtime |
| Result entry lag | Within hours of match completion |
| Engagement signal | Max-possible-points / elimination referenced in group chat |

## Product Scope

### MVP Strategy

**Approach:** Experience MVP — the minimum that makes 12 friends say "this is fun and works." Success is: everyone submits a bracket, the leaderboard works correctly, competitive engagement drives group chat activity through the Final.

**Resource:** Solo developer (Chris). Lean scope mitigates the primary risk — building and deploying before the knockout stage begins.

### MVP Capabilities

- **Bracket UI** — R32 through Final, 31 picks, tap-to-pick, cascading logic, responsive (full tree desktop / round-by-round mobile), color-coded picks, progress indicator, submission blocked until complete
- **User identity** — username entry, one bracket per user, locked after submission, return via username
- **Admin tools** — R32 matchup setup, manual result entry, undo/correct with auto-recalculation, bracket lock toggle
- **Leaderboard** — ranked standings, current score, champion pick display, max possible points remaining, eliminated flag
- **Scoring engine** — escalating points per round, configurable point values, tiebreaker logic
- **Landing page** — username input, state-based routing

### App Lifecycle

App must be fully functional before the knockout stage begins. Remains available through the Final. Leaderboard serves as the final state — no teardown, no post-tournament work required.

### Risk Mitigation

- **Technical Risk:** Low. Standard web app, small dataset, well-understood logic. Most complex calculation (max possible points) is straightforward math, not R&D.
- **Timing Risk:** Primary concern. Hard external deadline — app must be deployed and tested before group stage ends. Lean MVP scope mitigates this directly.
- **Resource Risk:** Solo developer. Every MVP feature is journey-critical — no scope to cut. Mitigation: start early, test continuously.

## User Journeys

### Journey 1: Participant — First-Time Bracket Entry (Happy Path)

**Mike** is one of the 12 friends. He gets a link dropped in the group chat from Chris with a message: "Bracket pool is live, you have 24 hours." Mike taps the link on his phone during lunch. He sees a single input field — types "Mike" and hits enter. He lands on a round-by-round bracket view showing the R32 matchups. He starts tapping winners — each pick cascades forward, populating the next round. A counter reads "7 of 31 picks made." He finishes all 31 picks on the train home, the submit button lights up, he taps it. Done. He screenshots his champion pick and drops it in the group chat. His bracket is locked.

**Reveals:** Username entry, mobile round-by-round UI, tap-to-pick, cascading picks, progress indicator, submit gate, bracket lock after submission.

### Journey 2: Participant — Returning to Check Results (Engagement Loop)

Two days later, Argentina beats Mexico in the R32. **Mike** opens the app, enters "Mike" on the landing page, and lands on the leaderboard. He's 3rd with 4 points. His correct pick is green on his bracket. He notices his buddy Dave is already flagged "Eliminated" — Dave's champion pick (Mexico) just got knocked out. Mike sees he still has 47 max possible points remaining. He screenshots the leaderboard showing Dave's elimination and drops it in the group chat. Trash talk ensues.

**Reveals:** Return access via username, leaderboard with ranking/score/max-possible/eliminated flag, color-coded bracket (green correct, red wrong), champion pick elimination indicator, engagement hook driving group chat activity.

### Journey 3: Participant — Wrong Pick Cascade (Edge Case)

**Sarah** picked Brazil to win it all — champion, semifinal, quarterfinal, R16. Brazil loses in the R16. Sarah opens her bracket and sees a red trail: her R16, QF, SF, and Final picks are all marked wrong in red. Her max possible points dropped significantly. The leaderboard shows she's not eliminated yet, but the path is narrow. She's still checking in every round to see if she can climb back.

**Reveals:** Color-coded wrong picks, cascading impact visibility, max possible points recalculation after upsets, engagement retention even when bracket is "busted."

### Journey 4: Admin — Tournament Setup & Result Entry

**Chris** opens the app before the knockout stage begins. He accesses admin tools, inputs the 16 R32 matchups (Team A vs Team B for each game). He toggles the bracket lock to "unlocked" and shares the link in the group chat. 24 hours later, all 12 brackets are submitted. Chris locks brackets. As matches are played, Chris opens admin tools, taps a completed match, taps the winner, confirms. Scores recalculate automatically. The leaderboard updates. Later, Chris realizes he entered a wrong result — he taps the match again, corrects the winner, confirms. All 12 users' scores recalculate. No manual fixes needed.

**Reveals:** Admin matchup setup, bracket lock toggle, manual result entry (tap match, tap winner, confirm), automatic score recalculation, undo/correct result with cascade recalculation.

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| Bracket Entry (Happy Path) | Username auth, responsive bracket UI, tap-to-pick, cascading picks, progress indicator, submit gate, bracket lock |
| Returning User (Engagement) | Return via username, leaderboard (rank, score, max-possible, eliminated), color-coded bracket, champion pick status |
| Wrong Pick Cascade (Edge Case) | Multi-pick impact visualization, max-points recalculation, engagement retention for trailing users |
| Admin Operations | Matchup setup, bracket lock control, result entry, undo/correct, automatic score recalculation |

## Web App Specific Requirements

### Project-Type Overview

Single-page application with REST API backend. Private app for 12 known users — no public discovery, no SEO, no complex auth. Shared via direct link in group chat.

### Technical Architecture Considerations

- **Architecture:** SPA with separate API backend, clean client/server separation
- **Rendering:** Client-side rendering (no SSR needed — no SEO, known users, small dataset)
- **Data flow:** REST API, standard request/response. No WebSockets for MVP — page refresh for updates
- **Auto-ingest results API:** Not in MVP — data source not yet identified. MVP uses manual admin entry.

### Browser Support

| Browser | Support |
|---------|---------|
| Chrome | Last 2 versions |
| Safari | Last 2 versions |
| Firefox | Last 2 versions |
| Edge | Last 2 versions |

Mobile browsers (Chrome iOS/Android, Safari iOS) included — responsive design required.

### Responsive Design

- Desktop: Full bracket tree visualization
- Mobile: Round-by-round view with swipe/tap navigation
- Thumb-zone optimized tap targets for bracket picks on mobile
- Sticky header with score summary on mobile

### Performance Targets

- Leaderboard calculation: Sub-millisecond (12 users, 372 rows max)
- Initial page load: Under 3 seconds on standard mobile connection
- Subsequent page loads leverage browser caching for near-instant response

### Accessibility

Basic usability — standard HTML semantics and reasonable tap target sizes. Known user base with no identified accessibility needs.

## Functional Requirements

### User Identity & Access

- **FR1:** Participant can enter a username to create a new identity
- **FR2:** Participant can return to the app by re-entering their username
- **FR3:** System enforces one bracket per username
- **FR4:** System routes users based on state (new user → bracket entry, returning user → bracket/leaderboard, locked state → read-only)

### Bracket Entry & Interaction

- **FR5:** Participant can view all R32 matchups in a bracket format
- **FR6:** Participant can select a winner for any available matchup by tapping a team
- **FR7:** System cascades winning team forward into the next round's matchup when a pick is made
- **FR8:** System clears downstream dependent picks when an earlier-round pick is changed
- **FR9:** Participant can view a progress indicator showing picks completed out of 31
- **FR10:** System prevents bracket submission until all 31 picks are complete
- **FR11:** Participant can submit a completed bracket
- **FR12:** System locks a participant's bracket permanently after submission
- **FR13:** Participant can view their bracket in read-only mode after submission
- **FR14:** Participant can view their bracket on desktop as a full tournament tree
- **FR15:** Participant can view their bracket on mobile as a round-by-round view

### Bracket Display & Results

- **FR16:** System color-codes picks after results are entered (green for correct, red for wrong, neutral for unplayed)
- **FR17:** Participant can view any other participant's bracket in read-only mode

### Leaderboard

- **FR18:** Participant can view a ranked leaderboard of all participants
- **FR19:** Leaderboard displays each participant's current score
- **FR20:** Leaderboard displays each participant's champion pick
- **FR21:** Leaderboard displays max possible points remaining for each participant
- **FR22:** Leaderboard displays an eliminated flag for participants who cannot mathematically win
- **FR23:** Leaderboard displays a visual indicator when a participant's champion pick has been eliminated

### Scoring Engine

- **FR24:** System calculates scores using escalating points per round: R32 = 1, R16 = 2, QF = 4, SF = 8, Final = 16. Point values are admin-configurable before brackets open.
- **FR25:** System automatically recalculates all participant scores when a result is entered or corrected
- **FR26:** System resolves ties using tiebreaker logic (correct champion pick first, most correct latest-round picks second)
- **FR27:** System calculates max possible points remaining for each participant based on surviving picks

### Admin — Tournament Setup

- **FR28:** Admin can input R32 matchups (Team A vs Team B for each of the 16 games)
- **FR29:** Admin can toggle bracket lock status (locked/unlocked) for all participants
- **FR30:** System prevents bracket entry or modification when brackets are locked

### Admin — Result Management

- **FR31:** Admin can select a completed match and enter the winner
- **FR32:** Admin can correct a previously entered result
- **FR33:** System automatically recalculates all scores and leaderboard standings after a result correction

### Landing Page

- **FR34:** System presents a single username input field as the entry point

## Non-Functional Requirements

### Reliability

- **NFR1:** App remains available for the full duration of the knockout stage (~3 weeks) with no unplanned downtime
- **NFR2:** No data loss — submitted brackets and entered results persist reliably across the tournament duration
- **NFR3:** App recovers gracefully from server restarts without losing state

### Data Integrity

- **NFR4:** Scoring calculations produce 100% accurate results — no rounding errors, no missed picks, no incorrect point assignments
- **NFR5:** Result corrections trigger complete and accurate recalculation of all affected scores, max possible points, and elimination status
- **NFR6:** Bracket lock enforcement is absolute — no race conditions or edge cases that allow picks after lock

### Performance

- **NFR7:** Page loads complete within 3 seconds and user actions complete within 500ms on both desktop and mobile
