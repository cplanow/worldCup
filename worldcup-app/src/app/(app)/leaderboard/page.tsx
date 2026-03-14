import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, picks, matches, results, tournamentConfig, groupPicks, groupTeams } from "@/db/schema";
import { asc } from "drizzle-orm";
import { buildLeaderboardEntries, getPointsPerRound, applyTiebreakers } from "@/lib/scoring-engine";
import { calculateGroupStageScore } from "@/lib/group-scoring-engine";
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

  const [allUsers, allPicks, allMatches, allResults, config, allGroupPicks, allGroupTeams] = await Promise.all([
    db.select().from(users).all(),
    db.select().from(picks).all(),
    db.select().from(matches).orderBy(asc(matches.round), asc(matches.position)).all(),
    db.select().from(results).all(),
    db.select().from(tournamentConfig).get(),
    db.select().from(groupPicks).all(),
    db.select().from(groupTeams).all(),
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

  // Build group results from groupTeams that have finalPosition set
  const groupResultsMap = new Map<number, { teamName: string; finalPosition: number }[]>();
  for (const gt of allGroupTeams) {
    if (gt.finalPosition != null) {
      if (!groupResultsMap.has(gt.groupId)) groupResultsMap.set(gt.groupId, []);
      groupResultsMap.get(gt.groupId)!.push({ teamName: gt.teamName, finalPosition: gt.finalPosition });
    }
  }
  const groupResults = Array.from(groupResultsMap.entries()).map(([groupId, teams]) => ({ groupId, teams }));

  const groupConfig = {
    pointsGroupAdvance: config?.pointsGroupAdvance ?? 2,
    pointsGroupExact: config?.pointsGroupExact ?? 1,
  };

  // Build combined entries
  const combinedEntries = entries.map((entry) => {
    const userGroupPicks = allGroupPicks
      .filter((p) => p.userId === entry.userId)
      .map((p) => ({ groupId: p.groupId, firstPlace: p.firstPlace, secondPlace: p.secondPlace }));

    const groupScore = calculateGroupStageScore(userGroupPicks, groupResults, groupConfig);

    return {
      ...entry,
      groupScore,
      bracketScore: entry.score,
      score: entry.score + groupScore,
    };
  });

  // Re-sort by combined score and re-rank
  combinedEntries.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
  let currentRank = 1;
  for (let i = 0; i < combinedEntries.length; i++) {
    if (i > 0 && combinedEntries[i].score < combinedEntries[i - 1].score) {
      currentRank = i + 1;
    }
    combinedEntries[i].rank = currentRank;
  }

  return (
    <div className="px-4 py-6">
      <h1 className="font-display text-2xl font-bold mb-4 text-slate-900">Leaderboard</h1>
      {isLocked && (
        <div className="mb-4">
          <LockMessage />
        </div>
      )}
      <LeaderboardTable entries={combinedEntries} currentUsername={username} />
    </div>
  );
}
