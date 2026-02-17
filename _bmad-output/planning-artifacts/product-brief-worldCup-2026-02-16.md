---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - brainstorming-session-2026-02-14.md
date: 2026-02-16
author: Chris
---

# Product Brief: worldCup

## Executive Summary

worldCup is a personal, purpose-built web application for a small group of 12 friends to participate in a World Cup knockout-stage bracket pool. Participants fill out tournament brackets predicting match winners from the Round of 32 through the Final, then track results on a live leaderboard as the tournament unfolds. Built as a passion project with full control over design, hosting, and rules — delivering a simple, focused experience without the overhead of commercial platforms.

---

## Core Vision

### Problem Statement

Commercial bracket pool platforms serve millions of users but offer no tailored experience for a small, private friend group. While functional, they come with unnecessary sign-up friction, ads, and features designed for mass audiences. There's no simple, self-owned option for a small group that just wants brackets, results, and a leaderboard.

### Problem Impact

Without a dedicated tool, the group either skips the bracket pool entirely or relies on manual tracking that lacks the competitive engagement of a live leaderboard and visual bracket display.

### Why Existing Solutions Fall Short

Existing platforms like ESPN work well but aren't built for this use case — a tight-knit group of 12 where the builder is also a participant. They can't be customized, self-hosted, or tailored to the group's specific preferences. More importantly, building it is part of the experience.

### Proposed Solution

A lightweight web app purpose-built for 12 users featuring: a tap-to-pick bracket UI for knockout stage predictions, admin-controlled result entry with optional auto-ingestion, and a live leaderboard with competitive tracking features including max possible points remaining and elimination indicators.

### Key Differentiators

- **Builder's craft** — Custom-built by a participant, for participants
- **Purpose-built simplicity** — Three things only: brackets, results, leaderboard
- **Competitive depth** — Max possible points remaining and elimination tracking elevate the competitive experience
- **Full ownership** — Self-hosted, no ads, no third-party dependencies, reusable for future tournaments

## Target Users

### Primary Users

**The Participants (12 friends)**
Tech-comfortable sports fans who follow the World Cup. A tight-knit group that communicates via group chat. Mix of desktop and mobile users. They want a simple, frictionless way to make bracket picks and track how they stack up against each other. Not looking for a deep analytical tool — they want quick engagement: fill out a bracket, check the leaderboard, talk trash.

### Secondary Users

**The Admin (Chris)**
One of the 12 participants who also builds and manages the app. Responsible for tournament setup (inputting R32 matchups), entering or verifying results, and controlling bracket lock timing. Plays both roles — competitor and commissioner.

### User Journey

1. **Discovery** — Admin shares app link in the existing group chat
2. **Onboarding** — User enters a username, lands on the bracket view, starts tapping picks
3. **Core Usage** — Fill out full 31-pick bracket during the ~24hr window between group stage completion and knockout round start
4. **Success Moment** — First results come in, leaderboard updates, max possible points shift — competitive engagement kicks in
5. **Long-term** — Check back after each knockout round to see standings, compare brackets, ride it out to the Final

## Success Metrics

### User Success

- All 12 participants successfully submit a complete 31-pick bracket within the entry window
- Participants actively check the leaderboard throughout the knockout stage (return visits after each round of matches)
- Zero confusion during onboarding — users can enter a username and start picking without instructions

### Technical Success

- App remains available and functional for the full duration of the knockout stage (~3 weeks)
- Leaderboard and scores update correctly after every result entry with no manual fixes needed
- Works smoothly on both desktop and mobile without layout or interaction issues

### Business Objectives

N/A — This is a personal passion project, not a commercial product. There are no revenue, growth, or market objectives.

### Key Performance Indicators

| KPI | Target |
|-----|--------|
| Bracket completion rate | 12/12 participants submit |
| Scoring accuracy | 100% correct point calculations |
| Uptime during tournament | No unplanned downtime |
| Result entry lag | Results entered within hours of match completion |

## MVP Scope

### Core Features

1. **Bracket UI** — Traditional tournament bracket (R32 through Final, 31 picks) with tap-to-pick interaction and cascading pick logic. Responsive design: full tree on desktop, round-by-round view on mobile. Color-coded picks (green correct, red wrong, neutral unplayed). Bracket progress indicator ("17 of 31 picks made"), submission blocked until all 31 picks complete.

2. **User Identity** — Lightweight soft authentication via username entry. One bracket per user, locked after submission. Return access by re-entering username. No passwords, trust-based.

3. **Admin Tools** — Admin inputs R32 matchups to populate bracket template. Manual result entry (tap game, tap winner, confirm). Undo/correct a result with automatic score recalculation. Admin-controlled bracket lock toggle. Hardcoded single admin role.

4. **Leaderboard** — Ranked standings with username, current score, and champion pick display. Max possible points remaining per user. Eliminated flag for users who can't mathematically win. Visual indicator when champion pick is eliminated.

5. **Scoring Engine** — Escalating points per round (e.g., 1, 2, 4, 8, 16). Point values configurable by admin. Tiebreaker: correct champion pick first, most correct latest-round picks second.

6. **Landing Page** — Single username input field. Routes based on state: new user to bracket entry, returning user to their bracket or leaderboard, locked state shows read-only bracket and leaderboard.

### Out of Scope for MVP

- Group stage predictions (Phase 2)
- Bonus points — upset bonuses, exact score predictions (Phase 2)
- Auto-ingest results from external API (Phase 2 — manual entry first)
- Bracket image export for sharing (Phase 2)
- Historical results archive (Phase 2)
- Social features — all social interaction handled via existing group chat
- Dark mode
- Bracket comparison view (side-by-side)

### MVP Success Criteria

- All 12 participants complete and submit brackets within the entry window
- Scores and leaderboard update correctly after every result entry
- App runs reliably through the full knockout stage with no unplanned downtime
- Users can access the app on both desktop and mobile without issues

### Future Vision

- **Phase 2 enhancements:** Group stage predictions, bonus scoring, auto-ingest results API, bracket image export, historical archive
- **Reusability:** Config-driven design (tournament name, branding, scoring structure) enables reuse for future World Cups or other tournaments
- **Visual polish:** Dark mode, bracket comparison view, confetti animations, QR code sharing
