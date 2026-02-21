import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, picks, matches, results, tournamentConfig } from "@/db/schema";
import { asc } from "drizzle-orm";
import { buildLeaderboardEntries, getPointsPerRound, applyTiebreakers } from "@/lib/scoring-engine";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { LockMessage } from "@/components/LockMessage";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ locked?: string }>;
}) {
  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value;
  if (!username) redirect("/");

  const params = await searchParams;
  const isLocked = params.locked === "1";

  const [allUsers, allPicks, allMatches, allResults, config] = await Promise.all([
    db.select().from(users).all(),
    db.select().from(picks).all(),
    db.select().from(matches).orderBy(asc(matches.round), asc(matches.position)).all(),
    db.select().from(results).all(),
    db.select().from(tournamentConfig).get(),
  ]);

  const pointsPerRound = config
    ? getPointsPerRound(config)
    : { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };

  const baseEntries = buildLeaderboardEntries({
    users: allUsers,
    allPicks,
    results: allResults,
    matches: allMatches,
    pointsPerRound,
  });

  const entries = applyTiebreakers(baseEntries, {
    allPicks,
    results: allResults,
    matches: allMatches,
  });

  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 text-slate-900">Leaderboard</h1>
      {isLocked && (
        <div className="mb-4">
          <LockMessage />
        </div>
      )}
      <LeaderboardTable entries={entries} currentUsername={username} />
    </div>
  );
}
