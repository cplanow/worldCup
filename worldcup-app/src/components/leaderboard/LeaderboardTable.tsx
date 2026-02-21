"use client";

import type { LeaderboardEntry } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUsername: string;
}

export function LeaderboardTable({ entries, currentUsername }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="w-14 text-center px-4">
            Rank
          </TableHead>
          <TableHead scope="col" className="px-4">
            Name
          </TableHead>
          <TableHead scope="col" className="text-right px-4">
            Score
          </TableHead>
          <TableHead scope="col" className="text-right px-4">
            Max
          </TableHead>
          <TableHead scope="col" className="px-4">
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
              className={
                isCurrentUser
                  ? "bg-emerald-50 hover:bg-emerald-50"
                  : undefined
              }
            >
              <TableCell className="text-center font-semibold px-4 py-3">
                {entry.rank === 1 ? "👑 1" : entry.rank}
              </TableCell>
              <TableCell className="px-4 py-3">{entry.username}</TableCell>
              <TableCell className="text-right px-4 py-3">
                {entry.score}
              </TableCell>
              <TableCell
                className={`text-right px-4 py-3${entry.isEliminated ? " text-slate-400" : ""}`}
              >
                {entry.maxPossible}
              </TableCell>
              <TableCell className="px-4 py-3">
                {entry.championPick ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-sm${
                      entry.isChampionEliminated
                        ? " bg-red-100 line-through"
                        : " bg-emerald-100"
                    }`}
                  >
                    {entry.championPick}
                  </span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}
