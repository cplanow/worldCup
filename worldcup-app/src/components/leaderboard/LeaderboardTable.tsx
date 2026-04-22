"use client";

import { useRouter } from "next/navigation";
import type { LeaderboardEntry } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type LeaderboardRow = LeaderboardEntry & {
  groupScore?: number;
  bracketScore?: number;
  /** Optional: previous rank, used to render an up/down delta chip. */
  previousRank?: number | null;
};

interface LeaderboardTableProps {
  entries: LeaderboardRow[];
  currentUsername: string;
}

/* ----- helpers -------------------------------------------------------- */

function RankPill({ rank }: { rank: number }) {
  // 1st: gold gradient; 2nd: silver (info tints); 3rd: bronze (warning tints);
  // 4+: neutral surface-2.
  if (rank === 1) {
    return (
      <span
        data-testid="rank-pill-1"
        className="bg-accent-gradient text-text-on-accent inline-flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold shadow-[var(--shadow-card)]"
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        data-testid={`rank-pill-${rank}`}
        className="bg-info-bg text-info inline-flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold ring-1 ring-info/30"
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        data-testid={`rank-pill-${rank}`}
        className="bg-warning-bg text-warning inline-flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold ring-1 ring-warning/30"
      >
        3
      </span>
    );
  }
  return (
    <span
      data-testid={`rank-pill-${rank}`}
      className="bg-surface-2 text-text-muted inline-flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-semibold"
    >
      {rank}
    </span>
  );
}

function RankDelta({ current, previous }: { current: number; previous?: number | null }) {
  if (previous == null || previous === current) return null;
  const delta = previous - current; // positive = moved up
  const up = delta > 0;
  return (
    <span
      aria-label={up ? `up ${delta}` : `down ${Math.abs(delta)}`}
      className={cn(
        "ml-1 inline-flex items-center gap-0.5 rounded-md px-1 text-[10px] font-semibold animate-slide-up",
        up ? "text-success" : "text-error"
      )}
    >
      <span aria-hidden="true">{up ? "\u25B2" : "\u25BC"}</span>
      {Math.abs(delta)}
    </span>
  );
}

function ChampionChip({
  pick,
  eliminated,
}: {
  pick: string | null;
  eliminated: boolean;
}) {
  if (!pick) {
    return <span className="text-text-subtle">—</span>;
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        eliminated
          ? "bg-error-bg text-text-subtle line-through"
          : "bg-success-bg text-success"
      )}
    >
      {pick}
    </span>
  );
}

/* ----- component ------------------------------------------------------ */

export function LeaderboardTable({ entries, currentUsername }: LeaderboardTableProps) {
  const router = useRouter();
  const showGroupColumns = entries.some(
    (e) => (e.groupScore ?? 0) > 0 || (e.bracketScore ?? 0) > 0
  );

  const handleRowClick = (username: string) => {
    if (username === currentUsername) {
      router.push("/bracket");
    } else {
      router.push(`/bracket/${encodeURIComponent(username)}`);
    }
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, username: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick(username);
    }
  };

  return (
    <div className="space-y-3">
      {/* --------- Mobile: stacked cards (sm and below) --------- */}
      <ul className="flex flex-col gap-2 sm:hidden" role="list">
        {entries.map((entry) => {
          const isCurrentUser = entry.username === currentUsername;
          return (
            <li key={entry.userId}>
              <div
                role="link"
                tabIndex={0}
                onClick={() => handleRowClick(entry.username)}
                onKeyDown={(e) => handleRowKeyDown(e, entry.username)}
                className={cn(
                  "rounded-xl border p-4 shadow-[var(--shadow-card)] cursor-pointer animate-lift outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCurrentUser
                    ? "bg-accent/8 border-accent/40"
                    : "bg-surface border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <RankPill rank={entry.rank} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <span className="truncate font-medium text-text">
                        {entry.username}
                      </span>
                      <RankDelta
                        current={entry.rank}
                        previous={entry.previousRank}
                      />
                    </div>
                    {showGroupColumns && (
                      <div className="mt-0.5 text-xs text-text-muted">
                        <span>Group {entry.groupScore ?? 0}</span>
                        <span className="mx-1.5 text-text-subtle">·</span>
                        <span>Bracket {entry.bracketScore ?? 0}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold leading-none text-text tabular-nums">
                      {entry.score}
                    </div>
                    <div
                      className={cn(
                        "mt-1 text-[11px] uppercase tracking-wide",
                        entry.isEliminated ? "text-text-subtle" : "text-text-muted"
                      )}
                    >
                      max {entry.maxPossible}
                    </div>
                  </div>
                </div>
                {entry.championPick !== null && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
                    <span>Champion:</span>
                    <ChampionChip
                      pick={entry.championPick}
                      eliminated={entry.isChampionEliminated}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* --------- Desktop / tablet table --------- */}
      <div className="hidden sm:block rounded-xl border border-border bg-surface shadow-[var(--shadow-card)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-2 hover:bg-surface-2 border-b border-border">
              <TableHead
                scope="col"
                className="w-16 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted"
              >
                Rank
              </TableHead>
              <TableHead
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted"
              >
                Name
              </TableHead>
              {showGroupColumns && (
                <TableHead
                  scope="col"
                  className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-subtle"
                >
                  Group
                </TableHead>
              )}
              {showGroupColumns && (
                <TableHead
                  scope="col"
                  className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-subtle"
                >
                  Bracket
                </TableHead>
              )}
              <TableHead
                scope="col"
                className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted"
              >
                {showGroupColumns ? "Total" : "Score"}
              </TableHead>
              <TableHead
                scope="col"
                className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-text-subtle"
              >
                Max
              </TableHead>
              <TableHead
                scope="col"
                className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted"
              >
                Champion
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isCurrentUser = entry.username === currentUsername;
              return (
                <TableRow
                  key={entry.userId}
                  role="link"
                  tabIndex={0}
                  onClick={() => handleRowClick(entry.username)}
                  onKeyDown={(e) => handleRowKeyDown(e, entry.username)}
                  className={cn(
                    "cursor-pointer border-border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    isCurrentUser
                      ? "bg-accent/8 hover:bg-accent/12"
                      : "hover:bg-surface-2"
                  )}
                >
                  <TableCell className="px-4 py-3">
                    <RankPill rank={entry.rank} />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center">
                      <span className="font-medium text-text">
                        {entry.username}
                      </span>
                      <RankDelta
                        current={entry.rank}
                        previous={entry.previousRank}
                      />
                    </div>
                  </TableCell>
                  {showGroupColumns && (
                    <TableCell className="px-4 py-3 text-right font-display text-base text-text-muted tabular-nums">
                      {entry.groupScore ?? 0}
                    </TableCell>
                  )}
                  {showGroupColumns && (
                    <TableCell className="px-4 py-3 text-right font-display text-base text-text-muted tabular-nums">
                      {entry.bracketScore ?? 0}
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 text-right">
                    <span className="font-display text-xl font-bold text-text tabular-nums">
                      {entry.score}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "px-4 py-3 text-right font-display text-base tabular-nums",
                      entry.isEliminated ? "text-text-subtle" : "text-text-muted"
                    )}
                  >
                    {entry.maxPossible}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <ChampionChip
                      pick={entry.championPick}
                      eliminated={entry.isChampionEliminated}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
