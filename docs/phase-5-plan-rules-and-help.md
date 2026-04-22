# Phase 5 Plan — Rules Page + Contextual Help

**Status:** Plan. Do not implement until explicitly asked.
**Date:** 2026-04-22
**Rationale:** Users forget scoring structure between rounds. Admin gets DM'd the same questions. Need one source of truth + inline reminders on the surfaces where picks happen.

---

## Decision (locked)

**Hybrid approach.** Both of:

1. **New `/rules` page** in the main nav — comprehensive, link-able, the authoritative answer to "how does this work?"
2. **Inline help on pick pages** — `/groups` and `/bracket` get a collapsible "How scoring works" summary right at the top, pre-expanded for unsubmitted users and collapsed-by-default for submitted users.

This matches how established pools (ESPN Tournament Challenge, FanDuel bracket pools, RunYourPool) handle it.

## Rejected alternatives

- **Tooltips on every number** — too noisy, hard to discover on mobile.
- **Onboarding wizard on first visit** — users dismiss it and forget. No way back without fresh account.
- **Info modal from a `(?)` icon in the header** — easy to miss; doesn't explain on the surfaces where users are making decisions.

---

## Part A — `/rules` page

### Location and nav

- New route: `src/app/(app)/rules/page.tsx`
- Added to `TabNav` between "Leaderboard" and "Groups" — order matters: rules → groups → bracket → leaderboard → admin mirrors the user journey (read rules → make picks → watch leaderboard).
- Visible to all authenticated users. Admin sees it too; it's not admin-gated.

### Content outline

Use `SectionHeader` + `Card` primitives (the pattern that already exists in admin pages). Keep every section tight — no marketing fluff.

#### 1. Hero — "How this pool works"
- Small eyebrow ("WORLD CUP 2026 · PRIVATE POOL")
- `text-display-md` headline
- 2-sentence summary: this is a two-phase prediction pool; the bracket fills in after group stage ends; total possible is 316 points.

#### 2. Timeline
Dated checklist of the ~6 milestones:

| Date | Event | Your action |
|------|-------|-------------|
| Before June 11 | Group-stage lock | Submit your 12 group rankings + Golden Boot |
| June 11 | Tournament kicks off | — |
| ~June 26 | Group stage ends | — (admin enters results + advancers) |
| ~June 28 | Bracket opens | Fill in R32 → Final, then submit |
| ~June 28 – July 3 | Round of 32 | — (picks lock once you submit; admin enters results) |
| ~July 19 | Final at MetLife | — (leaderboard freezes) |

Rendered as a vertical timeline component (simple CSS — absolute-positioned dots, connecting line via `border-l`). Current/next milestone visually marked.

#### 3. Phase 1 — Group Stage
- What you do: rank all 4 teams 1st through 4th in each of the 12 groups (A–L)
- Scoring breakdown in a table:
  - 2 pts per team in correct position (max 8 pts per group)
  - +5 pt perfect-group bonus (all 4 exactly right)
  - Max per group: **13 pts**
  - Max across 12 groups: **156 pts**
- Also: Golden Boot pick — required to submit, breaks ties.

#### 4. Phase 2 — Knockout Bracket
- What you do: after group stage ends, fill in picks for 31 games across 5 rounds.
- Escalating points table:

| Round | Games | Points each | Max |
|-------|------:|------------:|----:|
| Round of 32 | 16 | 2 | 32 |
| Round of 16 | 8 | 4 | 32 |
| Quarterfinals | 4 | 8 | 32 |
| Semifinals | 2 | 16 | 32 |
| Final | 1 | 32 | 32 |
| **Total** | **31** | — | **160** |

- Why escalating? Reward bold late-round picks. A correct Final bet is worth 16× an R32 pick. Nobody is out of it until the Final.

#### 5. Tiebreakers
Applied in order:
1. Combined score (group + bracket)
2. Golden Boot pick correctness (actual vs. predicted top scorer)
3. Champion pick correctness (actual vs. predicted final winner)
4. Username alphabetical (last resort)

#### 6. Fine print
- **Locking:** once you hit Submit for group or bracket, your picks are locked forever. No edits, no resets. Admin cannot edit your picks either.
- **Changes before submit:** edit freely up until you hit Submit or the admin locks the round.
- **Account recovery:** forgot your password? Ask the admin for a reset link.
- **The admin:** the admin (Chris) enters results and manages the bracket setup. The admin's picks compete alongside everyone else's — it's a fair game.
- **No money:** this pool is for pride and leaderboard glory only.

### Visual treatment
- Card-based layout with `SectionHeader` per section.
- Points tables use the existing `<table>` classes from the leaderboard work — consistent styling.
- Key numbers (13, 156, 32, 160, 316) rendered in `font-display` + `tabular-nums` at a larger size — visually anchors the scanning reader.
- Use semantic tokens throughout (already the norm post-phase-4). No new palette work.
- Timeline block is the one creative UI moment — the rest is straightforward prose + tables.

### Accessibility
- All tables have `<caption>` elements.
- Timeline is a `<ol>` with visually-hidden status labels ("completed" / "current" / "upcoming") for screen readers.
- All section headings are real `<h2>` / `<h3>` — no divs-as-headings.

### Estimated effort: **0.5 day**

---

## Part B — Inline help on pick pages

### Pattern: collapsible "How scoring works" panel at the top of each pick surface

Two places:

1. **`/groups`** — above the Golden Boot card
2. **`/bracket`** — above the bracket tree / round view

Behavior:
- **Default state:**
  - Unsubmitted users: **expanded**. They need this info RIGHT NOW.
  - Submitted users: **collapsed**. They already know; don't clutter their view.
- Collapse/expand state persists in `localStorage` per user-per-page (so returning users get their preferred state).
- Uses Radix `Collapsible` (already in deps via `radix-ui`).
- Links down to the relevant `/rules` anchor for the full story ("See full rules →").

### Content — `/groups` panel

```
How group scoring works
─────────────────────────
Rank all 4 teams in each of 12 groups (1st through 4th).

  • 2 points per team in the correct position
  • +5 point bonus for a perfect group (all 4 right)
  • Max per group: 13 pts  ·  Max total: 156 pts

Golden Boot: predict the tournament's top scorer — required to
submit, breaks ties on the final leaderboard.

See full rules →
```

### Content — `/bracket` panel

```
How bracket scoring works
─────────────────────────
Pick the winner of every knockout match, R32 through Final.

  Round      Points each    Max
  R32          2             32
  R16          4             32
  QF           8             32
  SF          16             32
  Final       32             32
  Total                     160

Later rounds are worth more — a correct Final pick is worth
16× a correct R32 pick. Stay in the game until the end.

See full rules →
```

### Styling
- Uses `Card variant="flat"` + subtle `bg-surface-2` tint so it reads as a help surface, not a primary action.
- Header row has a small `(i)` icon (Lucide `Info`) and the expand/collapse chevron.
- When collapsed, shows a one-line summary: "Max 156 pts · tap to expand scoring breakdown" for groups; "Escalating rewards: 2/4/8/16/32 per round · tap to expand" for bracket.

### Accessibility
- Button element, not a div.
- `aria-expanded` / `aria-controls` correctly wired.
- Keyboard-operable (Radix handles this).

### Estimated effort: **0.5 day**

---

## Part C — Leaderboard column tooltips (optional polish)

Low priority. On `/leaderboard`, add small `(i)` icons next to the Group, Bracket, Total, and Champion column headers. On click/hover, show a `Popover` (Radix again) explaining what the column shows:

- Group: "Max 156 pts from the group-stage rankings"
- Bracket: "Max 160 pts from the knockout picks (R32 → Final)"
- Total: "Group + Bracket. Max 316 pts"
- Champion: "Your predicted Final winner. Used as a tiebreaker."

### Estimated effort: **0.25 day**

---

## Implementation order (when we ship this)

1. `/rules` page — biggest chunk, can ship standalone with full content
2. Inline `/groups` panel — small, leans on `/rules` for "See full rules →"
3. Inline `/bracket` panel — same pattern
4. TabNav update — add "Rules" tab (3-line change)
5. Leaderboard tooltips — optional, last

Each can be a separate PR. No agent fan-out needed — this is one cohesive deliverable that one person (or agent) should own end-to-end so voice stays consistent.

## Total estimate

| Item | Effort |
|------|-------:|
| `/rules` page (Part A) | 0.5 day |
| Inline help panels (Part B) | 0.5 day |
| Leaderboard tooltips (Part C, optional) | 0.25 day |
| **Total** | **~1-1.25 days** |

## Open decisions (intentionally NOT locked — execution-time judgment)

These are low-stakes; execute whatever makes sense when building:

- **Timeline exact dates.** FIFA hasn't fully confirmed knockout-round kickoff times yet for every match; when we build, use their official schedule or leave as "~June 28" style.
- **Tab label: "Rules" vs "How it works" vs "Scoring"** — pick whatever reads best at render time.
- **Rules content tone** — my draft above errs on the side of matter-of-fact. If it reads stiff, loosen it.

## Out of scope for phase 5

- Historical pool data (no prior years to show).
- A rulebook editor for the admin (rules are codified in the scoring engine, shouldn't be mutable via UI).
- Multi-language support.
- A "print-friendly rules" view — overkill for a family pool.
