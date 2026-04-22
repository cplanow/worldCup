"use client";

import { cn } from "@/lib/utils";
import type { MatchCardMode, PickClassification } from "@/types";

interface MatchCardProps {
  matchId: number;
  teamA: string | null;
  teamB: string | null;
  selectedTeam: string | null;
  disabled: boolean;
  mode: MatchCardMode;
  classification?: PickClassification;
  onSelect: (matchId: number, team: string) => void;
  /**
   * Visual prominence of the match. Current round = full color, later rounds
   * fade back. Defaults to "active".
   */
  emphasis?: "active" | "muted" | "hero";
}

/**
 * A single team row within a match card. Shared across entry, readonly, and
 * results modes with state-specific styling. All colors go through semantic
 * design tokens — see docs/design-direction.md.
 */
function TeamRow({
  team,
  isSelected,
  isTop,
  disabled,
  onClick,
  mode,
  classification,
  emphasis,
}: {
  team: string | null;
  isSelected: boolean;
  isTop: boolean;
  disabled: boolean;
  onClick: () => void;
  mode: MatchCardMode;
  classification?: PickClassification;
  emphasis: "active" | "muted" | "hero";
}) {
  const cornerClass = isTop ? "rounded-t-[0.6rem]" : "rounded-b-[0.6rem]";
  const base = cn(
    "flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium transition-colors duration-200",
    cornerClass
  );

  // Empty slot (no team set yet) — TBD placeholder
  if (!team) {
    return (
      <div
        className={cn(base, "bg-surface-sunken text-text-subtle")}
        aria-hidden="true"
      >
        <span className="truncate text-xs uppercase tracking-wider">TBD</span>
      </div>
    );
  }

  // ----- READONLY MODE -----
  if (mode === "readonly") {
    return (
      <div
        className={cn(
          base,
          isSelected
            ? "bg-surface-2 text-text font-semibold"
            : "bg-surface text-text-muted"
        )}
        aria-label={isSelected ? `${team} — your pick` : team}
      >
        <span className="truncate">{team}</span>
        {isSelected && (
          <span
            aria-hidden="true"
            className="ml-2 h-2 w-2 shrink-0 rounded-full bg-accent"
          />
        )}
      </div>
    );
  }

  // ----- RESULTS MODE -----
  if (mode === "results") {
    if (!isSelected) {
      // Losing / not-picked team: neutral and de-emphasized
      return (
        <div
          className={cn(base, "bg-surface text-text-muted")}
          aria-label={team}
        >
          <span className="truncate">{team}</span>
        </div>
      );
    }

    const cls = classification ?? "pending";
    const stateConfig = {
      correct: {
        cls: "bg-success-bg text-success font-semibold",
        icon: "✓",
        strike: false,
        ariaLabel: `${team} — correct pick`,
      },
      wrong: {
        cls: "bg-error-bg text-text-subtle opacity-80",
        icon: "✗",
        strike: true,
        ariaLabel: `${team} — wrong pick`,
      },
      pending: {
        cls: "bg-surface-2 text-text",
        icon: null,
        strike: false,
        ariaLabel: `${team} — pending`,
      },
    }[cls];

    return (
      <div
        className={cn(base, stateConfig.cls)}
        aria-label={stateConfig.ariaLabel}
      >
        <span className={cn("truncate", stateConfig.strike && "line-through")}>
          {team}
        </span>
        {stateConfig.icon && (
          <span
            aria-hidden="true"
            className="ml-2 shrink-0 font-display text-base leading-none"
          >
            {stateConfig.icon}
          </span>
        )}
      </div>
    );
  }

  // ----- ENTRY MODE -----
  // Active emphasis: stronger selected color (brand gold accent). Muted
  // emphasis: softer, so far-future rounds don't fight for attention.
  const selectedActive =
    "bg-brand text-text-on-brand font-semibold shadow-inner";
  const selectedMuted =
    "bg-surface-2 text-text font-semibold";
  const selectedClass = emphasis === "muted" ? selectedMuted : selectedActive;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${team} wins`}
      aria-pressed={isSelected}
      className={cn(
        base,
        "text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        disabled
          ? "cursor-not-allowed bg-surface-sunken text-text-subtle"
          : isSelected
            ? selectedClass
            : "bg-surface text-text hover:bg-surface-2 active:scale-[0.99]"
      )}
    >
      <span className="truncate">{team}</span>
      {isSelected && (
        <span
          aria-hidden="true"
          className={cn(
            "ml-2 h-2 w-2 shrink-0 rounded-full",
            emphasis === "muted" ? "bg-accent" : "bg-accent"
          )}
        />
      )}
    </button>
  );
}

/**
 * MatchCard — the atomic pick unit. Two stacked team rows with a hairline
 * divider. Modes:
 * - entry: interactive buttons; selected row uses brand surface
 * - readonly: non-interactive; selected row subtly highlighted
 * - results: non-interactive; selected row tinted by correct/wrong/pending
 *
 * `emphasis` drives visual prominence: active rounds feel heavier; later
 * rounds fade back via a muted card treatment.
 */
export function MatchCard({
  matchId,
  teamA,
  teamB,
  selectedTeam,
  disabled,
  mode,
  classification,
  onSelect,
  emphasis = "active",
}: MatchCardProps) {
  const isEmpty = !teamA && !teamB;
  const hasPick = selectedTeam !== null && selectedTeam !== "";

  const outerClass = cn(
    "group w-full max-w-[16rem] overflow-hidden rounded-xl border transition-[transform,box-shadow,opacity] duration-200",
    isEmpty
      ? "border-border/60 opacity-70"
      : hasPick && mode === "entry"
        ? "border-brand/40 shadow-[var(--shadow-card)]"
        : "border-border shadow-[var(--shadow-card)]",
    emphasis === "muted" && "opacity-80",
    emphasis === "hero" && "ring-1 ring-accent/50 shadow-[var(--shadow-elevated)]",
    // Tactile hover only when interactive
    mode === "entry" && !isEmpty && "animate-lift"
  );

  return (
    <div className={outerClass} data-match-id={matchId}>
      <TeamRow
        team={teamA}
        isSelected={selectedTeam === teamA && teamA !== null}
        isTop={true}
        disabled={disabled || !teamA}
        onClick={() => teamA && onSelect(matchId, teamA)}
        mode={mode}
        classification={selectedTeam === teamA ? classification : undefined}
        emphasis={emphasis}
      />
      {!isEmpty && <div className="h-px bg-border" aria-hidden="true" />}
      <TeamRow
        team={teamB}
        isSelected={selectedTeam === teamB && teamB !== null}
        isTop={false}
        disabled={disabled || !teamB}
        onClick={() => teamB && onSelect(matchId, teamB)}
        mode={mode}
        classification={selectedTeam === teamB ? classification : undefined}
        emphasis={emphasis}
      />
    </div>
  );
}
