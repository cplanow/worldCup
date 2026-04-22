"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  total: number;
  /**
   * Optional per-round breakdown. When provided, renders a stepped progress
   * view with one segment per round instead of a single fill bar.
   *
   * Each entry is `[picksMade, picksNeeded]` for a round, in round order.
   */
  rounds?: ReadonlyArray<readonly [number, number]>;
}

const DEFAULT_ROUND_SIZES = [16, 8, 4, 2, 1] as const; // R32..Final
const ROUND_LABELS = ["R32", "R16", "QF", "SF", "F"] as const;

/**
 * Segmented progress indicator. Each round is a discrete segment that fills
 * as picks are made — replaces the old single-fill bar with clearer per-round
 * status at a glance. Falls back to the default R32→Final shape when no
 * `rounds` prop is provided (callers can reuse current/total for simple cases).
 */
export function ProgressBar({ current, total, rounds }: ProgressBarProps) {
  const percentage = Math.min(Math.round((current / total) * 100), 100);

  // Synthesize per-round state when only scalar progress is provided, by
  // draining `current` across the default round sizes. This keeps the simpler
  // call-sites working while still rendering a rich stepped view.
  const segments: ReadonlyArray<readonly [number, number]> = rounds ?? (() => {
    let remaining = current;
    return DEFAULT_ROUND_SIZES.map((size) => {
      const filled = Math.min(remaining, size);
      remaining -= filled;
      return [filled, size] as const;
    });
  })();

  return (
    <div className="space-y-2">
      {/* Text summary: emphasis on the count, minimal label */}
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-text-muted">
          <span className="font-display text-base font-semibold text-text">
            {current}
          </span>
          <span className="text-text-subtle"> / {total} picks</span>
        </p>
        <p className="text-xs font-semibold uppercase tracking-wider text-text-subtle">
          {percentage}%
        </p>
      </div>

      {/* Hidden ARIA progressbar — keeps assistive-tech semantics intact */}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuenow={current}
        aria-valuemax={total}
        aria-label="Bracket completion progress"
        className="relative h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Segmented round breakdown: one strip per round. Active = brand, done
          but not current = brand/70, untouched = surface-sunken. */}
      <div className="flex gap-1.5 pt-1" aria-hidden="true">
        {segments.map(([filled, size], idx) => {
          const isComplete = filled >= size;
          const isActive = !isComplete && filled > 0;
          const pct = Math.round((filled / size) * 100);
          return (
            <div key={idx} className="flex-1 min-w-0 space-y-1">
              <div
                className={cn(
                  "h-1 w-full overflow-hidden rounded-full",
                  isComplete
                    ? "bg-brand"
                    : "bg-surface-sunken"
                )}
              >
                {isActive && (
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <p
                className={cn(
                  "text-center text-[10px] font-semibold uppercase tracking-wider",
                  isComplete
                    ? "text-brand"
                    : isActive
                      ? "text-text"
                      : "text-text-subtle"
                )}
              >
                {ROUND_LABELS[idx] ?? `R${idx + 1}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
