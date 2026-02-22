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

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUsername: string;
}

export function LeaderboardTable({ entries, currentUsername }: LeaderboardTableProps) {
  const router = useRouter();

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
              role="link"
              tabIndex={0}
              onClick={() => handleRowClick(entry.username)}
              onKeyDown={(e) => handleRowKeyDown(e, entry.username)}
              className={
                isCurrentUser
                  ? "bg-emerald-50 hover:bg-emerald-50 cursor-pointer"
                  : "cursor-pointer hover:bg-slate-50"
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
