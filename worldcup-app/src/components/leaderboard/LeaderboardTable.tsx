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
  entries: (LeaderboardEntry & { groupScore?: number; bracketScore?: number })[];
  currentUsername: string;
}

export function LeaderboardTable({ entries, currentUsername }: LeaderboardTableProps) {
  const router = useRouter();
  const showGroupColumns = entries.some((e) => (e.groupScore ?? 0) > 0 || (e.bracketScore ?? 0) > 0);

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
    <div className="overflow-x-auto rounded-xl border border-slate-200/80">
    <Table>
      <TableHeader>
        <TableRow className="bg-[#0F2E23]">
          <TableHead scope="col" className="w-14 text-center px-4 text-[#8BAF9E]">
            Rank
          </TableHead>
          <TableHead scope="col" className="px-4 text-[#8BAF9E]">
            Name
          </TableHead>
          {showGroupColumns && (
            <TableHead scope="col" className="text-right px-4 text-[#8BAF9E]">
              Group
            </TableHead>
          )}
          {showGroupColumns && (
            <TableHead scope="col" className="text-right px-4 text-[#8BAF9E]">
              Bracket
            </TableHead>
          )}
          <TableHead scope="col" className="text-right px-4 text-[#8BAF9E]">
            {showGroupColumns ? "Total" : "Score"}
          </TableHead>
          <TableHead scope="col" className="text-right px-4 text-[#8BAF9E]">
            Max
          </TableHead>
          <TableHead scope="col" className="px-4 text-[#8BAF9E]">
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
                  ? "bg-emerald-50/60 hover:bg-emerald-50 cursor-pointer"
                  : "cursor-pointer hover:bg-slate-50"
              }
            >
              <TableCell className="text-center font-semibold px-4 py-3">
                {entry.rank === 1 ? (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#D4AF37] text-xs font-bold text-[#0F2E23]">1</span>
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{entry.rank}</span>
                )}
              </TableCell>
              <TableCell className="px-4 py-3">{entry.username}</TableCell>
              {showGroupColumns && (
                <TableCell className="text-right px-4 py-3">
                  {entry.groupScore ?? 0}
                </TableCell>
              )}
              {showGroupColumns && (
                <TableCell className="text-right px-4 py-3">
                  {entry.bracketScore ?? 0}
                </TableCell>
              )}
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
                    className={
                      entry.isChampionEliminated
                        ? "rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 line-through"
                        : "rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700"
                    }
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
