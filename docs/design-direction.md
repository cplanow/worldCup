# Design Direction — worldCup 2026

**Status:** Source of truth for the phase 4 UI revamp. Every component agent reads this before touching any file.

## Brand anchor (non-negotiable)

- **Primary:** Forest green `#0F2E23`
- **Accent:** Gold `#D4AF37`
- **Display type:** Bricolage Grotesque (variable axis)
- **Body type:** DM Sans

Everything else is on the table.

## Voice of the UI

- **Sportsman meets sommelier.** Competitive energy, but tasteful. The aesthetic of a high-end sports bar, not a casino, not a textbook.
- **Data-dense but legible.** Leaderboards and brackets will always carry a lot of information. The design helps users scan it, never punishes them with density.
- **Confident, not loud.** Bold typography. Restrained color. A gold accent here and there, not everywhere.
- **Warm, not clinical.** Warm ivory surfaces (Cloud Dancer), subtle gradients, rounded-but-not-pillowy corners.

## Token reference (authoritative — use via Tailwind utilities)

Defined in `src/app/globals.css`. Reference via semantic class names — never hardcode hex.

### Surface
| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `bg-bg` | `#FBFAF6` warm ivory | `#0A1F17` deep forest | page background |
| `bg-surface` | `#FFFFFF` | `#132F25` | cards, panels |
| `bg-surface-2` | `#F5F4EF` | `#1A3A2E` | alt surface, disabled, headers |
| `bg-surface-sunken` | `#EEECE4` | `#071813` | nav inactive, well insets |

### Brand + accent
| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `bg-brand` / `text-brand` | `#0F2E23` forest | `#D4AF37` gold | primary CTA, header, brand element |
| `bg-brand-hover` | `#1A4A38` | `#E3C040` | hover state |
| `bg-accent` / `text-accent` | `#D4AF37` gold | `#D4AF37` gold | accent pops, emphasis |
| `text-accent-strong` | `#8B6914` darker gold | `#F2D26A` lighter gold | gold text on non-brand backgrounds (contrast-safe) |
| `text-on-brand` | `#FFFFFF` | `#0F2E23` | text on brand-colored backgrounds |
| `text-on-accent` | `#0F2E23` | `#0F2E23` | text on gold backgrounds |

### Semantic (all pairings WCAG AA compliant)
| Token | Color | Use |
|-------|-------|-----|
| `text-success` / `bg-success-bg` | emerald-700 / emerald-50 | correct picks, advance confirmations |
| `text-warning` / `bg-warning-bg` | amber-700 / amber-50 | near-deadline reminders |
| `text-error` / `bg-error-bg` | red-700 / red-50 | errors, wrong picks, invalid state |
| `text-info` / `bg-info-bg` | blue-700 / blue-50 | neutral info callouts |

### Text
| Token | Light | Use |
|-------|-------|-----|
| `text-text` | slate-900 | body, headings on light surfaces |
| `text-text-muted` | slate-600 | secondary text, labels (AAA on white) |
| `text-text-subtle` | slate-500 | placeholders, caption (AA on white) |

### Borders + focus
| Token | Use |
|-------|-----|
| `border-border` | default divider / card edge |
| `border-border-strong` | more visible border (inputs, selected state) |
| `ring-ring` | focus ring, always gold |

## Typography scale

Use the utility classes defined in `globals.css`:

| Class | Use | Behavior |
|-------|-----|----------|
| `text-display-lg` | page hero, landing title | clamp 40px → 72px |
| `text-display-md` | section title, sign-in form header | clamp 32px → 48px |
| `text-display-sm` | card / panel title | clamp 24px → 36px |
| standard Tailwind text-* sizes for body | all body copy | — |

**Rules:**
- Use `font-display` (Bricolage) ONLY for headlines, rank badges, and numeric emphasis (scores, round names).
- Use `font-body` (DM Sans) — the default — for everything else.
- Max one display-sized element per viewport section. Hierarchy comes from SIZE, not from using the display font everywhere.

## Motion language

Four motion patterns, nothing else:

1. **fade-in** (200ms) — new content appearing. Pages, modals, banners.
2. **slide-up** (260ms) — picks saving, rows adding to a list. Subtle, originates from the element's true position.
3. **lift** (150ms) — hover affordance on cards/buttons. Translate up 2px + elevated shadow.
4. **state color transition** (200ms) — when a pick changes from pending → correct/wrong, the color transitions, not snaps.

All honor `prefers-reduced-motion: reduce` (handled in globals.css).

No parallax. No confetti. No full-page transitions. No morphing SVGs. No Lottie.

## Elevation

Neumorphic-lite. Three levels, via the `--shadow-card`, `--shadow-card-hover`, `--shadow-elevated` tokens. **Never combine shadows with heavy borders** — it's one or the other. Our default is shadow.

## Radius

- **Small UI (badges, chips, nav pills):** `rounded-md` (0.625rem)
- **Inputs, buttons:** `rounded-lg` (0.75rem)
- **Cards, panels:** `rounded-xl` (1rem)
- **Hero / dialog:** `rounded-2xl` (1.25rem)

Don't use `rounded-full` except for:
- circular badges (rank number, user avatar)
- pill buttons for filters/tabs

## Iconography

We currently have **zero icons**. When adding:
- Use [Lucide](https://lucide.dev) only (matches Tailwind/Shadcn aesthetic)
- Stroke width 2, size 16 or 20 only
- Color-match the surrounding text token (`text-text-muted` etc.), never hardcode hex
- No icon-only buttons unless they have an accessible label

We previously removed `lucide-react` as dead code — if any component reintroduces it, re-add to deps.

## Data visualization

The bracket and leaderboard are our only data-heavy surfaces.

### Bracket
- **Visual hierarchy:** current round should be visually "closest" (fullest color, boldest type). Earlier rounds fade into `surface-2` / `text-muted`. Final match stands alone.
- **State colors:** pending = `text-text`, correct = `text-success` + `bg-success-bg`, wrong = `text-text-subtle line-through` + `bg-error-bg opacity-60`.
- **Mobile:** round-by-round scrollable carousel with the current round centered. Desktop: full tree.

### Leaderboard
- **Rank pills** for top 3 use `bg-accent-gradient` for 1st, silver/bronze tints for 2-3, and `bg-surface-2` for everyone else.
- **Score columns** use `font-display` for the numeric value — scale the font size to the column width.
- **Current user row** has a subtle `bg-accent/8` tint so the user always finds themselves.
- **Rank change** shows a small arrow + delta, animated in with `slide-up`.

## Layout

- **Max content width:** 80ch for text-heavy, 1120px for data-heavy (bracket, leaderboard, admin).
- **Mobile first.** Every component designed for 375px, then scaled up. Not the other way around.
- **Standard padding scale:** 4/6/8 Tailwind. Avoid 3, 5, 7, 9 except for fine-tuning.

## Explicit rejects

Seen in the research, explicitly NOT doing:
- Neo-brutalism (raw borders, stark black/yellow, cramped grid). Too aggressive for a family pool.
- Claymorphism (pillowy 3D blobs). Reads as toy/kids.
- Heavy glassmorphism throughout. Restricted to 1-2 moments (landing hero, dialog overlay).
- Dark-mode-by-inversion (just flipping white ↔ black). We build designed palettes for both.
- Large illustrated mascots / character art. We don't have brand characters.
- Full-page parallax scroll. Performance + motion-sensitivity cost.
- Kinetic typography (letters that dance). Novelty. Ages fast.

## Component patterns

These are the reusable building blocks. Every agent MUST use these, not reinvent.

### Card
```tsx
<div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-card)] animate-lift">
  {children}
</div>
```
Hover = lift via the `animate-lift` utility.

### Input
(See primitives in `src/components/ui/input.tsx` — post-4C. All inputs use the shared variant.)

### Button
(See primitives in `src/components/ui/button.tsx`. Use variant names, don't re-style inline.)

### Badge
Small, used for rank pills, state labels, counts.
```tsx
<span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-muted">
  {label}
</span>
```

### Section header
```tsx
<div className="mb-6">
  <h2 className="text-display-sm text-text">{title}</h2>
  {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
</div>
```

## What to migrate from old components

**Keep these patterns (they're good):**
- Position-ring badges on GroupCard (1st/2nd/3rd/4th with colored rings) — reinterpret with new token colors
- Progressive R32→Final bracket layout — just needs visual polish
- Auth form glassmorphism — extend the gradient background to brand-accent gradient
- Leaderboard rank 1 gold badge

**Kill these patterns:**
- Inline hex colors on any JSX element
- `text-slate-*` / `bg-slate-*` utilities (replace with semantic tokens)
- `text-[#XYZ]` custom hex Tailwind classes
- `text-xs` for important info (raise to `text-sm` or give it a background)
- Error text in plain red-500 (use `text-error` token, which is red-700)
- Gold-muted text on gold background (anywhere)

## Checklist for each component rework

Agents must verify all before commit:
- [ ] No `#` hex color literals in JSX
- [ ] No `text-slate-*` / `bg-slate-*` / `border-slate-*` utilities
- [ ] No `text-[...]` or `bg-[...]` arbitrary-value utilities for colors
- [ ] All text contrast verified (or uses a token that's already verified)
- [ ] Keyboard-navigable
- [ ] Focus states use `ring-ring`
- [ ] Honors dark mode (adds `dark:` variants where needed OR uses tokens that auto-swap)
- [ ] `prefers-reduced-motion` respected (use utility classes, not raw CSS animations)
- [ ] Renders at 375px wide without horizontal scroll
- [ ] No new heavy dependencies (no chart libs, no animation libs beyond framer-motion if already in use)

## Questions? Don't ask — decide.

Every question a component agent might have (spacing, shadow, radius choice, etc.) should be answered from the tokens and patterns above. If something truly isn't covered, pick the most boring option consistent with the voice and ship it. No design decision needs stakeholder sign-off during phase 4.
